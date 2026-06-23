import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * CustomDomainRouter
 * ------------------
 * Detects when the app is being served from a user's custom domain
 * (i.e. NOT a Lovable / preview / app host). When that happens, we look up
 * the project bound to that hostname and redirect the visitor to the
 * `serve-page` edge function which renders their published landing page.
 *
 * If the hostname IS a Lovable/app host, we render the normal SPA.
 */

const APP_HOSTS = [
  "localhost",
  "127.0.0.1",
  "intoiq.lovable.app",
  "intoiq.app",
  "www.intoiq.app",
];

function isAppHost(hostname: string): boolean {
  if (APP_HOSTS.includes(hostname)) return true;
  if (hostname.endsWith(".lovable.app")) return true;
  if (hostname.endsWith(".lovableproject.com")) return true;
  if (hostname.includes("id-preview--")) return true;
  return false;
}

export function CustomDomainRouter({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const hostname = window.location.hostname.toLowerCase();

    // If we're on a known app host, render the SPA immediately.
    if (isAppHost(hostname)) {
      setChecking(false);
      return;
    }

    // Otherwise, this looks like a user's custom domain — try to resolve it.
    (async () => {
      try {
        const { data: project } = await supabase
          .from("projects")
          .select("id, slug, domain_verified, custom_domain")
          .eq("domain_verified", true)
          .ilike("custom_domain", `%${hostname}%`)
          .maybeSingle();

        if (!project) {
          // No matching verified domain — let the SPA render (will hit 404 page).
          setChecking(false);
          return;
        }

        // Find the primary published page for this project.
        const { data: page } = await supabase
          .from("pages")
          .select("slug")
          .eq("project_id", project.id)
          .eq("is_published", true)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        const targetSlug = page?.slug || project.slug;
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const path = window.location.pathname === "/" ? "" : window.location.pathname;
        const finalSlug = path ? path.replace(/^\//, "") : targetSlug;

        // Hard-redirect to serve-page so the visitor gets fully-rendered HTML.
        window.location.replace(
          `${supabaseUrl}/functions/v1/serve-page?slug=${encodeURIComponent(finalSlug)}`
        );
      } catch {
        setChecking(false);
      }
    })();
  }, []);

  if (checking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
