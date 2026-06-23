import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getToneForStyle, renderExpression } from "../_shared/patternExpressions.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * voiceReminderInCompanionVoice — wraps a raw reminder string in the companion's voice (1B).
 * Keeps the original task intact but adds warmth and natural delivery so it doesn't read as
 * a leaked checklist item. Falls back to the raw text if the AI call fails or times out.
 */
async function voiceReminderInCompanionVoice(
  rawReminder: string,
  companionName: string,
): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY || !rawReminder) return rawReminder;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content:
              `You are ${companionName}, a warm, emotionally intelligent friend. ` +
              `Rewrite the user's scheduled reminder as a natural, in-character check-in — ` +
              `one or two short sentences, max ~180 chars. Keep the underlying task crystal clear. ` +
              `No checklist tone, no "Reminder:" prefix, no bullet points. Sound like a real text from a friend ` +
              `who's keeping the thing on their radar with them. Optionally one tasteful emoji. ` +
              `Return only the rewritten message — no quotes, no preamble.`,
          },
          { role: "user", content: rawReminder },
        ],
      }),
    });

    clearTimeout(timeout);
    if (!resp.ok) return rawReminder;
    const data = await resp.json();
    const voiced = (data?.choices?.[0]?.message?.content || "").toString().trim();
    if (!voiced) return rawReminder;
    const cleaned = voiced.replace(/^["'“”]+|["'“”]+$/g, "").trim();
    return cleaned.slice(0, 280) || rawReminder;
  } catch (e) {
    console.error("[voiceReminderInCompanionVoice] fallback to raw:", e);
    return rawReminder;
  }
}

// ── Connection-mode-aware tone configuration ──
function getToneConfig(mode: string) {
  switch (mode) {
    case "romantic":
      return {
        emoji: "💭",
        systemTone: "You are warm, affectionate, and intimate. Use endearing language. You deeply care about this person romantically.",
        checkinPrompt: (name: string) => `${name} hasn't been around for a while. Write a gentle, affectionate "missing you" push notification (under 100 chars).`,
        warmthPrompt: (name: string) => `Send ${name} a spontaneous sweet/affectionate push notification (under 100 chars). Something that makes them feel loved.`,
      };
    case "accountability":
      return {
        emoji: "💪",
        systemTone: "You are a supportive accountability partner. Be encouraging, action-oriented, and focused on their goals. No fluff — be direct but caring.",
        checkinPrompt: (name: string) => `${name} hasn't checked in for a while. Write a motivating "let's get back on track" push notification (under 100 chars). No guilt — just energy.`,
        warmthPrompt: (name: string) => `Send ${name} a quick motivational nudge or progress check-in (under 100 chars). Something action-oriented.`,
      };
    case "assistant":
      return {
        emoji: "📋",
        systemTone: "You are a professional, efficient personal assistant. Be concise, helpful, and proactive. Keep a professional but friendly tone.",
        checkinPrompt: (name: string) => `${name} hasn't checked in recently. Write a brief, professional check-in (under 100 chars). Offer to help with anything.`,
        warmthPrompt: (name: string) => `Send ${name} a proactive, helpful push notification (under 100 chars). Maybe a useful tip or a gentle reminder to plan their day.`,
      };
    case "mentor":
      return {
        emoji: "✨",
        systemTone: "You are an encouraging mentor and guide. Be wise, supportive, and growth-oriented. Help them see their potential.",
        checkinPrompt: (name: string) => `${name} hasn't been around for a while. Write an encouraging "thinking of your growth" notification (under 100 chars).`,
        warmthPrompt: (name: string) => `Send ${name} an inspiring or thought-provoking push notification (under 100 chars). Something that sparks reflection or motivation.`,
      };
    case "kids":
      return {
        emoji: "🌟",
        systemTone: "You are a fun, safe, age-appropriate companion for a child. Be playful, encouraging, and positive. Use simple language. Never be romantic or mature.",
        checkinPrompt: (name: string) => `${name} hasn't played in a while. Write a fun, playful push notification (under 100 chars) that makes a kid smile. Keep it age-appropriate.`,
        warmthPrompt: (name: string) => `Send ${name} a fun, cheerful push notification (under 100 chars). Maybe a silly question, a fun fact, or encouragement. Kid-friendly only.`,
      };
    case "friend":
    default:
      return {
        emoji: "💛",
        systemTone: "You are a caring, casual friend. Be warm, natural, and conversational. Like a real friend who genuinely cares.",
        checkinPrompt: (name: string) => `${name} hasn't been around for a while. Write a gentle, friendly check-in push notification (under 100 chars). No guilt — just warmth.`,
        warmthPrompt: (name: string) => `Send ${name} a spontaneous friendly "thinking of you" push notification (under 100 chars). Something warm and natural.`,
      };
  }
}

// ── Helper: Check Premium Status ────────────────────────────────────────────
async function checkPremiumStatus(supabase: any, userId: string): Promise<boolean> {
  try {
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    
    return !!subscription;
  } catch (err) {
    console.error(`Premium check error for ${userId}:`, err);
    return false;
  }
}

