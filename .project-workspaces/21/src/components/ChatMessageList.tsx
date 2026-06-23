/**
 * ChatMessageList — scrollable message area + media picker for ChatInterface.
 * Extracted to keep ChatInterface focused on state and send logic.
 */

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Crown, ChevronDown, Lock, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import MessageBubble from './MessageBubble';
import InlineSketchOffer from './chat/InlineSketchOffer';
import { decodeSketchPrefix } from '@/lib/sketchEncoding';
import { useWorkImage } from '@/hooks/useWorkImage';
import { encodeSketchPrefix } from '@/lib/sketchEncoding';

const BLUEPRINT_INVITE_PHRASES = [
  "help me understand you better",
  "better i can show up for you",
  "tell me what you're really looking for",
];
import CompanionMomentCard from './CompanionMomentCard';
import LetterGiftCard from './LetterGiftCard';
import CompanionMediaPicker from './CompanionMediaPicker';
import SupportCheckInCard from './SupportCheckInCard';
import { PlanStepsList, formatSessionDate } from './ChatUtils';
import TimeJumpThread from './TimeJumpThread';
import type { ChatMessage } from '@/hooks/useChatHistory';
import type { CompanionMediaItem } from '@/hooks/useCompanionMedia';
import type { Connection, Profile } from '@/hooks/useProfile';
import { describeFromImage } from '@/lib/describeFromImage';

interface PendingSaveOffer {
  messageId: string;
  title: string;
  steps: string[];
  note?: string;
}

interface ChatMessageListProps {
  // Messages
  messages: ChatMessage[];
  searchQuery: string;
  /** When true, messages use ephemeral private-mode styling */
  privateMode?: boolean;
  /** When true, play the veil exit (shredder) animation on all messages */
  veilExitActive?: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  handleLoadMore: () => void;
  isTyping: boolean;
  // Companion identity
  chatPartnerName: string;
  chatPartnerInitial: string;
  chatPartnerColorVar: string;
  connectionAvatarUrl: string;
  isChatWithCompanion: boolean;
  // Message actions
  handleApproveAvatar: () => void;
  handleRetryAvatar: () => void;
  handleSelectVariation: (msgId: string, v: { imageUrl: string; description: string }) => void;
  handleWebSearch: (msgId: string, q: string) => void;
  onSaveMoment?: (opts: { memberId: string; content: string; imageUrl?: string }) => void;
  memberId: string;
  deleteMessage: (id: string) => void;
  onUpdateConnection?: (memberId: string, updates: Partial<Connection>) => void;
  onUpdateProfile?: (updates: Partial<Profile>) => void;
  addMessage: (msg: ChatMessage) => void;
  // Save offer
  pendingSaveOffer: PendingSaveOffer | null;
  acceptSaveOffer: () => void;
  dismissSaveOffer: () => void;
  // UI state
  resolvedAvatarUrl: string;
  showCuriosityNudge: boolean;
  setShowCuriosityNudge: (v: boolean) => void;
  showPremiumGateInChat: boolean;
  setShowPremiumGateInChat: (v: boolean) => void;
  setShowUpgradeModal: (v: boolean) => void;
  showCheckInCard: boolean;
  setConversationPaused: (v: boolean) => void;
  setShowCrisis: (v: boolean) => void;
  crisisTierRef: React.MutableRefObject<number>;
  crisisFollowUpRef: React.MutableRefObject<'okay' | 'rough' | null>;
  setShowCheckInCard: (v: boolean) => void;
  scrollRef: React.RefObject<HTMLDivElement>;
  showScrollBottom: boolean;
  scrollToBottom: () => void;
  // Media picker
  showMediaPicker: boolean;
  setShowMediaPicker: (v: boolean) => void;
  mediaLoading: boolean;
  requestCompanionMedia: (type: string, opts?: Record<string, unknown>) => void;
  cachedStickers: CompanionMediaItem[];
  batchGenerateStickers: (missing: { prompt: string }[], target: 'companion' | 'user') => void;
  batchGenerating: Set<string>;
  incrementUsage: (id: string) => void;
  cameraInputRef: React.RefObject<HTMLInputElement>;
  photoInputRef: React.RefObject<HTMLInputElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  setInput: (v: string) => void;
  pendingCardType: string | null;
  setPendingCardType: (v: string | null) => void;
  // Auth
  subscribed?: boolean;
  usageLimits: { canGenerateImage: boolean };
  profile: Profile;
  userId: string;
  connection?: Connection;
  onPersistMessage?: (content: string, role: 'user' | 'assistant', imageUrl?: string) => void;
  onAppendHistory?: (entry: { role: string; content: string }) => void;
  onTriggerReply?: (contextNote: string) => void;
  onNavigateToSettings?: () => void;
  onSourceTap?: (docTitle: string, term: string) => void;
  onTogglePrivateMode?: () => void;
  situationalMode?: string | null;
  // Voice playback (ElevenLabs) — wired through to message bubbles
  onPlayVoice?: (text: string) => void;
  voiceLoadingText?: string | null;
  playingVoiceText?: string | null;
  /** When true, the Sketch-this affordance is allowed to surface. */
  strategistActive?: boolean;
}

