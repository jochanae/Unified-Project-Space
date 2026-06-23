import React from 'react';
import { motion } from 'framer-motion';
import { Star, Volume2, Loader2, Copy, Check, Sparkles, Trash2, Smartphone, Cloud, CloudOff, BookOpen } from 'lucide-react';
import { useState, useRef, useCallback, useEffect } from 'react';
import LinkEmbed, { extractUrl, getTextWithoutUrl } from './LinkEmbed';
import AudioMessagePlayer from './AudioMessagePlayer';
import DeepDiveChips from './DeepDiveChips';
import { useCharacterReveal } from '@/hooks/useCharacterReveal';
import { LanguageCard, HabitCard, ReflectionCard, PracticeCard, DecisionCard, KnowledgeCard, RecipeCard, MemoryCard, DiscoveryCard, BlueprintCard } from '@/components/cards';
import { getDiscoveryTopic } from '@/lib/discoveryTopics';
import { buildInAxiom } from '@/lib/axiomHandoff';
import { supabase as sbClient } from '@/integrations/supabase/client';
import FocusSummaryCard from './FocusSummaryCard';
import MemoryMoment from './MemoryMoment';
import PassportStamp from './PassportStamp';
import { fireEventPost } from '@/lib/feedEvents';
import { getAvailableVoices, pickVoice, detectTextLanguage, getSavedRate, getSavedPitch } from '@/lib/readAloudVoice';
import { saveCollectibleFromChat } from '@/hooks/useCompanionCollectibles';
import BentoImageGrid from './chat/BentoImageGrid';
import { decodeSketchConsentFallback } from '@/lib/sketchToolToken';

/** Parse [SOURCE:docTitle]term[/SOURCE] tags into tappable spans */
function parseSourceRefs(
  text: string,
  onTapRef?: (docTitle: string, term: string) => void
): React.ReactNode {
  const regex = /\[SOURCE:([^\]]+)\](.*?)\[\/SOURCE\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Push text before this match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const docTitle = match[1];
    const term = match[2];
    parts.push(
      <button
        key={`src-${match.index}`}
        onClick={(e) => { e.stopPropagation(); onTapRef?.(docTitle, term); }}
        className="inline font-medium text-primary underline decoration-primary/40 underline-offset-2 decoration-dotted hover:decoration-solid hover:decoration-primary/70 transition-all cursor-pointer"
        title={`Source: ${docTitle}`}
      >
        {term}
      </button>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 && lastIndex > 0 ? <>{parts}</> : text;
}

interface MessageBubbleProps {
  content: string;
  isUser: boolean;
  companionName?: string;
  imageUrl?: string;
  imageLoading?: boolean;
  isPreview?: boolean;
  isVariations?: boolean;
  variations?: { imageUrl: string; description: string }[];
  onApproveImage?: () => void;
  onRetryImage?: () => void;
  onSelectVariation?: (variation: { imageUrl: string; description: string }) => void;
  onSaveMoment?: () => void;
  isSaved?: boolean;
  onPlayVoice?: (text: string) => void;
  voiceLoading?: boolean;
  /** True while the companion voice (ElevenLabs) is actively playing this clip */
  isVoicePlaying?: boolean;
  onSaveAsLook?: (imageUrl: string) => void;
  isAutoVoice?: boolean;
  /** When true, AI companion messages get the aura/shimmer treatment */
  isCompanion?: boolean;
  /** User and companion IDs for memory saving */
  userId?: string;
  companionMemberId?: string;
  /** Timestamp for ghost-style display */
  timestamp?: Date;
  /** Audio message */
  audioUrl?: string;
  audioDuration?: number;
  /** Delete individual message */
  onDelete?: () => void;
  /** Deep dive / web search */
  searchQuery?: string;
  isPremium?: boolean;
  onLookItUp?: (query: string) => void;
  searching?: boolean;
  searchComplete?: boolean;
  /** Message source: 'app' or 'sms' */
  source?: string;
  /** Save status indicator */
  savedStatus?: 'saving' | 'saved' | 'error';
  /** When true, show blinking cursor for streaming text */
  isStreaming?: boolean;
  /** Companion gender for Read Aloud voice matching */
  companionGender?: 'male' | 'female' | 'neutral' | string;
  /** Show watermark on images (mature mode) */
  matureMode?: boolean;
  /** Footer annotation below images */
  footerNote?: string;
  /** Callback when user taps a [SOURCE:] reference */
  onSourceTap?: (docTitle: string, term: string) => void;
  /** When true, apply ephemeral dissolve-in animation + breathing pulse */
  privateMode?: boolean;
  /** Age in days of the oldest memory used in context */
  memoryMomentDays?: number;
  /** The actual memory the reply referenced — required for the badge to render */
  memoryReference?: {
    text: string;
    extractedAt: string;
    daysOld: number;
  };
  /** Sketch metadata if this message wraps a work-image artifact. */
  sketchMeta?: {
    artifactId: string;
    visualKind: string;
    title: string;
    parentArtifactId?: string;
    stylePreset?: string;
  };
  /** Refine an existing sketch — opens a prompt for the tweak instruction. */
  onRefineSketch?: (instruction: string) => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="mt-1 ml-3 flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] font-light text-[rgba(212,175,55,0.4)] hover:text-[rgba(212,175,55,0.9)] hover:drop-shadow-[0_0_5px_rgba(212,175,55,0.3)] transition-all duration-300"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

/** Inline code block with one-tap copy — used inside companion replies that contain ``` fenced code. */
function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="relative my-2 rounded-xl overflow-hidden border border-[rgba(212,175,55,0.18)] bg-[rgba(10,10,14,0.65)] max-w-full min-w-0 w-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[rgba(212,175,55,0.12)] bg-[rgba(212,175,55,0.04)]">
        <span className="text-[10px] uppercase tracking-[0.12em] font-light text-[rgba(212,175,55,0.55)]">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] font-light text-[rgba(212,175,55,0.55)] hover:text-[rgba(212,175,55,0.95)] transition-all duration-300"
          aria-label="Copy code"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto px-3 py-2.5 text-[12.5px] leading-[1.55] font-mono text-foreground/90 whitespace-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/** Split a string by ```lang\ncode``` fenced blocks, rendering code as <CodeBlock> and text as the fallback renderer. */
function renderTextWithCodeBlocks(
  text: string,
  renderText: (chunk: string, key: string) => React.ReactNode
): React.ReactNode {
  const fence = /```([a-zA-Z0-9_+-]*)\n?([\s\S]*?)```/g;
  const out: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = fence.exec(text)) !== null) {
    if (match.index > lastIndex) {
      out.push(renderText(text.slice(lastIndex, match.index), `t-${i}`));
    }
    const lang = match[1] || undefined;
    const code = match[2].replace(/\n$/, '');
    out.push(<CodeBlock key={`c-${i}`} code={code} language={lang} />);
    lastIndex = match.index + match[0].length;
    i++;
  }
  if (lastIndex < text.length) {
    out.push(renderText(text.slice(lastIndex), `t-${i}`));
  }
  return out.length > 0 ? <>{out}</> : renderText(text, 't-0');
}

