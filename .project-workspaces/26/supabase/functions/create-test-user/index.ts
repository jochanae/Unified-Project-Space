import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Simple protection - only allow with correct secret
    const authHeader = req.headers.get("x-setup-key");
    if (authHeader !== "setup-test-user-2024") {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUsers?.users?.some(u => u.email === "test@example.com");

    if (userExists) {
      return new Response(
        JSON.stringify({ message: "Test user already exists", email: "test@example.com" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the test user
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: "test@example.com",
      password: "TestPassword123!",
      email_confirm: true,
      user_metadata: {
        first_name: "Test",
        last_name: "User"
      }
    });

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ 
        message: "Test user created successfully", 
        email: "test@example.com",
        userId: data.user?.id 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error creating test user:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
