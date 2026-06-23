import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Lovable hosting targets
const CNAME_TARGET = "intoiq.lovable.app";
const A_TARGET = "185.158.133.1";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: authData } = await supabaseClient.auth.getUser(token);
    if (!authData.user) throw new Error("Not authenticated");

    const { domain, projectId } = await req.json();
    if (!domain || !projectId) throw new Error("domain and projectId are required");

    const cleanDomain = domain.trim().toLowerCase();

    let verified = false;
    let message = "DNS not resolving yet";

    try {
      // 1) Check CNAME — must explicitly point to our Lovable target
      const cnameUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(cleanDomain)}&type=CNAME`;
      const cnameResp = await fetch(cnameUrl, { headers: { "Accept": "application/dns-json" } });
      const cnameData = await cnameResp.json();

      const hasValidCname = cnameData.Answer?.some((a: any) => {
        if (a.type !== 5 || !a.data) return false;
        const target = a.data.replace(/\.$/, "").toLowerCase();
        return target === CNAME_TARGET || target.endsWith(".lovable.app");
      });

      if (hasValidCname) {
        verified = true;
        message = `Domain verified — CNAME points to ${CNAME_TARGET}. SSL auto-provisioning.`;
      } else {
        // 2) Check A record — must explicitly point to our Lovable IP
        const aUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(cleanDomain)}&type=A`;
        const aResp = await fetch(aUrl, { headers: { "Accept": "application/dns-json" } });
        const aData = await aResp.json();

        const hasValidA = aData.Answer?.some((a: any) =>
          a.type === 1 && a.data === A_TARGET
        );

        if (hasValidA) {
          verified = true;
          message = `Domain verified — A record points to ${A_TARGET}. SSL auto-provisioning.`;
        } else if (cnameData.Answer?.length || aData.Answer?.length) {
          message = `DNS resolves, but not to Lovable. Add CNAME → ${CNAME_TARGET} or A → ${A_TARGET}.`;
        } else {
          message = `No DNS records found. Add CNAME → ${CNAME_TARGET} (subdomain) or A → ${A_TARGET} (root).`;
        }
      }
    } catch {
      message = "Could not query DNS. Please try again later.";
    }

    if (verified) {
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      await adminClient
        .from("projects")
        .update({ domain_verified: true })
        .eq("id", projectId);
    }

    return new Response(JSON.stringify({ verified, message, domain: cleanDomain }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
