import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { resolveGeo } from "../_shared/resolve-geo.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const POSTAL_REGEX = /^[A-Z0-9][A-Z0-9 -]{2,11}$/;

function normalizePostalCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim().toUpperCase().replace(/\s+/g, " ");
  if (!value) return null;
  return POSTAL_REGEX.test(value) ? value : "INVALID";
}

function normalizeZipList(raw: unknown): string[] {
  const source = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(/[\n,]/) : [];
  return [...new Set(source
    .map((zip) => String(zip).trim().toUpperCase().replace(/\s+/g, " "))
    .filter((zip) => POSTAL_REGEX.test(zip)))]
    .slice(0, 50);
}

function getServiceAreaConfig(page: Record<string, unknown>) {
  const blocks = Array.isArray(page.published_content_blocks)
    ? page.published_content_blocks
    : Array.isArray(page.content_blocks)
      ? page.content_blocks
      : [];
  const optin = blocks.find((b: any) => b?.type === "optin") as any;
  const zips = normalizeZipList(optin?.content?.service_area_zips);
  return {
    zips,
    requiresZip: optin?.content?.require_zip === true || zips.length > 0,
    label: typeof optin?.content?.service_area_label === "string" ? optin.content.service_area_label : null,
  };
}

/**
 * Sanitize the client-supplied attribution object.
 * We only persist a known shape so a malicious form can't bloat metadata.
 */
