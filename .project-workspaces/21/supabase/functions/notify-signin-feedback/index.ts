import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not set — skipping email");
      return new Response(JSON.stringify({ sent: false, reason: "no_api_key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { name, email, message } = await req.json();

    const adminEmail = Deno.env.get("ADMIN_EMAIL") || "admin@mycompani.com";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Compani <noreply@mycompani.com>",
        to: [adminEmail],
        subject: `[Sign-In Feedback] from ${name || "Anonymous"}`,
        html: `
          <h2>Sign-In Feedback</h2>
          <p><strong>Name:</strong> ${name || "Not provided"}</p>
          <p><strong>Email:</strong> ${email || "Not provided"}</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
          <hr />
          <p style="color:#888;font-size:12px">Sent from Compani sign-in feedback form</p>
        `,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Resend error:", data);
    }

    return new Response(JSON.stringify({ sent: res.ok }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Failed to send feedback" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
