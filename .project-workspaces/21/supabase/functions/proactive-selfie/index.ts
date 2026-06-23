import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Proactive Selfie Delivery — companions periodically send selfies
 * via push notification with context-aware captions.
 * 
 * This function:
 * 1. Picks eligible users (haven't received a selfie push recently)
 * 2. Generates a selfie-style image using the companion's appearance
 * 3. Sends it as a push notification with a personal caption
 * 4. Optionally sends via SMS if user has SMS enabled
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse optional body for force flag (bypasses random gate & hour check for testing)
    let forceMode = false;
    try {
      const body = await req.clone().json();
      forceMode = body?.force === true;
    } catch { /* empty body is fine */ }
    console.log(`[proactive-selfie] Starting. forceMode=${forceMode}`);
    // Validate caller is service-role (scheduled function)
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token || token !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      // Also accept valid user JWTs
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const authSb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claimsData, error: claimsError } = await authSb.auth.getClaims(authHeader.replace("Bearer ", ""));
      if (claimsError || !claimsData?.claims?.sub) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    // Get users with push subscriptions or SMS enabled
    const { data: pushUsers } = await supabase
      .from("push_subscriptions")
      .select("user_id");
    const { data: smsUsers } = await supabase
      .from("sms_profiles_decrypted")
      .select("user_id, phone_number_decrypted, companion_name, user_name")
      .eq("sms_enabled", true);

    const eligibleUserIds = new Set<string>();
    (pushUsers || []).forEach((s: any) => eligibleUserIds.add(s.user_id));
    (smsUsers || []).forEach((s: any) => { if (s.user_id) eligibleUserIds.add(s.user_id); });

    if (eligibleUserIds.size === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No eligible users" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const hour = now.getHours();

    // Only send during daytime (9am - 8pm) — skip check in force mode
    if (!forceMode && (hour < 9 || hour > 20)) {
      return new Response(JSON.stringify({ sent: 0, message: "Outside selfie hours" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;

    for (const userId of eligibleUserIds) {
      try {
        // Check if user received a selfie push in the last 48 hours
        const { data: recentSelfies } = await supabase
          .from("notifications")
          .select("created_at")
          .eq("user_id", userId)
          .eq("type", "companion_selfie")
          .order("created_at", { ascending: false })
          .limit(1);

        if (recentSelfies && recentSelfies.length > 0) {
          const lastSelfie = new Date(recentSelfies[0].created_at);
          const hoursSince = (now.getTime() - lastSelfie.getTime()) / (1000 * 60 * 60);
          if (hoursSince < 48) continue;
        }

        // Only 20% chance per eligible user per run (spread them out)
        if (!forceMode && Math.random() > 0.20) continue;

        // Get profile and companion info
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_name, companion_name, companion_appearance_desc, companion_gender, image_style, vibe, timezone")
          .eq("user_id", userId)
          .single();
        if (!profile) continue;

        // Get primary connection for richer context
        const { data: connection } = await supabase
          .from("connections")
          .select("member_id, name, appearance_desc, personality, bio, reference_image_url, image_style, connection_mode, avatar_url")
          .eq("user_id", userId)
          .eq("is_archived", false)
          .order("connected_at", { ascending: true })
          .limit(1)
          .single();
        if (!connection) continue;

        // Use connection appearance_desc as primary source — falls back to profile field
        const effectiveAppearanceDesc = connection?.appearance_desc || profile.companion_appearance_desc;
        if (!effectiveAppearanceDesc) continue;

        // Get memories scoped to this companion for richer context
        const { data: memories } = await supabase
          .from("memories")
          .select("text")
          .eq("user_id", userId)
          .eq("member_id", connection.member_id)
          .order("extracted_at", { ascending: false })
          .limit(10);

        const memoryHints = (memories || []).map((m: any) => m.text).join(". ");
        const companionDesc = effectiveAppearanceDesc;
        const companionName = connection.name || profile.companion_name;

        // Compute user's local time-of-day for caption context
        let timeOfDayHint = '';
        try {
          const tz = profile.timezone || 'UTC';
          const formatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: tz });
          const localHour = parseInt(formatter.format(now), 10);
          if (localHour >= 5 && localHour < 12) timeOfDayHint = 'It is MORNING for the recipient. Your caption should reflect a morning activity. NEVER say "tonight" or "this evening".';
          else if (localHour >= 12 && localHour < 17) timeOfDayHint = 'It is AFTERNOON for the recipient. Your caption should reflect an afternoon activity. NEVER say "this morning" or "tonight".';
          else if (localHour >= 17 && localHour < 21) timeOfDayHint = 'It is EVENING for the recipient. Your caption should reflect an evening activity. NEVER say "this morning" or "good morning".';
          else timeOfDayHint = 'It is LATE NIGHT for the recipient. Your caption should reflect a nighttime activity (reading in bed, stargazing, etc.). NEVER say "morning", "this morning", or "good morning".';
        } catch { /* ignore */ }

        // Generate caption with AI
        const captionResp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GEMINI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gemini-2.5-flash-lite",
            messages: [
              {
                role: "system",
                content: `You are ${companionName}, sending a selfie OF YOURSELF to your friend ${profile.user_name}. The photo is of YOU — it shows what YOU are doing right now. Write a brief, personal caption (under 80 chars) describing what you're up to in the photo. Use first-person perspective — "me" not "you". Be warm and natural — like texting a photo of yourself to a friend. ${timeOfDayHint} ${memoryHints ? `Things you know about ${profile.user_name}: ${memoryHints}` : ""}`,
              },
              {
                role: "user",
                content: `Write a caption for a selfie you're sending of YOURSELF right now. The photo shows YOU doing something. Examples of good captions: "caught me reading in the park 📚" or "thinking of you from my spot by the window 💛" or "look what I found on my walk today" — always describe what YOU are doing, never what the recipient is doing.`,
              },
            ],
          }),
        });

        if (!captionResp.ok) continue;
        const captionData = await captionResp.json();
        let caption = captionData.choices?.[0]?.message?.content?.trim() || "";
        caption = caption.replace(/^["']|["']$/g, "");
        if (!caption) caption = `${companionName} sent you a selfie 📸`;

        // Generate actual selfie image
        let selfieImageUrl: string | null = null;
        try {
          const imgResp = await fetch(`${supabaseUrl}/functions/v1/companion-image`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              messages: [{ role: "user", content: caption }],
              companionName,
              userName: profile.user_name,
              companionAppearanceDesc: companionDesc,
              referenceImageUrl: connection.reference_image_url || null,
              mode: "selfie",
              userId,
              memberId: connection.member_id,
              imageStyle: connection.image_style || profile.image_style || "photorealistic",
              companionRole: connection.connection_mode || "friend",
              matureMode: false,
            }),
          });
          if (imgResp.ok) {
            const imgData = await imgResp.json();
            selfieImageUrl = imgData?.imageUrl || null;
          }
        } catch (imgErr) {
          console.error(`Selfie image generation error for ${userId}:`, imgErr);
        }

        // Send push notification with selfie context
        const pushResp = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            user_id: userId,
            title: `📸 ${companionName}`,
            body: caption,
            tag: "companion_selfie",
            url: `/chat/${connection.member_id}`,
            ...(connection.avatar_url ? { icon: connection.avatar_url } : {}),
            ...(selfieImageUrl ? { image: selfieImageUrl } : {}),
          }),
        });

        if (pushResp.ok) {
          // Persist to chat history with image URL if generated
          const messageContent = selfieImageUrl 
            ? `📸 ${caption}\n[IMG:${selfieImageUrl}]` 
            : `📸 ${caption}`;
          
          await supabase.from("chat_messages").insert({
            user_id: userId,
            member_id: connection.member_id,
            role: "assistant",
            content: messageContent,
            source: "push",
          });

          // Save to companion_media so it appears in Moments/World tab
          if (selfieImageUrl) {
            await supabase.from("companion_media").insert({
              user_id: userId,
              member_id: connection.member_id,
              media_type: "selfie",
              image_url: selfieImageUrl,
              caption: caption,
              prompt: "",
            });
          }

          await supabase.from("connections").update({ last_message: `📸 ${caption}` })
            .eq("user_id", userId).eq("member_id", connection.member_id);

          // Also send via SMS if user has it enabled
          const smsProfile = (smsUsers || []).find((s: any) => s.user_id === userId);
          if (smsProfile) {
            try {
              const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
              const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
              const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

              if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER) {
                const smsBody = `📸 ${caption} — ${companionName}`;
                const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
                const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

                await fetch(twilioUrl, {
                  method: "POST",
                  headers: {
                    Authorization: `Basic ${credentials}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                  },
                  body: new URLSearchParams({
                    To: smsProfile.phone_number_decrypted,
                    From: TWILIO_PHONE_NUMBER,
                    Body: smsBody.slice(0, 160),
                  }).toString(),
                });
              }
            } catch (smsErr) {
              console.error(`SMS selfie error for ${userId}:`, smsErr);
            }
          }

          // Record notification
          await supabase.from("notifications").insert({
            user_id: userId,
            type: "companion_selfie",
            message: `📸 ${companionName}: ${caption}`,
            metadata: {
              companion_name: companionName,
              member_id: connection.member_id,
            },
          });

          sentCount++;
          console.log(`Selfie push sent to ${profile.user_name} from ${companionName}: ${caption.slice(0, 50)}...`);
        }
      } catch (userErr) {
        console.error(`Selfie error for ${userId}:`, userErr);
      }
    }

    return new Response(
      JSON.stringify({ sent: sentCount, total: eligibleUserIds.size }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Proactive selfie error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