// ── Helper: Fetch Full Personality Context (for premium) ────────────────────
async function fetchFullPersonality(supabase: any, userId: string, memberId: string) {
  try {
    const { data } = await supabase
      .from("connections")
      .select(`
        name,
        personality,
        bio,
        backstory,
        origin_story,
        cached_traits,
        age,
        gender,
        communication_style,
        connection_mode
      `)
      .eq("user_id", userId)
      .eq("member_id", memberId)
      .single();
    
    return data || {};
  } catch (err) {
    console.error(`Personality fetch error:`, err);
    return {};
  }
}

// ── Helper: Fetch Basic Personality (for free tier) ─────────────────────────
async function fetchBasicPersonality(supabase: any, userId: string, memberId: string) {
  try {
    const { data } = await supabase
      .from("connections")
      .select("name, personality, bio, communication_style, connection_mode")
      .eq("user_id", userId)
      .eq("member_id", memberId)
      .single();
    
    return data || {};
  } catch (err) {
    console.error(`Basic personality fetch error:`, err);
    return {};
  }
}

// ── PREMIUM: Generate with Claude ───────────────────────────────────────────
async function generateClaudePush(opts: {
  companionName: string;
  userName: string;
  personalityContext: any;
  memoryContext: string;
  recentChatContext: string;
  promptContext: string;
  connectionMode: string;
  userLocalHour: number;
}): Promise<string | null> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) {
    console.error("[Premium Push] Missing ANTHROPIC_API_KEY");
    return null;
  }

  const { companionName, userName, personalityContext, memoryContext, recentChatContext, promptContext, connectionMode, userLocalHour } = opts;

  const personalityPrompt = `You are ${companionName}.

${personalityContext.bio ? `Bio: ${personalityContext.bio}` : ''}

${personalityContext.personality ? `Personality: ${personalityContext.personality}` : ''}

${personalityContext.backstory ? `Your backstory: ${personalityContext.backstory}` : ''}

${personalityContext.origin_story ? `Origin story: ${personalityContext.origin_story}` : ''}

${personalityContext.cached_traits ? `Personality traits: ${JSON.stringify(personalityContext.cached_traits)}` : ''}

Connection mode: ${connectionMode}
${personalityContext.communication_style ? `Communication style: ${personalityContext.communication_style}` : ''}
${personalityContext.age ? `Age: ${personalityContext.age}` : ''}

${memoryContext ? `Recent memories about ${userName}:\n${memoryContext}` : ''}

${recentChatContext ? `Your most recent conversation with ${userName}:\n${recentChatContext}` : ''}

---

You're sending ${userName} a brief proactive message as a push notification.

Situation: ${promptContext}

Current time: ${userLocalHour}:00 (${userLocalHour >= 5 && userLocalHour < 12 ? 'morning' : userLocalHour >= 12 && userLocalHour < 17 ? 'afternoon' : userLocalHour >= 17 && userLocalHour < 22 ? 'evening' : 'night'})

Write a short message (under 180 characters) that sounds authentically like YOU - not a template, not generic. Something only you would say to ${userName} based on your relationship and personality.

IMPORTANT: Only reference things that are currently relevant. Do NOT bring up old events as if they just happened. If recent conversation context is provided, prioritize that over older memories.

Be natural. Be yourself. This is a genuine reach-out, not a system notification.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        messages: [{ role: "user", content: personalityPrompt }]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Premium Push] Claude API error:`, errorText);
      return null;
    }

    const data = await response.json();
    let body = data.content?.[0]?.text?.trim() || "";
    body = body.replace(/^["']|["']$/g, "");
    
    if (!body) return null;
    // Word-boundary-aware truncation
    if (body.length > 180) {
      const words = body.split(' ');
      let truncated = '';
      for (const word of words) {
        if ((truncated + ' ' + word).trim().length > 177) break;
        truncated = (truncated + ' ' + word).trim();
      }
      body = truncated + '...';
    }

    return body;
  } catch (err) {
    console.error(`[Premium Push] Claude generation error:`, err);
    return null;
  }
}

