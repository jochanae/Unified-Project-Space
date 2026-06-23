import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getStyleById } from '@/lib/communicationStyles';
import type { CircleMessage } from '@/hooks/useCircles';

interface CompanionInfo {
  memberId: string;
  name: string;
  personality?: string | null;
  gender?: string | null;
  age?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  communicationStyle?: string | null;
  appearanceDesc?: string | null;
  referenceImageUrl?: string | null;
}

interface UseCompanionEngineParams {
  circleId: string | undefined;
  userId: string | undefined;
  userName: string;
  vibe: string | null | undefined;
  companionGender: string;
  imageStyle: string;
  circleName: string;
  circleDescription: string;
  circleVibe: string;
  effectiveCircleType: string;
  members: { user_id: string; display_name?: string | null }[];
  memberNames: Record<string, string>;
  messages: CircleMessage[];
  myCompanions: { member_id: string; companion_name: string; mode: string; id: string }[];
  allCircleCompanions: { member_id: string; companion_name: string; mode: string; user_id: string }[];
  connections: CompanionInfo[];
  activeCompanion: CompanionInfo | null;
  activeCompanionMode: string;
  sendMessage: (content: string, senderName: string, senderType?: string) => Promise<void>;
}

export function useCompanionEngine({
  circleId, userId, userName, vibe, companionGender, imageStyle,
  circleName, circleDescription, circleVibe, effectiveCircleType,
  members, memberNames, messages, myCompanions, allCircleCompanions,
  connections, activeCompanion, activeCompanionMode, sendMessage,
}: UseCompanionEngineParams) {
  const [companionTyping, setCompanionTyping] = useState(false);
  const [lastCompanionReplyAt, setLastCompanionReplyAt] = useState(0);
  const [lastSpeakingCompanion, setLastSpeakingCompanion] = useState<string | null>(null);
  const speakingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const companionSpeakingLock = useRef(false);
  const lullTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHumanMessageAt = useRef<number>(0);

  const COMPANION_COOLDOWN_MS = 8000;
  const COMPANION_TO_COMPANION_CHANCE = 0.35;
  const COMPANION_MEDIA_CHANCE = 0.15;

  const triggerCompanionReply = useCallback(async (mentionedName?: string, specificCompanion?: CompanionInfo) => {
    if (!userId || !circleId) return;
    const now = Date.now();
    if (now - lastCompanionReplyAt < COMPANION_COOLDOWN_MS) return;
    if (companionSpeakingLock.current) return;
    companionSpeakingLock.current = true;

    let companionToRespond = specificCompanion || activeCompanion;
    if (mentionedName && !specificCompanion) {
      const mentioned = myCompanions.find(c => c.companion_name.toLowerCase() === mentionedName.toLowerCase());
      if (mentioned) companionToRespond = connections.find(c => c.memberId === mentioned.member_id) || null;
    }
    if (!companionToRespond) { companionSpeakingLock.current = false; return; }

    setCompanionTyping(true);
    setLastSpeakingCompanion(companionToRespond.memberId);
    setLastCompanionReplyAt(now);

    const recentMessages = messages.slice(-20).map(m => ({ sender_name: m.sender_name, sender_type: m.sender_type, content: m.content }));
    const humanParticipants = members.map(m => m.display_name || memberNames[m.user_id] || 'Friend').filter(Boolean);

    const myStyleId = companionToRespond.communicationStyle;
    const myStyle = myStyleId ? getStyleById(myStyleId) : null;
    const communicationStylePrompt = myStyle?.promptModifier || '';

    const otherCompanionStyles = allCircleCompanions
      .filter(cc => cc.mode === 'active' && cc.companion_name !== companionToRespond!.name)
      .map(cc => {
        const conn = connections.find(c => c.memberId === cc.member_id);
        const styleId = conn?.communicationStyle;
        const style = styleId ? getStyleById(styleId) : null;
        return style ? { name: cc.companion_name, style: style.label, contrastNote: style.contrastNote } : null;
      })
      .filter(Boolean);

    try {
      const { data, error } = await supabase.functions.invoke('circle-reply', {
        body: {
          circleMessages: recentMessages, companionName: companionToRespond.name,
          companionPersonality: companionToRespond.personality, companionGender: companionToRespond.gender || companionGender,
          companionAge: companionToRespond.age, companionBio: companionToRespond.bio, userName,
          vibe, circleName, humanParticipants,
          circleDescription, circleVibe: circleVibe || undefined,
          circleType: effectiveCircleType,
          communicationStyle: communicationStylePrompt || undefined,
          otherCompanionStyles: otherCompanionStyles.length > 0 ? otherCompanionStyles : undefined,
        },
      });
      if (error) return;
      const reply = data?.reply;
      if (reply) {
        await sendMessage(reply, companionToRespond.name, 'companion');

        if (Math.random() < COMPANION_MEDIA_CHANCE && companionToRespond.appearanceDesc) {
          setTimeout(async () => {
            try {
              const { data: imgData } = await supabase.functions.invoke('companion-image', {
                body: {
                  messages: recentMessages.slice(-6),
                  companionName: companionToRespond!.name,
                  userName,
                  companionAppearanceDesc: companionToRespond!.appearanceDesc,
                  referenceImageUrl: companionToRespond!.referenceImageUrl,
                  mode: 'contextual',
                  userId,
                  memberId: companionToRespond!.memberId,
                  imageStyle: imageStyle || 'photorealistic',
                },
              });
              if (imgData?.imageUrl) {
                await sendMessage(`📸 [📸 Photo](${imgData.imageUrl})`, companionToRespond!.name, 'companion');
              }
            } catch (e) {
              console.error('[CircleCompanionImage] Failed:', e);
            }
          }, 2000 + Math.random() * 3000);
        }
      }
    } catch (e) {
      console.error('[CompanionEngine] Reply failed:', e);
    } finally {
      setCompanionTyping(false);
      companionSpeakingLock.current = false;
      try { navigator.vibrate?.(15); } catch {}
      if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current);
      speakingTimerRef.current = setTimeout(() => setLastSpeakingCompanion(null), 3000);
    }
  }, [activeCompanion, myCompanions, connections, userId, circleId, messages, sendMessage, members, memberNames, lastCompanionReplyAt, userName, vibe, companionGender, imageStyle, circleName, circleDescription, circleVibe, effectiveCircleType, allCircleCompanions]);

  const lastProcessedHumanMsgRef = useRef<string | null>(null);
  const lastProcessedMsgRef = useRef<string | null>(null);
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.id === lastProcessedMsgRef.current) return;
    lastProcessedMsgRef.current = lastMsg.id;
    if (lastMsg.sender_type !== 'companion') return;
    const myActiveCompanions = myCompanions.filter(
      mc => mc.mode === 'active' && mc.companion_name !== lastMsg.sender_name
    );
    if (myActiveCompanions.length === 0) return;
    for (const otherComp of myActiveCompanions) {
      if (Math.random() < COMPANION_TO_COMPANION_CHANCE) {
        const conn = connections.find(c => c.memberId === otherComp.member_id);
        if (conn) {
          const delay = 3000 + Math.random() * 4000;
          setTimeout(() => triggerCompanionReply(undefined, conn), delay);
        }
        break;
      }
    }
  }, [messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Call this when a human sends a message — handles wake-words, active-mode replies, and lull timer */
  const onHumanMessage = useCallback((msgText: string) => {
    lastHumanMessageAt.current = Date.now();
    if (lullTimerRef.current) clearTimeout(lullTimerRef.current);

    if (myCompanions.length > 0) {
      const mentionedCompanion = myCompanions.find(c => msgText.toLowerCase().includes(c.companion_name.toLowerCase()));
      if (mentionedCompanion) {
        setTimeout(() => triggerCompanionReply(mentionedCompanion.companion_name), 800 + Math.random() * 1200);
      } else if (activeCompanionMode === 'active') {
        setTimeout(() => triggerCompanionReply(), 1500 + Math.random() * 2000);
      }
    }

    // Lull timer
    const lullDelay = 5000 + Math.random() * 3000;
    lullTimerRef.current = setTimeout(() => {
      if (companionSpeakingLock.current) return;
      const activeComps = myCompanions.filter(c => c.mode === 'active');
      if (activeComps.length > 0 && Date.now() - lastHumanMessageAt.current >= 4500) {
        const comp = connections.find(c => c.memberId === activeComps[0].member_id);
        if (comp) triggerCompanionReply(undefined, comp);
      }
    }, lullDelay);
  }, [myCompanions, activeCompanionMode, connections, triggerCompanionReply]);

  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.id === lastProcessedHumanMsgRef.current) return;
    if (lastMsg.sender_type !== 'human' || lastMsg.user_id !== userId) return;
    lastProcessedHumanMsgRef.current = lastMsg.id;
    onHumanMessage(lastMsg.content);
  }, [messages.length, userId, onHumanMessage]);

  /** Call on VAD speech start to clear lull timer */
  const onSpeechStart = useCallback(() => {
    lastHumanMessageAt.current = Date.now();
    if (lullTimerRef.current) { clearTimeout(lullTimerRef.current); lullTimerRef.current = null; }
  }, []);

  return {
    companionTyping,
    lastSpeakingCompanion,
    triggerCompanionReply,
    onHumanMessage,
    onSpeechStart,
    thinkingCompanionIds: companionTyping && lastSpeakingCompanion ? [lastSpeakingCompanion] : [] as string[],
  };
}
