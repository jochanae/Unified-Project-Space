import { supabase } from '@/integrations/supabase/client';
import type { Connection } from '@/hooks/useProfile';
import type { Profile } from '@/hooks/useProfile';
import type { CompanionPlan } from '@/hooks/useCompanionPlans';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

/**
 * When user marks a plan complete, sends a message to that companion's chat
 * and triggers a contextual acknowledgment based on the companion's role and plan type.
 */
export async function sendPlanCompletionToChat(
  userId: string,
  plan: CompanionPlan,
  connections: Connection[],
  profile: Profile | null,
  isRhythm?: boolean
): Promise<void> {
  if (!plan.memberId || plan.memberId === 'user') return;
  const connection = connections.find((c) => c.memberId === plan.memberId);
  if (!connection) return;

  const userName = profile?.userName || 'Friend';
  const userMessage = isRhythm
    ? `[System: ${userName} just checked in on their '${plan.title}' rhythm. Acknowledge it like you noticed them showing up — present, not celebratory. 1 sentence is enough.]`
    : `[System: ${userName} just completed their plan: '${plan.title}'. Acknowledge this warmly and personally — not generically. Reference something specific about this plan if you know it. Keep it brief, 1-2 sentences max.]`;

  await supabase.from('chat_messages').insert({
    user_id: userId,
    member_id: plan.memberId,
    role: 'user',
    content: userMessage,
    source: 'plan-completion',
  });

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: userMessage }],
        companionName: connection.name,
        userName: profile?.userName || 'Friend',
        companionGender: connection.gender || profile?.companionGender || 'neutral',
        vibe: profile?.vibe,
        connectionMode: connection.connectionMode || 'friend',
        backstory: connection.backstory,
        personaAge: connection.age,
        personaBio: connection.bio,
        personaPersonality: connection.personality,
        personaMemberGender: connection.gender,
        memberId: plan.memberId,
      }),
    });

    if (resp.ok && resp.body) {
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let rawStream = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        rawStream += decoder.decode(value, { stream: true });
      }
      let replyText = '';
      for (const line of rawStream.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr || jsonStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            replyText += parsed.delta.text;
          }
        } catch {
          if (!jsonStr.startsWith('{')) replyText += jsonStr;
        }
      }
      if (!replyText && !rawStream.includes('event:')) replyText = rawStream;
      replyText = replyText
        .replace(/\[GIFT_HINT:[^\]]*\]/g, '')
        .replace(/\[SEARCH_HINT:[^\]]*\]/g, '')
        .trim();
      if (replyText) {
        await supabase.from('chat_messages').insert({
          user_id: userId,
          member_id: plan.memberId,
          role: 'assistant',
          content: replyText,
          source: 'plan-completion-reply',
        });
      }
    }
  } catch (e) {
    console.error('[PlanCompletion] Companion reply failed:', e);
  }
}