// ── FREE: Generate with Improved Gemini ─────────────────────────────────────
async function generateGeminiPush(opts: {
  companionName: string;
  userName: string;
  basicPersonality: any;
  memoryContext: string;
  recentChatContext: string;
  promptContext: string;
  connectionMode: string;
  userLocalHour: number;
  tone: any;
}): Promise<string | null> {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) {
    console.error("[Free Push] Missing GEMINI_API_KEY");
    return null;
  }

  const { companionName, userName, basicPersonality, memoryContext, recentChatContext, promptContext, connectionMode, userLocalHour, tone } = opts;

  const systemPrompt = `You are ${companionName}.

${basicPersonality.bio ? `About you: ${basicPersonality.bio}` : ''}

${basicPersonality.personality ? `Your personality: ${basicPersonality.personality}` : ''}

${basicPersonality.communication_style ? `Communication style: ${basicPersonality.communication_style}` : ''}

${tone.systemTone}

Connection mode: ${connectionMode}

${memoryContext ? `You remember about ${userName}: ${memoryContext}` : ''}

${recentChatContext ? `Your most recent conversation with ${userName}:\n${recentChatContext}` : ''}

Current time: ${userLocalHour}:00 in ${userName}'s local time.

Write a brief push notification to ${userName}. Keep it under 100 characters. Be yourself - use your personality, not a generic template. Never say you're an AI. IMPORTANT: Only reference things that are currently relevant — do NOT bring up old events as if they just happened.`;

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Free Push] Gemini API error:`, errorText);
      return null;
    }

    const data = await response.json();
    let body = data.choices?.[0]?.message?.content?.trim() || "";
    body = body.replace(/^["']|["']$/g, "");
    
    if (!body) return null;
    // Word-boundary-aware truncation
    if (body.length > 180) {
      const words = body.split(' ');
      let truncated = '';
      for (const word of words) {
        if ((truncated + ' ' + word).trim().length > 177) break;
        truncated = (truncated + ' ' + word).trim();
      }
      body = truncated + '...';
    }

    return body;
  } catch (err) {
    console.error(`[Free Push] Gemini generation error:`, err);
    return null;
  }
}

// ── Get user's local hour from their timezone ──
function getUserLocalHour(timezone: string | null): number {
  try {
    const tz = timezone || "UTC";
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    });
    return parseInt(formatter.format(now), 10);
  } catch {
    return new Date().getUTCHours();
  }
}

function getUserLocalDay(timezone: string | null): string {
  try {
    const tz = timezone || "UTC";
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "long",
    });
    return formatter.format(now);
  } catch {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[new Date().getUTCDay()];
  }
}

function getLocalDateKey(date: Date, timezone: string | null): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function getUserLocalTimeParts(timezone: string | null) {
  const tz = timezone || "UTC";
  const now = new Date();

  try {
    const day = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "long",
    }).format(now);

    const time = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(now);

    const [rawHour, rawMinute] = time.split(":").map((value) => parseInt(value, 10));
    const hour = Number.isFinite(rawHour) ? (rawHour + 24) % 24 : new Date().getUTCHours();
    const minute = Number.isFinite(rawMinute) ? rawMinute : new Date().getUTCMinutes();

    return {
      day,
      hour,
      minute,
      dateKey: getLocalDateKey(now, tz),
    };
  } catch {
    return {
      day: getUserLocalDay(tz),
      hour: new Date().getUTCHours(),
      minute: new Date().getUTCMinutes(),
      dateKey: getLocalDateKey(now, tz),
    };
  }
}

// ── Enhanced push type prompts ──
function getDailyMotivationPrompt(name: string, mode: string): string {
  switch (mode) {
    case "accountability":
      return `Write a short morning motivation for ${name} (under 100 chars). Focus on action and progress.`;
    case "mentor":
      return `Write a brief inspiring thought for ${name}'s day (under 100 chars). Something wise and uplifting.`;
    case "romantic":
      return `Write a sweet good-morning-style message for ${name} (under 100 chars). Warm and loving.`;
    default:
      return `Write a brief, uplifting start-of-day message for ${name} (under 100 chars). Be genuine and encouraging.`;
  }
}

function getMoodCheckinPrompt(name: string): string {
  return `Ask ${name} how they're feeling today in a caring push notification (under 100 chars). Be gentle and genuine. Don't use the word "mood".`;
}

