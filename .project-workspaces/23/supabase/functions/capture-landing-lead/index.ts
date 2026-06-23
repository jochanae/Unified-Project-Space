// Captures a lead from the landing page Signal Audit gate.
// Saves to landing_signal_leads (Source of Truth), syncs to Loops if API key present,
// and fires the cinematic Intelligence Report email via send-transactional-email.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { resolveGeo } from "../_shared/resolve-geo.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CaptureBody {
  email: string;
  snippet: string;
  signals: Record<string, string>;
}

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip + "intoiq-audit-salt");
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as Partial<CaptureBody>;
    const email = (body.email || "").trim().toLowerCase();
    const snippet = (body.snippet || "").trim().slice(0, 600);
    const signals = body.signals && typeof body.signals === "object" ? body.signals : {};

    if (!email || !EMAIL_RE.test(email) || email.length > 255) {
      return new Response(
        JSON.stringify({ error: "Enter a valid email." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    });

    const ip = getClientIp(req);
    const ipHash = await hashIp(ip);
    const userAgent = req.headers.get("user-agent") || null;
    const referrer = req.headers.get("referer") || req.headers.get("referrer") || null;
    const geo = resolveGeo(req);

    // 1) Save to Source of Truth
    const { data: leadRow, error: leadErr } = await supabase
      .from("landing_signal_leads")
      .insert({
        email,
        snippet,
        signals,
        ip_hash: ipHash,
        user_agent: userAgent,
        referrer,
        country: geo.country,
        city: geo.city,
        region: geo.region,
        postal_code: geo.postal_code,
      })
      .select("id")
      .single();

    if (leadErr || !leadRow) {
      console.error("Lead insert error:", leadErr);
      return new Response(
        JSON.stringify({ error: "Could not save your request. Try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const leadId = leadRow.id as string;

    // 2) Loops sync (inert until LOOPS_API_KEY is added — Loops-ready stub)
    const LOOPS_API_KEY = Deno.env.get("LOOPS_API_KEY");
    if (LOOPS_API_KEY) {
      try {
        const loopsResp = await fetch("https://app.loops.so/api/v1/contacts/create", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOOPS_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            source: "landing_signal_audit",
            userGroup: "Landing Leads",
            snippet,
            signal: signals.signal || "",
          }),
        });
        if (loopsResp.ok || loopsResp.status === 409 /* already exists */) {
          await supabase
            .from("landing_signal_leads")
            .update({ loops_synced: true, loops_synced_at: new Date().toISOString() })
            .eq("id", leadId);
        } else {
          const t = await loopsResp.text().catch(() => "");
          console.error("Loops sync failed:", loopsResp.status, t);
        }
      } catch (e) {
        console.error("Loops sync exception:", e);
      }
    }

    // 3) Fire the cinematic Intelligence Report email
    let emailQueued = false;
    try {
      const { error: emailErr } = await supabase.functions.invoke(
        "send-transactional-email",
        {
          body: {
            templateName: "signal-intelligence-report",
            recipientEmail: email,
            idempotencyKey: `signal-report-${leadId}`,
            templateData: {
              snippet,
              signal: signals.signal || "",
              positioning: signals.positioning || "",
              voidLine: signals.void || "",
              hook: signals.hook || "",
              funnel: signals.funnel || "",
            },
          },
        },
      );
      if (emailErr) {
        console.error("Email enqueue error:", emailErr);
      } else {
        emailQueued = true;
        await supabase
          .from("landing_signal_leads")
          .update({ email_sent: true, email_sent_at: new Date().toISOString() })
          .eq("id", leadId);
      }
    } catch (e) {
      console.error("Email invoke exception:", e);
    }

    return new Response(
      JSON.stringify({ ok: true, leadId, emailQueued }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("capture-landing-lead error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
