import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { fireEdgeFunction } from '@/lib/edgeFunction';
import { loadMemory, formatMemoriesForPrompt } from '@/lib/memory';
import { isAdult } from '@/lib/ageUtils';
import { extractSketchToolCall, stripSketchToolCallForDisplay } from '@/lib/sketchToolToken';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

interface StreamChatOpts {
  history: { role: string; content: string; imageUrl?: string }[];
  companionName: string;
  userName: string;
  companionGender: 'male' | 'female' | 'neutral';
  vibe?: string;
  userId: string;
  memberId?: string;
  personaAge?: string;
  personaBio?: string;
  personaPersonality?: string;
  personaMemberGender?: string;
  personalityTraits?: Record<string, string | string[]>;
  userDateOfBirth?: string | null;
  matureMode?: boolean;
  roleplayMode?: boolean;
  communicationStyle?: string;
  preferredLanguage?: string;
  userAppearanceDesc?: string;
  companionAppearanceDesc?: string;
  userReferenceImageUrl?: string;
  userBio?: string;
  namePronunciation?: string;
  connectionMode?: string;
  backstory?: string;
  originStory?: string;
  isPremium?: boolean;
  relationshipLevel?: number;
  roleJustChanged?: boolean;
  situationalMode?: string | null;
  wandCardType?: string | null;
  userTimezone?: string | null;
  crisisTier?: number;
  privateMode?: boolean;
  postPrivateContext?: { justExitedPrivate: boolean; lastNormalTopicHint: string | null; privateUserMessageCount: number };
  pokeLevel?: number;
  currentProject?: { id?: string; name: string; emoji?: string; description?: string | null; default_mode?: string } | null;
  workbenchManifest?: Array<{ id: string; title: string; kind: string; language?: string | null }>;
  loadedArtifacts?: Array<{ id: string; title: string; kind: string; language?: string | null; content: string }>;
  memories?: string;
  lastSeenAt?: string;
  onToken: (text: string) => void;
  onComplete: (fullText: string, searchHint?: string, giftHint?: { type: string; scene: string }, saveOffer?: { title: string; steps: string[]; note?: string }, stickerExpression?: string, flameHint?: boolean, selfieHint?: string, privateSuggest?: boolean, sketchHint?: string) => void;
  onError: (reason?: 'rate_limited' | 'generic') => void;
}

export interface InjectedMemory {
  id?: string;
  text: string;
  extractedAt: string;
  daysOld: number;
  themes?: string[];
}

/**
 * Post-hoc reference detection: given an assistant reply and the memories
 * that were injected into the prompt, decide which memory (if any) the reply
 * actually referenced. We look for token overlap between the reply text and
 * each memory's text + themes. Only memories ≥7 days old qualify for the
 * "Remembered from..." badge — fresh context isn't worth surfacing.
 */
