import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizeZipList(raw: unknown): string[] {
  const source = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(/[\n,]/) : [];
  return [...new Set(source
    .map((zip) => String(zip).trim().toUpperCase())
    .filter((zip) => /^[A-Z0-9][A-Z0-9 -]{2,11}$/.test(zip)))]
    .slice(0, 50);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { projectId, landingPage, strategy, thankYouPage, theme, activeHook } = await req.json();
    if (!projectId || !landingPage) throw new Error("projectId and landingPage are required");
    const pageTheme = theme || 'cinematic';
    // Identity Lock hook attached to this deploy — used for Signal Origin attribution.
    const resolvedActiveHook: string | null =
      (typeof activeHook === 'string' && activeHook.trim()) ? activeHook.trim() :
      (typeof landingPage.headline === 'string' ? landingPage.headline.trim() : null);

    // Get user's org
    const { data: userData } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();
    if (!userData) throw new Error("User not found");

    // Get the first funnel step for this project (landing type)
    const { data: steps } = await supabase
      .from("funnel_steps")
      .select("id")
      .eq("project_id", projectId)
      .eq("org_id", userData.org_id)
      .order("order_index", { ascending: true })
      .limit(1);

    let funnelStepId: string;

    if (steps && steps.length > 0) {
      funnelStepId = steps[0].id;
    } else {
      // Create a landing funnel step
      const { data: newStep, error: stepError } = await supabase
        .from("funnel_steps")
        .insert({
          project_id: projectId,
          org_id: userData.org_id,
          title: "Landing Page",
          step_type: "landing",
          order_index: 0,
        })
        .select("id")
        .single();
      if (stepError || !newStep) throw new Error("Failed to create funnel step");
      funnelStepId = newStep.id;
    }

    // Build content blocks from landing page data
    const serviceAreaZips = normalizeZipList(landingPage.service_area_zips);
    const serviceAreaRequired = Boolean(landingPage.service_area_required || serviceAreaZips.length > 0);

    const contentBlocks = [
      {
        type: "hero",
        content: {
          headline: landingPage.headline,
          subheadline: landingPage.subheadline,
          cta_text: landingPage.cta_text,
          buttonText: landingPage.cta_text,
          imageUrl: landingPage.hero_image || null,
        },
      },
      ...landingPage.features.map((f: any) => ({
        type: "feature",
        content: { title: f.title, description: f.description },
      })),
      {
        type: "social_proof",
        content: { text: landingPage.social_proof },
      },
      {
        type: "optin",
        content: {
          headline: landingPage.optin_heading || "Check your service area",
          subheadline: landingPage.service_area_label || "Enter your email and ZIP code so we can confirm you are in the right coverage area.",
          buttonText: landingPage.cta_text,
          require_zip: serviceAreaRequired,
          service_area_zips: serviceAreaZips,
          service_area_label: landingPage.service_area_label || null,
        },
      },
    ];

    // Get project slug for the URL
    const { data: project } = await supabase
      .from("projects")
      .select("slug")
      .eq("id", projectId)
      .single();

    const pageSlug = `${project?.slug || "landing"}-page`;

    // Upsert page
    const { data: existingPage } = await supabase
      .from("pages")
      .select("id")
      .eq("funnel_step_id", funnelStepId)
      .eq("org_id", userData.org_id)
      .limit(1);

    if (existingPage && existingPage.length > 0) {
      await supabase
        .from("pages")
        .update({
          content_blocks: contentBlocks,
          published_content_blocks: contentBlocks,
          is_published: true,
          theme: pageTheme,
          active_hook: resolvedActiveHook,
        })
        .eq("id", existingPage[0].id);
    } else {
      await supabase
        .from("pages")
        .insert({
          funnel_step_id: funnelStepId,
          project_id: projectId,
          org_id: userData.org_id,
          slug: pageSlug,
          content_blocks: contentBlocks,
          published_content_blocks: contentBlocks,
          is_published: true,
          theme: pageTheme,
          active_hook: resolvedActiveHook,
        });
    }

    // Also update the existing page to ensure project_id is set
    if (existingPage && existingPage.length > 0) {
      await supabase
        .from("pages")
        .update({ project_id: projectId })
        .eq("id", existingPage[0].id)
        .is("project_id", null);
    }

    // Deploy thank you page if provided
    let thankYouUrl: string | null = null;
    if (thankYouPage) {
      const thankYouSlug = `${project?.slug || "landing"}-thank-you`;

      // Get or create a thankyou funnel step
      const { data: tySteps } = await supabase
        .from("funnel_steps")
        .select("id")
        .eq("project_id", projectId)
        .eq("org_id", userData.org_id)
        .eq("step_type", "thankyou")
        .limit(1);

      let tyStepId: string;
      if (tySteps && tySteps.length > 0) {
        tyStepId = tySteps[0].id;
      } else {
        const { data: newTyStep, error: tyStepErr } = await supabase
          .from("funnel_steps")
          .insert({
            project_id: projectId,
            org_id: userData.org_id,
            title: "Thank You Page",
            step_type: "thankyou",
            order_index: 99,
          })
          .select("id")
          .single();
        if (tyStepErr || !newTyStep) throw new Error("Failed to create thank you funnel step");
        tyStepId = newTyStep.id;
      }

      const tyBlocks: any[] = [
        {
          type: "hero",
          content: {
            headline: thankYouPage.headline,
            subheadline: thankYouPage.subheadline,
            cta_text: thankYouPage.cta_text,
            cta_url: thankYouPage.cta_url || null,
          },
        },
      ];
      if (thankYouPage.bonus_message) {
        tyBlocks.push({ type: "bonus", content: { message: thankYouPage.bonus_message } });
      }

      const { data: existingTy } = await supabase
        .from("pages")
        .select("id")
        .eq("funnel_step_id", tyStepId)
        .eq("org_id", userData.org_id)
        .limit(1);

      if (existingTy && existingTy.length > 0) {
        await supabase
          .from("pages")
          .update({
            content_blocks: tyBlocks,
            published_content_blocks: tyBlocks,
            is_published: true,
            project_id: projectId,
          })
          .eq("id", existingTy[0].id);
      } else {
        await supabase
          .from("pages")
          .insert({
            funnel_step_id: tyStepId,
            project_id: projectId,
            org_id: userData.org_id,
            slug: thankYouSlug,
            content_blocks: tyBlocks,
            published_content_blocks: tyBlocks,
            is_published: true,
          });
      }
      thankYouUrl = `/p/${thankYouSlug}`;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      url: `/p/${pageSlug}`,
      thankYouUrl,
      message: "Landing page deployed successfully",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("deploy error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
