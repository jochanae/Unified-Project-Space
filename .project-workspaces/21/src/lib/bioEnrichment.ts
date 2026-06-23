/**
 * Bio Enrichment — extracts biographical facts revealed during conversation
 * and syncs them back to the companion's bio field in the connections table.
 *
 * Triggered periodically (every ~20 user messages) to avoid excessive API calls.
 */
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const EXTRACTION_PROMPT = `You are analyzing a conversation between a user and their AI companion. Extract ONLY concrete biographical facts the companion has revealed about themselves during this conversation.

Look for facts like:
- Where they're from / where they live
- Their occupation or hobbies
- Age, birthday, favorite things
- Backstory details, family, friends
- Personal beliefs, values, goals

Format: Write a concise bio paragraph (2-4 sentences max) combining any NEW facts found. If the companion hasn't revealed any concrete biographical details, respond with exactly "NO_NEW_FACTS".

Do NOT include:
- The user's information
- Generic personality traits already in their existing bio
- Conversational filler or opinions on topics`;

export async function enrichCompanionBio({
  userId,
  memberId,
  companionName,
  currentBio,
  recentMessages,
}: {
  userId: string;
  memberId: string;
  companionName: string;
  currentBio: string | undefined;
  recentMessages: { role: string; content: string }[];
}): Promise<void> {
  if (recentMessages.length < 10) {
    logger.log('[BioEnrichment] Skipped — fewer than 10 messages');
    return;
  }

  try {
    // Get the user's actual session token for auth
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      logger.warn('[BioEnrichment] No session token — skipping');
      return;
    }

    const transcript = recentMessages
      .slice(-40) // last 40 messages for context
      .map(m => `${m.role === 'user' ? 'User' : companionName}: ${m.content}`)
      .join('\n');

    const bioContext = currentBio && currentBio.trim().length > 5
      ? `Existing bio: "${currentBio}"`
      : 'No bio set yet — write one from scratch based on what the companion has shared.';

    const prompt = `${EXTRACTION_PROMPT}

${bioContext}

Recent conversation:
${transcript}

Updated bio (combine existing + new facts, or "NO_NEW_FACTS"):`;

    logger.log(`[BioEnrichment] Running enrichment for ${companionName} (currentBio: ${currentBio ? 'exists' : 'empty'})`);

    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        companionName: 'System',
        userName: 'System',
        companionGender: 'neutral',
        memories: '',
        vibe: 'warm',
      }),
    });

    if (!resp.ok) {
      logger.warn(`[BioEnrichment] Chat function returned ${resp.status}`);
      return;
    }
    if (!resp.body) {
      logger.warn('[BioEnrichment] No response body');
      return;
    }

    // Parse streaming response
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let text = '';
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) text += parsed.delta.text;
        } catch { /* skip */ }
      }
    }

    const enrichedBio = text.trim();
    if (!enrichedBio || enrichedBio === 'NO_NEW_FACTS' || enrichedBio.length < 10) {
      logger.log(`[BioEnrichment] No new facts found for ${companionName}`);
      return;
    }

    // Update the connection's bio
    const { error } = await supabase
      .from('connections')
      .update({ bio: enrichedBio })
      .eq('user_id', userId)
      .eq('member_id', memberId);

    if (error) {
      logger.warn(`[BioEnrichment] Failed to update bio: ${error.message}`);
    } else {
      logger.log(`[BioEnrichment] ✅ Updated bio for ${companionName}: "${enrichedBio.slice(0, 80)}…"`);
    }
  } catch (e) {
    logger.warn('[BioEnrichment] Error:', e);
  }
}