export function pickReferencedMemory(
  replyText: string,
  injected: InjectedMemory[]
): InjectedMemory | null {
  if (!injected || injected.length === 0 || !replyText) return null;

  const stop = new Set([
    'the','and','you','your','that','this','with','have','from','they','them',
    'are','was','were','for','but','not','his','her','him','she','our','out',
    'about','what','when','where','their','there','here','just','like','really',
    'still','some','been','will','would','could','should','than','then','also',
    'know','feel','feels','felt','one','two','can','any','all','its','into',
    'today','tonight','yesterday','tomorrow','want','need','make','made','take',
    'good','great','nice','love','loved','think','thought','time','people',
    'things','thing','always','never','maybe','something','someone','everything',
    'going','doing','saying','tell','told','said','say','says','well','much',
    'more','most','very','only','same','other','because','first','last','next',
    'right','left','away','back','over','down','through','around','again',
  ]);
  const tokenize = (s: string) =>
    s.toLowerCase()
      .replace(/[^a-z0-9\s'-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stop.has(w));

  const replyTokenList = tokenize(replyText);
  const replyTokens = new Set(replyTokenList);
  if (replyTokens.size === 0) return null;

  // Temporal/recall cue — phrases that indicate the AI is leaning on past context.
  // Without a cue, require a much stronger overlap to surface the badge.
  const lower = replyText.toLowerCase();
  const recallCues = [
    'you mentioned','you said','you told me','last time','remember when',
    'you were','you had','you used to','still','again','back then',
    'a while ago','earlier','before','last week','last month',
  ];
  const hasRecallCue = recallCues.some((c) => lower.includes(c));

  // A "distinctive" token = appears in the memory but is rare in the reply's general
  // vocabulary. Proper nouns (capitalized in original text) and longer words count more.
  const distinctiveInReply = (raw: string) => {
    // Capture proper-noun-like tokens from the original (preserves case)
    const propers = new Set(
      (raw.match(/\b[A-Z][a-z]{2,}\b/g) || []).map((w) => w.toLowerCase()),
    );
    return propers;
  };
  const replyProperNouns = distinctiveInReply(replyText);

  let best: { mem: InjectedMemory; score: number; distinctive: boolean } | null = null;
  for (const mem of injected) {
    if (mem.daysOld < 7) continue; // only old memories qualify
    const memTokenList = tokenize(mem.text);
    const memTokens = new Set(memTokenList);
    let overlap = 0;
    memTokens.forEach((t) => { if (replyTokens.has(t)) overlap++; });

    // Theme matches are semantic — weight them higher
    let themeMatches = 0;
    if (mem.themes) {
      for (const theme of mem.themes) {
        const t = theme.toLowerCase();
        if (replyTokens.has(t)) { themeMatches++; overlap += 2; }
      }
    }

    // Distinctive overlap: shared proper nouns (names, places) or rare long words (>=7 chars)
    const memProperNouns = distinctiveInReply(mem.text);
    let distinctiveOverlap = 0;
    memProperNouns.forEach((p) => { if (replyProperNouns.has(p)) distinctiveOverlap++; });
    memTokens.forEach((t) => { if (t.length >= 7 && replyTokens.has(t)) distinctiveOverlap++; });

    const hasDistinctive = distinctiveOverlap > 0 || themeMatches > 0;

    // Gate: require either (a) a recall cue + ≥2 overlap, OR (b) distinctive overlap + ≥3 overlap.
    // Pure generic-word overlap no longer triggers the badge.
    const qualifies =
      (hasRecallCue && overlap >= 2) ||
      (hasDistinctive && overlap >= 3);

    if (qualifies && (!best || overlap > best.score)) {
      best = { mem, score: overlap, distinctive: hasDistinctive };
    }
  }
  return best?.mem ?? null;
}

/**
 * Paced reveal: model streams as fast as the network allows, but UI advances
 * at a steady human cadence (~80 chars/sec) with brief pauses on punctuation.
 * Returns { feed, flush } — call feed(fullText) on each chunk, await flush()
 * before finalizing so the user sees the complete response.
 */
function createPaceddOnToken(onToken: (t: string) => void) {
  // Readable cadence: ~45 chars/sec ≈ 540 wpm-equivalent reveal, paced for
  // comfortable reading rather than raw network speed. Longer breath pauses
  // on punctuation give the message a natural, considered rhythm.
  const CHARS_PER_SEC = 45;
  const TICK_MS = 28;
  const charsPerTick = Math.max(1, Math.round((CHARS_PER_SEC * TICK_MS) / 1000));
  let target = '';
  let displayed = 0;
  let interval: ReturnType<typeof setInterval> | null = null;
  let pauseUntil = 0;

  const tick = () => {
    if (Date.now() < pauseUntil) return;
    if (displayed >= target.length) return;
    const next = Math.min(target.length, displayed + charsPerTick);
    const justAdded = target.slice(displayed, next);
    displayed = next;
    // Breath pauses for natural rhythm
    if (/[.!?]\s*$/.test(justAdded)) pauseUntil = Date.now() + 260;
    else if (/\n/.test(justAdded)) pauseUntil = Date.now() + 200;
    else if (/[,;:—]\s*$/.test(justAdded)) pauseUntil = Date.now() + 110;
    onToken(target.slice(0, displayed));
  };

  const ensureInterval = () => {
    if (!interval) interval = setInterval(tick, TICK_MS);
  };

  return {
    feed(fullText: string) {
      target = fullText;
      ensureInterval();
    },
    async flush() {
      // Drain the queue, then stop
      while (displayed < target.length) {
        await new Promise(r => setTimeout(r, TICK_MS));
      }
      if (interval) { clearInterval(interval); interval = null; }
      // Ensure final state
      onToken(target);
    },
  };
}

export function useChatStreaming() {
  const lastMemoryMomentDaysRef = useRef<number | null>(null);
  const lastInjectedMemoriesRef = useRef<InjectedMemory[]>([]);
  const streamResponse = useCallback(async ({
    history, companionName, userName, companionGender, vibe, userId, memberId,
    personaAge, personaBio, personaPersonality, personaMemberGender, personalityTraits,
    userDateOfBirth, matureMode, roleplayMode, communicationStyle, preferredLanguage,
    userAppearanceDesc, companionAppearanceDesc, userReferenceImageUrl, userBio,
    namePronunciation, connectionMode, backstory, originStory, isPremium, relationshipLevel, roleJustChanged, situationalMode, wandCardType, userTimezone, crisisTier, privateMode, postPrivateContext, pokeLevel, currentProject, workbenchManifest, loadedArtifacts, onToken: rawOnToken, onComplete, onError,
  }: StreamChatOpts) => {
    // Wrap caller's onToken with a steady paced reveal.
    // Strip invisible directive tokens (CALL_ME, SKETCH, IMG, *_HINT, PRIVATE_SUGGEST)
    // before paint so they never flash in the bubble during streaming.
    const stripDirectives = (s: string) =>
      s
        .replace(/\[CALL_ME(?::[^\]]*)?\]/gi, '')
        .replace(/\[SKETCH:[^\]]*\]/gi, '')
        .replace(/\[IMG:[^\]]*\]/gi, '')
        .replace(/\[PRIVATE_SUGGEST\]/gi, '')
        .replace(/\[\w+_HINT[:\s][^\]]*\]/gi, '');
    const sanitizedOnToken = (t: string) => rawOnToken(stripDirectives(t));
    const pacer = createPaceddOnToken(sanitizedOnToken);
    const onToken = (t: string) => pacer.feed(t);
    // Reset memory tracking refs for this request
    lastMemoryMomentDaysRef.current = null;
    lastInjectedMemoriesRef.current = [];
    // Load memories from DB
    let memoriesText = '';
    try {
      const memQuery = supabase
        .from('memories')
        .select('text, category, extracted_at, source, tier, base_score, themes')
        .eq('user_id', userId)
        .eq('member_id', memberId)
        .order('extracted_at', { ascending: false });
      
      // Filter out mature memories when flame is off
      if (!matureMode) {
        memQuery.neq('source', 'mature');
      }

      const { data: dbMemories } = await memQuery;
      
      if (dbMemories && dbMemories.length > 0) {
        // Tiered memory prioritization
        const now = Date.now();
        
        // ── Theme-matching: extract keywords from the latest user message ──
        const lastUserMsg = [...history].reverse().find(m => m.role === 'user')?.content || '';
        const messageTokens = new Set(
          lastUserMsg.toLowerCase()
            .replace(/[^a-z0-9\s'-]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 2)
        );
        
        // Stage 1: Foundational memories ALWAYS included (never decay)
        const foundational = dbMemories.filter((m: any) => m.tier === 'foundational');
        
        // Stage 2: Score remaining memories using tier-aware decay + theme boost
        const nonFoundational = dbMemories.filter((m: any) => m.tier !== 'foundational');
        const scored = nonFoundational.map((m: any) => {
          const daysOld = (now - new Date(m.extracted_at).getTime()) / (1000 * 60 * 60 * 24);
          const decayDays = m.tier === 'identity' ? 180 : m.tier === 'episodic' ? 90 : m.tier === 'contextual' ? 30 : 7;
          const baseScore = m.base_score || (
            (m.tier === 'identity' ? 50 : m.tier === 'episodic' ? 30 : m.tier === 'contextual' ? 20 : 10)
            + (m.category === 'emotional' ? 15 : m.category === 'wellness' ? 10 : 0)
          );
          const recencyBoost = 20 / (1 + daysOld / decayDays);
          
          // Theme relevance boost: +15 per matching theme (up to +45)
          const themes: string[] = m.themes || [];
          const themeMatches = themes.filter(t => messageTokens.has(t)).length;
          const themeBoost = Math.min(45, themeMatches * 15);
          
          return { ...m, score: baseScore + recencyBoost + themeBoost };
        });
        scored.sort((a: any, b: any) => b.score - a.score);
        
        // Combine: all foundational + top scored to fill remaining slots
        const remainingSlots = Math.max(0, 40 - foundational.length);
        const topMemories = [...foundational, ...scored.slice(0, remainingSlots)];

        // Track injected memories with full metadata for post-hoc reference detection
        const injected: InjectedMemory[] = topMemories.map((m: any) => {
          const memDate = new Date(m.extracted_at).getTime();
          const daysOld = Math.floor((now - memDate) / (1000 * 60 * 60 * 24));
          return {
            id: m.id,
            text: m.text,
            extractedAt: m.extracted_at,
            daysOld,
            themes: m.themes || [],
          };
        });
        lastInjectedMemoriesRef.current = injected;
        const oldestDays = injected.length > 0 ? Math.max(...injected.map((m) => m.daysOld)) : 0;
        lastMemoryMomentDaysRef.current = oldestDays >= 7 ? oldestDays : null;

        // Format using tier-aware grouping
        const coreMemories = topMemories.filter((m: any) => m.tier === 'foundational' || m.tier === 'identity');
        const recentMemories = topMemories.filter((m: any) => m.tier !== 'foundational' && m.tier !== 'identity');
        
        const sections: string[] = [];
        if (coreMemories.length > 0) {
          sections.push(`CORE IDENTITY:\n- ${coreMemories.map((m: any) => m.text).join('\n- ')}`);
        }
        
        // Group recent by category for readability
        const grouped: Record<string, string[]> = { general: [], emotional: [], wellness: [] };
        for (const m of recentMemories) {
          grouped[m.category]?.push(m.text);
        }
        if (grouped.general.length > 0) sections.push(`Things you know about them:\n- ${grouped.general.join('\n- ')}`);
        if (grouped.emotional.length > 0) sections.push(`Emotional patterns you've noticed:\n- ${grouped.emotional.join('\n- ')}`);
        if (grouped.wellness.length > 0) sections.push(`Health & wellness context:\n- ${grouped.wellness.join('\n- ')}`);
        memoriesText = sections.join('\n\n');

        // Fire-and-forget: increment retrieval counts (retrieval practice boost)
        const memoryIds = topMemories.map((m: any) => m.id).filter(Boolean);
        if (memoryIds.length > 0) {
          Promise.resolve(supabase.rpc('increment_memory_retrieval', { memory_ids: memoryIds } as any)).catch(() => {});
        }
      }
    } catch (e) {
      console.error('[Chat] Failed to load memories from DB:', e);
      const memory = loadMemory();
      memoriesText = formatMemoriesForPrompt(memory);
    }

    // ── Phase 5: Load narrative portraits for richer context ──
    try {
      if (memberId) {
        const { data: narratives } = await supabase
          .from('memory_narratives')
          .select('title, narrative_text, themes, narrative_type')
          .eq('user_id', userId)
          .eq('member_id', memberId)
          .order('generated_at', { ascending: false })
          .limit(5);

        if (narratives && narratives.length > 0) {
          // Theme-match narratives to current message for relevance
          const lastUserMsg = [...history].reverse().find(m => m.role === 'user')?.content || '';
          const msgTokens = new Set(
            lastUserMsg.toLowerCase().replace(/[^a-z0-9\s'-]/g, ' ').split(/\s+/).filter(w => w.length > 2)
          );

          const scored = narratives.map((n: any) => {
            const themes: string[] = n.themes || [];
            const themeMatches = themes.filter((t: string) => msgTokens.has(t)).length;
            return { ...n, relevance: themeMatches };
          });

          // Sort by relevance, take top 3
          scored.sort((a: any, b: any) => b.relevance - a.relevance);
          const topNarratives = scored.slice(0, 3);

          if (topNarratives.length > 0) {
            const narrativeSection = topNarratives
              .map((n: any) => `[${n.title}]\n${n.narrative_text}`)
              .join('\n\n');
            memoriesText += `\n\nDEEPER UNDERSTANDING (narrative portraits):\n${narrativeSection}`;
          }
        }
      }
    } catch (e) {
      console.error('[Chat] Failed to load narrative portraits:', e);
    }

    // ── Phase 6: Adaptive verification — check for stale identity memories ──
    let verificationHint = '';
    try {
      if (memberId) {
        const { data: candidates } = await supabase.rpc('get_verification_candidates', {
          p_user_id: userId,
          p_member_id: memberId,
          p_limit: 1,
        } as any);

        if (candidates && candidates.length > 0) {
          const candidate = candidates[0];
          verificationHint = `\n\nMEMORY VERIFICATION (do this naturally, not robotically):\nYou remember they once said: "${candidate.text}" (${candidate.days_old} days ago). If it comes up naturally in conversation, gently check if this is still true. Don't force it — only ask if the topic is relevant. Frame it as genuine curiosity, like "Are you still...?" or "How's that going with...?"`;
        }
      }
    } catch (e) {
      console.error('[Chat] Failed to load verification candidates:', e);
    }

    // Load Personal Intel (discovery results) for companion awareness
    try {
      if (memberId) {
        const { data: discoveryData } = await supabase
          .from('discovery_results')
          .select('topic, result_label, secondary_label')
          .eq('user_id', userId)
          .eq('member_id', memberId);

        if (discoveryData && discoveryData.length > 0) {
          const intelLines = discoveryData.map((d: any) => {
            const base = `${d.topic.replace(/-/g, ' ')}: ${d.result_label}`;
            return d.secondary_label
              ? `${base} (with ${d.secondary_label} tendencies)`
              : base;
          });
          memoriesText += '\n\nPersonal Intel (self-discovery results):\n- '
            + intelLines.join('\n- ');
        }
      }
    } catch (e) {
      console.error('[Chat] Failed to load discovery results:', e);
    }

    // ── Cross-Companion Awareness: fetch recent context from OTHER companions ──
    let crossCompanionContext = '';
    try {
      if (memberId && userId) {
        // Get other active connections
        const { data: otherConns } = await supabase
          .from('connections')
          .select('member_id, name')
          .eq('user_id', userId)
          .neq('member_id', memberId)
          .eq('is_archived', false)
          .limit(5);

        if (otherConns && otherConns.length > 0) {
          const otherIds = otherConns.map(c => c.member_id);
          // Fetch latest message from each other companion (last 48h)
          const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
          const { data: recentMsgs } = await supabase
            .from('chat_messages')
            .select('member_id, content, role, created_at')
            .eq('user_id', userId)
            .in('member_id', otherIds)
            .gte('created_at', since)
            .order('created_at', { ascending: false })
            .limit(20);

          if (recentMsgs && recentMsgs.length > 0) {
            // Group by companion, take last 2 messages each
            const byCompanion: Record<string, { content: string; role: string }[]> = {};
            for (const msg of recentMsgs) {
              const mid = msg.member_id;
              if (!byCompanion[mid]) byCompanion[mid] = [];
              if (byCompanion[mid].length < 2) {
                byCompanion[mid].push({ content: msg.content, role: msg.role });
              }
            }

            const nameMap = Object.fromEntries(otherConns.map(c => [c.member_id, c.name]));
            const lines: string[] = [];
            for (const [mid, msgs] of Object.entries(byCompanion)) {
              const name = nameMap[mid] || 'another friend';
              const summary = msgs.map(m =>
                m.role === 'user' ? `${userName} said: "${m.content.slice(0, 80)}"` : `${name} said: "${m.content.slice(0, 80)}"`
              ).join(' / ');
              lines.push(`- ${name}: ${summary}`);
            }
            if (lines.length > 0) {
              crossCompanionContext = lines.join('\n');
            }
          }
        }
      }
    } catch (e) {
      console.error('[Chat] Failed to load cross-companion context:', e);
    }

    // Load wellness goals
    let wellnessGoals = '';
    try {
      const { data: goalsData } = await supabase
        .from('wellness_goals' as any)
        .select('title, description, status, progress_notes')
        .eq('user_id', userId)
        .eq('status', 'active');
      if (goalsData && (goalsData as any[]).length > 0) {
        const lines = (goalsData as any[]).map((g: any) => {
          const notes = (g.progress_notes || []) as { text: string }[];
          const latest = notes.length > 0 ? notes[notes.length - 1].text : null;
          return `- ${g.title}${g.description ? ` (${g.description})` : ''}${latest ? ` — latest: "${latest}"` : ''}`;
        });
        wellnessGoals = `Active wellness goals:\n${lines.join('\n')}`;
      }
    } catch (e) {
      console.error('[Chat] Failed to load goals:', e);
    }

    // Load recent unreferenced mood check-ins for companion awareness
    let recentCheckins = '';
    try {
      const { data: checkinData } = await supabase
        .from('mood_checkins')
        .select('mood_emoji, mood_level, note, created_at, companion_context')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);
      if (checkinData && checkinData.length > 0) {
        const moodLabels: Record<number, string> = { 1: 'rough', 2: 'low', 3: 'okay', 4: 'good', 5: 'great' };
        const unreferenced = checkinData.filter((c: any) => {
          const ctx = c.companion_context as Record<string, unknown> | null;
          return !ctx?.referenced;
        });
        if (unreferenced.length > 0) {
          const lines = unreferenced.slice(0, 3).map((c: any) => {
            const when = new Date(c.created_at);
            const ago = Math.round((Date.now() - when.getTime()) / (1000 * 60 * 60));
            const timeStr = ago < 1 ? 'just now' : ago < 24 ? `${ago}h ago` : `${Math.round(ago / 24)}d ago`;
            return `- ${c.mood_emoji} Feeling ${moodLabels[c.mood_level] || 'okay'} (${timeStr})${c.note ? ` — "${c.note}"` : ''}`;
          });
          recentCheckins = lines.join('\n');
        }
      }
    } catch (e) {
      console.error('[Chat] Failed to load check-ins:', e);
    }

    // Load missed plan check-ins for this companion (flagged by end-of-day job)
    let missedPlanCheckins = '';
    const missedPlanIds: string[] = [];
    try {
      if (memberId) {
        const { data: missedPlans } = await supabase
          .from('companion_plans' as any)
          .select('id, title, emoji, category, schedule')
          .eq('user_id', userId)
          .eq('member_id', memberId)
          .eq('status', 'active')
          .not('missed_at', 'is', null);
        if (missedPlans && missedPlans.length > 0) {
          const lines = missedPlans.map((p: any) => {
            missedPlanIds.push(p.id);
            const sched = p.schedule || {};
            const timeStr = sched.time ? ` (${sched.time})` : '';
            return `- ${p.emoji || '📋'} ${p.title}${timeStr}`;
          });
          missedPlanCheckins = lines.join('\n');
          // Clear missed_at now that we've surfaced to companion (one-time check-in)
          for (const planId of missedPlanIds) {
            await supabase.from('companion_plans' as any).update({ missed_at: null }).eq('id', planId).eq('user_id', userId);
          }
        }
      }
    } catch (e) {
      console.error('[Chat] Failed to load missed plans:', e);
    }

    // Check for presence context from dashboard tap
    let presenceContext: string | undefined;
    try {
      const stored = sessionStorage.getItem('presenceContext');
      if (stored) {
        presenceContext = stored;
        sessionStorage.removeItem('presenceContext');
      }
    } catch (e) { logger.warn('[ChatStreaming] Failed to read presenceContext from sessionStorage:', e); }

    // Check for moment context from "A moment for you" card tap
    let momentContext: string | undefined;
    try {
      const stored = sessionStorage.getItem('momentContext');
      if (stored) {
        momentContext = stored;
        sessionStorage.removeItem('momentContext');
      }
    } catch (e) { logger.warn('[ChatStreaming] Failed to read momentContext from sessionStorage:', e); }

    const attemptStream = async (): Promise<boolean> => {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: history,
          companionName,
          userName,
          memories: memoriesText + verificationHint,
          crossCompanionContext: crossCompanionContext || undefined,
          presenceContext: presenceContext || undefined,
          momentContext: momentContext || undefined,
          crisisContext: true,
          companionGender,
          vibe,
          personaAge,
          personaBio,
          personaPersonality,
          personaMemberGender,
          personalityTraits,
           wellnessGoals,
           recentCheckins: recentCheckins || undefined,
           missedPlanCheckins: missedPlanCheckins || undefined,
          userIsMinor: !userDateOfBirth || !isAdult(userDateOfBirth),
          matureMode: matureMode || false,
          roleplayMode: roleplayMode || false,
           communicationStyle: communicationStyle || undefined,
           preferredLanguage: preferredLanguage || 'auto',
           userAppearanceDesc: userAppearanceDesc || undefined,
           companionAppearanceDesc: companionAppearanceDesc || undefined,
           userReferenceImageUrl: userReferenceImageUrl || undefined,
           userBio: userBio || undefined,
           namePronunciation: namePronunciation || undefined,
           connectionMode: connectionMode || 'friend',
           backstory: backstory || undefined,
           originStory: originStory || undefined,
           isPremium: isPremium || false,
           relationshipLevel: relationshipLevel || 1,
           memberId: memberId || undefined,
           roleJustChanged: roleJustChanged || false,
           situationalMode: situationalMode || undefined,
           wandCardType: wandCardType || undefined,
             userTimezone: userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || undefined,
             crisisTier: crisisTier || 0,
              privateMode: privateMode || false,
              postPrivateContext: postPrivateContext || undefined,
              pokeLevel: typeof pokeLevel === 'number' ? pokeLevel : 0,
              currentProject: currentProject || undefined,
              workbenchManifest: workbenchManifest && workbenchManifest.length > 0 ? workbenchManifest : undefined,
              loadedArtifacts: loadedArtifacts && loadedArtifacts.length > 0 ? loadedArtifacts : undefined,
         }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) {
          throw new Error('RATE_LIMITED');
        }
        throw new Error('Failed to get response');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';
      let buffer = '';
      let streamError: Error | null = null;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);
            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (!line.startsWith('data: ') || line.trim() === '') continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                assistantText += parsed.delta.text;
                const streamDisplay = assistantText
                  .replace(/\s*\[GIFT_HINT[:\s].*$/, '')
                  .replace(/\s*\[SEARCH_HINT[:\s].*$/, '')
                  .replace(/\s*\[SAVE_OFFER[:\s].*$/, '')
                  .replace(/\s*\[STICKER[:\s].*$/i, '')
                  .replace(/\s*\[FLAME_HINT\]\s*/gi, '')
                  .replace(/\s*\[SELFIE_HINT[:\s][^\]]*\]\s*$/i, '')
                  .replace(/\s*\[PRIVATE_SUGGEST\]\s*$/i, '')
                  .replace(/\s*\[SKETCH[:\s].*$/i, '')
                  .replace(/\s*\[IMAGE_GEN[:\s].*$/i, '')
                  .replace(/\s*\[IMG:[^\]]*\]\s*/gi, '')
                  .replace(/\s*\[\w+_HINT[:\s][^\]]*\]\s*$/i, '');
                onToken(stripSketchToolCallForDisplay(streamDisplay));
              }
            } catch {
              if (line.startsWith('data: {')) {
                buffer = line + '\n' + buffer;
                break;
              }
              logger.warn('[Chat] Discarding unparseable SSE line');
            }
          }
        }
      } catch (streamErr) {
        streamError = streamErr as Error;
        logger.warn('[Chat] Stream interrupted, preserving partial response:', streamErr);
      }

      // If streaming broke mid-response but we got no text, signal retry
      if (streamError && assistantText.trim().length === 0) {
        return false; // indicates: no text recovered, caller should retry
      }

      // Extract [GIFT_HINT: type|scene] if present
      const giftHintMatch = assistantText.match(/\[GIFT_HINT:\s*(.+?)\|(.+?)\]\s*$/);
      let cleanText = assistantText;
      let giftHint: { type: string; scene: string } | undefined;
      if (giftHintMatch) {
        giftHint = { type: giftHintMatch[1].trim(), scene: giftHintMatch[2].trim() };
        cleanText = cleanText.replace(/\s*\[GIFT_HINT:\s*.+?\]\s*$/, '').trim();
      }

      // Extract [SEARCH_HINT: ...] if present
      const searchHintMatch = cleanText.match(/\[SEARCH_HINT:\s*(.+?)\]\s*$/);
      let searchHint: string | undefined;
      if (searchHintMatch) {
        searchHint = searchHintMatch[1].trim();
        cleanText = cleanText.replace(/\s*\[SEARCH_HINT:\s*.+?\]\s*$/, '').trim();
      }

      // Extract [SAVE_OFFER: {...}] if present
      const saveOfferMatch = cleanText.match(/\[SAVE_OFFER:\s*(\{[\s\S]*\})\]\s*$/);
      let saveOffer: { title: string; steps: string[]; note?: string } | undefined;
      if (saveOfferMatch) {
        try {
          const parsed = JSON.parse(saveOfferMatch[1]) as { title?: string; steps?: string[]; note?: string };
          if (parsed.title && Array.isArray(parsed.steps)) {
            saveOffer = {
              title: String(parsed.title),
              steps: parsed.steps.filter((s): s is string => typeof s === 'string'),
              note: parsed.note ? String(parsed.note) : undefined,
            };
          }
        } catch {
          // Invalid JSON — ignore
        }
        cleanText = cleanText.replace(/\s*\[SAVE_OFFER:\s*\{[\s\S]*\}\]\s*$/, '').trim();
      }

      // Extract [STICKER: expression] if present
      const stickerMatch = cleanText.match(/\[STICKER:\s*(.+?)\]\s*$/i);
      let stickerExpression: string | undefined;
      if (stickerMatch) {
        stickerExpression = stickerMatch[1].trim();
        cleanText = cleanText.replace(/\s*\[STICKER:\s*.+?\]\s*$/i, '').trim();
      }

      // Extract [FLAME_HINT] if present (anywhere in the text — model sometimes prepends it)
      const flameHintMatch = cleanText.match(/\[FLAME_HINT\]/i);
      const flameHint = !!flameHintMatch;
      if (flameHint) {
        cleanText = cleanText.replace(/\s*\[FLAME_HINT\]\s*/gi, ' ').replace(/\s{2,}/g, ' ').trim();
      }

      // Extract [SELFIE_HINT: description] if present
      const selfieHintMatch = cleanText.match(/\[?SELFIE_HINT:\s*(.+?)\]?\s*$/i);
      let selfieHint: string | undefined;
      if (selfieHintMatch) {
        selfieHint = selfieHintMatch[1].trim().replace(/\]$/, '');
        cleanText = cleanText.replace(/\s*\[?SELFIE_HINT:\s*.+?\]?\s*$/i, '').trim();
      }

      // Extract [PRIVATE_SUGGEST] if present
      const privateSuggest = /\[PRIVATE_SUGGEST\]/i.test(cleanText);
      if (privateSuggest) {
        cleanText = cleanText.replace(/\s*\[PRIVATE_SUGGEST\]\s*/gi, '').trim();
      }

      // Extract [SKETCH: <visual prompt>] — real tool call. Token is invisible to the user.
      // When present, the caller fires generate-work-image and appends a sketch bubble inline.
      const sketchToolCall = extractSketchToolCall(cleanText);
      const sketchHint = sketchToolCall.prompt;
      cleanText = sketchToolCall.cleanText;

      // Extract [CALL_ME: <opener line>] — companion is requesting to ring the user.
      // Token is invisible. We fire request-call which inserts an incoming_calls row,
      // and the global IncomingCallOverlay listens via realtime and rings the device.
      const callMeMatch = cleanText.match(/\[CALL_ME(?::\s*([^\]]+))?\]/i);
      if (callMeMatch && memberId) {
        const openerLine = (callMeMatch[1] || '').trim().slice(0, 280) || null;
        cleanText = cleanText.replace(/\s*\[CALL_ME(?::[^\]]+)?\]\s*/gi, ' ').replace(/\s{2,}/g, ' ').trim();
        // Fire-and-forget — overlay handles ringing via realtime
        supabase.functions.invoke('request-call', {
          body: { memberId, openerLine, reason: 'companion_initiated' },
        }).catch((err) => console.warn('[CALL_ME] request-call failed:', err));
      }

      // Catch-all: strip any remaining unknown bracket hints the model may hallucinate
      cleanText = cleanText.replace(/\s*\[\w+_HINT[:\s][^\]]*\]/gi, '').replace(/\s*\[IMG:[^\]]*\]/gi, '').trim();

      // Wait for the paced reveal to finish painting before signaling completion
      await pacer.flush();

      onComplete(cleanText, searchHint, giftHint, saveOffer, stickerExpression, flameHint, selfieHint, privateSuggest, sketchHint);

      // Fire-and-forget: extract reminders from the conversation
      try {
        const lastFew = history.slice(-4);
        const userAsked = lastFew.some(m => m.role === 'user' && /remind|accountab|hold me|check.?in|nudge|wake me|every (day|morning|evening|night)|stop remind|cancel remind|don'?t remind|no more remind|pause remind|not going to worry|deal with it (later|tomorrow|tuesday|wednesday|thursday|friday|saturday|sunday|monday|next)|stop check.?in|don'?t check.?in|no more nudge/i.test(m.content));
        const companionSuggested = lastFew.some(m => m.role === 'assistant' && /i'?ll remind you|let'?s practice|tomorrow at|tonight at|next (session|lesson)|remind you (to|at|about)|check in (with you|on you|tomorrow|tonight)|practice (again|at|every|tomorrow)|see you (at|tomorrow)|same time tomorrow/i.test(m.content));
        if (userAsked || companionSuggested) {
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-reminders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              userId,
              memberId: memberId || 'primary',
              companionName,
              recentMessages: lastFew,
            }),
          }).catch(() => {});
        }
      } catch (e) { logger.warn('[ChatStreaming] Reminder extraction failed:', e); }

      // Fire-and-forget: extract plans/recommendations from the conversation
      try {
        const lastSix = history.slice(-6);
        if (lastSix.some(m => m.role === 'assistant' && /\b(plan for you|here'?s (a|your) (plan|routine|schedule)|(daily|weekly|morning|evening) routine|let'?s set up|i'?ve (put together|created|drafted)|action items:|step[s]? to follow|checklist:)/i.test(m.content))) {
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-plans`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              userId,
              memberId: memberId || 'primary',
              companionName,
              recentMessages: lastSix,
              connectionMode,
              matureMode: !!matureMode,
            }),
          }).catch(() => {});
        }
      } catch (e) { logger.warn('[ChatStreaming] Plan extraction failed:', e); }

      return true; // success
    };

    // Attempt stream with one automatic retry on connection drop
    try {
      const success = await attemptStream();
      if (!success) {
        logger.warn('[Chat] Stream failed with no text, retrying once...');
        await new Promise(r => setTimeout(r, 1200));
        const retrySuccess = await attemptStream();
        if (!retrySuccess) {
          throw new Error('Stream failed after retry');
        }
      }
    } catch (e: any) {
      console.error('Chat error:', e);
      onError(e?.message === 'RATE_LIMITED' ? 'rate_limited' : 'generic');
    }
  }, []);

  return { streamResponse, lastMemoryMomentDaysRef, lastInjectedMemoriesRef };
}
