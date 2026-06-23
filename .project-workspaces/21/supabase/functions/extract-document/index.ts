import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
const EXTRACTION_PENDING = "⏳ Extracting content...";
const EXTRACTION_FAILED_PREFIX = "❌ Extraction failed — ";
const runtime = globalThis as typeof globalThis & {
  EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void };
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Internal error";
}

function trimFailureMessage(message: string) {
  return `${EXTRACTION_FAILED_PREFIX}${message}`.slice(0, 240);
}

function extractStoragePath(fileUrl: string) {
  return fileUrl.includes("/storage/v1/object/")
    ? fileUrl.split("/storage/v1/object/")[1]?.replace(/^(public|authenticated)\//, "")
    : null;
}

function inferMimeType(fileName?: string) {
  const ext = (fileName || "").toLowerCase();
  if (ext.endsWith(".pdf")) return "application/pdf";
  if (ext.endsWith(".txt")) return "text/plain";
  if (ext.endsWith(".md")) return "text/markdown";
  if (ext.endsWith(".csv")) return "text/csv";
  return "application/octet-stream";
}

function getGeminiText(payload: any) {
  return payload?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// ── Vault Synthesis Metadata ─────────────────────────────────────────────────
// Generates a 2-sentence summary + up to 10 thematic tags for a vault document.
// Called async (fire-and-forget) after content is saved — zero latency impact.
async function generateVaultMetadata(
  anthropicApiKey: string,
  adminSb: ReturnType<typeof createClient>,
  documentId: string,
  userId: string,
  title: string,
  contentText: string,
): Promise<void> {
  try {
    const snippet = contentText.substring(0, 6000);
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        system: `You extract metadata from documents for a personal knowledge vault. 
Respond ONLY with valid JSON in this exact shape:
{"summary":"<2 sentences max describing what this document is and its main purpose>","tags":["tag1","tag2",...]}
Tags must be lowercase, 1-3 words each, maximum 10 tags. Focus on topic, domain, and purpose.
Never include markdown, backticks, or any text outside the JSON object.`,
        messages: [{
          role: "user",
          content: `Document title: "${title}"\n\nContent:\n${snippet}`,
        }],
      }),
    });

    if (!resp.ok) return;

    const data = await resp.json();
    const raw = data?.content?.[0]?.text?.trim() || "";
    
    // Strip any accidental markdown fences
    const clean = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(clean);

    if (parsed?.summary && Array.isArray(parsed?.tags)) {
      await adminSb
        .from("knowledge_documents")
        .update({
          summary: parsed.summary.substring(0, 500),
          tags: parsed.tags.slice(0, 10).map((t: string) => String(t).toLowerCase().substring(0, 50)),
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId)
        .eq("user_id", userId);
    }
  } catch {
    // Silent fail — metadata is enhancement only, never blocks extraction
  }
}

async function markDocumentFailed(adminSb: ReturnType<typeof createClient>, documentId: string, userId: string, message: string) {
  await adminSb
    .from("knowledge_documents")
    .update({
      content_text: trimFailureMessage(message || "Please tap Remove and try again."),
      updated_at: new Date().toISOString(),
      is_active: false,
    })
    .eq("id", documentId)
    .eq("user_id", userId);
}

async function generateDeltaSummary(apiKey: string, oldTitle: string, oldText: string, newTitle: string, newText: string) {
  const geminiResp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Compare these two document versions and produce a concise delta summary (max 300 words) as bullet points. Focus on changed sections, added/removed rules, and key date/number changes.\n\nPREVIOUS: "${oldTitle}"\n${oldText.substring(0, 8000)}\n\nNEW: "${newTitle}"\n${newText.substring(0, 8000)}\n\nOutput ONLY bullet points of what changed.`,
          }],
        }],
        generationConfig: { maxOutputTokens: 2000, temperature: 0.1 },
      }),
    }
  );

  if (!geminiResp.ok) {
    throw new Error(`Delta comparison failed: ${await geminiResp.text()}`);
  }

  return getGeminiText(await geminiResp.json());
}

async function startGeminiUpload(apiKey: string, bytes: Uint8Array, mimeType: string, displayName: string) {
  const startResp = await fetch("https://generativelanguage.googleapis.com/upload/v1beta/files", {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(bytes.byteLength),
      "X-Goog-Upload-Header-Content-Type": mimeType,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      file: {
        display_name: displayName,
      },
    }),
  });

  if (!startResp.ok) {
    throw new Error(`Gemini upload start failed: ${await startResp.text()}`);
  }

  const uploadUrl = startResp.headers.get("x-goog-upload-url");
  if (!uploadUrl) throw new Error("Gemini upload URL missing");

  const uploadResp = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(bytes.byteLength),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: bytes,
  });

  if (!uploadResp.ok) {
    throw new Error(`Gemini upload finalize failed: ${await uploadResp.text()}`);
  }

  const uploadJson = await uploadResp.json();
  return uploadJson.file as { name: string; uri?: string; mimeType?: string; state?: string };
}

async function getGeminiFile(apiKey: string, name: string) {
  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/${name}?key=${apiKey}`);
  if (!resp.ok) {
    throw new Error(`Gemini file status failed: ${await resp.text()}`);
  }
  const data = await resp.json();
  return data.file as { name: string; uri?: string; mimeType?: string; state?: string };
}

