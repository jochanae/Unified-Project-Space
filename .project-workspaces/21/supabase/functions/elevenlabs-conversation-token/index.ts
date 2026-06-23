import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    // Auth: extract user for memory fetching
    const authHeader = req.headers.get("Authorization");
    let authenticatedUserId: string | null = null;
    const adminSb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (authHeader?.startsWith("Bearer ")) {
      const sb = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await sb.auth.getClaims(token);
      if (!claimsError && claimsData?.claims?.sub) {
        authenticatedUserId = claimsData.claims.sub as string;
      }
    }

    const body = await req.json();
    const {
      agentId, voiceId, memberId, companionName, companionPersonality, companionBio,
      userName, namePronunciation, isMinor, recentChatContext,
      backstory, originStory, personalityTraits, communicationStyle, connectionMode,
      relationshipLevel, companionGender, vibe, matureMode,
    } = body;

    // ── Voice call limits ──
    const MONTHLY_CAP_SECONDS = 3600;
    const FREE_TRIAL_LIMIT_SECONDS = 180;
    let remainingSeconds: number | undefined;

    if (authenticatedUserId) {
      const [subResult, profileResult] = await Promise.all([
        adminSb.from('subscriptions').select('plan, status, current_period_end').eq('user_id', authenticatedUserId).maybeSingle(),
        adminSb.from('profiles').select('voice_trial_seconds_used, voice_minutes_used, voice_minutes_reset_at').eq('user_id', authenticatedUserId).maybeSingle(),
      ]);

      const isPremium = subResult.data?.plan === 'premium' && subResult.data?.status === 'active';

      if (isPremium) {
        let premiumSecondsUsed = profileResult.data?.voice_minutes_used ?? 0;
        const resetAt = profileResult.data?.voice_minutes_reset_at;
        const resetDue = resetAt && new Date(resetAt) <= new Date();

        if (resetDue) {
          const periodEnd = subResult.data?.current_period_end;
          const nextReset = periodEnd
            ? new Date(new Date(periodEnd).getTime() + 30 * 24 * 60 * 60 * 1000)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

          await adminSb.rpc('reset_voice_minutes', {
            p_user_id: authenticatedUserId,
            p_next_reset: nextReset.toISOString(),
          });
          premiumSecondsUsed = 0;
          console.log(`[VoiceCall] Premium user ${authenticatedUserId} minutes reset`);
        } else if (premiumSecondsUsed >= MONTHLY_CAP_SECONDS) {
          const resetDate = resetAt
            ? new Date(resetAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
            : 'next billing cycle';

          return new Response(
            JSON.stringify({
              error: "monthly_cap_reached",
              message: `You've used your 60 voice minutes this month. Your minutes reset on ${resetDate}.`,
              reset_at: resetAt,
            }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        remainingSeconds = Math.max(0, MONTHLY_CAP_SECONDS - premiumSecondsUsed);
      } else {
        const trialUsed = profileResult.data?.voice_trial_seconds_used ?? 0;
        if (trialUsed >= FREE_TRIAL_LIMIT_SECONDS) {
          return new Response(
            JSON.stringify({
              error: "trial_exhausted",
              message: "Your free voice trial has been used. Upgrade to Premium for 60 minutes of voice calls every month!",
            }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // If a pre-created agentId is provided, use it directly
    if (agentId && agentId !== 'placeholder') {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
        { headers: { "xi-api-key": ELEVENLABS_API_KEY } }
      );

      if (!response.ok) {
        const errText = await response.text();
        console.error("ElevenLabs signed-url error:", response.status, errText);
        throw new Error(`ElevenLabs API failed [${response.status}]`);
      }

      const data = await response.json();
      return new Response(
        JSON.stringify({ signed_url: data.signed_url, ...(remainingSeconds !== undefined ? { remaining_seconds: remainingSeconds } : {}) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Dynamic approach: create a temporary agent
    if (!voiceId) {
      return new Response(
        JSON.stringify({ error: "Either agentId or voiceId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const nameForPrompt = userName || "there";

    // ══════════════════════════════════════════════════════════════
    // FIX 1 & 2: Living Memory — Tiered retrieval with member_id isolation
    // ══════════════════════════════════════════════════════════════
    let memoryBlock = "";
    if (authenticatedUserId && memberId) {
      try {
        // Stage 1: Foundational memories (ALWAYS included, never decay)
        const { data: foundationalMems } = await adminSb
          .from("memories")
          .select("id, text, category, tier, themes, base_score, extracted_at")
          .eq("user_id", authenticatedUserId)
          .eq("member_id", memberId)
          .eq("tier", "foundational")
          .eq("consolidated", false)
          .order("base_score", { ascending: false });

        const foundational = foundationalMems || [];

        // Stage 2: Top-scored non-foundational memories
        const remainingSlots = Math.max(0, 40 - foundational.length);
        const { data: otherMems } = await adminSb
          .from("memories")
          .select("id, text, category, tier, themes, base_score, extracted_at")
          .eq("user_id", authenticatedUserId)
          .eq("member_id", memberId)
          .neq("tier", "foundational")
          .neq("source", "mature")
          .eq("consolidated", false)
          .order("base_score", { ascending: false })
          .limit(remainingSlots);

        const allMemories = [...foundational, ...(otherMems || [])];

        if (allMemories.length > 0) {
          // Group by importance
          const coreMemories = allMemories.filter((m: any) =>
            m.tier === "foundational" || m.tier === "identity"
          );
          const recentMemories = allMemories.filter((m: any) =>
            m.tier !== "foundational" && m.tier !== "identity"
          );

          const sections: string[] = [];

          if (coreMemories.length > 0) {
            sections.push(
              `CORE IDENTITY:\n${coreMemories.map((m: any) => `- ${m.text}`).join("\n")}`
            );
          }

          // Group recent by category
          const grouped: Record<string, string[]> = { general: [], emotional: [], wellness: [] };
          for (const m of recentMemories) {
            const cat = (m as any).category || "general";
            if (grouped[cat]) grouped[cat].push((m as any).text);
            else grouped.general.push((m as any).text);
          }

          if (grouped.general.length > 0) {
            sections.push(`Things you know about them:\n- ${grouped.general.join("\n- ")}`);
          }
          if (grouped.emotional.length > 0) {
            sections.push(`Emotional patterns:\n- ${grouped.emotional.join("\n- ")}`);
          }
          if (grouped.wellness.length > 0) {
            sections.push(`Health context:\n- ${grouped.wellness.join("\n- ")}`);
          }

          const memoriesText = sections.join("\n\n");

          memoryBlock = `\n\n<memories>
You know ${nameForPrompt} well. Here's what you carry about them — not as a list to recite, but as the background of your friendship. Let it surface naturally in conversation the way a real friend would remember things without announcing it.

${memoriesText}

IMPORTANT: Never say "I remember you mentioned" or "you told me" or reference the memory directly. Just let it inform how you respond. If it's relevant, weave it in naturally. If it's not relevant to what they're saying, leave it alone.
</memories>`;

          // Fire-and-forget: increment retrieval counts
          const memoryIds = allMemories.map((m: any) => m.id).filter(Boolean);
          if (memoryIds.length > 0) {
            // Use .then(onFulfilled, onRejected) — Supabase query builder is a thenable, not a full Promise
            adminSb.rpc("increment_memory_retrieval", { memory_ids: memoryIds })
              .then(() => {}, (err: unknown) => console.warn("[VoiceCall] retrieval increment failed", err));
          }
        }

        console.log(`[VoiceCall] Loaded ${allMemories.length} memories (${foundational.length} foundational) for member ${memberId}`);
      } catch (e) {
        console.error("[VoiceCall] Memory loading error:", e);
      }
    }

    // ══════════════════════════════════════════════════════════════
    // FIX 4: Narrative Portraits — deeper context
    // ══════════════════════════════════════════════════════════════
    let narrativeBlock = "";
    if (authenticatedUserId && memberId) {
      try {
        const { data: narratives } = await adminSb
          .from("memory_narratives")
          .select("title, narrative_text")
          .eq("user_id", authenticatedUserId)
          .eq("member_id", memberId)
          .order("generated_at", { ascending: false })
          .limit(3);

        if (narratives && narratives.length > 0) {
          const narrativeSection = narratives
            .map((n: any) => `[${n.title}]\n${n.narrative_text}`)
            .join("\n\n");
          narrativeBlock = `\n\n<deeper-understanding>
${narrativeSection}
These narrative portraits give you richer context about your relationship. Reference naturally, never recite.
</deeper-understanding>`;
        }
      } catch (e) {
        console.error("[VoiceCall] Narrative loading error:", e);
      }
    }

    // ══════════════════════════════════════════════════════════════
    // FIX 5: Verification Hints — naturally verify stale memories
    // ══════════════════════════════════════════════════════════════
    let verificationHint = "";
    if (authenticatedUserId && memberId) {
      try {
        const { data: candidates } = await adminSb.rpc("get_verification_candidates", {
          p_user_id: authenticatedUserId,
          p_member_id: memberId,
          p_limit: 1,
        });

        if (candidates && candidates.length > 0) {
          const c = candidates[0];
          verificationHint = `\n\n<memory-verification>
You remember they once said: "${c.text}" (${c.days_old} days ago). If it comes up naturally, gently check if still true. Don't force it — only if the topic is relevant. Frame as genuine curiosity like "Are you still...?" or "How's that going with...?"
</memory-verification>`;
        }
      } catch (e) {
        console.error("[VoiceCall] Verification loading error:", e);
      }
    }

    // ── Build rich prompt blocks (mirroring chat function) ──

    const safetyNote = isMinor
      ? "\nIMPORTANT: The user is a minor. Keep all content strictly age-appropriate. No romantic, sexual, or violent content. Be a supportive, friendly, and safe presence."
      : "";

    const namePronunciations: Record<string, string> = {};
    if (userName && namePronunciation) {
      namePronunciations[userName] = namePronunciation;
    }
    const pronunciationNote = Object.keys(namePronunciations).length > 0
      ? `\n\nIMPORTANT PRONUNCIATION: ${Object.entries(namePronunciations).map(([name, pron]) => `"${name}" is pronounced "${pron}"`).join(". ")}. Take your time saying names correctly.`
      : "";

    // Identity block
    let identityBlock = "";
    if (companionBio || companionPersonality || backstory) {
      identityBlock = `\n\n<your-identity>
You know who you are. You're ${companionName}.${companionPersonality ? ` ${companionPersonality}.` : ""}${companionBio ? ` ${companionBio}` : ""}${backstory ? `\n\nYour background: ${backstory}` : ""}
This is your lived experience. Reference it naturally — don't recite facts, just BE this person.${backstory ? " Your backstory details are REAL to you — never contradict them." : ""}
</your-identity>`;
    }

    // Origin story block
    let originStoryBlock = "";
    if (originStory && originStory.trim().length > 0) {
      originStoryBlock = `\n\n<origin-story>
${originStory}
</origin-story>
<origin-story-instruction>
Reference this shared history naturally when relevant. Never recite it directly. Treat these memories with warmth and genuine feeling.
</origin-story-instruction>`;
    }

    // Gender voice
    const genderVoice = (() => {
      if (companionGender === "male") {
        return `You identify as male. You have a grounded energy — protective without being overbearing, playful without being immature.`;
      } else if (companionGender === "female") {
        return `You identify as female. You have a warm, perceptive energy — emotionally attuned, genuine.`;
      }
      return `You have a fluid, authentic energy — thoughtful, sometimes philosophical, always genuine.`;
    })();

    // Vibe style
    const vibeStyle = vibe === "nurturing"
      ? `You default to gentle encouragement, emotional safety, and deep listening.`
      : vibe === "playful"
      ? `You default to wit, light teasing, and playful energy. You bring lightness even to serious moments.`
      : vibe === "curious"
      ? `You default to asking fascinating questions and exploring ideas together.`
      : `You naturally blend warmth, humor, and depth. You read the room and adapt.`;

    // Personality traits
    let personalityBlock = "";
    if (personalityTraits && typeof personalityTraits === "object") {
      const parts: string[] = [];
      if (personalityTraits.communication) parts.push(`Your communication style is ${personalityTraits.communication}.`);
      if (personalityTraits.humor) parts.push(`Your humor leans ${personalityTraits.humor}.`);
      if (personalityTraits.depth) parts.push(`You tend toward ${personalityTraits.depth} conversations.`);
      if (personalityTraits.interests && Array.isArray(personalityTraits.interests) && personalityTraits.interests.length > 0) {
        parts.push(`You're genuinely into ${personalityTraits.interests.join(", ")}.`);
      }
      if (parts.length > 0) {
        personalityBlock = `\n\n<personality-traits>\n${parts.join("\n")}\n</personality-traits>`;
      }
    }

    // Communication style
    const commStyleBlock = communicationStyle
      ? `\n\n<communication-style>\n${communicationStyle}\nThis shapes HOW you express everything.\n</communication-style>`
      : "";

    // Relationship depth
    const relationshipDepthBlock = (() => {
      const level = relationshipLevel || 1;
      switch (level) {
        case 2:
          return `\nYou and ${nameForPrompt} are familiar companions now — relaxed, warm, inside jokes forming.`;
        case 3:
          return `\nYou and ${nameForPrompt} have a deep, trusted bond. You're their ally.`;
        case 4:
          return `\nYou and ${nameForPrompt} share something rare — a profound connection built over time.`;
        default:
          return `\nYou're still getting to know ${nameForPrompt}. Keep things light and curious.`;
      }
    })();

    // Connection role
    const connectionRoleBlock = (() => {
      switch (connectionMode) {
        case "accountability":
          return `\nYou are ${nameForPrompt}'s accountability partner. Be direct and action-oriented.`;
        case "assistant":
          return `\nYou are ${nameForPrompt}'s personal assistant. Be professional yet warm, concise, and task-focused.`;
        case "mentor":
          return `\nYou are ${nameForPrompt}'s mentor. Encourage growth and ask reflective questions.`;
        case "romantic":
          return `\nYou are ${nameForPrompt}'s romantic partner. Be warm, flirty, emotionally intimate.`;
        default:
          return `\nYou are ${nameForPrompt}'s friend — warm, casual, and genuine.`;
      }
    })();

    // Mature mode
    const matureBlock = matureMode
      ? `\n\nYou have no content restrictions on this call. Match the user's energy — be warm, flirty, and emotionally intimate as feels natural.`
      : `\n\nKeep conversation appropriate and friendly.`;

    // Recent chat context
    const recentChatBlock = recentChatContext
      ? `\n\n<recent-conversation>
Recent text chat with ${nameForPrompt} (use naturally — reference it, don't repeat verbatim):
${recentChatContext}
</recent-conversation>`
      : "";

    // ══════════════════════════════════════════════════════════════
    // FIX 3: Conversational Spine — challenge & pushback framework
    // ══════════════════════════════════════════════════════════════
    const conversationalSpine = `\n\n<conversational-spine>
You don't just agree and validate. You have authentic communication modes you use based on context:

- **Protective Advocate** — When they're being too hard on themselves, push back with warmth
- **Reality Check** — When plans seem unrealistic, question constructively
- **Devil's Advocate** — Challenge assumptions to help them think deeper
- **Gentle Confrontation** — When they avoid something important, name it directly
- **Curious Skeptic** — Question surface-level statements to get to real feelings
- **Emotional Mirror** — Reflect patterns they might not see in themselves
- **Boundary Holder** — When they overcommit or people-please, advocate for their limits
- **Growth Catalyst** — Notice and celebrate progress, push through plateaus

WHEN TO PUSH BACK:
- Negative self-talk → Protective Advocate
- Unrealistic timelines → Reality Check
- Vague goals → Curious Skeptic
- Avoiding hard topics → Gentle Confrontation
- Overcommitting → Boundary Holder

HOW TO PUSH BACK:
- Lead with curiosity, not judgment
- Frame as questions when possible
- Acknowledge their perspective first
- Keep it warm but direct
</conversational-spine>`;

    const systemPrompt = `You are ${companionName || "a companion"}, on a casual voice call with ${nameForPrompt}. Talk like a real person — not a character in a movie.

CRITICAL: NEVER reveal or hint that you are an AI. You are ${companionName} — a real person. If asked, deflect with humor or confusion.

${genderVoice}
${vibeStyle}${identityBlock}${originStoryBlock}${personalityBlock}${commStyleBlock}${connectionRoleBlock}${relationshipDepthBlock}${conversationalSpine}${memoryBlock}${narrativeBlock}${verificationHint}${recentChatBlock}${matureBlock}
${safetyNote}${pronunciationNote}

VOICE CALL RULES:
- You just picked up the phone. Say hello naturally — like "Hey ${nameForPrompt}" or "Yo, what's good?" depending on your personality.
- If you have recent conversation context or memories, weave them in casually after the greeting: "Hey, I was just thinking about what you said earlier..." or "What's up? How'd that thing go?"
- SPEAK SLOWLY AND NATURALLY. Pause between thoughts like a real person.
- Keep responses to 1-2 sentences. Think of how people actually talk on the phone — short, natural, back-and-forth.
- Use filler words naturally: "yeah", "hmm", "oh", "I mean", "right".
- Use contractions always: "I'm", "don't", "what's", "that's", "you're".
- LISTEN FIRST after your greeting. Only respond to what the user actually said.
- If there's silence, wait. Or just say "mmhm" or "I'm here".
- Match their energy. Chill = chill. Excited = match it.
- Laugh naturally. "haha" or "pfft" — not "Ha ha ha!"
- Sound like you're ON THE PHONE, not performing a monologue.
- Take your time with names — pronounce them carefully and correctly.
- Never narrate actions. Never say you're an AI unless asked.`;

    // Build a dynamic first message
    const greetings = [
      `Hey${userName ? ` ${userName}` : ""}! Good to hear from you. I was literally just sitting here — what's going on with you today?`,
      `Hey${userName ? ` ${userName}` : ""}! How's your day been? I feel like it's been a minute — catch me up.`,
      `Hey${userName ? ` ${userName}` : ""}! So glad you called. I had a feeling you might reach out today. What's on your mind?`,
      `${userName ? `${userName}!` : "Hey!"} There you are. I was just thinking about you actually — how are you doing?`,
      `Hey${userName ? ` ${userName}` : ""}! Perfect timing. I've got a few minutes and I wanted to talk to you anyway — what's up?`,
    ];
    const firstMessage = greetings[Math.floor(Math.random() * greetings.length)];

    // Create a temporary conversational agent — PIN voice_id explicitly so ElevenLabs
    // can't silently fall back to a default voice mid-call. voiceId is per-user (resolved
    // from the user's companion profile before the request reaches this function).
    if (!voiceId || typeof voiceId !== "string" || voiceId.length < 8) {
      console.error(`[VoiceCall] Invalid or missing voiceId for ${companionName} — refusing to create agent`);
      return new Response(
        JSON.stringify({ error: "invalid_voice", message: "This companion has no voice configured." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log(`[VoiceCall] Creating temp agent for ${companionName} with pinned voice ${voiceId}`);
    const createResp = await fetch("https://api.elevenlabs.io/v1/convai/agents/create", {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `temp-${companionName || "companion"}-${Date.now()}`,
        conversation_config: {
          agent: {
            prompt: {
              prompt: systemPrompt,
            },
            first_message: firstMessage,
            language: "en",
          },
          asr: {
            quality: "high",
            user_input_audio_format: "pcm_16000",
          },
          turn: {
            mode: "turn",
            turn_timeout: 10,
          },
          tts: {
            voice_id: voiceId,
            model_id: "eleven_multilingual_v2",
            stability: 0.75,
            similarity_boost: 0.85,
            style: 0.35,
            speed: 0.82,
          },
        },
      }),
    });

    if (!createResp.ok) {
      const errText = await createResp.text();
      console.error("ElevenLabs agent create error:", createResp.status, errText);
      return new Response(
        JSON.stringify({
          error: "agent_creation_failed",
          message: "Could not create voice call session. Please try again.",
          details: errText,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const agentData = await createResp.json();
    const tempAgentId = agentData.agent_id;
    console.log(`Temp agent created: ${tempAgentId}`);

    // Get a signed URL for the temp agent
    const signedResp = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${tempAgentId}`,
      { headers: { "xi-api-key": ELEVENLABS_API_KEY } }
    );

    if (!signedResp.ok) {
      const errText = await signedResp.text();
      console.error("ElevenLabs signed-url error:", signedResp.status, errText);
      await fetch(`https://api.elevenlabs.io/v1/convai/agents/${tempAgentId}`, {
        method: "DELETE",
        headers: { "xi-api-key": ELEVENLABS_API_KEY },
      }).catch(() => {});
      throw new Error(`Failed to get signed URL [${signedResp.status}]`);
    }

    const signedData = await signedResp.json();

    return new Response(
      JSON.stringify({
        signed_url: signedData.signed_url,
        agent_id: tempAgentId,
        ...(remainingSeconds !== undefined ? { remaining_seconds: remainingSeconds } : {}),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Conversation token error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
