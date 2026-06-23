import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * quinn-context-signals
 * ---------------------
 * Returns AT MOST one prioritized, route-aware nudge for MarQ to surface.
 * The frontend handles dismissal/cooldown — this function is purely analytical.
 *
 * Input:  { route: string }   (e.g. "/analytics", "/projects")
 * Output: { nudge: { id, route, severity, message, cta_label, cta_route } | null }
 */

type Nudge = {
  id: string;
  route: string;
  severity: "info" | "warn" | "win";
  message: string;
  cta_label: string;
  cta_route: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ nudge: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ nudge: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .maybeSingle();
    const orgId = profile?.org_id;
    if (!orgId) {
      return new Response(JSON.stringify({ nudge: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const route: string = body?.route || "/dashboard";

    // Pull a compact snapshot in parallel
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();

    const [projectsRes, leadsRes, recentLeadsRes, sequencesRes, followupsRes, pagesRes, viewsRes] =
      await Promise.all([
        supabase.from("projects").select("id, name", { count: "exact" }).eq("org_id", orgId).limit(5),
        supabase
          .from("lead_notifications")
          .select("id, project_id, created_at", { count: "exact" })
          .eq("org_id", orgId)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("lead_notifications")
          .select("id, project_id")
          .eq("org_id", orgId)
          .gte("created_at", sevenDaysAgo),
        supabase.from("email_sequences").select("id, project_id").eq("org_id", orgId),
        supabase
          .from("lead_followups")
          .select("id")
          .eq("org_id", orgId)
          .gte("created_at", sevenDaysAgo),
        supabase
          .from("pages")
          .select("id, project_id, is_published", { count: "exact" })
          .eq("org_id", orgId),
        supabase
          .from("page_views")
          .select("id, page_id", { count: "exact" })
          .eq("org_id", orgId)
          .gte("created_at", sevenDaysAgo),
      ]);

    const projectCount = projectsRes.count ?? 0;
    const leadCount = leadsRes.count ?? 0;
    const recentLeads = recentLeadsRes.data ?? [];
    const sequences = sequencesRes.data ?? [];
    const followupsLast7 = followupsRes.data?.length ?? 0;
    const pages = pagesRes.data ?? [];
    const publishedPages = pages.filter((p) => p.is_published);
    const viewsLast7 = viewsRes.count ?? 0;

    // Route-prioritized nudge generation. Return the FIRST that matches.
    const candidates: Nudge[] = [];

    // ---- Universal high-priority nudges ----
    // Leads with no follow-up sequence configured for that project
    const projectsWithRecentLeads = new Set(recentLeads.map((l) => l.project_id).filter(Boolean));
    const projectsWithSequences = new Set(sequences.map((s) => s.project_id).filter(Boolean));
    const orphanProjects = [...projectsWithRecentLeads].filter(
      (pid) => !projectsWithSequences.has(pid as string)
    );
    if (orphanProjects.length > 0 && recentLeads.length > 0) {
      candidates.push({
        id: "leads-no-sequence",
        route,
        severity: "warn",
        message: `${recentLeads.length} recent lead${recentLeads.length === 1 ? "" : "s"} with no follow-up sequence. Want me to draft one?`,
        cta_label: "Draft sequence",
        cta_route: "/strategy",
      });
    }

    // ---- Route-specific nudges ----
    if (route.startsWith("/analytics")) {
      if (publishedPages.length > 0 && viewsLast7 < 10) {
        candidates.push({
          id: "low-traffic",
          route,
          severity: "info",
          message: `Only ${viewsLast7} view${viewsLast7 === 1 ? "" : "s"} in 7 days. Let's amplify with a Social drop.`,
          cta_label: "Open Social Lab",
          cta_route: "/studio?tab=social",
        });
      }
      if (leadCount === 0 && publishedPages.length > 0) {
        candidates.push({
          id: "no-leads-yet",
          route,
          severity: "info",
          message: "Page is live but no leads yet. I can audit your hook in 30 seconds.",
          cta_label: "Run audit",
          cta_route: "/signal-lab",
        });
      }
    }

    if (route.startsWith("/projects")) {
      const drafts = pages.filter((p) => !p.is_published).length;
      if (drafts > 0 && publishedPages.length === 0) {
        candidates.push({
          id: "drafts-unpublished",
          route,
          severity: "warn",
          message: `${drafts} draft page${drafts === 1 ? "" : "s"} sitting unpublished. Ready to launch?`,
          cta_label: "Publish",
          cta_route: "/workspace",
        });
      }
    }

    if (route.startsWith("/dashboard")) {
      if (projectCount === 0) {
        candidates.push({
          id: "no-projects",
          route,
          severity: "info",
          message: "Let's turn your first idea into a live funnel — takes about 30 minutes.",
          cta_label: "Start project",
          cta_route: "/workspace",
        });
      } else if (leadCount === 0 && publishedPages.length === 0) {
        candidates.push({
          id: "no-deploy",
          route,
          severity: "info",
          message: "Your project is shaped — next move is publishing the funnel.",
          cta_label: "Open builder",
          cta_route: "/workspace",
        });
      }
    }

    if (route.startsWith("/signal-lab") || route.startsWith("/strategy")) {
      if (recentLeads.length > 0 && followupsLast7 === 0) {
        candidates.push({
          id: "leads-no-touch",
          route,
          severity: "warn",
          message: `${recentLeads.length} lead${recentLeads.length === 1 ? "" : "s"} this week with zero follow-up. They cool off fast.`,
          cta_label: "Send follow-up",
          cta_route: "/projects",
        });
      }
    }

    // Win nudges
    if (leadCount >= 10 && route.startsWith("/dashboard")) {
      candidates.push({
        id: "milestone-10-leads",
        route,
        severity: "win",
        message: `You crossed ${leadCount} leads. Time to refine the highest-converting hook.`,
        cta_label: "Open analytics",
        cta_route: "/analytics",
      });
    }

    const nudge = candidates[0] ?? null;

    return new Response(JSON.stringify({ nudge }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("quinn-context-signals error:", error);
    return new Response(
      JSON.stringify({ nudge: null, error: error instanceof Error ? error.message : "Unknown" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