async function deleteGeminiFile(apiKey: string, name: string) {
  await fetch(`https://generativelanguage.googleapis.com/v1beta/${name}?key=${apiKey}`, {
    method: "DELETE",
  });
}

async function extractLargeDocument(apiKey: string, fileData: Blob, fileName: string) {
  const mimeType = fileData.type || inferMimeType(fileName);
  const bytes = new Uint8Array(await fileData.arrayBuffer());
  const uploadedFile = await startGeminiUpload(apiKey, bytes, mimeType, fileName || "document");

  try {
    let readyFile = uploadedFile;
    for (let attempt = 0; attempt < 18; attempt++) {
      if (readyFile.state === "ACTIVE" && readyFile.uri) break;
      if (readyFile.state === "FAILED") {
        throw new Error("Gemini could not process this document.");
      }
      await delay(3000);
      readyFile = await getGeminiFile(apiKey, uploadedFile.name);
    }

    if (!readyFile.uri) {
      throw new Error("Document processing timed out. Please try again.");
    }

    const geminiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: "Extract ALL text content from this document. Preserve headings, sections, numbered items, tables, and key rules. Output clean text only with no commentary.",
              },
              {
                file_data: {
                  mime_type: readyFile.mimeType || mimeType,
                  file_uri: readyFile.uri,
                },
              },
            ],
          }],
          generationConfig: {
            maxOutputTokens: 32000,
            temperature: 0,
          },
        }),
      }
    );

    if (!geminiResp.ok) {
      throw new Error(`AI extraction failed: ${await geminiResp.text()}`);
    }

    return getGeminiText(await geminiResp.json());
  } finally {
    if (uploadedFile?.name) {
      await deleteGeminiFile(apiKey, uploadedFile.name).catch(() => undefined);
    }
  }
}

