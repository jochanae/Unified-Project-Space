/**
 * dispatch-webhook
 *
 * Called internally when a lead event fires.
 * Looks up active webhook_endpoints for the org/project, signs the payload
 * with HMAC-SHA256, and POSTs to each configured URL.
 *
 * Signature header: X-IntoIQ-Signature: sha256=<hex>
 * Event header:     X-IntoIQ-Event: lead.created | form.submitted | contact.stage_changed | webhook.test
 *
 * Zapier / Make verification:
 *   compute HMAC-SHA256(secret, raw body) and compare to X-IntoIQ-Signature (strip "sha256=")
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DispatchBody {
  event: string;
  org_id: string;
  project_id?: string | null;
  payload: Record<string, unknown>;
}

async function hmacSign(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: DispatchBody = await req.json();
    const { event, org_id, project_id, payload } = body;

    if (!event || !org_id || !payload) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Load active endpoints subscribed to this event
    const { data: endpoints, error } = await supabase
      .from("webhook_endpoints")
      .select("id, url, secret, project_id")
      .eq("org_id", org_id)
      .eq("is_active", true)
      .contains("events", [event]);

    if (error) throw error;
    if (!endpoints || endpoints.length === 0) {
      return new Response(JSON.stringify({ ok: true, dispatched: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // project_id = null means "all projects"
    const targets = endpoints.filter(
      (ep) => !ep.project_id || !project_id || ep.project_id === project_id,
    );

    const rawBody = JSON.stringify({
      event,
      created_at: new Date().toISOString(),
      ...payload,
    });

    let dispatched = 0;

    await Promise.all(
      targets.map(async (ep) => {
        const sig = await hmacSign(ep.secret, rawBody);
        let statusCode = 0;
        try {
          const res = await fetch(ep.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-IntoIQ-Event": event,
              "X-IntoIQ-Signature": `sha256=${sig}`,
            },
            body: rawBody,
            signal: AbortSignal.timeout(8000),
          });
          statusCode = res.status;
          dispatched++;
        } catch (fetchErr) {
          console.error(`Webhook delivery failed for ${ep.url}:`, fetchErr);
          statusCode = 0;
        }

        // Update delivery metadata
        supabase
          .from("webhook_endpoints")
          .update({
            last_triggered_at: new Date().toISOString(),
            last_status_code: statusCode,
          })
          .eq("id", ep.id)
          .then(() => {});
      }),
    );

    return new Response(JSON.stringify({ ok: true, dispatched }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("dispatch-webhook error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
