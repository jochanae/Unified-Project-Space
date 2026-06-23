import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Event-Driven Feed Post Generator
 * 
 * Generates life-event / milestone feed posts with companion reactions
 * when user actions occur (plan complete, mood log, milestone, etc.)
 * 
 * Rate limits:
 * - Max 4 feed posts per user per day
 * - Max 1 ambient post per companion per 24h
 */

const REACTION_EMOJIS = ["👍", "🔥", "💛", "✨", "💪", "🎉", "🌟", "👏"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    let callerUserId: string | null = null;
    if (!isServiceRole) {
      const authSb = createClient(
        Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user }, error } = await authSb.auth.getUser(token);
      if (error || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      callerUserId = user.id;
    }

    const body = await req.json();
    const { userId, eventType, eventLabel, eventContext } = body;

    // Ownership guard
    if (callerUserId && callerUserId !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // --- Dedup: milestones are forever-unique; other events use 2-hour window ---
    if (eventLabel) {
      const isMilestone = eventType === "milestone";
      const query = supabase
        .from("companion_feed_posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("event_label", eventLabel);

      if (!isMilestone) {
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
        query.gte("created_at", twoHoursAgo);
      }

      const { count: recentDupCount } = await query;

      if ((recentDupCount ?? 0) > 0) {
        return new Response(JSON.stringify({ message: "Duplicate event skipped", skipped: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- Rate limit: max 4 event posts per day ---
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count: todayCount } = await supabase
      .from("companion_feed_posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("card_type", ["life-event", "milestone"])
      .gte("created_at", todayStart.toISOString());

    if ((todayCount ?? 0) >= 4) {
      return new Response(JSON.stringify({ message: "Daily event post limit reached", skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Get ALL companions (including archived) for reactions to keep feed alive ---
    const { data: connections } = await supabase
      .from("connections")
      .select("member_id, name, avatar_url, connection_mode, personality, bio, is_archived")
      .eq("user_id", userId);

    if (!connections || connections.length === 0) {
      return new Response(JSON.stringify({ message: "No active companions", skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine card type
    const cardType = eventType === "milestone" ? "milestone" : "life-event";
    const isRhythmCheckin = eventType === "rhythm_checkin";

    // Pick a primary companion (active = first connection)
    const primary = connections[0];

    // --- Generate companion reactions using AI ---
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    let companionReactions: any[] = [];
    let postContent = "";

    if (ANTHROPIC_API_KEY) {
      const reactionsPrompt = connections.map((c: any) => 
        `- ${c.name} (${c.connection_mode || 'friend'}): ${c.personality || 'warm and supportive'}`
      ).join("\n");

      const rhythmTone = isRhythmCheckin
        ? `
For rhythm_checkin events: The companion post must feel OBSERVATIONAL, not celebratory. Notice what happened without cheering or praising. Examples: "You came back to your morning rhythm today." or "Three days of your evening reflection this week." Avoid exclamation points, "Great job!", "You did it!", or hype.`
        : "";

      const systemPrompt = `You generate feed reactions for an AI companion app. The user just did something and their companions react.

RULES:
- Reactions are OBSERVATIONAL, not conversational. No questions. No "how are you?"
- Each companion gets either an emoji reaction OR a short comment (max 12 words), not both unless it's a milestone.
- Comments should reflect each companion's personality and role.
- The primary companion writes a slightly longer observation (1-2 sentences max).
- Keep it warm but not excessive.${rhythmTone}

User's companions:
${reactionsPrompt}

Respond ONLY with valid JSON:
{
  "primaryComment": "string (1-2 sentence observation from ${primary.name})",
  "reactions": [
    { "memberId": "string", "name": "string", "type": "emoji" | "comment", "emoji": "string (if emoji)", "comment": "string (if comment)" }
  ]
}`;

      try {
        const aiResp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 400,
            system: systemPrompt,
            messages: [{
              role: "user",
              content: `Event: ${eventType}\nLabel: ${eventLabel}\nContext: ${eventContext || "none"}`,
            }],
          }),
        });

        if (aiResp.ok) {
          const aiData = await aiResp.json();
          const text = aiData.content?.[0]?.text || "";
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            postContent = parsed.primaryComment || "";

            // Build reactions array with avatars
            const connMap = new Map(connections.map((c: any) => [c.member_id, c]));
            companionReactions = (parsed.reactions || []).map((r: any) => {
              // Try to match by name since AI returns names
              const conn = connections.find((c: any) => c.name === r.name) || primary;
              return {
                memberId: conn.member_id,
                name: r.name || conn.name,
                avatarUrl: conn.avatar_url || undefined,
                emoji: r.type === "emoji" ? r.emoji : undefined,
                comment: r.type === "comment" ? r.comment : undefined,
              };
            });
          }
        } else {
          await aiResp.text(); // consume body
        }
      } catch (e) {
        console.error("[generate-event-post] AI reaction generation failed:", e);
      }
    }

    // Fallback if AI didn't generate content
    if (!postContent) {
      postContent = isRhythmCheckin
        ? "You came back to your rhythm today."
        : (eventLabel || "Something happened today.");
    }
    if (companionReactions.length === 0) {
      // Generate simple emoji reactions as fallback
      companionReactions = connections.slice(0, 3).map((c: any, i: number) => ({
        memberId: c.member_id,
        name: c.name,
        avatarUrl: c.avatar_url || undefined,
        emoji: REACTION_EMOJIS[i % REACTION_EMOJIS.length],
      }));
    }

    // --- Insert the event post ---
    const { data: post, error: insertError } = await supabase
      .from("companion_feed_posts")
      .insert({
        user_id: userId,
        member_id: primary.member_id,
        content: postContent,
        member_name: primary.name,
        member_handle: `@${(primary.name || "").toLowerCase().replace(/\s+/g, "")}`,
        member_personality: primary.personality || "",
        member_bio: primary.bio || "",
        member_avatar_url: primary.avatar_url || null,
        card_type: cardType,
        event_label: eventLabel,
        event_type: eventType,
        companion_reactions: companionReactions,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[generate-event-post] Insert failed:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create post" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      postId: post?.id,
      cardType,
      eventLabel,
      companionReactions: companionReactions.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("[generate-event-post] Error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
