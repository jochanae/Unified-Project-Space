import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SignJWT } from "https://deno.land/x/jose@v5.2.0/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { credential, challenge, userId, email } = await req.json();

    if (!credential || !challenge || !userId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseService = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the credential exists for this user
    const { data: passkey, error: passkeyError } = await supabaseService
      .from("passkeys")
      .select("*")
      .eq("credential_id", credential.id)
      .eq("user_id", userId)
      .single();

    if (passkeyError || !passkey) {
      return new Response(JSON.stringify({ error: "Invalid passkey" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update last used timestamp and counter
    await supabaseService
      .from("passkeys")
      .update({ 
        last_used_at: new Date().toISOString(),
        counter: passkey.counter + 1
      })
      .eq("id", passkey.id);

    // Generate a magic link for the user to sign in
    const { data: linkData, error: linkError } = await supabaseService.auth.admin.generateLink({
      type: "magiclink",
      email: email,
      options: {
        redirectTo: `${req.headers.get("origin") || "https://lovable.app"}/dashboard`,
      },
    });

    if (linkError) {
      console.error("Link generation error:", linkError);
      return new Response(JSON.stringify({ error: "Failed to generate session" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract the token from the magic link
    const actionLink = linkData.properties.action_link;
    const url = new URL(actionLink);
    const token = url.searchParams.get("token");
    const type = url.searchParams.get("type");

    return new Response(JSON.stringify({ 
      success: true,
      token,
      type,
      redirectUrl: actionLink
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
