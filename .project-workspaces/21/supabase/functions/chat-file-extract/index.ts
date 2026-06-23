// Chat File Extractor — converts an arbitrary attachment (PDF, DOCX, PPTX,
// XLSX, ZIP, code, etc.) into plain text the chat companion can read.
// Personality stays on Claude; this function ONLY produces extracted text.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB hard ceiling
const MAX_OUTPUT_CHARS = 60_000; // budget passed to Claude as context
const MAX_ZIP_ENTRIES = 200;
const MAX_ZIP_FILE_BYTES = 2 * 1024 * 1024; // skip very large files inside zips
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const TEXT_EXTS = new Set([
  "txt", "md", "markdown", "csv", "tsv", "json", "jsonc", "ndjson", "xml", "yaml", "yml", "toml", "ini", "env",
  "log", "sql", "graphql", "proto",
  "html", "htm", "css", "scss", "sass", "less",
  "js", "jsx", "mjs", "cjs", "ts", "tsx",
  "py", "rb", "php", "go", "rs", "java", "kt", "swift", "scala", "cs", "c", "h", "cpp", "hpp", "m", "mm",
  "sh", "bash", "zsh", "fish", "ps1", "bat",
  "vue", "svelte", "astro",
  "dockerfile", "gitignore", "gitattributes", "editorconfig", "lock",
]);

const BINARY_EXTS_VIA_GEMINI = new Set([
  "pdf", "docx", "pptx", "xlsx", "xls", "doc", "ppt",
  "rtf", "odt", "ods", "odp",
  "mp3", "wav", "m4a", "ogg", "flac", "aac", "webm",
]);

const SKIP_INSIDE_ZIP = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "ico", "bmp", "tiff", "svg",
  "mp4", "mov", "avi", "mkv", "webm",
  "ttf", "otf", "woff", "woff2", "eot",
  "exe", "dll", "so", "dylib", "bin",
  "zip", "tar", "gz", "rar", "7z",
  "node", "pyc", "class",
]);

function getExt(name: string): string {
  const m = (name || "").toLowerCase().match(/\.([^.\/\\]+)$/);
  if (m) return m[1];
  // Special files without extension
  const base = (name || "").toLowerCase().split(/[/\\]/).pop() || "";
  if (TEXT_EXTS.has(base)) return base;
  return "";
}

function isProbablyText(bytes: Uint8Array, sampleSize = 1024): boolean {
  const len = Math.min(bytes.length, sampleSize);
  if (len === 0) return true;
  let nonPrintable = 0;
  for (let i = 0; i < len; i++) {
    const b = bytes[i];
    if (b === 0) return false; // null byte → binary
    if (b < 9) nonPrintable++;
    else if (b > 13 && b < 32) nonPrintable++;
  }
  return nonPrintable / len < 0.1;
}

function getGeminiText(payload: unknown): string {
  // deno-lint-ignore no-explicit-any
  const p = payload as any;
  return p?.candidates?.[0]?.content?.parts?.[0]?.text || "";
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
    body: JSON.stringify({ file: { display_name: displayName } }),
  });
  if (!startResp.ok) throw new Error(`Gemini upload start failed: ${await startResp.text()}`);
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
  if (!uploadResp.ok) throw new Error(`Gemini upload finalize failed: ${await uploadResp.text()}`);

  const json = await uploadResp.json();
  return json.file as { name: string; uri?: string; mimeType?: string; state?: string };
}

async function getGeminiFile(apiKey: string, name: string) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/${name}?key=${apiKey}`);
  if (!r.ok) throw new Error(`Gemini file status failed: ${await r.text()}`);
  const j = await r.json();
  return j.file as { name: string; uri?: string; mimeType?: string; state?: string };
}

async function deleteGeminiFile(apiKey: string, name: string) {
  await fetch(`https://generativelanguage.googleapis.com/v1beta/${name}?key=${apiKey}`, { method: "DELETE" });
}

async function extractWithGemini(apiKey: string, bytes: Uint8Array, mimeType: string, fileName: string): Promise<string> {
  const uploaded = await startGeminiUpload(apiKey, bytes, mimeType, fileName || "document");
  try {
    let ready = uploaded;
    for (let i = 0; i < 18; i++) {
      if (ready.state === "ACTIVE" && ready.uri) break;
      if (ready.state === "FAILED") throw new Error("Gemini could not process this file.");
      await delay(2500);
      ready = await getGeminiFile(apiKey, uploaded.name);
    }
    if (!ready.uri) throw new Error("File processing timed out.");

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Extract ALL readable text from this file. Preserve headings, sections, lists, tables, and any code blocks. Output clean text only — no commentary, no markdown wrapping." },
              { file_data: { mime_type: ready.mimeType || mimeType, file_uri: ready.uri } },
            ],
          }],
          generationConfig: { maxOutputTokens: 32000, temperature: 0 },
        }),
      },
    );
    if (!resp.ok) throw new Error(`Gemini extract failed: ${await resp.text()}`);
    return getGeminiText(await resp.json());
  } finally {
    if (uploaded?.name) deleteGeminiFile(apiKey, uploaded.name).catch(() => undefined);
  }
}

