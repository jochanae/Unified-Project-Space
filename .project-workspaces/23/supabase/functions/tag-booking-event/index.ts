import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, page_id, provider } = await req.json();
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const pageId = typeof page_id === "string" ? page_id.trim() : "";
    const tagSuffix = typeof provider === "string" && provider.length <= 30
      ? provider.replace(/[^a-z0-9-]/gi, "").toLowerCase()
      : "";

    if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!pageId) {
      return new Response(JSON.stringify({ error: "Missing page_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: page } = await supabase
      .from("pages").select("org_id").eq("id", pageId).maybeSingle();
    if (!page) {
      return new Response(JSON.stringify({ error: "Page not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: contact } = await supabase
      .from("contacts").select("id, tags, pipeline_stage")
      .eq("org_id", page.org_id).eq("email", normalizedEmail)
      .order("created_at", { ascending: true }).limit(1).maybeSingle();

    if (!contact) {
      return new Response(JSON.stringify({ ok: true, skipped: "no contact" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseTag = "booked-meeting";
    const providerTag = tagSuffix ? `booked-${tagSuffix}` : null;
    const newTags = Array.from(new Set([...(contact.tags || []), baseTag, providerTag].filter(Boolean) as string[]));

    const updates: Record<string, unknown> = { tags: newTags };
    // Auto-bump cold/new leads to qualified when they book.
    if (contact.pipeline_stage === "new" || contact.pipeline_stage === "contacted") {
      updates.pipeline_stage = "qualified";
    }

    await supabase.from("contacts").update(updates).eq("id", contact.id);

    return new Response(JSON.stringify({ ok: true, contact_id: contact.id, tags: newTags }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("tag-booking-event error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