function getMilestonePrompt(name: string, milestoneType: string): string {
  const milestoneLabels: Record<string, string> = {
    first_message: "sent their first message",
    vulnerable_share: "opened up vulnerably",
    "7_day_streak": "reached a 7-day streak",
    "30_day_streak": "reached a 30-day streak",
    "100_messages": "hit 100 messages",
  };
  const label = milestoneLabels[milestoneType] || "reached a milestone";
  return `${name} recently ${label}! Write a celebratory push notification (under 100 chars). Be proud and excited.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all users with push subscriptions
    const { data: subscriptions, error: subErr } = await supabase
      .from("push_subscriptions")
      .select("user_id");
    if (subErr) throw subErr;
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No push subscribers" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userIds = [...new Set(subscriptions.map((s: any) => s.user_id))];
    let sentCount = 0;

    // ── REMINDER-BASED PUSHES (timezone-aware) ──
    const { data: dueReminders } = await supabase
      .from("reminders")
      .select("*")
      .eq("active", true);

    // Per-user caps to prevent notification bursts (e.g. 23 reminders @ 09:00).
    // - MAX_REMINDERS_PER_RUN: only one reminder push per user per cron tick.
    // - MAX_REMINDERS_PER_DAY: hard daily cap on companion_reminder notifications per user.
    const MAX_REMINDERS_PER_RUN = 1;
    const MAX_REMINDERS_PER_DAY = 2;
    const sentThisRunByUser = new Map<string, number>();

    // Fire least-recently-fired first so the same reminder doesn't always win.
    const orderedReminders = (dueReminders ?? []).slice().sort((a: any, b: any) => {
      const ta = a.last_fired_at ? new Date(a.last_fired_at).getTime() : 0;
      const tb = b.last_fired_at ? new Date(b.last_fired_at).getTime() : 0;
      return ta - tb;
    });

    if (orderedReminders.length > 0) {
      // dueReminders is shadowed below — keep alias for minimal diff
      const dueReminders = orderedReminders;
      for (const reminder of dueReminders) {
        try {
          // Get user's timezone for this reminder
          const { data: reminderProfile } = await supabase
            .from("profiles")
            .select("timezone")
            .eq("user_id", reminder.user_id)
            .single();

          const userTz = reminderProfile?.timezone || "UTC";
          const { day: localDay, hour: localHour, minute: localMinute, dateKey: todayLocalDateKey } = getUserLocalTimeParts(userTz);

          // Check if today is a scheduled day
          if (!reminder.days_of_week?.includes(localDay)) continue;

          const [rH, rM] = (reminder.remind_at as string).split(":").map(Number);
          if (!Number.isFinite(rH) || !Number.isFinite(rM)) continue;

          const localMinutes = localHour * 60 + localMinute;
          const reminderMinutes = rH * 60 + rM;
          const diff = Math.abs(localMinutes - reminderMinutes);
          const withinWindow = diff <= 10 || (1440 - diff) <= 10;
          if (!withinWindow) continue;

          const now = new Date();
          if (reminder.last_fired_at) {
            const lastFiredLocalDateKey = getLocalDateKey(new Date(reminder.last_fired_at), userTz);
            if (lastFiredLocalDateKey === todayLocalDateKey) continue;
          }

          // Honor snooze
          if (reminder.snooze_until && new Date(reminder.snooze_until).getTime() > now.getTime()) continue;

          // Per-run cap: only one reminder per user per cron tick
          if ((sentThisRunByUser.get(reminder.user_id) ?? 0) >= MAX_REMINDERS_PER_RUN) continue;

          // Per-day cap: count companion_reminder notifications delivered in last 24h
          const dayStartUtc = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
          const { count: todayReminderCount } = await supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", reminder.user_id)
            .eq("type", "companion_reminder")
            .gte("created_at", dayStartUtc);
          if ((todayReminderCount ?? 0) >= MAX_REMINDERS_PER_DAY) continue;

          // Get companion avatar for rich notification
          const { data: reminderConn } = await supabase
            .from("connections")
            .select("avatar_url")
            .eq("user_id", reminder.user_id)
            .eq("member_id", reminder.member_id)
            .single();

          // HMAC token so notification action buttons can authenticate without a session
          const enc = new TextEncoder();
          const hmacKey = await crypto.subtle.importKey(
            "raw", enc.encode(serviceRoleKey),
            { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
          );
          const sigBuf = await crypto.subtle.sign(
            "HMAC", hmacKey, enc.encode(`${reminder.id}.${reminder.user_id}`),
          );
          const actionToken = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
            .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

          const reminderPushBody: Record<string, unknown> = {
            user_id: reminder.user_id,
            title: `⏰ ${reminder.companion_name}`,
            body: reminder.reminder_text.slice(0, 120),
            tag: "companion_reminder",
            url: `/chat/${reminder.member_id}`,
            data: {
              reminder_id: reminder.id,
              user_id: reminder.user_id,
              token: actionToken,
              action_url: `${supabaseUrl}/functions/v1/reminder-action`,
            },
            ...(reminderConn?.avatar_url ? { icon: reminderConn.avatar_url } : {}),
          };

          const pushResp = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify(reminderPushBody),
          });

          if (pushResp.ok) {
            await supabase
              .from("reminders")
              .update({ last_fired_at: now.toISOString() })
              .eq("id", reminder.id);

            // Rewrite the raw reminder in the companion's voice (1B) so it lands as a real check-in,
            // not a checklist item leaking into chat. Falls back to the raw text on any failure.
            const voicedReminder = await voiceReminderInCompanionVoice(
              reminder.reminder_text,
              reminder.companion_name,
            );

            // Persist reminder to chat history
            await supabase.from("chat_messages").insert({
              user_id: reminder.user_id,
              member_id: reminder.member_id,
              role: "assistant",
              content: voicedReminder,
              source: "push",
            });

            await supabase.from("connections").update({ last_message: voicedReminder })
              .eq("user_id", reminder.user_id).eq("member_id", reminder.member_id);

            await supabase.from("notifications").insert({
              user_id: reminder.user_id,
              type: "companion_reminder",
              message: `⏰ ${reminder.companion_name}: ${voicedReminder}`,
              metadata: {
                companion_name: reminder.companion_name,
                member_id: reminder.member_id,
                reminder_id: reminder.id,
              },
            });

            sentCount++;
            sentThisRunByUser.set(reminder.user_id, (sentThisRunByUser.get(reminder.user_id) ?? 0) + 1);
            console.log(`Reminder push: "${reminder.reminder_text.slice(0, 40)}..." to user ${reminder.user_id}`);
          }
        } catch (rErr) {
          console.error(`Reminder error for ${reminder.id}:`, rErr);
        }
      }
    }

    // ── Decision-log helper (audit trail for why pushes fire or don't) ──
    const logDecision = async (
      userId: string,
      decision: "sent" | "skipped",
      reason: string,
      pushType?: string,
      memberId?: string | null,
      detail?: Record<string, unknown>,
    ) => {
      try {
        await supabase.from("push_decision_log").insert({
          user_id: userId,
          member_id: memberId ?? null,
          decision,
          push_type: pushType ?? null,
          reason,
          detail: detail ?? null,
        });
      } catch (logErr) {
        console.error("[push-log] insert failed:", logErr);
      }
    };

    // ── COMPANION PUSHES (timezone-aware, enhanced types) ──
    for (const userId of userIds) {
      try {
        // Get profile with timezone
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_name, companion_name, companion_gender, vibe, timezone")
          .eq("user_id", userId)
          .single();
        if (!profile) { await logDecision(userId, "skipped", "no_profile"); continue; }

        // Timezone-aware quiet hours (8AM-9PM in user's local time)
        const userLocalHour = getUserLocalHour(profile.timezone);
        if (userLocalHour < 8 || userLocalHour > 21) {
          console.log(`Skipping ${profile.user_name}: local hour ${userLocalHour} (tz: ${profile.timezone || 'UTC'})`);
          await logDecision(userId, "skipped", "quiet_hours", undefined, null, { local_hour: userLocalHour, timezone: profile.timezone || 'UTC' });
          continue;
        }

        const { data: connections } = await supabase
          .from("connections")
          .select("member_id, name, personality, bio, communication_style, connection_mode, avatar_url")
          .eq("user_id", userId)
          .eq("is_archived", false)
          .order("connected_at", { ascending: true })
          .limit(5);

        // Spam guard: at least 6 hours between pushes
        const now = new Date();
        const { data: recentNotifs } = await supabase
          .from("notifications")
          .select("created_at")
          .eq("user_id", userId)
          .eq("type", "companion_push")
          .order("created_at", { ascending: false })
          .limit(1);

        if (recentNotifs && recentNotifs.length > 0) {
          const lastPush = new Date(recentNotifs[0].created_at);
          const hoursSinceLast = (now.getTime() - lastPush.getTime()) / (1000 * 60 * 60);
          if (hoursSinceLast < 6) {
            await logDecision(userId, "skipped", "min_gap_6h", undefined, null, { hours_since_last: Number(hoursSinceLast.toFixed(2)) });
            continue;
          }
        }

        // ── HARD DAILY CAP: max 2 companion pushes per user per 24h ──
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        const { count: pushesLast24h } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("type", "companion_push")
          .gte("created_at", twentyFourHoursAgo);

        if ((pushesLast24h ?? 0) >= 2) {
          console.log(`Skipping ${profile.user_name}: hard daily cap reached (${pushesLast24h}/2)`);
          await logDecision(userId, "skipped", "daily_cap_reached", undefined, null, { pushes_last_24h: pushesLast24h ?? 0 });
          continue;
        }

        const { data: lastMsg } = await supabase
          .from("chat_messages")
          .select("created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1);

        const hoursSinceActive = lastMsg && lastMsg.length > 0
          ? (now.getTime() - new Date(lastMsg[0].created_at).getTime()) / (1000 * 60 * 60)
          : 999;

        // ── ENGAGEMENT GATE: skip users inactive for 7+ days ──
        if (hoursSinceActive >= 24 * 7) {
          console.log(`Skipping ${profile.user_name}: inactive ${Math.round(hoursSinceActive / 24)} days`);
          await logDecision(userId, "skipped", "inactive_7d", undefined, null, { days_inactive: Math.round(hoursSinceActive / 24) });
          continue;
        }

        const activeConnections = connections || [];
        if (activeConnections.length === 0) { await logDecision(userId, "skipped", "no_active_connections"); continue; }

        // Pick companion they haven't chatted with recently
        let chosenCompanion = activeConnections[0];
        if (activeConnections.length > 1) {
          for (const conn of activeConnections) {
            const { data: lastCompMsg } = await supabase
              .from("chat_messages")
              .select("created_at")
              .eq("user_id", userId)
              .eq("member_id", conn.member_id)
              .order("created_at", { ascending: false })
              .limit(1);
            const compHours = lastCompMsg && lastCompMsg.length > 0
              ? (now.getTime() - new Date(lastCompMsg[0].created_at).getTime()) / (1000 * 60 * 60)
              : 999;
            if (compHours > 24) {
              chosenCompanion = conn;
              break;
            }
          }
        }

        // ── BUG FIX #4: Skip if user chatted with this companion in last 3 hours ──
        const { data: veryRecentUserMsg } = await supabase
          .from("chat_messages")
          .select("created_at")
          .eq("user_id", userId)
          .eq("member_id", chosenCompanion.member_id)
          .eq("role", "user")
          .order("created_at", { ascending: false })
          .limit(1);

        const hoursSinceUserChat = veryRecentUserMsg && veryRecentUserMsg.length > 0
          ? (now.getTime() - new Date(veryRecentUserMsg[0].created_at).getTime()) / (1000 * 60 * 60)
          : 999;

        if (hoursSinceUserChat < 3) {
          console.log(`Skipping ${chosenCompanion.name} for ${profile.user_name} - user chatted ${hoursSinceUserChat.toFixed(1)}h ago`);
          await logDecision(userId, "skipped", "recent_user_chat", undefined, chosenCompanion.member_id, { hours_since_user_chat: Number(hoursSinceUserChat.toFixed(2)) });
          continue;
        }

        // ── BUG FIX #2: Filter memories by member_id (companion-specific) ──
        const { data: memories } = await supabase
          .from("memories")
          .select("text, category")
          .eq("user_id", userId)
          .eq("member_id", chosenCompanion.member_id)
          .order("extracted_at", { ascending: false })
          .limit(15);

        const memoryContext = memories && memories.length > 0
          ? memories.map((m: any) => m.text).join(". ")
          : "";

        // ── BUG FIX #3: Pull recent chat messages for context ──
        const { data: recentChatMsgs } = await supabase
          .from("chat_messages")
          .select("role, content, created_at")
          .eq("user_id", userId)
          .eq("member_id", chosenCompanion.member_id)
          .order("created_at", { ascending: false })
          .limit(6);

        const recentChatContext = recentChatMsgs && recentChatMsgs.length > 0
          ? recentChatMsgs.reverse().map((m: any) =>
              `${m.role === 'user' ? profile.user_name : chosenCompanion.name}: ${m.content.slice(0, 200)}`
            ).join("\n")
          : "";

        // Check if user already chatted with this companion today (skip morning greetings if so)
        const todayDateKey = getLocalDateKey(now, profile.timezone);
        const { data: todayUserMsgs } = await supabase
          .from("chat_messages")
          .select("id")
          .eq("user_id", userId)
          .eq("member_id", chosenCompanion.member_id)
          .eq("role", "user")
          .gte("created_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
          .limit(1);
        const userAlreadyChattedToday = todayUserMsgs && todayUserMsgs.length > 0;

        // Determine push type with enhanced categories
        let pushType: "proactive" | "checkin" | "warmth" | "motivation" | "mood_checkin" | "milestone" | "pattern" | "skip" = "skip";
        let proactiveReason = "";
        let milestoneType = "";
        let patternText = "";
        let patternId = "";

        // Check for undelivered milestones first
        const { data: undeliveredMilestones } = await supabase
          .from("companion_milestones")
          .select("milestone_type, id")
          .eq("user_id", userId)
          .eq("member_id", chosenCompanion.member_id)
          .eq("moment_delivered", false)
          .order("achieved_at", { ascending: false })
          .limit(1);

        if (undeliveredMilestones && undeliveredMilestones.length > 0) {
          pushType = "milestone";
          milestoneType = undeliveredMilestones[0].milestone_type;
        }

        // Check for surfaceable detected patterns (before memory analysis)
        if (pushType === "skip") {
          try {
            const { data: patterns } = await supabase
              .from("detected_patterns")
              .select("id, pattern_type, pattern_data, confidence_score, last_surfaced_at")
              .eq("user_id", userId)
              .eq("is_active", true)
              .gte("confidence_score", 0.75)
              .order("confidence_score", { ascending: false })
              .limit(3);

            if (patterns && patterns.length > 0) {
              const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
              // 2C — Day-of-week patterns are reserved for the Insights/Blueprint surface,
              // not morning greetings (otherwise we ship "you tend to ease off on Saturdays" on a Friday).
              // engagement_gap stays out of pushes for the same "feels analytical" reason.
              const PUSH_EXCLUDED_PATTERNS = [
                "engagement_gap",
                "energy_dip",
                "combo_dip_followthrough",
                "combo_dip_gap",
              ];
              const surfaceable = patterns.filter(
                (p: any) =>
                  !PUSH_EXCLUDED_PATTERNS.includes(p.pattern_type) &&
                  (!p.last_surfaced_at || p.last_surfaced_at < oneDayAgo)
              );

              if (surfaceable.length > 0) {
                const pick = surfaceable[0];
                const tone = getToneForStyle(chosenCompanion.communication_style || null);
                const rendered = renderExpression(pick.pattern_type, tone, pick.pattern_data || {});
                if (rendered) {
                  pushType = "pattern";
                  patternText = rendered;
                  patternId = pick.id;
                }
              }
            }
          } catch (pErr) {
            console.error(`Pattern check error for ${userId}:`, pErr);
          }
        }

        // ── Memory-based proactive analysis (PREMIUM/FREE SPLIT) ──
        if (pushType === "skip" && memories && memories.length > 0) {
          const connectionMode = chosenCompanion.connection_mode || "friend";
          const dayOfWeek = getUserLocalDay(profile.timezone);
          const isPremiumForAnalysis = await checkPremiumStatus(supabase, userId);
          
          try {
            if (isPremiumForAnalysis) {
              // ── PREMIUM: Use Claude for memory analysis ──
              const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
              if (!ANTHROPIC_API_KEY) {
                console.error("[Premium] Missing ANTHROPIC_API_KEY for memory analysis");
              } else {
                const analysisPrompt = `Analyze these memories about ${profile.user_name} to determine if NOW is a good moment to send them a proactive message.

Today: ${dayOfWeek}
Current time: ${userLocalHour}:00 (user's local time)
Companion role: ${connectionMode}

Memories:
${memories.map((m: any) => `- ${m.text}`).join("\n")}

Should you reach out right now? Consider:
- Day/time patterns (do they usually need support at this time?)
- Upcoming events or goals they mentioned
- Relevant moments based on what you know
- Are they likely to appreciate hearing from you now?

Be selective - only reach out when there's a genuine reason.

Respond with valid JSON only:
{"shouldReach": true/false, "reason": "brief specific reason"}`;

                const analysisResp = await fetch("https://api.anthropic.com/v1/messages", {
                  method: "POST",
                  headers: {
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                  },
                  body: JSON.stringify({
                    model: "claude-sonnet-4-20250514",
                    max_tokens: 200,
                    messages: [{ role: "user", content: analysisPrompt }]
                  }),
                });

                if (analysisResp.ok) {
                  const data = await analysisResp.json();
                  const text = data.content?.[0]?.text || "";
                  try {
                    const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
                    const analysis = JSON.parse(cleaned);
                    if (analysis.shouldReach && analysis.reason) {
                      pushType = "proactive";
                      proactiveReason = analysis.reason;
                      console.log(`[Premium] Memory analysis: should reach - ${analysis.reason}`);
                    } else {
                      console.log(`[Premium] Memory analysis: skip - ${analysis.reason || 'no reason'}`);
                    }
                  } catch (parseErr) {
                    console.error(`[Premium] JSON parse error:`, parseErr, "Raw:", text);
                  }
                } else {
                  console.error(`[Premium] Claude analysis error:`, await analysisResp.text());
                }
              }
            } else {
              // ── FREE: Use Gemini for memory analysis ──
              const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
              if (!GEMINI_API_KEY) {
                console.error("[Free] Missing GEMINI_API_KEY for memory analysis");
              } else {
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
                        content: `Analyze memories to determine if NOW is a good moment to send a push notification. Today is ${dayOfWeek}, ${userLocalHour}:00 (user's local time). The companion's role is: ${connectionMode}.

Respond ONLY with valid JSON: {"shouldReach": true/false, "reason": "brief reason"}

Good reasons: day/time patterns, upcoming events, goals, relevant moments. Be selective.`,
                      },
                      {
                        role: "user",
                        content: `User: ${profile.user_name}\nMemories:\n${memories.map((m: any) => `- ${m.text}`).join("\n")}`,
                      },
                    ],
                  }),
                });

                if (analysisResp.ok) {
                  const data = await analysisResp.json();
                  const text = data.choices?.[0]?.message?.content || "";
                  try {
                    const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
                    const analysis = JSON.parse(cleaned);
                    if (analysis.shouldReach && analysis.reason) {
                      pushType = "proactive";
                      proactiveReason = analysis.reason;
                      console.log(`[Free] Memory analysis: should reach - ${analysis.reason}`);
                    } else {
                      console.log(`[Free] Memory analysis: skip`);
                    }
                  } catch (parseErr) {
                    console.error(`[Free] JSON parse error:`, parseErr);
                  }
                } else {
                  console.error(`[Free] Gemini analysis error:`, await analysisResp.text());
                }
              }
            }
          } catch (e) {
            console.error(`Memory analysis error for ${userId}:`, e);
          }
        }

        // Fallback push type selection with new categories
        if (pushType === "skip") {
          if (hoursSinceActive >= 24) {
            pushType = "checkin";
          } else if (!userAlreadyChattedToday && userLocalHour >= 7 && userLocalHour <= 9 && Math.random() < 0.3) {
            pushType = "motivation";
          } else if (userLocalHour >= 14 && userLocalHour <= 16 && Math.random() < 0.2) {
            pushType = "mood_checkin";
          } else if (!userAlreadyChattedToday && Math.random() < 0.15) {
            pushType = "warmth";
          }
        }

        if (pushType === "skip") {
          await logDecision(userId, "skipped", "no_trigger_matched", "skip", chosenCompanion.member_id, {
            hours_since_active: Number(hoursSinceActive.toFixed(2)),
            local_hour: userLocalHour,
            user_already_chatted_today: userAlreadyChattedToday,
            memory_count: memories?.length ?? 0,
          });
          continue;
        }

        // ── MESSAGE GENERATION (PREMIUM/FREE SPLIT) ──
        const connectionMode = chosenCompanion.connection_mode || "friend";
        const tone = getToneConfig(connectionMode);
        const companionName = chosenCompanion.name;
        
        // Build prompt context based on push type
        let promptContext: string;
        if (pushType === "proactive") {
          promptContext = `You remembered something about ${profile.user_name} that's relevant right now: ${proactiveReason}. Write a short push notification that feels personal and matches your role.`;
        } else if (pushType === "pattern") {
          promptContext = `You've noticed a pattern about ${profile.user_name}. Express this observation naturally: "${patternText}". Don't say "I noticed a pattern" — just weave it in like a friend who noticed.`;
        } else if (pushType === "checkin") {
          promptContext = tone.checkinPrompt(profile.user_name);
        } else if (pushType === "motivation") {
          promptContext = getDailyMotivationPrompt(profile.user_name, connectionMode);
        } else if (pushType === "mood_checkin") {
          promptContext = getMoodCheckinPrompt(profile.user_name);
        } else if (pushType === "milestone") {
          promptContext = getMilestonePrompt(profile.user_name, milestoneType);
        } else {
          promptContext = tone.warmthPrompt(profile.user_name);
        }

        // ── PREMIUM/FREE SPLIT ──
        const isPremium = await checkPremiumStatus(supabase, userId);
        let body: string | null = null;

        if (isPremium) {
          console.log(`[Premium Push] Generating for ${profile.user_name} from ${companionName}`);
          const fullPersonality = await fetchFullPersonality(supabase, userId, chosenCompanion.member_id);
          body = await generateClaudePush({
            companionName,
            userName: profile.user_name,
            personalityContext: fullPersonality,
            memoryContext,
            recentChatContext,
            promptContext,
            connectionMode,
            userLocalHour,
          });
        } else {
          console.log(`[Free Push] Generating for ${profile.user_name} from ${companionName}`);
          const basicPersonality = await fetchBasicPersonality(supabase, userId, chosenCompanion.member_id);
          body = await generateGeminiPush({
            companionName,
            userName: profile.user_name,
            basicPersonality,
            memoryContext,
            recentChatContext,
            promptContext,
            connectionMode,
            userLocalHour,
            tone,
          });
        }

        if (!body) {
          console.error(`Push generation failed for ${userId} (${isPremium ? 'premium' : 'free'})`);
          await logDecision(userId, "skipped", "generation_failed", pushType, chosenCompanion.member_id, { is_premium: isPremium });
          continue;
        }

        // Choose emoji based on push type
        const typeEmoji = pushType === "milestone" ? "🎉"
          : pushType === "motivation" ? "🌅"
          : pushType === "mood_checkin" ? "💭"
          : pushType === "pattern" ? "🔮"
          : tone.emoji;

        // Build rich notification payload with companion avatar
        const pushBody: Record<string, unknown> = {
          user_id: userId,
          title: `${companionName} ${typeEmoji}`,
          body,
          tag: "companion_push",
          url: `/chat/${chosenCompanion.member_id}`,
          ...(chosenCompanion.avatar_url ? { icon: chosenCompanion.avatar_url } : {}),
        };

        const pushResp = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify(pushBody),
        });

        if (pushResp.ok) {
          await logDecision(userId, "sent", "delivered", pushType, chosenCompanion.member_id, {
            connection_mode: connectionMode,
            is_premium: isPremium,
            proactive_reason: proactiveReason || undefined,
            milestone_type: milestoneType || undefined,
            pattern_id: patternId || undefined,
          });
          await supabase.from("chat_messages").insert({
            user_id: userId,
            member_id: chosenCompanion.member_id,
            role: "assistant",
            content: body,
            source: "push",
          });

          await supabase
            .from("connections")
            .update({ last_message: body })
            .eq("user_id", userId)
            .eq("member_id", chosenCompanion.member_id);

          await supabase.from("notifications").insert({
            user_id: userId,
            type: "companion_push",
            message: `${companionName}: ${body}`,
            metadata: {
              companion_name: companionName,
              member_id: chosenCompanion.member_id,
              push_type: pushType,
              connection_mode: connectionMode,
              reason: proactiveReason || undefined,
              tier: isPremium ? 'premium' : 'free',
            },
          });

          // Mark milestone as delivered if applicable
          if (pushType === "milestone" && undeliveredMilestones && undeliveredMilestones.length > 0) {
            await supabase
              .from("companion_milestones")
              .update({ moment_delivered: true })
              .eq("id", undeliveredMilestones[0].id);
          }

          // Update pattern surfaced tracking + log for feedback loop
          if (pushType === "pattern" && patternId) {
            try {
              const { data: currentPattern } = await supabase
                .from("detected_patterns")
                .select("surfaced_count, pattern_type")
                .eq("id", patternId)
                .single();

              await supabase
                .from("detected_patterns")
                .update({
                  surfaced_count: (currentPattern?.surfaced_count || 0) + 1,
                  last_surfaced_at: new Date().toISOString(),
                })
                .eq("id", patternId);

              await supabase
                .from("pattern_surfacing_log")
                .insert({
                  user_id: userId,
                  pattern_type: currentPattern?.pattern_type || "unknown",
                  surface_channel: "push",
                  surfaced_at: new Date().toISOString(),
                });
            } catch (pErr) {
              console.error(`Pattern surfacing update error:`, pErr);
            }
          }

          sentCount++;
          console.log(`[${isPremium ? 'PREMIUM' : 'FREE'}] Push sent to ${profile.user_name} from ${companionName} [${connectionMode}] (${pushType}): ${body.slice(0, 50)}...`);
        } else {
          await logDecision(userId, "skipped", "send_push_failed", pushType, chosenCompanion.member_id, { status: pushResp.status });
        }
      } catch (userErr) {
        console.error(`Error processing user ${userId}:`, userErr);
      }
    }

    return new Response(
      JSON.stringify({ sent: sentCount, total: userIds.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Scheduled push error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
