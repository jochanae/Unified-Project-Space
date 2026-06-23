import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseService = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find user by email
    const { data: userData, error: userError } = await supabaseService.auth.admin.listUsers();
    if (userError) {
      return new Response(JSON.stringify({ error: "Failed to lookup user" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = userData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) {
      return new Response(JSON.stringify({ error: "No account found with this email" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's passkeys
    const { data: passkeys, error: passkeysError } = await supabaseService
      .from("passkeys")
      .select("credential_id, transports")
      .eq("user_id", user.id);

    if (passkeysError || !passkeys || passkeys.length === 0) {
      return new Response(JSON.stringify({ error: "No passkeys registered for this account" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allowCredentials = passkeys.map((pk) => ({
      id: pk.credential_id,
      type: "public-key" as const,
      transports: pk.transports || ["internal"],
    }));

    // Generate challenge
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const challengeBase64 = btoa(String.fromCharCode(...challenge));

    // Get the origin from request headers
    const origin = req.headers.get("origin") || "https://lovable.app";
    const rpId = new URL(origin).hostname;

    const options = {
      challenge: challengeBase64,
      timeout: 60000,
      rpId,
      allowCredentials,
      userVerification: "preferred",
    };

    return new Response(JSON.stringify({ 
      options, 
      challenge: challengeBase64,
      userId: user.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