function formatTime(date?: Date): string {
  if (!date) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const sameDay = date.toDateString() === now.toDateString();

  if (sameDay) {
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const timeStr = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday ${timeStr}`;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays < 7) {
    return `${date.toLocaleDateString(undefined, { weekday: 'short' })} ${timeStr}`;
  }
  return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${timeStr}`;
}

function parseCards(content: string): {
  cleanText: string;
  card: { type: string; data: Record<string, any> } | null;
} {
  // Brace-balanced parser — handles arbitrarily nested JSON (blueprint sections etc.)
  const headerRegex = /\[CARD:(\w+)\]\{/g;
  const headerMatch = headerRegex.exec(content);
  if (!headerMatch) return { cleanText: content, card: null };

  const type = headerMatch[1];
  const jsonStart = headerMatch.index + headerMatch[0].length - 1; // points at the `{`
  let depth = 0;
  let inString = false;
  let escape = false;
  let end = -1;
  for (let i = jsonStart; i < content.length; i++) {
    const ch = content[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end === -1) return { cleanText: content, card: null };

  const jsonStr = content.slice(jsonStart, end + 1);
  const fullToken = content.slice(headerMatch.index, end + 1);
  let data: Record<string, any> = {};
  try {
    data = JSON.parse(jsonStr);
  } catch {
    return { cleanText: content.replace(fullToken, '').trim(), card: null };
  }

  return {
    cleanText: content.replace(fullToken, '').trim(),
    card: { type, data },
  };
}

async function saveCardMemory(
  userId: string,
  memberId: string,
  text: string,
  category: 'practice' | 'habit_completion' | 'card_save'
) {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    await supabase.from('memories').insert({
      user_id: userId,
      member_id: memberId,
      text,
      category,
      extracted_at: new Date().toISOString(),
    });
  } catch {
    // Non-blocking — memory save failure should never break the UI
  }
}

function fillChatInput(text: string, autoSend = false) {
  // Use global auto-send if available (most reliable path)
  if (autoSend && (window as any).__cardAutoSend) {
    (window as any).__cardAutoSend(text);
    return;
  }
  const textarea = document.querySelector<HTMLTextAreaElement>('textarea[data-chat-input]');
  if (textarea) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
    setter?.call(textarea, text);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.focus();
  }
}

function CardRenderer({ type, data, onPlayVoice, userId, memberId }: { type: string; data: Record<string, any>; onPlayVoice?: (text: string) => void; userId?: string; memberId?: string }) {
  const [selected, setSelected] = React.useState<string | undefined>();
  const [isSaved, setIsSaved] = React.useState(false);

  switch (type) {
    case 'language':
      return (
        <LanguageCard
          phrase={data.phrase ?? ''} translation={data.translation ?? ''} lang={data.lang ?? ''} phonetic={data.phonetic}
          onTypeIt={(typed) => {
            fillChatInput(`I tried typing "${data.phrase}": ${typed}`, true);
            if (userId && memberId) saveCardMemory(userId, memberId, `Typed practice: ${data.phrase} → ${typed}`, 'practice');
            if (userId) fireEventPost({ userId, eventType: 'rhythm_checkin', eventLabel: `Typed "${data.phrase}"`, eventContext: `Language practice · ${data.lang?.toUpperCase() ?? ''}` });
          }}
        />
      );
    case 'habit':
      return <HabitCard title={data.title ?? ''} emoji={data.emoji} streak={data.streak} planId={data.planId} onComplete={() => {
        if (userId && memberId) saveCardMemory(userId, memberId, `Completed: ${data.title}`, 'habit_completion');
        if (userId) fireEventPost({ userId, eventType: 'plan_complete', eventLabel: `Completed: ${data.title}`, eventContext: 'Habit check-in' });
      }} />;
    case 'reflection':
      return <ReflectionCard prompt={data.prompt ?? ''} onWrite={() => {
        fillChatInput(data.prompt ?? '');
        if (userId && memberId) saveCardMemory(userId, memberId, `[card:reflection] ${data.prompt}`, 'card_save');
      }} />;
    case 'practice':
      return (
        <PracticeCard
          scenario={data.scenario ?? ''} phrase={data.phrase} tip={data.tip}
          onHear={data.phrase ? () => {
            window.speechSynthesis?.cancel();
            const u = new SpeechSynthesisUtterance(data.phrase);
            u.rate = 0.85;
            window.speechSynthesis?.speak(u);
          } : undefined}
        />
      );
    case 'decision':
      return <DecisionCard question={data.question ?? ''} options={Array.isArray(data.options) ? data.options : []} selected={selected} onSelect={(opt) => {
        setSelected(opt);
        if (userId && memberId) saveCardMemory(userId, memberId, `[card:decision] ${data.question} → chose: ${opt}`, 'card_save');
      }} />;
    case 'knowledge':
      return <KnowledgeCard title={data.title ?? ''} body={data.body ?? ''} isSaved={isSaved} onSave={() => {
        setIsSaved(true);
        if (userId && memberId) saveCardMemory(userId, memberId, `[card:knowledge] ${data.title} | ${data.body ?? ''}`, 'card_save');
        if (userId) fireEventPost({ userId, eventType: 'rhythm_checkin', eventLabel: `Saved a tip: ${data.title}`, eventContext: data.body ?? '' });
      }} />;
    case 'recipe':
      return <RecipeCard title={data.title ?? ''} ingredients={Array.isArray(data.ingredients) ? data.ingredients : []} steps={Array.isArray(data.steps) ? data.steps : []} onMarkMade={() => {
        if (userId && memberId) saveCardMemory(userId, memberId, `[card:recipe] ${data.title}`, 'card_save');
        if (userId) fireEventPost({ userId, eventType: 'plan_complete', eventLabel: `Made: ${data.title}`, eventContext: 'Recipe completed' });
      }} />;
    case 'memory':
      return <MemoryCard text={data.text ?? ''} date={data.date} category={data.category} />;
    case 'discovery': {
      const topic = getDiscoveryTopic(data.topicId);
      if (!topic) return null;
      return (
        <DiscoveryCard
          topic={topic}
          onComplete={async (result, answers) => {
            if (!userId) return;
            await sbClient.from('discovery_results').upsert({
              user_id: userId,
              topic: topic.id,
              result_key: result.key,
              result_label: result.label,
              result_emoji: result.emoji,
              result_description: result.description,
              answers,
              member_id: memberId,
            }, { onConflict: 'user_id,topic' });
            if (memberId) saveCardMemory(userId, memberId, `[discovery:${topic.id}] Result: ${result.label}`, 'card_save');
          }}
        />
      );
    }
    case 'blueprint': {
      let activeProject: { id: string; name: string } | null = null;
      try {
        const raw = memberId ? localStorage.getItem(`compani-project-${memberId}`) : null;
        activeProject = raw ? JSON.parse(raw) : null;
      } catch { /* ignore */ }
      return (
        <BlueprintCard
          mode={data.mode ?? 'strategist'}
          title={data.title ?? ''}
          callout={data.callout}
          sections={Array.isArray(data.sections) ? data.sections : []}
          activeProjectName={activeProject?.name ?? null}
          onSave={async () => {
            if (!userId || !memberId) return;
            saveCardMemory(userId, memberId, `[card:blueprint] ${data.title}`, 'card_save');
            if (activeProject?.id) {
              try {
                const { supabase } = await import('@/integrations/supabase/client');
                await supabase.from('project_blueprints').insert({
                  user_id: userId,
                  project_id: activeProject.id,
                  member_id: memberId,
                  mode: data.mode ?? 'strategist',
                  title: data.title ?? '',
                  callout: data.callout ?? null,
                  sections: Array.isArray(data.sections) ? data.sections : [],
                });
                window.dispatchEvent(new CustomEvent('project-blueprint-saved', { detail: { projectId: activeProject.id } }));
              } catch { /* non-blocking */ }
            }
            setIsSaved(true);
          }}
          isSaved={isSaved}
          onBuildInAxiom={() => buildInAxiom({
            title: data.title ?? '',
            callout: data.callout,
            sections: Array.isArray(data.sections) ? data.sections : [],
          })}
        />
      );
    }
    default:
      return null;
  }
}

export default function MessageBubble({
  content, isUser, companionName, imageUrl, imageLoading, isPreview,
  isVariations, variations, onApproveImage, onRetryImage, onSelectVariation,
  onSaveMoment, isSaved, onPlayVoice, voiceLoading, isVoicePlaying, onSaveAsLook, isAutoVoice,
  isCompanion = false, timestamp, audioUrl, audioDuration, onDelete,
  searchQuery, isPremium, onLookItUp, searching, searchComplete, source, savedStatus, isStreaming,
  userId, companionMemberId, companionGender, matureMode, footerNote, onSourceTap,
  privateMode, memoryMomentDays, memoryReference, sketchMeta, onRefineSketch,
}: MessageBubbleProps) {
  const [showStar, setShowStar] = useState(false);
  const [isReadingAloud, setIsReadingAloud] = useState(false);
  // Auto-collapse long user messages (>400 chars) to keep the chat scannable
  const isLongUserMsg = isUser && typeof content === 'string' && content.length > 400;
  const [userExpanded, setUserExpanded] = useState(false);
  // Cancel any in-flight read-aloud when this bubble unmounts
  useEffect(() => () => { try { window.speechSynthesis?.cancel(); } catch {} }, []);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const handlePressStart = useCallback(() => {
    if (isUser || !onSaveMoment) return;
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setShowStar(true);
    }, 500);
  }, [isUser, onSaveMoment]);

  const handlePressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Determine if this is an AI companion (not just any non-user)
  const showAura = !isUser && isCompanion;
  const isSms = source === 'sms';

  // Smooth character-by-character reveal for streaming messages
  const revealedContent = useCharacterReveal(content, !!isStreaming, 14);

  // Parse card markers at component level so card can be rendered outside the bubble
  const cardParseResult = React.useMemo(() => {
    const effective = isStreaming ? revealedContent : content;
    const stripOffer = (s: string) => s.replace(/\[BLUEPRINT_OFFER\]/g, '').trim();
    if (isStreaming) {
      // Strip any [CARD:...] token (including deeply nested JSON like blueprint) during streaming
      return { cleanText: stripOffer(parseCards(effective).cleanText), card: null };
    }
    const parsed = parseCards(effective);
    return { cleanText: stripOffer(parsed.cleanText), card: parsed.card };
  }, [content, isStreaming, revealedContent]);
  const parsedCard = cardParseResult.card;
  // Detect blueprint offer marker — render inline "Turn into blueprint" CTA
  const hasBlueprintOffer = !isUser && !isStreaming && !parsedCard && /\[BLUEPRINT_OFFER\]/.test(content);

  // Auto-save cards to collectibles vault (fire once per card)
  const cardSavedRef = useRef(false);
  useEffect(() => {
    if (!parsedCard || cardSavedRef.current || isUser || isStreaming) return;
    if (!userId || !companionMemberId) return;
    const savableTypes = ['recipe', 'language', 'reflection', 'decision', 'knowledge', 'habit', 'practice'];
    if (!savableTypes.includes(parsedCard.type)) return;
    cardSavedRef.current = true;
    const title = parsedCard.data.title || parsedCard.data.phrase || parsedCard.data.question || parsedCard.data.prompt || parsedCard.type;
    saveCollectibleFromChat(userId, companionMemberId, {
      type: parsedCard.type,
      title: typeof title === 'string' ? title : parsedCard.type,
      content: parsedCard.data,
      companionName: companionName,
    });
  }, [parsedCard, isUser, isStreaming, userId, companionMemberId, companionName]);

  return (
    <motion.div
      initial={privateMode
        ? { opacity: 0, filter: 'blur(12px)', scale: 0.96 }
        : { opacity: 0, y: 16, x: isUser ? 12 : -12 }
      }
      animate={privateMode
        ? { opacity: 1, filter: 'blur(0px)', scale: 1 }
        : { opacity: 1, y: 0, x: 0 }
      }
      transition={privateMode
        ? { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
        : { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
      }
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
      onPointerDown={handlePressStart}
      onPointerUp={handlePressEnd}
      onPointerLeave={handlePressEnd}
      onContextMenu={(e) => { if (!isUser && onSaveMoment) e.preventDefault(); }}
    >
      <div className={`relative max-w-[85%] sm:max-w-[450px] md:max-w-[520px] min-w-0 w-fit ${isUser ? 'ml-auto items-end' : 'items-start'}`}>
        {!isUser && companionName && (
          <span className="mb-1.5 ml-3 flex items-center gap-1 text-xs font-medium text-muted-foreground">
            {showAura && <Sparkles className="h-3 w-3 text-primary/70" />}
            {companionName}
          </span>
        )}
        <motion.div
          className={`px-5 py-4 text-[15px] font-light leading-[1.85] min-w-0 max-w-full ${
            isUser
              ? 'rounded-[24px] rounded-br-[8px] text-foreground border backdrop-blur-md'
              : showAura
                ? 'rounded-[24px] rounded-bl-[8px] backdrop-blur-xl border text-white/90'
                : 'rounded-[24px] rounded-bl-[8px] backdrop-blur-xl border text-foreground'
          }`}
          style={{
            ...(isUser ? {
              background: privateMode
                ? 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(10,11,30,0.9) 100%)'
                : 'linear-gradient(135deg, rgba(212,175,55,0.05) 0%, rgba(10,11,30,0.8) 100%)',
              borderColor: privateMode ? 'rgba(212,175,55,0.45)' : 'rgba(212,175,55,0.3)',
              boxShadow: privateMode
                ? '0 0 20px rgba(212,175,55,0.15), 0 0 40px rgba(212,175,55,0.05)'
                : '0 0 15px rgba(212,175,55,0.1)',
            } : {
              background: privateMode ? 'rgba(26,27,46,0.55)' : 'rgba(26,27,46,0.4)',
              borderColor: privateMode ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.08)',
              boxShadow: privateMode
                ? '0 4px 15px rgba(0,0,0,0.3), 0 0 25px rgba(212,175,55,0.04), inset 0 1px 0 rgba(212,175,55,0.04)'
                : showAura
                  ? '0 4px 15px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)'
                  : '0 4px 15px rgba(0,0,0,0.2)',
            }),
            // Breathing pulse animation for private mode
            ...(privateMode ? {
              animation: 'private-breath 4s ease-in-out infinite',
            } : {}),
          }}
        >
          {/* Audio message player */}
          {audioUrl && audioDuration ? (
            <AudioMessagePlayer audioUrl={audioUrl} duration={audioDuration} isUser={isUser} />
          ) : (() => {
            const consentFallback = decodeSketchConsentFallback(cardParseResult.cleanText);
            const cleanText = consentFallback.cleanText;
            // Extract [IMG:url] markers from content
            const imgMarkerRegex = /\[IMG:(https?:\/\/[^\]\s]+)\]/g;
            const inlineImages: string[] = [];
            let match;
            while ((match = imgMarkerRegex.exec(cleanText)) !== null) {
              inlineImages.push(match[1]);
            }
            const cleanedContent = cleanText.replace(/\s*\[IMG:(https?:\/\/[^\]\s]*)\]\s*/g, '').trim();

            const linkUrl = extractUrl(cleanedContent);
            const displayText = linkUrl ? getTextWithoutUrl(cleanedContent, linkUrl) : cleanedContent;
            // Hide redundant "📷 Sent a photo" label when the image is shown inline
            const isRedundantPhotoLabel = (imageUrl || inlineImages.length > 0) && (displayText === '📷 Sent a photo' || displayText === '(shared a photo)');
            // When 2+ inline images, render the cinematic Bento Grid instead of stacked images
            const useBento = inlineImages.length > 1;
            return (
              <>
                {displayText && !isRedundantPhotoLabel && (
                  <div className="break-words min-w-0 max-w-full">
                    {(() => {
                      const shouldCollapse = isLongUserMsg && !userExpanded;
                      const textToRender = shouldCollapse ? displayText.slice(0, 280).trimEnd() + '…' : displayText;
                      return (
                        <>
                          {renderTextWithCodeBlocks(textToRender, (chunk, key) => (
                            <React.Fragment key={key}>
                              {!isUser && onSourceTap ? parseSourceRefs(chunk, onSourceTap) : chunk}
                            </React.Fragment>
                          ))}
                          {isLongUserMsg && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setUserExpanded((v) => !v); }}
                              className="mt-1.5 block text-[11px] font-medium text-primary/70 hover:text-primary transition-colors"
                            >
                              {userExpanded ? 'Show less' : 'Show more'}
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
                {isStreaming && (
                  <span
                    className="inline-block w-[2px] h-[1em] ml-[1px] align-middle bg-current opacity-70 animate-pulse"
                    style={{ verticalAlign: '-0.1em' }}
                  />
                )}
                {linkUrl && <LinkEmbed url={linkUrl} />}
                {useBento ? (
                  <BentoImageGrid images={inlineImages} matureMode={matureMode} />
                ) : (
                  inlineImages.map((src, idx) => (
                    <img
                      key={`inline-img-${idx}`}
                      src={src}
                      alt="Shared moment"
                      className="mt-2 w-full rounded-2xl object-cover max-h-64"
                      loading="lazy"
                      decoding="async"
                    />
                  ))
                )}
                {sketchMeta && onRefineSketch && (inlineImages.length > 0 || imageUrl) && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const instruction = window.prompt('How should I tweak this sketch?');
                        if (instruction && instruction.trim()) onRefineSketch(instruction.trim());
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium text-[rgba(212,175,55,0.9)] bg-[rgba(212,175,55,0.06)] border border-[rgba(212,175,55,0.22)] hover:bg-[rgba(212,175,55,0.12)] transition-colors"
                    >
                      <Sparkles className="h-3 w-3" />
                      Refine
                    </button>
                    {sketchMeta.stylePreset && (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-[0.1em] font-light text-muted-foreground/70 bg-white/[0.03] border border-white/10">
                        {sketchMeta.stylePreset}
                      </span>
                    )}
                  </div>
                )}
                {!isUser && consentFallback.prompt && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const fn = (window as any).__cardAutoSend;
                      if (typeof fn === 'function') fn(`Generate this visual now: ${consentFallback.prompt}`);
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium text-[rgba(212,175,55,0.9)] bg-[rgba(212,175,55,0.06)] border border-[rgba(212,175,55,0.22)] hover:bg-[rgba(212,175,55,0.12)] transition-colors"
                  >
                    <Sparkles className="h-3 w-3" />
                    Try render again
                  </button>
                )}
              </>
            );
          })()}
          {timestamp && (
            <div className="mt-1 flex items-center justify-end gap-1.5">
              {/* Save status indicator for companion messages */}
              {!isUser && savedStatus && (
                <span className="inline-flex items-center gap-0.5 text-[10px] leading-none opacity-40 select-none">
                  {savedStatus === 'saving' && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
                  {savedStatus === 'saved' && <Cloud className="h-2.5 w-2.5" />}
                  {savedStatus === 'error' && <CloudOff className="h-2.5 w-2.5 text-destructive" />}
                </span>
              )}
              {isSms && (
                <span className="inline-flex items-center gap-0.5 text-[10px] leading-none opacity-50 select-none">
                  <Smartphone className="h-2.5 w-2.5" />
                  SMS
                </span>
              )}
              <span className="text-[10px] leading-none opacity-40 select-none">
                {formatTime(timestamp)}
              </span>
            </div>
          )}

          {/* Image loading shimmer */}
          {imageLoading && !imageUrl && (
            <div className="mt-2 w-full rounded-2xl bg-muted/40 overflow-hidden" style={{ height: 200 }}>
              <div className="h-full w-full animate-pulse bg-gradient-to-r from-muted/30 via-muted/60 to-muted/30 bg-[length:200%_100%]" 
                style={{ animation: 'shimmer 1.5s ease-in-out infinite' }} />
            </div>
          )}

          {imageUrl && (
            <div className="relative mt-2">
              <img
                src={imageUrl}
                alt="Shared moment"
                className="w-full rounded-2xl object-cover max-h-64"
                loading="lazy"
                decoding="async"
              />
              {matureMode && (
                <span className="absolute bottom-2 right-2 text-[9px] text-white/40 font-medium select-none pointer-events-none drop-shadow-sm">
                  © Compani · Personal Use Only
                </span>
              )}
            </div>
          )}

          {/* Preview approve/retry buttons */}
          {isPreview && imageUrl && !imageLoading && (
            <div className="mt-2 flex gap-2">
              {onApproveImage && (
                <button
                  onClick={(e) => { e.stopPropagation(); onApproveImage(); }}
                  className="flex-1 rounded-full gradient-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-all active:scale-[0.98]"
                >
                  Love it 💛
                </button>
              )}
              {onRetryImage && (
                <button
                  onClick={(e) => { e.stopPropagation(); onRetryImage(); }}
                  className="flex-1 rounded-full border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary transition-all active:scale-[0.98]"
                >
                  Try again
                </button>
              )}
            </div>
          )}

          {/* Side-by-side variation picker */}
          {isVariations && variations && variations.length === 2 && !imageLoading && (
            <div className="mt-3 space-y-2">
              <div className="flex gap-2">
                {variations.map((v, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => { e.stopPropagation(); onSelectVariation?.(v); }}
                    className="flex-1 group relative rounded-xl overflow-hidden border-2 border-border hover:border-primary transition-all"
                  >
                    <img
                      src={v.imageUrl}
                      alt={`Option ${idx + 1}`}
                      className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                      <span className="text-[11px] font-semibold text-white">
                        {idx === 0 ? 'Option A' : 'Option B'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground/60 text-center">Tap the one you like best</p>
            </div>
          )}


          {/* Use as look */}
          {!isUser && imageUrl && onSaveAsLook && (
            <button
              onClick={(e) => { e.stopPropagation(); onSaveAsLook(imageUrl); }}
              className="mt-1.5 flex items-center gap-1.5 rounded-full bg-secondary/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              ✨ Use as their look
            </button>
           )}

          {/* Footer note (e.g. first memory together) */}
           {footerNote && (
            <p className="text-[10px] text-primary/50 text-center mt-2 italic">
              {footerNote}
            </p>
          )}

          {/* Memory Moment indicator — only renders when a real reference is detected */}
          {!isUser && memoryReference && memoryReference.daysOld >= 7 && (
            <MemoryMoment
              days={memoryReference.daysOld}
              reference={memoryReference}
              className="mt-2 ml-1"
            />
          )}
        </motion.div>

        {/* Smart Card rendering */}
        {parsedCard && !isUser && (
          <CardRenderer type={parsedCard.type} data={parsedCard.data} onPlayVoice={onPlayVoice} userId={userId} memberId={companionMemberId} />
        )}

        {/* Blueprint offer — proactive nudge in Strategic mode */}
        {hasBlueprintOffer && (
          <motion.button
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.15 }}
            onClick={(e) => {
              e.stopPropagation();
              const fn = (window as any).__triggerBlueprint;
              if (typeof fn === 'function') fn();
            }}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-medium text-[rgba(212,175,55,0.95)] bg-[rgba(212,175,55,0.08)] border border-[rgba(212,175,55,0.25)] hover:bg-[rgba(212,175,55,0.14)] hover:border-[rgba(212,175,55,0.4)] transition-colors"
          >
            <Sparkles className="h-3 w-3" />
            Turn this into a blueprint
          </motion.button>
        )}

        {/* Focus Summary — Inscribed brainstorm card */}
        {(() => {
          const summaryMatch = content.match(/\[FOCUS_SUMMARY:([^\]]+)\]\s*([\s\S]*)/);
          if (!summaryMatch || isUser) return null;
          const summaryTitle = summaryMatch[1].trim();
          const summaryPoints = summaryMatch[2]
            .split(/\n/)
            .map(l => l.replace(/^\d+\.\s*/, '').trim())
            .filter(Boolean);
          return (
            <FocusSummaryCard
              title={summaryTitle}
              points={summaryPoints}
              companionName={companionName}
              onExport={() => {
                const text = `${summaryTitle}\n\n${summaryPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}`;
                navigator.clipboard.writeText(text);
              }}
            />
          );
        })()}

        {/* Passport Stamp — new city detection */}
        {(() => {
          const stampMatch = content.match(/\[PASSPORT_STAMP:([^\]]+)\|([^\]]+)\]/);
          if (!stampMatch) return null;
          return (
            <PassportStamp
              cityName={stampMatch[1].trim()}
              date={stampMatch[2].trim()}
              companionName={companionName}
            />
          );
        })()}

        {/* Search in progress indicator */}
        {!isUser && searching && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/10 px-3 py-2"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary/70" />
            <span className="text-xs text-primary/70 font-medium">Looking that up for you…</span>
          </motion.div>
        )}

        {/* Deep dive chips for search-worthy messages */}
        {!isUser && searchQuery && (
          <DeepDiveChips
            searchQuery={searchQuery}
            isPremium={isPremium}
            onLookItUp={onLookItUp}
            searching={searching}
            searchComplete={searchComplete}
          />
        )}

        {/* Utility row: Read Aloud, Copy, Delete */}
        <div className="flex items-center gap-3 mt-1.5">
          {!isUser && content && !parsedCard && (() => {
            // Strip markdown / cards / image markers for clean spoken text
            const spokenText = content
              .replace(/\[CARD:\w+\]\{[\s\S]*?\}(?:\})?/g, '')
              .replace(/\[IMG:https?:\/\/[^\]\s]+\]/g, '')
              .replace(/```[\s\S]*?```/g, '')
              .replace(/\*\*([^*]+)\*\*/g, '$1')
              .replace(/\*([^*]+)\*/g, '$1')
              .replace(/__([^_]+)__/g, '$1')
              .replace(/_([^_]+)_/g, '$1')
              .replace(/#{1,6}\s/g, '')
              .replace(/!\[.*?\]\(.*?\)/g, '')
              .replace(/\[([^\]]+)\]\(.*?\)/g, '$1')
              .replace(/[`~>|]/g, '')
              .replace(/\n{2,}/g, '. ')
              .replace(/\n/g, ' ')
              .trim();
            if (!spokenText) return null;

            const handleClick = async () => {
              if (!window.speechSynthesis) return;
              // If something is already speaking, tapping again stops it (toggle off)
              if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
                window.speechSynthesis.cancel();
                setIsReadingAloud(false);
                return;
              }
              const detectedLang = detectTextLanguage(spokenText);
              const voices = await getAvailableVoices();
              const voice = pickVoice(voices, companionGender, detectedLang);
              const utterance = new SpeechSynthesisUtterance(spokenText);
              if (voice) utterance.voice = voice;
              utterance.rate = getSavedRate();
              utterance.pitch = getSavedPitch();
              utterance.onend = () => setIsReadingAloud(false);
              utterance.onerror = () => setIsReadingAloud(false);
              setIsReadingAloud(true);
              window.speechSynthesis.speak(utterance);
            };

            return (
              <button
                onClick={handleClick}
                className="flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] font-light text-[rgba(212,175,55,0.5)] hover:text-[rgba(212,175,55,0.9)] transition-all duration-300"
                aria-label={isReadingAloud ? 'Stop reading' : 'Read aloud'}
              >
                <Volume2 className={`h-3 w-3 ${isReadingAloud ? 'animate-pulse text-[rgba(212,175,55,0.95)]' : ''}`} />
                {isReadingAloud ? 'Stop' : 'Read Aloud'}
              </button>
            );
          })()}
          {content && (
            <CopyButton text={content} />
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="mt-1 flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] font-light text-[rgba(212,175,55,0.4)] hover:text-[rgba(255,75,75,0.8)] hover:drop-shadow-[0_0_5px_rgba(255,75,75,0.25)] transition-all duration-300"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
          )}
        </div>

        {/* Star action */}
        {(showStar || isSaved) && !isUser && onSaveMoment && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => {
              onSaveMoment();
              setShowStar(false);
            }}
            className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-card border border-border shadow-md"
          >
            <Star className={`h-3.5 w-3.5 ${isSaved ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