function sanitizeAttribution(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;

  const primary_block_id =
    typeof a.primary_block_id === "string" && a.primary_block_id.length <= 200
      ? a.primary_block_id
      : null;

  const dwell_time_ms =
    typeof a.dwell_time_ms === "number" && isFinite(a.dwell_time_ms)
      ? Math.max(0, Math.min(60 * 60 * 1000, Math.round(a.dwell_time_ms)))
      : 0;

  const scroll_depth =
    typeof a.scroll_depth === "number" && isFinite(a.scroll_depth)
      ? Math.max(0, Math.min(1, Number(a.scroll_depth.toFixed(3))))
      : 0;

  const session_duration_ms =
    typeof a.session_duration_ms === "number" && isFinite(a.session_duration_ms)
      ? Math.max(0, Math.min(6 * 60 * 60 * 1000, Math.round(a.session_duration_ms)))
      : 0;

  const exit_intent_triggered = a.exit_intent_triggered === true;

  const timestamp_at_conversion =
    typeof a.timestamp_at_conversion === "string" && a.timestamp_at_conversion.length <= 40
      ? a.timestamp_at_conversion
      : new Date().toISOString();

  // block_dwells: cap to 30 entries, clamp values
  let block_dwells: Record<string, number> = {};
  if (a.block_dwells && typeof a.block_dwells === "object") {
    const entries = Object.entries(a.block_dwells as Record<string, unknown>).slice(0, 30);
    for (const [k, v] of entries) {
      if (typeof k !== "string" || k.length > 200) continue;
      if (typeof v !== "number" || !isFinite(v)) continue;
      block_dwells[k] = Math.max(0, Math.min(60 * 60 * 1000, Math.round(v)));
    }
  }

  return {
    primary_block_id,
    dwell_time_ms,
    scroll_depth,
    session_duration_ms,
    exit_intent_triggered,
    timestamp_at_conversion,
    block_dwells,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, page_id, postal_code, variant, field, attribution, extra_fields, ref_code, phone, sms_consent } = await req.json();
    const geo = resolveGeo(req);

    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const pageId = typeof page_id === "string" ? page_id.trim() : "";
    const submittedPostalCode = normalizePostalCode(postal_code);

    // Phone normalization: keep digits + optional leading + for E.164-ish storage
    let normalizedPhone: string | null = null;
    if (typeof phone === "string") {
      const trimmed = phone.trim();
      const digits = trimmed.replace(/\D+/g, "");
      if (digits.length >= 10 && digits.length <= 15) {
        normalizedPhone = trimmed.startsWith("+") ? `+${digits}` : digits.length === 10 ? `+1${digits}` : `+${digits}`;
      }
    }
    const smsConsent = sms_consent === true;

    if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
      return new Response(JSON.stringify({ error: "Invalid email address" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!pageId) {
      return new Response(JSON.stringify({ error: "Missing page_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (submittedPostalCode === "INVALID") {
      return new Response(JSON.stringify({ error: "Invalid ZIP code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      throw new Error("Backend credentials are not configured");
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: page, error: pageError } = await supabase
      .from("pages")
      .select("id, org_id, project_id, is_published, active_hook, content_blocks, published_content_blocks, next_page_id, next_page:pages!pages_next_page_id_fkey(slug)")
      .eq("id", pageId)
      .eq("is_published", true)
      .maybeSingle();

    if (pageError) throw pageError;
    if (!page) {
      return new Response(JSON.stringify({ error: "Published page not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceArea = getServiceAreaConfig(page as Record<string, unknown>);
    if (serviceArea.requiresZip && !submittedPostalCode) {
      return new Response(JSON.stringify({ error: "ZIP code is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (serviceArea.zips.length > 0 && (!submittedPostalCode || !serviceArea.zips.includes(submittedPostalCode))) {
      return new Response(JSON.stringify({ error: serviceArea.label || "Outside service area" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resolvedPostalCode = submittedPostalCode || geo.postal_code;

    const { data: existingContact, error: existingContactError } = await supabase
      .from("contacts")
      .select("id, affiliate_id")
      .eq("org_id", page.org_id)
      .eq("email", normalizedEmail)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existingContactError) throw existingContactError;

    let contactId = existingContact?.id ?? null;
    const isServiceAreaMatch = serviceArea.zips.length > 0 && !!submittedPostalCode && serviceArea.zips.includes(submittedPostalCode);

    // Resolve affiliate from ref_code (active affiliates for this org only)
    let affiliateId: string | null = existingContact?.affiliate_id ?? null;
    if (!affiliateId && typeof ref_code === "string" && ref_code.trim()) {
      const { data: aff } = await supabase
        .from("funnel_affiliates")
        .select("id, commission_type, commission_value")
        .eq("org_id", page.org_id)
        .eq("ref_code", ref_code.trim().toLowerCase())
        .eq("status", "active")
        .maybeSingle();
      if (aff) affiliateId = aff.id;
    }

    if (!contactId) {
      const { data: insertedContact, error: insertContactError } = await supabase
        .from("contacts")
        .insert({
          email: normalizedEmail,
          org_id: page.org_id,
          source_project_id: page.project_id,
          pipeline_stage: isServiceAreaMatch ? "qualified" : "new",
          country: geo.country,
          city: geo.city,
          region: geo.region,
          postal_code: resolvedPostalCode,
          affiliate_id: affiliateId,
          ...(normalizedPhone ? { phone: normalizedPhone } : {}),
          ...(normalizedPhone && smsConsent ? { sms_consent_at: new Date().toISOString() } : {}),
        })
        .select("id")
        .single();

      if (insertContactError) throw insertContactError;
      contactId = insertedContact.id;

      // Record lead conversion for affiliate (fire-and-forget)
      if (affiliateId) {
        supabase.from("affiliate_conversions").insert({
          org_id: page.org_id,
          affiliate_id: affiliateId,
          contact_id: contactId,
          event_type: "lead",
          amount_cents: 0,
          commission_cents: 0,
        }).then(() => {});
      }
    } else if (resolvedPostalCode || isServiceAreaMatch || normalizedPhone) {
      await supabase
        .from("contacts")
        .update({
          ...(resolvedPostalCode ? { postal_code: resolvedPostalCode } : {}),
          ...(isServiceAreaMatch ? { pipeline_stage: "qualified" } : {}),
          ...(normalizedPhone ? { phone: normalizedPhone } : {}),
          ...(normalizedPhone && smsConsent ? { sms_consent_at: new Date().toISOString() } : {}),
        })
        .eq("id", contactId);
    }

    const submissionData: Record<string, unknown> = {
      email: normalizedEmail,
      ...(resolvedPostalCode ? { postal_code: resolvedPostalCode } : {}),
      ...(normalizedPhone ? { phone: normalizedPhone, sms_consent: smsConsent } : {}),
      service_area_match: isServiceAreaMatch,
      ...(serviceArea.zips.length ? { service_area_zips: serviceArea.zips } : {}),
      submitted_at: new Date().toISOString(),
    };

    if (typeof variant === "string" && (variant === "a" || variant === "b")) {
      submissionData.variant = variant;
    }

    if (typeof field === "string" && field.trim()) {
      submissionData.field = field.trim();
    }

    if (page.active_hook) {
      submissionData.active_hook = page.active_hook;
    }

    const cleanAttribution = sanitizeAttribution(attribution);
    if (cleanAttribution) {
      submissionData.attribution = cleanAttribution;
    }

    // Persist extra custom form field answers
    if (extra_fields && typeof extra_fields === 'object') {
      submissionData.extra_fields = extra_fields;
    }

    const { error: submissionError } = await supabase.from("form_submissions").insert({
      contact_id: contactId,
      page_id: page.id,
      org_id: page.org_id,
      data: submissionData,
    });

    if (submissionError) throw submissionError;

    // Create in-app lead notification (fires realtime to dashboard feed).
    // metadata.active_hook is the Signal Origin tag — exact hook this lead saw.
    // metadata.attribution is the Conversion Snapshot — primary block + dwell + scroll.
    const notifMetadata: Record<string, unknown> = {
      ...submissionData,
      active_hook: page.active_hook ?? null,
    };
    if (cleanAttribution) {
      notifMetadata.attribution = cleanAttribution;
    }

    const { data: notif } = await supabase
      .from("lead_notifications")
      .insert({
        org_id: page.org_id,
        project_id: page.project_id,
        page_id: page.id,
        contact_id: contactId,
        email: normalizedEmail,
        source: "public_form",
        metadata: notifMetadata,
      })
      .select("id")
      .single();

    // Fire-and-forget: email + web push alerts to org owners
    if (notif?.id) {
      const fnUrl = `${supabaseUrl}/functions/v1/notify-first-lead`;
      fetch(fnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ lead_notification_id: notif.id }),
      }).catch((e) => console.error("notify-first-lead dispatch failed:", e));
    }

    const nextSlug = (page as any).next_page?.slug ?? null;

    // Dispatch form.submitted webhook (fire-and-forget)
    fetch(`${supabaseUrl}/functions/v1/dispatch-webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        event: "form.submitted",
        org_id: page.org_id,
        project_id: page.project_id ?? null,
        payload: {
          contact_id: contactId,
          email: normalizedEmail,
          page_id: page.id,
          project_id: page.project_id ?? null,
          variant: typeof variant === "string" ? variant : null,
          field: typeof field === "string" ? field.trim() : null,
        },
      }),
    }).catch((e) => console.error("dispatch-webhook form.submitted failed:", e));

    return new Response(
      JSON.stringify({ success: true, contactId, org_id: page.org_id, project_id: page.project_id, next_slug: nextSlug }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("submit-public-lead error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
