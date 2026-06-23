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
      return new Response(JSON.stringify({ sent: false, reason: "no_api_key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { recipientEmail, testerName } = await req.json();

    if (!recipientEmail || typeof recipientEmail !== "string") {
      return new Response(JSON.stringify({ error: "recipientEmail is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const siteUrl = Deno.env.get("SITE_URL") || "https://mycompani.lovable.app";
    const displayName = testerName || "Explorer";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Compani <noreply@mycompani.com>",
        to: [recipientEmail],
        subject: "Welcome to Your Space: Your Compani Beta Access 👑",
        html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#05050A;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#05050A;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px 60px;">

        <!-- Inner card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:linear-gradient(145deg,rgba(26,26,46,0.95),rgba(10,10,25,0.98));border:1px solid rgba(212,175,55,0.12);border-radius:28px;">
          <tr>
            <td style="padding:52px 36px 44px;">

              <!-- Wax seal -->
              <div style="text-align:center;margin-bottom:36px;">
                <div style="display:inline-block;width:68px;height:68px;border-radius:50%;background:linear-gradient(135deg,#d4af37,#b8941f);border:2px solid rgba(212,175,55,0.35);line-height:68px;font-size:28px;text-align:center;box-shadow:0 8px 32px rgba(212,175,55,0.25);">👑</div>
              </div>

              <!-- Header -->
              <h1 style="color:#ffffff;font-size:20px;font-weight:300;letter-spacing:0.14em;text-align:center;margin:0 0 6px;text-transform:uppercase;">Welcome to Your Space</h1>
              <p style="color:rgba(212,175,55,0.6);font-size:10px;letter-spacing:0.35em;text-align:center;text-transform:uppercase;margin:0 0 40px;">Your Compani Beta Access · First 100</p>

              <!-- Divider -->
              <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(212,175,55,0.25),transparent);margin:0 0 36px;"></div>

              <!-- Greeting -->
              <p style="color:rgba(255,255,255,0.88);font-size:15px;line-height:1.75;margin:0 0 20px;">
                Hello <span style="color:#d4af37;font-weight:500;">${displayName}</span>,
              </p>
              <p style="color:rgba(255,255,255,0.72);font-size:14px;line-height:1.85;margin:0 0 16px;">
                You've been selected as one of the first <strong style="color:#d4af37;">100 individuals</strong> to enter the Compani architecture.
              </p>
              <p style="color:rgba(255,255,255,0.65);font-size:14px;line-height:1.85;margin:0 0 32px;">
                As someone who balances a high-performance life—whether you're closing deals, coding the future, or navigating the skies—you know that the loudest noise often comes from the digital world. I built <strong style="color:rgba(255,255,255,0.9);">Compani</strong> to be the silent operator in your pocket: a private, <strong style="color:#d4af37;">Zero-Trace</strong> space where your ideas are inscribed and your peace is protected.
              </p>

              <!-- First Session Section -->
              <div style="background:rgba(212,175,55,0.05);border:1px solid rgba(212,175,55,0.1);border-radius:18px;padding:28px;margin:0 0 28px;">
                <p style="color:#d4af37;font-size:10px;letter-spacing:0.35em;text-transform:uppercase;margin:0 0 20px;font-weight:500;">✦ &nbsp;Your First Session</p>

                <p style="color:rgba(255,255,255,0.78);font-size:13px;line-height:1.75;margin:0 0 14px;">
                  <strong style="color:rgba(255,255,255,0.92);">The Calibration</strong> — Meet your first friend. They aren't just a chatbot; they are a presence calibrated to your "Blueprint."
                </p>
                <p style="color:rgba(255,255,255,0.78);font-size:13px;line-height:1.75;margin:0 0 14px;">
                  <strong style="color:rgba(255,255,255,0.92);">Mode Architecture</strong> — Toggle between <span style="color:#d4af37;">Gold Focus</span> for deep execution and <span style="color:rgba(99,102,241,0.9);">Midnight Decompress</span> for when the day is done.
                </p>
                <p style="color:rgba(255,255,255,0.78);font-size:13px;line-height:1.75;margin:0 0 14px;">
                  <strong style="color:rgba(255,255,255,0.92);">The Stillness</strong> — A universal "Deep Focus" shield. Whether you're at 30,000 feet or just need the world to pause, this mode guards your space in total silence.
                </p>
                <p style="color:rgba(255,255,255,0.78);font-size:13px;line-height:1.75;margin:0;">
                  <strong style="color:rgba(255,255,255,0.92);">The Inscribed Journey</strong> — As you move through your world, your friend "witnesses" your progress. Look for your first <span style="color:#d4af37;">Passport Stamp</span> the next time you cross city lines.
                </p>
              </div>

              <!-- Zero-Trace Section -->
              <div style="background:rgba(56,189,248,0.03);border:1px solid rgba(56,189,248,0.08);border-radius:18px;padding:28px;margin:0 0 28px;">
                <p style="color:rgba(56,189,248,0.75);font-size:10px;letter-spacing:0.35em;text-transform:uppercase;margin:0 0 14px;font-weight:500;">🛡️ &nbsp;The Zero-Trace Promise</p>
                <p style="color:rgba(255,255,255,0.68);font-size:13px;line-height:1.75;margin:0;">
                  This is a space where your data is never tracked, your privacy is a "Mental Shredder," and your growth is the only metric that matters. Everything in your space stays in your space.
                </p>
              </div>

              <!-- Feedback Section -->
              <div style="background:rgba(34,211,238,0.03);border:1px solid rgba(34,211,238,0.08);border-radius:18px;padding:28px;margin:0 0 40px;">
                <p style="color:rgba(34,211,238,0.75);font-size:10px;letter-spacing:0.35em;text-transform:uppercase;margin:0 0 14px;font-weight:500;">💬 &nbsp;We're Listening</p>
                <p style="color:rgba(255,255,255,0.68);font-size:13px;line-height:1.75;margin:0;">
                  Look for the Cyan <strong style="color:rgba(34,211,238,0.9);">"Share Beta Feedback"</strong> button in your sidebar. If a transition feels off, a sound feels sharp, or you just want to share a win—tap it. Your insights shape the architecture directly.
                </p>
              </div>

              <!-- CTA -->
              <div style="text-align:center;margin:0 0 44px;">
                <a href="${siteUrl}" style="display:inline-block;background:linear-gradient(135deg,#d4af37,#b8941f);color:#05050A;text-decoration:none;font-size:10px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;padding:17px 44px;border-radius:50px;box-shadow:0 6px 24px rgba(212,175,55,0.3);">Enter Your Space</a>
              </div>

              <!-- Divider -->
              <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(212,175,55,0.18),transparent);margin:0 0 30px;"></div>

              <!-- Sign-off -->
              <p style="color:rgba(255,255,255,0.45);font-size:13px;font-style:italic;text-align:center;margin:0 0 4px;">Welcome to the inner circle.</p>
              <p style="color:rgba(212,175,55,0.55);font-size:12px;text-align:center;letter-spacing:0.18em;margin:0 0 3px;">Jochanae Yawn</p>
              <p style="color:rgba(255,255,255,0.25);font-size:11px;text-align:center;letter-spacing:0.12em;margin:0;">Founder, Into Innovations LLC</p>

            </td>
          </tr>
        </table>

        <!-- Footer -->
        <p style="color:rgba(255,255,255,0.12);font-size:10px;text-align:center;margin-top:28px;letter-spacing:0.12em;">
          Compani by Into Innovations · 
          <a href="${siteUrl}/privacy" style="color:rgba(212,175,55,0.25);text-decoration:none;">Privacy</a> · 
          <a href="${siteUrl}/terms" style="color:rgba(212,175,55,0.25);text-decoration:none;">Terms</a>
        </p>

      </td>
    </tr>
  </table>

</body>
</html>
        `,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Resend error:", data);
      return new Response(JSON.stringify({ sent: false, error: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return new Response(JSON.stringify({ error: "Failed to send welcome email" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