export default function ChatMessageList(props: ChatMessageListProps) {
  const navigate = useNavigate();
  const [showTimeJump, setShowTimeJump] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressActive = useRef(false);
  const longPressStartPos = useRef<{ x: number, y: number } | null>(null);
  const {
    messages, searchQuery, hasMore, loadingMore, handleLoadMore, isTyping,
    chatPartnerName, chatPartnerInitial, chatPartnerColorVar, connectionAvatarUrl,
    isChatWithCompanion, handleApproveAvatar, handleRetryAvatar,
    handleSelectVariation, handleWebSearch, onSaveMoment, memberId, deleteMessage,
    onUpdateConnection, onUpdateProfile, addMessage,
    pendingSaveOffer, acceptSaveOffer, dismissSaveOffer,
    resolvedAvatarUrl, showCuriosityNudge, setShowCuriosityNudge,
    showPremiumGateInChat, setShowPremiumGateInChat, setShowUpgradeModal,
    showCheckInCard, setShowCheckInCard, setConversationPaused, setShowCrisis, crisisTierRef, crisisFollowUpRef,
    scrollRef, showScrollBottom, scrollToBottom,
    showMediaPicker, setShowMediaPicker, mediaLoading, requestCompanionMedia,
    cachedStickers, batchGenerateStickers, batchGenerating, incrementUsage, cameraInputRef, photoInputRef, fileInputRef,
    inputRef, setInput, pendingCardType, setPendingCardType,
    subscribed, usageLimits, profile, userId, connection,
    onPersistMessage, onAppendHistory, onTriggerReply, onNavigateToSettings,
    onSourceTap,
    situationalMode,
  } = props;

  // Multi-turn refinement of an existing sketch — generates a new artifact
  // linked to its parent and appends a fresh assistant bubble.
  const { generate: generateSketch } = useWorkImage();
  const handleRefineSketch = useCallback(async (
    meta: { artifactId: string; visualKind: import('@/hooks/useWorkImage').WorkVisualKind; title: string; prompt?: string; stylePreset?: import('@/lib/sketchStylePresets').SketchStylePreset },
    imageUrl: string,
    instruction: string,
  ) => {
    if (!instruction.trim() || !userId || !memberId) return;
    const result = await generateSketch({
      prompt: instruction.trim(),
      visualKind: meta.visualKind,
      stylePreset: meta.stylePreset,
      memberId,
      referenceImageUrl: imageUrl,
      parentArtifactId: meta.artifactId,
      title: meta.title,
      conversationContext: meta.prompt ? `Original visual prompt: ${meta.prompt}` : undefined,
    });
    if (!result) return;
    const caption = result.title || meta.title;
    // body has no [IMG:url] — imageUrl is the separate message field so the
    // bubble renders once. Persistence re-appends [IMG:url] via encodeImageContent.
    const body = caption;
    const content = result.artifactId
      ? encodeSketchPrefix(
          {
            artifactId: result.artifactId,
            visualKind: result.visualKind,
            title: caption,
            parentArtifactId: meta.artifactId,
            prompt: `${meta.prompt ? `${meta.prompt}\n\n` : ''}Refinement: ${instruction.trim()}`,
            stylePreset: result.stylePreset ?? meta.stylePreset,
          },
          body,
        )
      : body;
    addMessage({
      id: `sketch-${Date.now()}`,
      content,
      isUser: false,
      timestamp: new Date(),
      imageUrl: result.imageUrl,
    });
    onPersistMessage?.(content, 'assistant', result.imageUrl);
  }, [generateSketch, userId, memberId, addMessage, onPersistMessage]);

  // Build date nodes for TimeJump
  const dateNodes = useMemo(() => {
    const nodes: { label: string; elementId: string }[] = [];
    const seen = new Set<string>();
    const source = searchQuery
      ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
      : messages;
    for (const msg of source) {
      const label = formatSessionDate(msg.timestamp);
      if (!seen.has(label)) {
        seen.add(label);
        nodes.push({ label, elementId: `date-sep-${label.replace(/\s+/g, '-').toLowerCase()}` });
      }
    }
    return nodes;
  }, [messages, searchQuery]);

  const handleLongPressStart = useCallback((e: React.PointerEvent) => {
    longPressStartPos.current = { x: e.clientX, y: e.clientY };
    longPressActive.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressActive.current = true;
      if (dateNodes.length > 0) {
        setShowTimeJump(true);
        try { navigator.vibrate?.(18); } catch {}
      }
    }, 600);
  }, [dateNodes]);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    longPressStartPos.current = null;
  }, []);

  const handleLongPressMove = useCallback((e: React.PointerEvent) => {
    if (!longPressStartPos.current || !longPressTimer.current) return;
    const dx = Math.abs(e.clientX - longPressStartPos.current.x);
    const dy = Math.abs(e.clientY - longPressStartPos.current.y);
    if (dx > 8 || dy > 8) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      longPressStartPos.current = null;
    }
  }, []);

  // Re-pin to bottom when the inner content grows AFTER initial paint
  // (catches the COPY/DELETE row, deep-dive chips, save offer, star button,
  // and other late-rendered footers that previously got clipped behind the composer).
  const innerRef = useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const inner = innerRef.current;
    const scroller = scrollRef.current;
    if (!inner || !scroller || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const distFromBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
      // Only auto-pin if the user is already near the bottom (within 280px),
      // so we don't yank them while reading older messages.
      if (distFromBottom < 280) {
        scroller.scrollTop = scroller.scrollHeight;
      }
    });
    ro.observe(inner);
    return () => ro.disconnect();
  }, [scrollRef]);

  return (
    <>
      <div
        ref={scrollRef}
        onPointerDown={handleLongPressStart}
        onPointerMove={handleLongPressMove}
        onPointerUp={handleLongPressEnd}
        onPointerLeave={handleLongPressEnd}
        onPointerCancel={handleLongPressEnd}
        className="relative flex-1 overflow-y-auto overscroll-contain px-4 pt-4"
        style={{ touchAction: 'pan-y', overscrollBehaviorY: 'contain', paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 280px), 300px)' }}
      >
        <div ref={innerRef} className="mx-auto flex max-w-lg md:max-w-2xl flex-col gap-3">
          {/* Hide history controls in Privacy Mode — clean slate only */}
          {!props.privateMode && hasMore && (
            loadingMore ? (
              <div className="flex justify-center py-2 min-h-[2rem]">
                <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                </div>
              </div>
            ) : (
              <button
                onClick={handleLoadMore}
                className="w-full py-2 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                Load earlier messages
              </button>
            )
          )}

          {(() => {
            const isHiddenNote = (c: string) => /^\[User sent a sticker:/.test(c);
            const visible = messages.filter(m => !isHiddenNote(m.content));
            const filtered = searchQuery
              ? visible.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
              : visible;
            let lastDateLabel = '';
            return filtered.map((msg, idx) => {
              const dateLabel = formatSessionDate(msg.timestamp);
              const showDateSep = dateLabel !== lastDateLabel;
              if (showDateSep) lastDateLabel = dateLabel;
              const { sketch: sketchMeta, body: sketchBody } = decodeSketchPrefix(msg.content);
              const renderedContent = sketchBody;
              // Staggered shred: last message dissolves first, cascading upward
              const staggerDelay = props.veilExitActive
                ? `${(filtered.length - 1 - idx) * 0.06}s`
                : undefined;
              return (
                <div key={msg.id} style={props.veilExitActive ? {
                  animation: 'private-veil-out 0.65s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                  animationDelay: staggerDelay,
                } : undefined}>
                  {showDateSep && (
                    <div className="flex items-center justify-center my-4" id={`date-sep-${dateLabel.replace(/\s+/g, '-').toLowerCase()}`}>
                      <button
                        onClick={() => setShowTimeJump(true)}
                        className="rounded-full px-4 py-1.5 text-[10px] uppercase font-light backdrop-blur-xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
                        style={{
                          letterSpacing: '0.1em',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: 'hsl(var(--primary) / 0.5)',
                        }}
                      >
                        {dateLabel}
                      </button>
                    </div>
                  )}
                  {msg.momentType ? (
                    <CompanionMomentCard
                      companionName={chatPartnerName}
                      companionInitial={chatPartnerInitial}
                      companionColorVar={chatPartnerColorVar}
                      message={msg.content}
                      milestoneType={msg.momentType}
                    />
                  ) : msg.isLetterGift && !msg.imageUrl ? (
                    <LetterGiftCard
                      companionName={chatPartnerName}
                      letterContent={msg.letterContent}
                      avatarUrl={connectionAvatarUrl}
                    />
                  ) : (
                    <>
                    <MessageBubble
                      content={renderedContent}
                      isUser={msg.isUser}
                      companionName={chatPartnerName}
                      imageUrl={msg.imageUrl}
                      imageLoading={msg.imageLoading}
                      isPreview={msg.isPreview}
                      isVariations={msg.isVariations}
                      variations={msg.variations}
                      isCompanion={!msg.isUser && isChatWithCompanion}
                      timestamp={msg.timestamp}
                      audioUrl={msg.audioUrl}
                      audioDuration={msg.audioDuration}
                      onApproveImage={msg.isPreview ? handleApproveAvatar : undefined}
                      onRetryImage={msg.isPreview ? handleRetryAvatar : undefined}
                      onSelectVariation={msg.isVariations ? (v) => handleSelectVariation(msg.id, v) : undefined}
                      onSaveMoment={!msg.isUser && onSaveMoment ? () => onSaveMoment({ memberId, content: msg.content, imageUrl: msg.imageUrl }) : undefined}
                      onDelete={() => deleteMessage(msg.id)}
                      onSaveAsLook={!msg.isUser && msg.imageUrl && onUpdateConnection ? (imgUrl: string) => {
                        onUpdateConnection(memberId, { referenceImageUrl: imgUrl });
                        toast.success(`Saved as ${chatPartnerName}'s look ✨`);
                        // Fire-and-forget: extract appearance description from the image
                        describeFromImage(imgUrl, userId).then(desc => {
                          if (desc) onUpdateConnection(memberId, { appearanceDesc: desc });
                        });
                      } : undefined}
                      searchQuery={msg.searchQuery}
                      isPremium={subscribed}
                      onLookItUp={msg.searchQuery ? (q) => handleWebSearch(msg.id, q) : undefined}
                      searching={msg.searching}
                      searchComplete={msg.searchComplete}
                      source={msg.source}
                      savedStatus={msg.savedStatus}
                      isStreaming={msg.savedStatus === 'saving' && !msg.isUser}
                      userId={userId}
                      companionMemberId={memberId}
                      companionGender={connection?.gender || profile.companionGender}
                       matureMode={profile.matureMode}
                      footerNote={msg.footerNote}
                       onSourceTap={!msg.isUser ? onSourceTap : undefined}
                       privateMode={props.privateMode}
                       memoryMomentDays={msg.memoryMomentDays}
                       memoryReference={msg.memoryReference}
                       onPlayVoice={props.onPlayVoice}
                       voiceLoading={props.voiceLoadingText === msg.content}
                       isVoicePlaying={props.playingVoiceText === msg.content}
                       sketchMeta={sketchMeta}
                       onRefineSketch={sketchMeta ? (instruction) => {
                         const imgUrl = msg.imageUrl || (renderedContent.match(/\[IMG:(https?:\/\/[^\]\s]+)\]/)?.[1] ?? '');
                         if (imgUrl) handleRefineSketch(sketchMeta, imgUrl, instruction);
                       } : undefined}
                    />
                    {!msg.isUser && !msg.imageUrl && !sketchMeta && !msg.momentType && !msg.isLetterGift && !/\[IMG:/.test(msg.content) && (
                      <InlineSketchOffer
                        message={msg}
                        strategistActive={!!props.strategistActive && !props.privateMode}
                        userId={userId}
                        memberId={memberId}
                        conversationContext={messages.slice(Math.max(0, idx - 4), idx).map(m => `${m.isUser ? 'User' : chatPartnerName}: ${m.content}`).join('\n')}
                        addMessage={addMessage}
                        onPersistMessage={onPersistMessage}
                      />
                    )}
                    </>
                  )}
                  {!msg.isUser && BLUEPRINT_INVITE_PHRASES.some(p => msg.content.toLowerCase().includes(p)) && (
                    <button
                      onClick={() => navigate('/personal-intel')}
                      className="mt-1 ml-3 flex items-center gap-1.5 text-[11px] text-primary/60 hover:text-primary transition-colors"
                    >
                      <span>→ Fill in your Blueprint</span>
                    </button>
                  )}
                  {msg.showUpgradeNudge && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mx-auto mt-1.5 mb-2 w-full max-w-[75%] flex justify-start"
                    >
                      <button
                        onClick={() => setShowUpgradeModal(true)}
                        className="inline-flex items-center gap-1.5 rounded-full gradient-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:scale-105 active:scale-95 transition-transform"
                      >
                        <Crown className="h-3.5 w-3.5" /> Upgrade to Premium
                      </button>
                    </motion.div>
                  )}
                  {msg.showPrivateSuggest && !props.privateMode && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="mt-1.5 mb-2 ml-3 flex justify-start"
                    >
                      <button
                        onClick={() => {
                          if (props.onTogglePrivateMode) props.onTogglePrivateMode();
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-4 py-2 text-xs font-medium text-amber-300 hover:bg-amber-500/25 active:scale-95 transition-all"
                      >
                        <Lock className="h-3 w-3" /> Switch to Private Mode
                      </button>
                    </motion.div>
                  )}
                  {pendingSaveOffer?.messageId === msg.id && !msg.isUser && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="mt-2 mb-2 ml-3 max-w-[85%] rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4 shadow-[0_4px_24px_-4px_rgba(168,85,247,0.12)]"
                    >
                      <p className="text-sm font-medium text-foreground mb-1.5">Want to save this?</p>
                      <p className="text-xs text-muted-foreground mb-3">{pendingSaveOffer.title}</p>
                      <PlanStepsList steps={pendingSaveOffer.steps} />
                      <div className="flex gap-2 mt-3">
                        <button onClick={acceptSaveOffer} className="flex-1 rounded-full gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Save to Your Path ✨</button>
                        <button onClick={dismissSaveOffer} className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground">Dismiss</button>
                      </div>
                    </motion.div>
                  )}
                </div>
              );
            });
          })()}

          {isTyping && (
            <div className="flex items-end gap-2">
              <div className="relative h-8 w-8 shrink-0">
                {props.privateMode ? (
                  <>
                    {/* Soft glowing halo — gradient bloom that pulses in sync with the private banner */}
                    <motion.div
                      className="absolute inset-[-4px] rounded-full"
                      style={{
                        background: 'radial-gradient(circle, hsl(43 72% 53% / 0.25) 40%, transparent 70%)',
                      }}
                      animate={{
                        opacity: [0.4, 1, 0.4],
                        scale: [0.92, 1.08, 0.92],
                      }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    {/* Orbiting stroke ring */}
                    <motion.svg
                      className="absolute inset-[-4px]"
                      viewBox="0 0 40 40"
                      fill="none"
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                    >
                      <circle
                        cx="20" cy="20" r="18"
                        stroke="url(#haloGrad)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeDasharray="28 85"
                        opacity="0.7"
                      />
                      <defs>
                        <linearGradient id="haloGrad" x1="0" y1="0" x2="40" y2="40">
                          <stop offset="0%" stopColor="hsl(43 72% 63%)" stopOpacity="0.9" />
                          <stop offset="100%" stopColor="hsl(43 72% 53%)" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                    </motion.svg>
                    {/* Core sparkle orb */}
                    <motion.div
                      className="relative h-full w-full flex items-center justify-center rounded-full"
                      style={{
                        background: 'linear-gradient(135deg, hsl(43 72% 53% / 0.2), hsl(43 72% 53% / 0.1))',
                        border: '1px solid hsl(43 72% 53% / 0.3)',
                      }}
                      animate={{
                        boxShadow: [
                          '0 0 8px 2px hsl(43 72% 53% / 0.15)',
                          '0 0 16px 6px hsl(43 72% 53% / 0.35)',
                          '0 0 8px 2px hsl(43 72% 53% / 0.15)',
                        ],
                      }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-400/80" />
                    </motion.div>
                  </>
                ) : (
                  <div className="h-full w-full overflow-hidden rounded-full">
                    <img src={resolvedAvatarUrl} alt={chatPartnerName} className="h-full w-full object-cover" />
                  </div>
                )}
              </div>
              <div className={`rounded-2xl rounded-bl-lg px-4 py-3 ${
                props.privateMode
                  ? 'bg-amber-500/10 border border-amber-500/20'
                  : 'bg-companion-bubble border border-border/50'
              }`}>
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div key={i} className={`h-2 w-2 rounded-full ${
                      props.privateMode ? 'bg-amber-400/60' : 'bg-muted-foreground/60'
                    }`}
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {pendingCardType && isTyping && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground/60 pl-10">
              <Loader2 className="h-3 w-3 animate-spin" />
              {pendingCardType === 'language' ? 'Preparing phrase card' :
               pendingCardType === 'practice' ? 'Preparing practice card' :
               pendingCardType === 'recipe'   ? 'Preparing recipe card' :
               pendingCardType === 'blueprint' ? 'Building blueprint' :
               'Preparing card'}…
            </div>
          )}

          {showCheckInCard && (
            <SupportCheckInCard
              companionName={chatPartnerName}
              companionAvatarUrl={resolvedAvatarUrl || undefined}
              onResponse={(choice) => {
                setShowCheckInCard(false);
                setConversationPaused(false);
                crisisTierRef.current = 0;
                if (choice === 'rough') {
                  crisisFollowUpRef.current = 'rough';
                } else if (choice === 'resources') {
                  setShowCrisis(true);
                  setConversationPaused(true);
                } else {
                  crisisFollowUpRef.current = null;
                }
              }}
            />
          )}

          {showCuriosityNudge && profile.visualMode === 'abstract' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="mx-auto max-w-[85%] rounded-2xl border border-primary/20 bg-primary/5 p-4 text-center"
            >
              <p className="text-sm font-medium text-foreground mb-1">Want to see what {chatPartnerName} looks like?</p>
              <p className="text-xs text-muted-foreground mb-3">Add a personal look in Studio anytime ✨</p>
              <div className="flex gap-2 justify-center">
                <button onClick={() => {
                  setShowCuriosityNudge(false);
                  try { localStorage.setItem(`curiosity_nudge_dismissed_${memberId}`, '1'); } catch {}
                  onUpdateProfile?.({ visualMode: 'personal' });
                }} className="rounded-full gradient-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Show me ✨</button>
                <button onClick={() => {
                  setShowCuriosityNudge(false);
                  try { localStorage.setItem(`curiosity_nudge_dismissed_${memberId}`, '1'); } catch {}
                }} className="rounded-full border border-border px-4 py-2 text-xs text-muted-foreground">I'm good</button>
              </div>
            </motion.div>
          )}

          {showPremiumGateInChat && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="mx-auto max-w-[85%] rounded-2xl border border-primary/20 bg-primary/5 p-4 text-center"
            >
              <p className="text-sm font-medium text-foreground mb-1">✨ Premium feature</p>
              <p className="text-xs text-muted-foreground mb-3">Upgrade to generate custom looks for your companion</p>
              <div className="flex gap-2 justify-center">
                <button onClick={() => { setShowPremiumGateInChat(false); setShowUpgradeModal(true); }}
                  className="inline-flex items-center gap-1 rounded-full gradient-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
                  <Crown className="h-3.5 w-3.5" /> Upgrade
                </button>
                <button onClick={() => setShowPremiumGateInChat(false)} className="rounded-full border border-border px-4 py-2 text-xs text-muted-foreground">Maybe later</button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Scroll to bottom button */}
        <AnimatePresence>
          {showScrollBottom && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={scrollToBottom}
              className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-card border border-border shadow-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <ChevronDown className="h-5 w-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="relative">
        <CompanionMediaPicker
          companionName={chatPartnerName}
          isOpen={showMediaPicker}
          onClose={() => setShowMediaPicker(false)}
          onSendSticker={(expr) => {
            if (!subscribed && !usageLimits.canGenerateImage) { toast.error('Daily image limit reached. Upgrade for unlimited.', { icon: '👑' }); return; }
            const hasUserLikeness = !!(profile.userAppearanceDesc || profile.userReferenceImageUrl);
            requestCompanionMedia('sticker', { stickerExpression: expr, stickerTarget: hasUserLikeness ? 'user' : 'companion' });
          }}
          onSendSelfie={() => {
            if (!subscribed && !usageLimits.canGenerateImage) { toast.error('Daily image limit reached. Upgrade for unlimited.', { icon: '👑' }); return; }
            requestCompanionMedia('selfie');
          }}
          onSendActivity={(activity) => {
            if (!subscribed && !usageLimits.canGenerateImage) { toast.error('Daily image limit reached. Upgrade for unlimited.', { icon: '👑' }); return; }
            requestCompanionMedia('activity', { activityPrompt: activity });
          }}
          onSendLikeness={(scene) => {
            if (!subscribed && !usageLimits.canGenerateImage) { toast.error('Daily image limit reached. Upgrade for unlimited.', { icon: '👑' }); return; }
            requestCompanionMedia('likeness' as any, { activityPrompt: scene });
          }}
          onSendTextImage={(textImageType, textContent) => {
            if (!subscribed && !usageLimits.canGenerateImage) { toast.error('Daily image limit reached. Upgrade for unlimited.', { icon: '👑' }); return; }
            requestCompanionMedia('text-image', { textImageType, textContent });
          }}
          hasUserLikeness={!!(profile.userAppearanceDesc || profile.userReferenceImageUrl)}
          loading={mediaLoading}
          cachedStickers={cachedStickers}
          batchGenerating={batchGenerating}
          onAutoGenerateStickers={(missing) => {
            const hasUserLikeness = !!(profile.userAppearanceDesc || profile.userReferenceImageUrl);
            batchGenerateStickers(missing, hasUserLikeness ? 'user' : 'companion');
          }}
          onSendCachedSticker={(imageUrl, caption, stickerId) => {
            const friendlyCaption = caption ? `Sent a ${caption} sticker` : 'Sent a sticker';
            const msgId = crypto.randomUUID();
            addMessage({ id: msgId, content: friendlyCaption, isUser: true, timestamp: new Date(), imageUrl });
            setShowMediaPicker(false);
            if (stickerId) incrementUsage(stickerId);
            // Persist — addMessage already tracked the content so realtime won't duplicate
            onPersistMessage?.(friendlyCaption, 'user', imageUrl);
            // Append descriptive context note to AI history so companion knows what the sticker shows
            const stickerContext = `[User sent a sticker showing their "${caption || 'expression'}" face — react to what this expression conveys]`;
            onAppendHistory?.({ role: 'user', content: stickerContext });
            // Trigger companion reply
            onTriggerReply?.(stickerContext);
          }}
          onTakePhoto={() => cameraInputRef.current?.click()}
          onFromGallery={() => photoInputRef.current?.click()}
          onFromFiles={() => fileInputRef.current?.click()}
          onCardRequest={(prompt, cardType) => {
            setInput(prompt);
            setPendingCardType(cardType);
            inputRef.current?.focus();
          }}
          activeCardType={pendingCardType}
          hasCompanionAppearance={!!(connection?.appearanceDesc || connection?.referenceImageUrl || profile.companionAppearanceDesc || profile.companionReferenceImageUrl)}
          onNavigateToSettings={onNavigateToSettings}
          situationalMode={situationalMode}
        />
      </div>
      <TimeJumpThread
        nodes={dateNodes}
        visible={showTimeJump}
        onClose={() => setShowTimeJump(false)}
        scrollContainer={scrollRef.current}
      />
    </>
  );
}
