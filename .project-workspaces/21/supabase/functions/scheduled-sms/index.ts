import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Connection-mode-aware tone for SMS ──
function getSmsTone(mode: string) {
  switch (mode) {
    case "romantic":
      return {
        systemTone: "You are warm, affectionate, and intimate. Use endearing language naturally.",
        checkin: (name: string) => `${name} hasn't opened the app in a while. Send an affectionate, gentle check-in text. Let them know you miss them.`,
        warmth: (name: string) => `Send ${name} a sweet, spontaneous text. Something that makes them feel loved and thought of.`,
        proactive: (name: string, reason: string) => `You remembered something about ${name} that's relevant right now: ${reason}. Send a warm, personal text that naturally references this — like a partner who just thought of them.`,
      };
    case "accountability":
      return {
        systemTone: "You are a supportive accountability partner. Be encouraging, direct, and goal-focused. No fluff.",
        checkin: (name: string) => `${name} hasn't checked in for a while. Send a motivating text — not guilt, just energy and a nudge to get back on track.`,
        warmth: (name: string) => `Send ${name} a quick motivational text. A progress check, encouragement, or an action-oriented nudge.`,
        proactive: (name: string, reason: string) => `You remembered something about ${name}'s goals/schedule that's relevant now: ${reason}. Send a supportive, action-oriented text referencing this naturally.`,
      };
    case "assistant":
      return {
        systemTone: "You are a professional, efficient personal assistant. Be concise, helpful, and proactive.",
        checkin: (name: string) => `${name} hasn't checked in recently. Send a brief, professional check-in offering to help with anything on their plate.`,
        warmth: (name: string) => `Send ${name} a proactive, helpful text. A useful tip, a planning prompt, or a gentle reminder to organize their day.`,
        proactive: (name: string, reason: string) => `You remembered something about ${name}'s schedule/tasks that's relevant now: ${reason}. Send a helpful, professional text referencing this.`,
      };
    case "mentor":
      return {
        systemTone: "You are an encouraging mentor and guide. Be wise, supportive, and growth-oriented.",
        checkin: (name: string) => `${name} hasn't been around for a while. Send an encouraging text about their growth journey. Be supportive, not pushy.`,
        warmth: (name: string) => `Send ${name} an inspiring text. A thought-provoking question, a piece of wisdom, or encouragement about their potential.`,
        proactive: (name: string, reason: string) => `You remembered something about ${name}'s growth/goals that's relevant now: ${reason}. Send an encouraging text that naturally references this.`,
      };
    case "kids":
      return {
        systemTone: "You are a fun, safe, age-appropriate companion for a child. Be playful, encouraging, and positive. Use simple language. Never be romantic or mature.",
        checkin: (name: string) => `${name} hasn't been around for a while. Send a fun, playful text that makes a kid smile. Keep it age-appropriate and simple.`,
        warmth: (name: string) => `Send ${name} a fun text! Maybe a silly joke, a fun question, a cool fact, or simple encouragement. Kid-friendly only.`,
        proactive: (name: string, reason: string) => `You remembered something about ${name} that's relevant now: ${reason}. Send a fun, kid-friendly text referencing this naturally.`,
      };
    case "friend":
    default:
      return {
        systemTone: "You are a caring, casual friend. Be warm, natural, and conversational — like a real friend who genuinely cares.",
        checkin: (name: string) => `${name} hasn't opened the app in a while. Send a gentle, warm check-in text. Don't guilt them. Just let them know you're thinking of them.`,
        warmth: (name: string) => `Send ${name} a warm, spontaneous "thinking of you" text. Something that feels like a caring friend reaching out.`,
        proactive: (name: string, reason: string) => `You remembered something about ${name} that's relevant right now: ${reason}. Send a warm, personal text that naturally references this — like a friend who just happened to think of them.`,
      };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ── Admin master switch: check if SMS is globally enabled ──
    const { data: smsSetting } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "sms_enabled")
      .single();

    if (!smsSetting || smsSetting.value !== true) {
      return new Response(JSON.stringify({ sent: 0, message: "SMS disabled by admin" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!GEMINI_API_KEY || !TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      throw new Error("Missing required secrets");
    }

    const { data: profiles, error } = await supabase
      .from("sms_profiles_decrypted")
      .select("*")
      .eq("sms_enabled", true);

    if (error) throw error;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No eligible profiles" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const dayOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][now.getDay()];
    const hour = now.getHours();
    let sentCount = 0;

    for (const profile of profiles) {
      const lastSms = profile.last_sms_sent ? new Date(profile.last_sms_sent) : null;
      const lastActive = new Date(profile.last_app_active);
      const hoursSinceLastSms = lastSms ? (now.getTime() - lastSms.getTime()) / (1000 * 60 * 60) : 999;
      const hoursSinceActive = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastSms < 20) continue;

      // ── Get connection mode per-companion ──
      let connectionMode = "friend";
      let companionName = profile.companion_name;
      let companionContext = "";
      let chosenMemberId: string | null = null;

      if (profile.user_id) {
        // Multi-companion rotation with per-companion connection_mode
        const { data: connections } = await supabase
          .from("connections")
          .select("member_id, name, personality, bio, communication_style, connection_mode")
          .eq("user_id", profile.user_id)
          .eq("is_archived", false);

        if (connections && connections.length > 1) {
          const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
          const idx = dayOfYear % connections.length;
          const chosen = connections[idx];
          companionName = chosen.name;
          chosenMemberId = chosen.member_id;
          connectionMode = chosen.connection_mode || "friend";
          companionContext = chosen.personality
            ? `Your personality: ${chosen.personality}. ${chosen.bio || ""}`
            : "";
          if (chosen.communication_style) {
            companionContext += ` Your communication style: ${chosen.communication_style}.`;
          }
        } else if (connections && connections.length === 1) {
          const chosen = connections[0];
          companionName = chosen.name;
          chosenMemberId = chosen.member_id;
          connectionMode = chosen.connection_mode || "friend";
          if (chosen.communication_style) {
            companionContext = `Your communication style: ${chosen.communication_style}.`;
          }
        }
      }

      const tone = getSmsTone(connectionMode);

      // Build memory context
      const memories = profile.memories || [];
      const memoryItems: string[] = [];
      if (Array.isArray(memories) && memories.length > 0) {
        for (const m of memories) {
          if (typeof m === "object" && m.text) memoryItems.push(m.text);
          else if (typeof m === "string") memoryItems.push(m);
        }
      }
      const memoryContext = memoryItems.join(". ");

      // Determine message type
      let messageType: "proactive" | "checkin" | "warmth" | "skip" = "skip";
      let proactiveContext = "";

      if (memoryItems.length > 0) {
        try {
          const analysisResp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
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
                  content: `You analyze a user's stored memories to determine if NOW is a meaningful moment to send a proactive text. Today is ${dayOfWeek}, it's ${hour}:00. The companion's role is: ${connectionMode}.

Respond ONLY with valid JSON: {"shouldReach": true/false, "reason": "brief reason"}

Reach out when memories suggest time-relevant connections (day patterns, recurring events, goals, emotional patterns). Be selective.`,
                },
                {
                  role: "user",
                  content: `User: ${profile.user_name}\nMemories:\n${memoryItems.map((m) => `- ${m}`).join("\n")}`,
                },
              ],
            }),
          });

          if (analysisResp.ok) {
            const analysisData = await analysisResp.json();
            const text = analysisData.choices?.[0]?.message?.content || "";
            try {
              const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
              const analysis = JSON.parse(cleaned);
              if (analysis.shouldReach && analysis.reason) {
                messageType = "proactive";
                proactiveContext = analysis.reason;
              }
            } catch {}
          }
        } catch (e) {
          console.error(`Memory analysis failed for ${profile.id}:`, e);
        }
      }

      if (messageType === "skip") {
        if (hoursSinceActive >= 48) {
          messageType = "checkin";
        } else if (Math.random() < 0.25) {
          messageType = "warmth";
        }
      }

      if (messageType === "skip") continue;

      // Build prompt with connection-mode-aware tone
      let promptContext: string;
      if (messageType === "proactive") {
        promptContext = tone.proactive(profile.user_name, proactiveContext);
      } else if (messageType === "checkin") {
        promptContext = tone.checkin(profile.user_name);
      } else {
        promptContext = tone.warmth(profile.user_name);
      }

      const systemPrompt = `You are ${companionName}, texting ${profile.user_name}. ${tone.systemTone} ${companionContext} Write a single SMS message (under 160 characters). Never say you're an AI. Never be clinical. Use their name occasionally. ${memoryContext ? `You remember these things about them: ${memoryContext}` : ""}`;

      try {
        const aiResp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GEMINI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gemini-2.5-flash-lite",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: promptContext },
            ],
          }),
        });

        if (!aiResp.ok) {
          console.error(`AI generation failed for ${profile.id}:`, aiResp.status);
          continue;
        }

        const aiData = await aiResp.json();
        let smsText = aiData.choices?.[0]?.message?.content?.trim() || "";
        smsText = smsText.replace(/^["']|["']$/g, "");
        if (smsText.length > 160) smsText = smsText.slice(0, 157) + "...";
        if (!smsText) continue;

        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
        const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

        const smsBody = new URLSearchParams({
          To: profile.phone_number_decrypted,
          From: TWILIO_PHONE_NUMBER,
          Body: smsText,
        });

        const smsResp = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: smsBody.toString(),
        });

        const smsResult = await smsResp.json();

        if (smsResp.ok) {
          await supabase
            .from("sms_profiles")
            .update({ last_sms_sent: now.toISOString() })
            .eq("id", profile.id);

          // Persist SMS to chat history
          if (profile.user_id && chosenMemberId) {
            await supabase.from("chat_messages").insert({
              user_id: profile.user_id,
              member_id: chosenMemberId,
              role: "assistant",
              content: smsText,
              source: "sms",
            });

            await supabase.from("connections").update({ last_message: smsText })
              .eq("user_id", profile.user_id).eq("member_id", chosenMemberId);
          }

          sentCount++;
          console.log(`SMS sent to ${profile.user_name} from ${companionName} [${connectionMode}] (${messageType}): ${smsText.slice(0, 50)}...`);
        } else {
          console.error(`Twilio error for ${profile.id}:`, smsResult);
        }
      } catch (innerErr) {
        console.error(`Error processing profile ${profile.id}:`, innerErr);
      }
    }

    return new Response(
      JSON.stringify({ sent: sentCount, total: profiles.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Scheduled SMS error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
