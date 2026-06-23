// Clone a brand voice via ElevenLabs Instant Voice Cloning
// Innovation tier only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tier gate — Innovation only
    const subRes = await fetch(`${SUPABASE_URL}/functions/v1/check-subscription`, {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (subRes.ok) {
      const sub = await subRes.json();
      const tier = sub?.tier ?? "free";
      // Innovation tier === "growth" in billing model
      if (tier !== "growth" && tier !== "innovation") {
        return new Response(
          JSON.stringify({
            error: "Brand Voice Cloning requires the Innovation tier ($79).",
            upgradeRequired: true,
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Multipart form: name, description, sample (audio file)
    const form = await req.formData();
    const name = (form.get("name") as string | null)?.trim() || "My Voice";
    const description = (form.get("description") as string | null)?.trim() || "";
    const sample = form.get("sample") as File | null;
    const setDefault = form.get("set_default") === "true";

    if (!sample) {
      return new Response(JSON.stringify({ error: "Audio sample required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (sample.size > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "Sample too large (max 10MB)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (name.length > 80) {
      return new Response(JSON.stringify({ error: "Name too long (max 80 chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminSb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: userRow } = await adminSb
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .maybeSingle();
    const orgId = userRow?.org_id;
    if (!orgId) {
      return new Response(JSON.stringify({ error: "No org for user" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upload sample to storage (private bucket)
    const sampleBytes = new Uint8Array(await sample.arrayBuffer());
    const samplePath = `brand-voice-samples/${orgId}/${user.id}-${Date.now()}-${sample.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: upErr } = await adminSb.storage
      .from("project-assets")
      .upload(samplePath, sampleBytes, {
        contentType: sample.type || "audio/mpeg",
        upsert: false,
      });
    if (upErr) throw new Error(`Sample upload failed: ${upErr.message}`);

    // Send to ElevenLabs Instant Voice Cloning
    // POST /v1/voices/add — multipart form: name, description, files[]
    const elForm = new FormData();
    elForm.append("name", `${name} (IntoIQ)`);
    if (description) elForm.append("description", description);
    elForm.append("files", new Blob([sampleBytes], { type: sample.type || "audio/mpeg" }), sample.name);
    elForm.append("labels", JSON.stringify({ org_id: orgId, source: "intoiq" }));

    const elRes = await fetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: { "xi-api-key": ELEVENLABS_API_KEY },
      body: elForm,
    });

    if (!elRes.ok) {
      const errText = await elRes.text();
      throw new Error(`ElevenLabs clone failed ${elRes.status}: ${errText.slice(0, 300)}`);
    }

    const elJson = await elRes.json() as { voice_id: string };
    if (!elJson.voice_id) throw new Error("ElevenLabs returned no voice_id");

    // If set_default, clear other defaults first
    if (setDefault) {
      await adminSb
        .from("brand_voices")
        .update({ is_default: false })
        .eq("org_id", orgId);
    }

    // Persist
    const { data: row, error: insErr } = await adminSb
      .from("brand_voices")
      .insert({
        org_id: orgId,
        created_by: user.id,
        name,
        description: description || null,
        elevenlabs_voice_id: elJson.voice_id,
        sample_storage_path: samplePath,
        is_default: setDefault,
      })
      .select()
      .single();

    if (insErr) throw new Error(`DB insert failed: ${insErr.message}`);

    return new Response(JSON.stringify({ voice: row }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[clone-brand-voice]", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