async function processDocumentExtraction({
  adminSb,
  userId,
  fileUrl,
  fileName,
  documentId,
  previousDocId,
  title,
}: {
  adminSb: ReturnType<typeof createClient>;
  userId: string;
  fileUrl: string;
  fileName?: string;
  documentId: string;
  previousDocId?: string | null;
  title?: string;
}) {
  const storagePath = extractStoragePath(fileUrl);
  if (!storagePath) throw new Error("Invalid file URL");

  const bucketAndPath = storagePath.split("/");
  const bucket = bucketAndPath[0];
  const path = bucketAndPath.slice(1).join("/");

  const { data: fileData, error: downloadError } = await adminSb.storage
    .from(bucket)
    .download(path);

  if (downloadError || !fileData) {
    throw new Error("Failed to download file");
  }

  const ext = (fileName || "").toLowerCase();
  let fileContent = "";

  if (ext.endsWith(".txt") || ext.endsWith(".md") || ext.endsWith(".csv")) {
    fileContent = await fileData.text();
  } else {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("AI extraction not configured");
    fileContent = await extractLargeDocument(GEMINI_API_KEY, fileData, fileName || "document.pdf");
  }

  if (!fileContent.trim() || fileContent.trim() === EXTRACTION_PENDING) {
    throw new Error("No readable text was extracted from this file.");
  }

  if (fileContent.length > 100000) {
    fileContent = `${fileContent.substring(0, 100000)}\n\n[...truncated — document exceeds extraction limit]`;
  }

  const updatedAt = new Date().toISOString();
  const { error: updateError } = await adminSb
    .from("knowledge_documents")
    .update({
      content_text: fileContent,
      updated_at: updatedAt,
      is_active: true,
    })
    .eq("id", documentId)
    .eq("user_id", userId);

  if (updateError) {
    throw new Error("Failed to save extracted text");
  }

  // Fire-and-forget: generate summary + tags for vault synthesis (no latency impact)
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (ANTHROPIC_API_KEY) {
    // Resolve title — may come from params or need a quick DB lookup
    const resolveTitle = async (): Promise<string> => {
      if (title) return title;
      const { data } = await adminSb
        .from("knowledge_documents")
        .select("title")
        .eq("id", documentId)
        .eq("user_id", userId)
        .single();
      return data?.title || "";
    };

    const metaPromise = resolveTitle().then((resolvedTitle) =>
      generateVaultMetadata(ANTHROPIC_API_KEY, adminSb, documentId, userId, resolvedTitle, fileContent)
    );

    if (runtime.EdgeRuntime?.waitUntil) {
      runtime.EdgeRuntime.waitUntil(metaPromise);
    } else {
      metaPromise.catch(() => {});
    }
  }

  if (previousDocId) {
    await adminSb
      .from("knowledge_documents")
      .update({ is_active: false, updated_at: updatedAt })
      .eq("id", previousDocId)
      .eq("user_id", userId);
  }

  if (previousDocId) {
    try {
      const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
      if (!GEMINI_API_KEY) return;

      const [{ data: oldDoc }, { data: newDocRow }] = await Promise.all([
        adminSb
          .from("knowledge_documents")
          .select("content_text, title")
          .eq("id", previousDocId)
          .eq("user_id", userId)
          .single(),
        adminSb
          .from("knowledge_documents")
          .select("title")
          .eq("id", documentId)
          .eq("user_id", userId)
          .single(),
      ]);

      if (oldDoc?.content_text && oldDoc.content_text.length > 10) {
        const deltaSummary = await generateDeltaSummary(
          GEMINI_API_KEY,
          oldDoc.title,
          oldDoc.content_text,
          newDocRow?.title || "Updated Document",
          fileContent
        );

        if (deltaSummary) {
          await adminSb
            .from("knowledge_documents")
            .update({ delta_summary: deltaSummary, updated_at: new Date().toISOString() })
            .eq("id", documentId)
            .eq("user_id", userId);
        }
      }
    } catch (error) {
      console.error("[extract-document] Delta comparison error:", error);
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await sb.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const userId = claimsData.claims.sub as string;
    const body = await req.json();
    const { mode } = body;

    const adminSb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (mode === "delta") {
      const { newDocId, oldDocId } = body;
      if (!newDocId || !oldDocId) {
        return new Response(JSON.stringify({ error: "Missing newDocId or oldDocId" }), {
          status: 400,
          headers: jsonHeaders,
        });
      }

      const [{ data: newDoc }, { data: oldDoc }] = await Promise.all([
        adminSb.from("knowledge_documents").select("content_text, title").eq("id", newDocId).eq("user_id", userId).single(),
        adminSb.from("knowledge_documents").select("content_text, title").eq("id", oldDocId).eq("user_id", userId).single(),
      ]);

      if (!newDoc || !oldDoc) {
        return new Response(JSON.stringify({ error: "Documents not found" }), {
          status: 404,
          headers: jsonHeaders,
        });
      }

      const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
      if (!GEMINI_API_KEY) {
        return new Response(JSON.stringify({ error: "AI not configured" }), {
          status: 500,
          headers: jsonHeaders,
        });
      }

      const deltaSummary = await generateDeltaSummary(
        GEMINI_API_KEY,
        newDoc.title,
        oldDoc.content_text,
        newDoc.title,
        newDoc.content_text
      );

      if (deltaSummary) {
        await adminSb
          .from("knowledge_documents")
          .update({ delta_summary: deltaSummary, updated_at: new Date().toISOString() })
          .eq("id", newDocId)
          .eq("user_id", userId);
      }

      return new Response(JSON.stringify({ success: true, deltaSummary }), {
        headers: jsonHeaders,
      });
    }

    const { fileUrl, fileName, documentId, previousDocId } = body;
    if (!fileUrl || !documentId) {
      return new Response(JSON.stringify({ error: "Missing fileUrl or documentId" }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const job = processDocumentExtraction({
      adminSb,
      userId,
      fileUrl,
      fileName,
      documentId,
      previousDocId,
    }).catch(async (error) => {
      console.error("[extract-document] Background extraction error:", error);
      await markDocumentFailed(adminSb, documentId, userId, getErrorMessage(error));
    });

    if (runtime.EdgeRuntime?.waitUntil) {
      runtime.EdgeRuntime.waitUntil(job);
    } else {
      await job;
    }

    return new Response(JSON.stringify({ success: true, queued: true }), {
      status: 202,
      headers: jsonHeaders,
    });
  } catch (error) {
    console.error("[extract-document] Error:", error);
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});