async function extractZip(bytes: Uint8Array, geminiKey: string | undefined): Promise<{ text: string; fileCount: number; skipped: number }> {
  const zip = await JSZip.loadAsync(bytes);
  const parts: string[] = [];
  let fileCount = 0;
  let skipped = 0;
  let totalChars = 0;

  // Collect entries in stable order
  const names: string[] = [];
  zip.forEach((path, entry) => {
    if (!entry.dir) names.push(path);
  });
  names.sort();

  let processed = 0;
  for (const name of names) {
    if (processed >= MAX_ZIP_ENTRIES) { skipped++; continue; }
    if (name.startsWith("__MACOSX/") || name.endsWith(".DS_Store")) continue;
    const ext = getExt(name);
    if (SKIP_INSIDE_ZIP.has(ext)) { skipped++; continue; }

    const file = zip.file(name);
    if (!file) continue;

    let entryBytes: Uint8Array;
    try {
      entryBytes = await file.async("uint8array");
    } catch {
      skipped++;
      continue;
    }
    if (entryBytes.byteLength > MAX_ZIP_FILE_BYTES) { skipped++; continue; }
    processed++;

    let content = "";
    if (TEXT_EXTS.has(ext) || isProbablyText(entryBytes)) {
      try { content = new TextDecoder("utf-8", { fatal: false }).decode(entryBytes); }
      catch { skipped++; continue; }
    } else if (BINARY_EXTS_VIA_GEMINI.has(ext) && geminiKey) {
      try { content = await extractWithGemini(geminiKey, entryBytes, "application/octet-stream", name); }
      catch { skipped++; continue; }
    } else {
      skipped++;
      continue;
    }

    if (!content.trim()) continue;
    const block = `\n\n=== ${name} ===\n${content.trim()}\n`;
    if (totalChars + block.length > MAX_OUTPUT_CHARS) {
      parts.push(`\n\n[…remaining ${names.length - processed} files truncated to stay within context limit]`);
      break;
    }
    parts.push(block);
    totalChars += block.length;
    fileCount++;
  }

  return { text: parts.join(""), fileCount, skipped };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
    }
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await sb.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: jsonHeaders });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return new Response(JSON.stringify({ error: "Invalid body" }), { status: 400, headers: jsonHeaders });
    }
    const { fileName, mimeType, base64 } = body as { fileName?: string; mimeType?: string; base64?: string };
    if (!fileName || !base64) {
      return new Response(JSON.stringify({ error: "Missing fileName or base64" }), { status: 400, headers: jsonHeaders });
    }

    // Decode base64 → bytes
    let bytes: Uint8Array;
    try {
      const binStr = atob(base64);
      bytes = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid base64 payload" }), { status: 400, headers: jsonHeaders });
    }

    if (bytes.byteLength > MAX_FILE_BYTES) {
      return new Response(JSON.stringify({ error: `File too large — max ${Math.round(MAX_FILE_BYTES / 1024 / 1024)}MB` }), { status: 413, headers: jsonHeaders });
    }

    const ext = getExt(fileName);
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";

    let text = "";
    let summary = "";

    if (ext === "zip") {
      if (!GEMINI_API_KEY) {
        // Still extract text/code from inside the zip without Gemini
      }
      const { text: zipText, fileCount, skipped } = await extractZip(bytes, GEMINI_API_KEY || undefined);
      text = zipText;
      summary = `ZIP archive with ${fileCount} readable file(s)${skipped ? `, ${skipped} skipped (binary or too large)` : ""}`;
    } else if (TEXT_EXTS.has(ext) || isProbablyText(bytes)) {
      text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      summary = `${ext || "text"} file`;
    } else if (BINARY_EXTS_VIA_GEMINI.has(ext)) {
      if (!GEMINI_API_KEY) {
        return new Response(JSON.stringify({ error: "AI extraction not configured" }), { status: 500, headers: jsonHeaders });
      }
      text = await extractWithGemini(GEMINI_API_KEY, bytes, mimeType || "application/octet-stream", fileName);
      summary = `${ext} document`;
    } else {
      return new Response(JSON.stringify({ error: `Unsupported file type: .${ext || "unknown"}` }), { status: 415, headers: jsonHeaders });
    }

    if (!text.trim()) {
      return new Response(JSON.stringify({ error: "No readable text could be extracted from this file." }), { status: 422, headers: jsonHeaders });
    }

    // Trim to context budget
    let truncated = false;
    if (text.length > MAX_OUTPUT_CHARS) {
      text = text.slice(0, MAX_OUTPUT_CHARS) + "\n\n[…truncated to stay within chat context limit]";
      truncated = true;
    }

    return new Response(
      JSON.stringify({ text, summary, truncated, originalSize: bytes.byteLength }),
      { headers: jsonHeaders },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[chat-file-extract] error:", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: jsonHeaders });
  }
});
