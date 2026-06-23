import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, memberId, recentMessages } = await req.json();

    if (!userId || !memberId || !recentMessages || recentMessages.length < 10) {
      return new Response(
        JSON.stringify({
          profile: {
            communicationRegister: "balanced",
            engagementTriggers: [],
            pushbackTolerance: "moderate",
            tonePreferences: [],
            confidence: "low",
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userMessages = recentMessages.filter((m: any) => m.role === "user");
    const avgUserLength =
      userMessages.reduce((sum: number, m: any) => sum + m.content.length, 0) /
      userMessages.length;

    const responsePatterns = {
      shortToLong: 0,
      longToLong: 0,
      afterChallenge: 0,
      afterValidation: 0,
    };

    for (let i = 0; i < recentMessages.length - 1; i++) {
      const current = recentMessages[i];
      const next = recentMessages[i + 1];

      if (current.role === "assistant" && next.role === "user") {
        const currentLen = current.content.length;
        const nextLen = next.content.length;

        if (currentLen < 100 && nextLen > 200) responsePatterns.shortToLong++;
        if (currentLen > 200 && nextLen > 200) responsePatterns.longToLong++;

        const lowerContent = current.content.toLowerCase();
        if (
          lowerContent.includes("actually") ||
          lowerContent.includes("disagree") ||
          lowerContent.includes("differently") ||
          lowerContent.includes("but") ||
          lowerContent.includes("however")
        ) {
          if (nextLen > avgUserLength * 1.3) {
            responsePatterns.afterChallenge++;
          }
        } else if (
          lowerContent.includes("valid") ||
          lowerContent.includes("makes sense") ||
          lowerContent.includes("totally") ||
          lowerContent.includes("right")
        ) {
          if (nextLen > avgUserLength * 1.3) {
            responsePatterns.afterValidation++;
          }
        }
      }
    }

    let communicationRegister = "balanced";
    if (
      responsePatterns.afterChallenge >
      responsePatterns.afterValidation * 1.5
    ) {
      communicationRegister = "direct";
    } else if (
      responsePatterns.afterValidation >
      responsePatterns.afterChallenge * 1.5
    ) {
      communicationRegister = "gentle";
    }

    let pushbackTolerance = "moderate";
    if (responsePatterns.afterChallenge > 2) {
      pushbackTolerance = "high";
    } else if (
      responsePatterns.afterChallenge === 0 &&
      userMessages.length > 15
    ) {
      pushbackTolerance = "low";
    }

    const tonePreferences: string[] = [];
    const humorEngagement = userMessages.filter(
      (m: any) =>
        m.content.includes("😂") ||
        m.content.includes("lol") ||
        m.content.includes("haha")
    ).length;

    if (humorEngagement > userMessages.length * 0.3) {
      tonePreferences.push("humor");
    }

    const directQuestions = userMessages.filter((m: any) =>
      m.content.match(/^(what|why|how|should i|would you)/i)
    ).length;

    if (directQuestions > userMessages.length * 0.4) {
      tonePreferences.push("directness");
    }

    const engagementTriggers: string[] = [];
    if (responsePatterns.longToLong > 3) {
      engagementTriggers.push("depth");
    }
    if (responsePatterns.afterChallenge > 0) {
      engagementTriggers.push("challenge");
    }

    const profile = {
      communicationRegister,
      engagementTriggers,
      pushbackTolerance,
      tonePreferences,
      confidence:
        userMessages.length > 20
          ? "high"
          : userMessages.length > 10
          ? "medium"
          : "low",
      lastAnalyzed: new Date().toISOString(),
    };

    const adminSb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await adminSb.from("conversation_profiles").upsert(
      {
        user_id: userId,
        member_id: memberId,
        communication_register: communicationRegister,
        engagement_triggers: engagementTriggers,
        pushback_tolerance: pushbackTolerance,
        tone_preferences: tonePreferences,
        confidence: profile.confidence,
        last_analyzed: profile.lastAnalyzed,
      },
      { onConflict: "user_id,member_id" }
    );

    return new Response(JSON.stringify({ profile }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
