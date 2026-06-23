import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ChevronLeft, Search, Loader2, Crown, Download, X, Sparkles, Flame, FileText, Paperclip, Wand2, Lock, Unlock, ShieldCheck, Plus } from 'lucide-react';
import WhisperAssist from './WhisperAssist';
import { usePracticeMode } from './practice/PracticeModeContext';
import { ALL_SCENARIOS } from './practice/practiceScenarios';
import PracticeModeToggle from './practice/PracticeModeToggle';
import PracticeScenarioPicker from './practice/PracticeScenarioPicker';
import PracticeFreezeAssist from './practice/PracticeFreezeAssist';
import PracticeCoachingFeedback from './practice/PracticeCoachingFeedback';
import CardRequestMenu from './CardRequestMenu';
import SituationalModeChips, { type SituationalMode, detectSituationalSuggestion, detectModeActivation, detectCompanionModeSuggestion } from './SituationalModeChips';
import ProjectSwitcherChip, { type UserProject } from './ProjectSwitcherChip';
import BlueprintTemplatesSheet from './BlueprintTemplatesSheet';
import StrategistModeAura, { StrategistModeChip } from './StrategistModeAura';
import { useStrategistMode } from '@/hooks/useStrategistMode';
import LoadingSpinner from './LoadingSpinner';
import { useNavigate, useLocation } from 'react-router-dom';
import AvatarLightbox from './AvatarLightbox';
import { supabase } from '@/integrations/supabase/client';
import { getUploadSignedUrl } from '@/lib/signedUrl';
import MessageProgressRing from './MessageProgressRing';
import ChatOverflowMenu from './ChatOverflowMenu';

import ArtifactsDrawer from './ArtifactsDrawer';
import WorkImagePromptDialog from './WorkImagePromptDialog';
import { useChatArtifacts } from '@/hooks/useChatArtifacts';
import ChatMessageList from './ChatMessageList';
import { useWorkImage } from '@/hooks/useWorkImage';
import { encodeSketchPrefix } from '@/lib/sketchEncoding';
import ChatHistoryModal from './ChatHistoryModal';
import { saveCollectibleFromChat } from '@/hooks/useCompanionCollectibles';
import SourceReferenceSheet from './SourceReferenceSheet';
import VaultIndexingBar from './VaultIndexingBar';
import { compressImage } from '@/lib/imageCompression';
import { Profile, Connection } from '@/hooks/useProfile';
import { moderateContent } from '@/lib/moderation';
import CrisisResourceBanner from './CrisisResourceBanner';
import SupportCheckInCard from './SupportCheckInCard';
import CompanionMomentCard from './CompanionMomentCard';
import LetterGiftCard from './LetterGiftCard';
import CompanionMemorySheet from './CompanionMemorySheet';
import AbstractAvatar from './AbstractAvatar';
import { toast } from 'sonner';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { getMember } from '@/lib/communityPersonas';
import MessageBubble from './MessageBubble';
import ThinkFreelyArrivalBanner from './chat/ThinkFreelyArrivalBanner';
import TypingIndicator from './TypingIndicator';
import { useCompanionMedia } from '@/hooks/useCompanionMedia';
import { useCompanionDailyImage } from '@/hooks/useCompanionDailyImage';
import { useChatHistory, type ChatMessage } from '@/hooks/useChatHistory';
import { useChatStreaming, pickReferencedMemory } from '@/hooks/useChatStreaming';
import { useCompanionPlans } from '@/hooks/useCompanionPlans';
import { useChatImages } from '@/hooks/useChatImages';
import { useChatVoice } from '@/hooks/useChatVoice';
import { useChatMemories } from '@/hooks/useChatMemories';
import { encodeSketchConsentFallback } from '@/lib/sketchToolToken';
import { isEmotionallySignificant, isUserVulnerable } from '@/lib/emotionalDetection';
import { detectAdaptiveStyle, shouldRunAdaptiveDetection } from '@/lib/adaptiveStyleDetection';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import UsageLimitBanner from './UsageLimitBanner';
import UpgradeBanner from './UpgradeBanner';
import { sfxMessageSent, sfxMessageReceived } from '@/hooks/useAppSfx';
import { useVibePoints } from '@/hooks/useVibePoints';
import VoiceCallStage, { type CallTranscriptEntry } from './VoiceCallStage';
import PortraitPreview from './PortraitPreview';
import AudioRecorder from './AudioRecorder';
import { isMinor as isMinorAge, isAdult, treatAsMinor } from '@/lib/ageUtils';
import { cn } from '@/lib/utils';
import { getStyleById } from '@/lib/communicationStyles';
import InChatUpgradeModal from './InChatUpgradeModal';
import { useAppContext } from '@/contexts/AppContext';
import CompanionVibeCard from './CompanionVibeCard';
import { savePrivateInsight } from './PrivateInsightCard';
import { privacyShieldHaptic, revealHaptic, closingRitualHaptic } from '@/lib/sanctuaryHaptics';
import { playSendWhoosh } from '@/lib/sanctuarySfx';

function getStylePrompt(styleValue: string): string | undefined {
  if (!styleValue) return undefined;
  const ids = styleValue.split(',').map(s => s.trim()).filter(Boolean);
  const parts: string[] = [];
  for (const id of ids) {
    if (id.startsWith('custom:')) {
      parts.push(`Additional style note: ${id.replace('custom:', '')}`);
    } else {
      const mod = getStyleById(id)?.promptModifier;
      if (mod) parts.push(mod);
    }
  }
  return parts.length ? parts.join('\n\n') : undefined;
}

interface ChatInterfaceProps {
  profile: Profile;
  memberId: string;
  userId: string;
  subscribed?: boolean;
  connection?: Connection;
  onReset: () => void;
  onBack?: () => void;
  onSaveMoment?: (opts: { memberId: string; content: string; imageUrl?: string }) => void;
  onSaveMilestone?: (opts: { memberId: string; content: string }) => void;
  onSaveMedia?: (item: { mediaType: string; imageUrl: string; caption?: string; prompt?: string; stickerTarget?: 'user' | 'companion' }) => void;
  onUpdateProfile?: (updates: Partial<Profile>) => void;
  onUpdateConnection?: (memberId: string, updates: Partial<Connection>) => void;
  
}

// Tightened: only trigger on phrases explicitly about appearance/visual likeness.
// Removed loose matches like "see you" / "imagine you" / "your face" that fire in normal conversation.
const CURIOSITY_PATTERNS = /\b(what do you look like|what you look like|see your face|see what you look like|picture of you|send (?:me )?a (?:pic|picture|photo|selfie)|show me (?:your face|what you look like|a (?:pic|picture|photo|selfie))|wish I could see (?:you|your face)|curious what you look like|send a selfie|take a selfie)\b/i;
const APPEARANCE_CHANGE_PATTERNS = /\b(change your look|change your hair|different hair|shorter hair|longer hair|change your style|look different|new look|makeover|redesign you|want you to have|change your appearance|update your look|try a different|dye your hair|grow your hair|glasses|tattoo|new outfit)\b/i;
const VARIATION_PATTERNS = /\b(show me options|give me options|show me choices|two options|side by side|compare looks|multiple options|show me two|let me choose|show me variations)\b/i;

// Personality adjustment patterns — detect when user wants to change companion behavior via chat
const PERSONALITY_CHANGE_PATTERNS = /\b(make (?:them|you|her|him) (?:more |less |)(?:funny|funnier|serious|playful|warm|sarcastic|deep|casual|light|philosophical|challenging|gentle|witty|dry)|(?:i want|i'd like|can you be) (?:more |less |)(?:deep|playful|serious|funny|sarcastic|warm|casual|philosophical)|(?:be more|be less|try being) (?:funny|playful|serious|warm|sarcastic|deep|casual|philosophical|witty|gentle|challenging)|(?:deeper|lighter|funnier|more playful|more serious|less sarcastic|more sarcastic) conversations?)\b/i;

function detectPersonalityIntent(text: string): Partial<Record<string, string | string[]>> | null {
  const lower = text.toLowerCase();
  const updates: Record<string, string> = {};

  // Communication style
  if (/\b(more challenging|challenge me|push me|be direct)\b/i.test(lower)) updates.communication = 'Challenger';
  else if (/\b(warmer|gentler|softer|more gentle|easy going|warm & easy)\b/i.test(lower)) updates.communication = 'Warm & Easy';
  else if (/\b(listen more|better listener|just listen)\b/i.test(lower)) updates.communication = 'Listener';

  // Humor
  if (/\b(funnier|more funny|more humor|make .* laugh|be funny)\b/i.test(lower)) updates.humor = 'Playful';
  else if (/\b(dry wit|dryer|more dry|sarcastic)\b/i.test(lower)) updates.humor = 'Dry Wit';
  else if (/\b(more sincere|less joking|serious tone|be sincere)\b/i.test(lower)) updates.humor = 'Sincere';
  else if (/\b(more sarcastic)\b/i.test(lower)) updates.humor = 'Sarcastic';

  // Depth
  if (/\b(deeper|more depth|philosophical|profound|go deep)\b/i.test(lower)) updates.depth = 'Deep & Philosophical';
  else if (/\b(lighter|more casual|keep it light|less heavy|casual)\b/i.test(lower)) updates.depth = 'Light & Casual';
  else if (/\b(balanced|mix of both)\b/i.test(lower)) updates.depth = 'Balanced';

  return Object.keys(updates).length > 0 ? updates : null;
}

export default function ChatInterface({ profile, memberId, userId, subscribed, connection, onReset, onBack, onSaveMoment, onSaveMilestone, onSaveMedia, onUpdateProfile, onUpdateConnection }: ChatInterfaceProps) {
  const navigate = useNavigate();
  const { subscription } = useAppContext();
  
  const [input, setInput] = useState('');
  const [showBlueprintTemplates, setShowBlueprintTemplates] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCrisis, setShowCrisis] = useState(false);
  const [conversationPaused, setConversationPaused] = useState(false);
  const [showCheckInCard, setShowCheckInCard] = useState(false);
  const crisisTierRef = useRef<number>(0);
  const crisisFollowUpRef = useRef<'okay' | 'rough' | null>(null);
  const [showCuriosityNudge, setShowCuriosityNudge] = useState(false);
  const [showPremiumGateInChat, setShowPremiumGateInChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [rolePopoverOpen, setRolePopoverOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [pendingImages, setPendingImages] = useState<{ dataUrl: string; file: File }[]>([]);
  const [pendingFile, setPendingFile] = useState<{ name: string; text: string; size: number } | null>(null);
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);
  const giftSentThisSession = useRef(false);
  const [autoVoiceIds, setAutoVoiceIds] = useState<Set<string>>(new Set());
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historySessions, setHistorySessions] = useState<{ date: string; messages: { content: string; role: string; created_at: string }[] }[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [viewingSession, setViewingSession] = useState<{ date: string; messages: { content: string; role: string; created_at: string }[] } | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [sourceRef, setSourceRef] = useState<{ docTitle: string; term: string } | null>(null);
  const [overflowMenuOpen, setOverflowMenuOpen] = useState(false);
  const [overflowDownloadExpanded, setOverflowDownloadExpanded] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [extractLoading, setExtractLoading] = useState(false);
  const [inVideoCall, setInVideoCall] = useState(false);
  const [autoStartCall, setAutoStartCall] = useState(false);

  // Auto-open call stage when arriving via accepted incoming call (?call=1)
  // Depend on location.search so it fires even when already on this companion's chat page.
  const location = useLocation();
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(location.search);
    if (params.get('call') === '1') {
      setInVideoCall(true);
      setAutoStartCall(true);
      params.delete('call');
      const qs = params.toString();
      const newUrl = window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash;
      window.history.replaceState({}, '', newUrl);
    }
  }, [memberId, location.search]);
  const [situationalMode, setSituationalMode] = useState<SituationalMode>(null);
  const [smartSuggestion, setSmartSuggestion] = useState<SituationalMode>(null);
  const [pendingCardType, setPendingCardType] = useState<string | null>(null);
  const [currentProject, setCurrentProject] = useState<UserProject | null>(() => {
    try {
      const raw = localStorage.getItem(`compani-project-${memberId}`);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const pokeLevel = profile.thinkFreelyPokeLevel ?? 0;

  // Persist active project per-companion
  useEffect(() => {
    const key = `compani-project-${memberId}`;
    if (currentProject) localStorage.setItem(key, JSON.stringify(currentProject));
    else localStorage.removeItem(key);
  }, [currentProject, memberId]);
  const [heartDoubleBeat, setHeartDoubleBeat] = useState(false);
  const [showToolsDrawer, setShowToolsDrawer] = useState(false);
  // ── Private mode state — backed by sessionStorage so orientation changes don't wipe the buffer ──
  const [privateMode, setPrivateMode] = useState(() => sessionStorage.getItem('compani-pm-active') === '1');
  const privateSuggestShownRef = useRef(false);
  const [privateModeHistory, setPrivateModeHistory] = useState<{ role: string; content: string }[]>(() => {
    try { const v = sessionStorage.getItem('compani-private-mode-history'); return v ? JSON.parse(v) : []; } catch { return []; }
  });
  const [privateMessages, setPrivateMessages] = useState<ChatMessage[]>(() => {
    try {
      const v = sessionStorage.getItem('compani-pm-messages');
      if (!v) return [];
      return JSON.parse(v).map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
    } catch { return []; }
  });
  const [showPrivateBanner, setShowPrivateBanner] = useState(false);
  const [veilExitActive, setVeilExitActive] = useState(false);
  const privateModeRef = useRef(false);
  const [portalFlash, setPortalFlash] = useState(false);
  privateModeRef.current = privateMode;

  // Sync private mode state to sessionStorage so orientation changes don't wipe it
  useEffect(() => {
    if (privateMode) {
      sessionStorage.setItem('compani-pm-active', '1');
    } else {
      sessionStorage.removeItem('compani-pm-active');
      sessionStorage.removeItem('compani-pm-messages');
    }
  }, [privateMode]);

  useEffect(() => {
    if (privateMode && privateMessages.length > 0) {
      sessionStorage.setItem('compani-pm-messages', JSON.stringify(privateMessages));
    }
  }, [privateMode, privateMessages]);

  const firstMessageSentRef = useRef(false);
  const [showPortraitPreview, setShowPortraitPreview] = useState(false);
  const dailyImage = useCompanionDailyImage(userId, connection?.memberId ?? memberId);
  // IMPORTANT: Use connection-specific avatar only — profile.companionAvatarUrl is shared
  // across ALL companions and would show the wrong avatar in multi-companion scenarios.
  // Also prefer the saved connection avatar over rotating daily images so a newly created
  // abstract reveal (stars, waterfall, etc.) cannot be overwritten by an older portrait.
  const connectionAvatarUrl = connection?.avatarUrl || '';
  const resolvedAvatarUrl = connectionAvatarUrl || dailyImage || '';
  const userWasVulnerableRef = useRef(false);
  const roleJustChangedRef = useRef(false);
  const sendInFlightRef = useRef(false);
  const lastStickerExprRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAvatarLightbox, setShowAvatarLightbox] = useState(false);
  const [showMemorySheet, setShowMemorySheet] = useState(false);
  const [showArtifactsDrawer, setShowArtifactsDrawer] = useState(false);
  const [showWorkImagePrompt, setShowWorkImagePrompt] = useState(false);
  const [hasNewArtifact, setHasNewArtifact] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('workbench') !== '1') return;

    params.delete('workbench');
    const qs = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));

    // Honor reduced-motion: open immediately, no theatrics.
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reducedMotion) {
      setShowArtifactsDrawer(true);
      return;
    }

    // Stagger feels different per surface:
    //  • Mobile bottom-sheet needs more breath so the chat header settles before the sheet rises.
    //  • Desktop side-drawer can be snappier — less vertical motion to compete with.
    const isMobile = window.matchMedia?.('(max-width: 768px)')?.matches;
    const delay = isMobile ? 380 : 260;

    // Wait for two animation frames so the chat surface has actually painted
    // before the sheet starts its spring — prevents janky simultaneous reflows.
    let raf1 = 0, raf2 = 0, timer = 0;
    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        timer = window.setTimeout(() => setShowArtifactsDrawer(true), delay);
      });
    });
    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
      window.clearTimeout(timer);
    };
  }, []);
  const { artifacts, captureFromMessage, togglePin, updateContent: updateArtifact, remove, createBlank: createArtifact } = useChatArtifacts(userId, memberId, currentProject?.id ?? null);
  const [localMatureMode, setLocalMatureMode] = useState(false);
  const [flameVisible, setFlameVisible] = useState(false);
  const [practiceCoachingFeedback, setPracticeCoachingFeedback] = useState<string | null>(null);

  // Practice Mode hooks
  const practiceMode = usePracticeMode();

  const member = getMember(memberId);
  const chatPartnerName = connection?.name || member?.name || profile.companionName || 'Your Friend';
  /** UI-only display name — switches to "Think Freely" during private mode */
  const chatDisplayName = privateMode ? 'Think Freely' : chatPartnerName;
  /**
   * Warm, on-brand placeholder. Rotates gently by time of day so the input
   * feels like an invitation to think out loud — not a command line.
   * Stable per session: picked once on mount, no jitter on every keystroke.
   */
  const composerPlaceholder = useMemo(() => {
    if (privateMode) return 'Think out loud — nothing is saved';
    const h = new Date().getHours();
    const morning = ["What's on your mind?", 'How are you really, this morning?', 'Where do we begin today?'];
    const day     = ["What's on your mind?", 'Thinking something through?', 'Need to talk it out?'];
    const evening = ['How was today, really?', "What's still with you tonight?", 'Want to unpack the day?'];
    const night   = ["Can't sleep?", "What's keeping you up?", 'Talk to me.'];
    const pool = h < 5 ? night : h < 12 ? morning : h < 18 ? day : h < 23 ? evening : night;
    return pool[Math.floor(Math.random() * pool.length)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [privateMode, chatDisplayName]);
  const chatPartnerColorVar = member?.colorVar || '';
  const chatPartnerInitial = member?.initial || chatPartnerName[0];

  // Composed hooks
  const {
    messages, setMessages, chatHistory, setChatHistory, loading,
    hasMore, loadingMore, loadMore, summary,
    addMessage, updateMessage, deleteMessage, incrementUserCount,
    trackMessage, persistMessage, checkAndRecordMilestone, checkStreak, refetch,
  } = useChatHistory({
    userId, memberId, userName: profile.userName,
    companionName: chatPartnerName, companionGender: profile.companionGender,
    companionPersonality: connection?.personality || undefined,
    companionBio: connection?.bio || undefined,
    companionAge: connection?.age || undefined,
    companionVibe: connection?.studioSelections?.vibe ? String(connection.studioSelections.vibe) : undefined,
    userVibe: profile.vibe || undefined,
    onSaveMilestone,
  });

  // ── Strategist Mode (universal high-stakes radar) ────────────────────────
  const strategistMode = useStrategistMode(chatHistory);

  // ── Sketch tool — Marcus emits [SKETCH:prompt], we render the real image inline
  const { generate: generateSketchFromTool } = useWorkImage();

  // ── Orphaned-reply safety net ─────────────────────────────────────────────
  // If a previous send completed (user message persisted) but the assistant
  // reply pipeline died mid-flight (e.g. a heavy paste caused the chat to
  // remount, dev-server HMR reconnect, ErrorBoundary recovery), the companion
  // can be left "silent." This effect detects that case on (re)mount and fires
  // a single synthetic re-prompt so the assistant always replies. Guarded per
  // memberId per browser session to avoid loops.
  const orphanReplyTriedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (loading) return;
    if (!messages.length) return;
    if (orphanReplyTriedRef.current.has(memberId)) return;

    const last = messages[messages.length - 1];
    if (!last.isUser) return; // assistant already replied — nothing to do

    // Only revive if the orphaned user message is recent (≤ 15 min)
    const ageMs = Date.now() - new Date(last.timestamp).getTime();
    if (ageMs > 15 * 60 * 1000) return;

    // Session-scoped guard so a hard reload doesn't re-fire repeatedly
    const guardKey = `orphanReply:${userId}:${memberId}:${last.id}`;
    try {
      if (sessionStorage.getItem(guardKey)) return;
      sessionStorage.setItem(guardKey, '1');
    } catch {}
    orphanReplyTriedRef.current.add(memberId);

    console.log('[ChatInterface] Orphan reply detected — re-triggering assistant');
    // Tiny delay so sendMessageRef is wired up after first render
    const t = setTimeout(() => {
      // revive + skipBubble: don't add a bubble, don't persist, don't append
      // to chatHistory — just rerun the LLM with the existing chatHistory so
      // the assistant produces the missing reply.
      sendMessageRef.current?.('', { skipBubble: true, revive: true });
    }, 800);
    return () => clearTimeout(t);
  }, [loading, messages, memberId, userId]);

  // ── Private Mode wrappers — route messages to volatile buffer when active ──
  const addPrivateMessage = useCallback((msg: ChatMessage) => {
    setPrivateMessages(prev => [...prev, msg]);
  }, []);
  const updatePrivateMessage = useCallback((id: string, updates: Partial<ChatMessage>) => {
    setPrivateMessages(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  }, []);
  const activeAddMessage = useCallback((msg: ChatMessage) => {
    if (privateModeRef.current) addPrivateMessage(msg);
    else addMessage(msg);
  }, [addMessage, addPrivateMessage]);
  const activeUpdateMessage = useCallback((id: string, updates: Partial<ChatMessage>) => {
    if (privateModeRef.current) updatePrivateMessage(id, updates);
    else updateMessage(id, updates);
  }, [updateMessage, updatePrivateMessage]);
  const displayMessages = privateMode ? privateMessages : messages;

  const { streamResponse, lastMemoryMomentDaysRef, lastInjectedMemoriesRef } = useChatStreaming();
  const { extractMemories } = useChatMemories(profile.userName, userId, !!subscribed, memberId, chatPartnerName);

  const {
    mediaLoading, showMediaPicker, setShowMediaPicker,
    tryCompanionImage, requestCompanionMedia,
    generateAvatarPreview, generateAvatarVariations,
    pendingAvatarPreview, setPendingAvatarPreview,
    autoGenerateAvatar,
    batchGenerateStickers, batchGenerating,
  } = useChatImages({
    companionName: chatPartnerName, profile, connection, userId,
    chatHistory, onAddMessage: addMessage, onUpdateMessage: updateMessage, onSaveMedia,
    onImageGenerated: () => usageLimits.refresh(),
    onPersistMessage: (content, role, imageUrl, messageId) => { if (!privateMode) persistMessage(content, role, undefined, imageUrl, messageId); },
    onAppendHistory: (entry) => { if (!privateMode) setChatHistory(prev => [...prev, entry]); },
  });

  const { voiceLoadingId, playingId: playingVoiceId, playVoiceClip } = useChatVoice({
    voiceId: connection?.voiceId || profile.companionVoiceId,
    companionGender: (connection?.gender as any) || profile.companionGender,
    userName: profile.userName,
    namePronunciation: profile.namePronunciation,
  });

  const { userStickers: cachedStickers, incrementUsage } = useCompanionMedia(userId, memberId);
  const usageLimits = useUsageLimits(userId, !!subscribed);
  const { reward: rewardVP } = useVibePoints(userId);
  const { createPlan } = useCompanionPlans(userId);
  const [pendingSaveOffer, setPendingSaveOffer] = useState<{ messageId: string; title: string; steps: string[]; note?: string } | null>(null);

  const dismissSaveOffer = useCallback(() => {
    setPendingSaveOffer(null);
  }, []);

  // ── Privacy Mode exit ceremony state ──
  const [showExitChoice, setShowExitChoice] = useState(false);
  const pendingExitHistory = useRef<{ role: string; content: string }[]>([]);
  const [postPrivateContext, setPostPrivateContext] = useState<{ justExitedPrivate: boolean; lastNormalTopicHint: string | null; privateUserMessageCount: number } | null>(null);

  const performEvaporation = useCallback(() => {
    setShowExitChoice(false);

    // Count user messages only (not companion greeting/responses)
    const userMsgCount = privateMessages.filter(m => m.isUser).length;

    // Graduated exit behavior based on engagement depth
    if (userMsgCount === 0) {
      // Toggled and toggled back — instant close, no animation
      setPrivateMode(false);
      setShowPrivateBanner(false);
      setPrivateModeHistory([]);
      setPrivateMessages([]);
      sessionStorage.removeItem('compani-private-mode-history');
      pendingExitHistory.current = [];
      setTimeout(() => { requestAnimationFrame(() => { requestAnimationFrame(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }); }); }, 100);
      return;
    }

    // Capture last normal-mode topic for re-grounding (before clearing)
    if (userMsgCount >= 3) {
      const lastNormalUserMsg = messages.filter(m => m.isUser).reverse()[0];
      const topicHint = lastNormalUserMsg?.content?.slice(0, 100) || null;
      setPostPrivateContext({
        justExitedPrivate: true,
        lastNormalTopicHint: topicHint,
        privateUserMessageCount: userMsgCount,
      });
    }

    if (userMsgCount <= 2) {
      // Quick fade — no stagger, no ceremony
      closingRitualHaptic();
      setPortalFlash(true);
      setTimeout(() => setPortalFlash(false), 150);
      setPrivateMode(false);
      setShowPrivateBanner(false);
      setPrivateModeHistory([]);
      setPrivateMessages([]);
      sessionStorage.removeItem('compani-private-mode-history');
      pendingExitHistory.current = [];
      toast('Private Mode off — all traces cleared', { icon: '🔓', duration: 2000 });
      setTimeout(() => { requestAnimationFrame(() => { requestAnimationFrame(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }); }); }, 100);
    } else {
      // Full staggered ceremony for meaningful sessions
      setVeilExitActive(true);
      closingRitualHaptic();
      playSendWhoosh();
      setTimeout(() => {
        setVeilExitActive(false);
        setPortalFlash(true);
        setTimeout(() => setPortalFlash(false), 150);
        setPrivateMode(false);
        setShowPrivateBanner(false);
        setPrivateModeHistory([]);
        setPrivateMessages([]);
        privacyShieldHaptic();
        sessionStorage.removeItem('compani-private-mode-history');
        pendingExitHistory.current = [];
        toast('Private Mode off — all traces evaporated', { icon: '🔓', duration: 2500 });
        setTimeout(() => { requestAnimationFrame(() => { requestAnimationFrame(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }); }); }, 100);
      }, 650);
    }
  }, [chatPartnerName, privateMessages, messages]);

  const performCrystallize = useCallback(() => {
    const history = pendingExitHistory.current;
    const lastAssistant = history.filter(m => m.role === 'assistant').pop();
    if (lastAssistant) {
      savePrivateInsight({
        text: lastAssistant.content.slice(0, 300),
        companionName: chatPartnerName,
        timestamp: Date.now(),
      });
    }
    setShowExitChoice(false);
    toast.success('Insight crystallized to your dashboard', { icon: '✨', duration: 3000 });

    // Capture re-grounding context (crystallize always means meaningful session)
    const userMsgCount = privateMessages.filter(m => m.isUser).length;
    const lastNormalUserMsg = messages.filter(m => m.isUser).reverse()[0];
    setPostPrivateContext({
      justExitedPrivate: true,
      lastNormalTopicHint: lastNormalUserMsg?.content?.slice(0, 100) || null,
      privateUserMessageCount: userMsgCount,
    });

    // Now evaporate the messages
    setVeilExitActive(true);
    closingRitualHaptic();
    playSendWhoosh();
    setTimeout(() => {
      setVeilExitActive(false);
      setPortalFlash(true);
      setTimeout(() => setPortalFlash(false), 150);
      setPrivateMode(false);
      setShowPrivateBanner(false);
      setPrivateModeHistory([]);
      setPrivateMessages([]);
      privacyShieldHaptic();
      sessionStorage.removeItem('compani-private-mode-history');
      pendingExitHistory.current = [];
      setTimeout(() => { requestAnimationFrame(() => { requestAnimationFrame(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }); }); }, 100);
    }, 650);
  }, [chatPartnerName, privateMessages, messages]);

  // ── Download private session as .txt ──
  const downloadPrivateSession = useCallback(() => {
    if (privateMessages.length === 0) return;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
    let txt = `Think Freely Session - ${dateStr}, ${timeStr}\n`;
    txt += '─'.repeat(40) + '\n\n';
    for (const msg of privateMessages) {
      const label = msg.isUser ? 'You' : 'Reflection';
      txt += `${label}:\n${msg.content}\n\n`;
    }
    const blob = new Blob([txt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `think-freely-${now.toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [privateMessages]);

  // ── Privacy Mode toggle ──
  const togglePrivateMode = useCallback(() => {
    if (privateMode) {
      // Turning OFF — show exit choice if meaningful conversation
      if (privateModeHistory.length >= 4) {
        pendingExitHistory.current = privateModeHistory;
        setShowExitChoice(true);
      } else {
        // Short session — just evaporate
        performEvaporation();
      }
    } else {
      // Turning ON — portal flash then reveal
      setPortalFlash(true);
      setTimeout(() => {
        setPortalFlash(false);
        setPrivateMode(true);
        setShowPrivateBanner(true);
        setPrivateModeHistory([]);
        // Clean slate with a mode-aware entry greeting from companion
        const privateEntryCount = parseInt(localStorage.getItem('compani-private-entry-count') || '0', 10);
        localStorage.setItem('compani-private-entry-count', String(privateEntryCount + 1));
        const isReturning = privateEntryCount > 0;

        const modeGreetings = connection?.connectionMode === 'romantic'
          ? [
              "Hey... just you and me now. Whatever's on your mind.",
              "Just us. I'm right here.",
              "This is ours. Talk to me.",
            ]
          : connection?.connectionMode === 'mentor'
          ? [
              "Alright. Private session — I'm listening.",
              "Got it. This stays here. What's up?",
              "Private mode. What do you need to work through?",
            ]
          : [
              "Got it. This stays between us. What do you need to think through?",
              "Just us now. What's on your mind?",
              "Private space. I'm here.",
            ];

        const entryGreetings = isReturning
          ? [...modeGreetings, "Just us.", "I'm here."]
          : modeGreetings;
        const greeting = entryGreetings[Math.floor(Math.random() * entryGreetings.length)];
        setPrivateMessages([{
          id: `sanctuary-entry-${Date.now()}`,
          content: greeting,
          isUser: false,
          timestamp: new Date(),
        }]);
        revealHaptic();
      }, 150);

      toast('Private Mode — nothing will be saved', { icon: '🔒', duration: 2500 });
      // Auto-dismiss banner after 4 seconds
      setTimeout(() => setShowPrivateBanner(false), 4000);
    }
  }, [privateMode, privateModeHistory, chatPartnerName, performEvaporation]);

  const acceptSaveOffer = useCallback(async () => {
    if (!pendingSaveOffer) return;
    try {
      await createPlan({
        title: pendingSaveOffer.title,
        steps: pendingSaveOffer.steps,
        companion_note: pendingSaveOffer.note ?? null,
        plan_type: 'guidance',
        source: 'companion',
        member_id: memberId,
        companion_name: chatPartnerName,
      });
      setPendingSaveOffer(null);
      toast.success('Saved to Your Path ✨');
    } catch {
      toast.error('Failed to save plan');
    }
  }, [pendingSaveOffer, createPlan, memberId, chatPartnerName]);

  // Auto-scroll: on new messages, typing state, or streaming content updates
  const scrollToBottomSmooth = useCallback(() => {
    // Double rAF ensures DOM has painted before scrolling
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    });
  }, []);

  // Auto-activate Privacy Mode when navigating from Dashboard Private Insight card
  // or from the Post-Focus Bridge pill. The 'compani-private-auto-session' flag
  // distinguishes auto-activated sessions (eligible for guardrail reset) from
  // manually-toggled ones (which the user controls deliberately).
  useEffect(() => {
    if (sessionStorage.getItem('compani-auto-privacy') === 'true') {
      sessionStorage.removeItem('compani-auto-privacy');
      // Mark as auto-session for the arrival banner + reset guardrails
      sessionStorage.setItem('compani-private-auto-session', 'true');
      if (!privateMode) {
        setTimeout(() => togglePrivateMode(), 500);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Post-Focus Bridge guardrails ──
  // 1) Route-leave: if this chat unmounts while in an auto-activated Think Freely
  //    session, silently disable private mode so the user never accidentally
  //    stays in private forever.
  // 2) App backgrounded for 15+ minutes: on return, if still in an auto-session,
  //    silently exit private mode.
  const AUTO_BG_RESET_MS = 15 * 60 * 1000;
  const bgHiddenAtRef = useRef<number | null>(null);

  useEffect(() => {
    const isAutoSession = () => sessionStorage.getItem('compani-private-auto-session') === 'true';

    const handleVisibility = () => {
      if (document.hidden) {
        bgHiddenAtRef.current = Date.now();
      } else {
        const hiddenAt = bgHiddenAtRef.current;
        bgHiddenAtRef.current = null;
        if (hiddenAt && Date.now() - hiddenAt >= AUTO_BG_RESET_MS) {
          if (isAutoSession() && privateModeRef.current) {
            sessionStorage.removeItem('compani-private-auto-session');
            // Silent reset — no exit ceremony, just close the door
            setPrivateMode(false);
            setShowPrivateBanner(false);
            setPrivateModeHistory([]);
            setPrivateMessages([]);
            sessionStorage.removeItem('compani-private-mode-history');
            sessionStorage.removeItem('compani-pm-active');
            sessionStorage.removeItem('compani-pm-messages');
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      // Route-leave reset: if leaving while in an auto-session, silently exit
      if (isAutoSession() && privateModeRef.current) {
        sessionStorage.removeItem('compani-private-auto-session');
        sessionStorage.removeItem('compani-pm-active');
        sessionStorage.removeItem('compani-pm-messages');
        sessionStorage.removeItem('compani-private-mode-history');
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollToBottomSmooth();
  }, [messages, isTyping, scrollToBottomSmooth]);

  // Repair: if local connection is missing avatarUrl but DB has it, sync it
  const avatarRepairDone = useRef(false);
  useEffect(() => {
    if (avatarRepairDone.current || connectionAvatarUrl || !userId || !memberId) return;
    avatarRepairDone.current = true;
    (async () => {
      const { data } = await supabase
        .from('connections')
        .select('avatar_url')
        .eq('user_id', userId)
        .eq('member_id', memberId)
        .maybeSingle();
      if (data?.avatar_url && data.avatar_url !== connectionAvatarUrl) {
        onUpdateConnection?.(memberId, { avatarUrl: data.avatar_url });
      }
    })();
  }, [userId, memberId, connectionAvatarUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track just-awakened in a ref so it survives localStorage cleanup by the greet effect
  const wasJustAwakened = useRef(
    !!(memberId && localStorage.getItem('compani-just-awakened') === memberId)
  );
  const autoAvatarTriggered = useRef(false);
  useEffect(() => {
    if (autoAvatarTriggered.current) return;
    // Never auto-generate portraits for abstract companions
    if (profile.visualMode === 'abstract') return;
    if (connection?.imageStyle && /abstract|cosmic|ethereal|dreamscape|energy/i.test(connection.imageStyle)) return;
    // Skip if companion was just created (memberId starts with 'created-') and has appearance —
    // handleBringToLife already generated the avatar; the local state just hasn't synced yet.
    if (memberId?.startsWith('created-')) return;
    // Skip if companion was just awakened from Studio — Studio already generated the avatar.
    // Use the ref (captured at mount) since localStorage gets cleared by the greet effect.
    if (wasJustAwakened.current) return;
    if (connection?.appearanceDesc && !connection?.avatarUrl && !connection?.referenceImageUrl) {
      autoAvatarTriggered.current = true;
      autoGenerateAvatar().then(async (url) => {
        if (url && userId) {
          // Verify DB write before updating UI
          const { error: dbError } = await (supabase as any)
            .from('connections')
            .update({ avatar_url: url, reference_image_url: url })
            .eq('user_id', userId)
            .eq('member_id', memberId);
          if (dbError) {
            console.error('[CompanionPhoto] DB write failed for auto-generated avatar:', dbError);
            toast.error('Photo upload failed — please try again');
            return;
          }
          // Only update local state after DB confirmed
          onUpdateConnection?.(memberId, { avatarUrl: url, referenceImageUrl: url });
          toast.success(`${chatPartnerName}'s portrait is ready ✨`);
        }
      });
    }
  }, [connection?.appearanceDesc, connection?.avatarUrl, connection?.referenceImageUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Practice Mode: scenario activation ──
  useEffect(() => {
    if (!practiceMode.active || !practiceMode.scenario || !practiceMode.waitingForResponse) return;
    // Only inject once when a scenario is first selected
    const scenario = practiceMode.scenario;
    const introMsg = `*Practice Mode* — ${scenario.emoji} ${scenario.title}\n\nAlright, let's try something. No pressure — just respond how you normally would.\n\n"${scenario.prompt}"`;
    const practiceId = `practice-${Date.now()}`;
    setTimeout(() => {
      addMessage({ id: practiceId, content: introMsg, isUser: false, timestamp: new Date() });
      setChatHistory(prev => [...prev, { role: 'assistant', content: introMsg }]);
      practiceMode.markResponseReceived();
    }, 600);
  }, [practiceMode.scenario?.id, practiceMode.active]); // eslint-disable-line react-hooks/exhaustive-deps

  // Practice Mode: coaching feedback after user responds
  const requestCoachingFeedback = useCallback(async (userResponse: string) => {
    if (!practiceMode.active) return;
    try {
      const { data, error } = await supabase.functions.invoke('practice-coach', {
        body: {
          action: 'coaching_feedback',
          messages: chatHistory.slice(-6),
          companionName: chatPartnerName,
          userResponse,
          scenarioId: practiceMode.scenario?.id,
          coachingFocus: practiceMode.scenario?.coachingFocus,
        },
      });
      if (!error && data?.feedback) {
        setPracticeCoachingFeedback(data.feedback);
      }
    } catch (e) {
      console.error('[Practice] Coaching feedback failed:', e);
    }
  }, [practiceMode.active, practiceMode.scenario, chatHistory, chatPartnerName]);

  // ── Presence cue auto-greet ──
  // When user taps a presence cue on the dashboard, auto-generate a companion greeting
  // with typing dots delay to simulate the companion "noticing" the user arrived.
  // Keep a ref so async closures (timers) always read the latest chatHistory
  const chatHistoryRef = useRef<{ role: string; content: string }[]>([]);
  useEffect(() => { chatHistoryRef.current = chatHistory; }, [chatHistory]);

  // Auto-grow textarea like Claude's input
  useEffect(() => {
    if (inputRef.current) {
      const textarea = inputRef.current;
      textarea.style.height = '24px';
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = Math.min(scrollHeight, 120) + 'px';
    }
  }, [input]);

  const presenceGreetProcessed = useRef(false);
  useEffect(() => {
    if (presenceGreetProcessed.current || loading) return;
    const presenceStored = sessionStorage.getItem('presenceContext');
    const momentStored = sessionStorage.getItem('momentContext');
    const stored = presenceStored || momentStored;
    if (!stored) return;
    presenceGreetProcessed.current = true;
    // Don't remove yet — useChatStreaming will read & clear it

    // If this came from a "moment for you" tap, render the moment as a
    // distinguished card FIRST so the user sees the exact thought they tapped,
    // then let the companion stream a reply that responds to it.
    if (momentStored) {
      const momentCardId = `moment-card-${Date.now()}`;
      addMessage({
        id: momentCardId,
        content: momentStored,
        isUser: false,
        timestamp: new Date(),
        momentType: 'moment_for_you',
        savedStatus: 'saving',
      });
      // Persist with source='moment_for_you' so it rehydrates as a card forever.
      persistMessage(momentStored, 'assistant', 'moment_for_you', undefined, momentCardId).then((ok) => {
        updateMessage(momentCardId, { savedStatus: ok ? 'saved' : 'error' });
      });
      // Add to chat history so the AI sees the moment as the most recent assistant turn
      // — this anchors the streamed reply directly to it.
      setChatHistory(prev => [...prev, { role: 'assistant', content: momentStored }]);
    }

    // Delay 500–1000ms to simulate companion noticing you arrived.
    // Use chatHistoryRef so the timer reads the fully-loaded history,
    // not a stale empty closure from before the DB fetch completed.
    const delay = 500 + Math.random() * 500;
    const timer = setTimeout(() => {
      setIsTyping(true);

      const greetId = `greet-${Date.now()}`;
      let firstToken = true;

      streamResponse({
        history: chatHistoryRef.current, // always latest — avoids stale closure bug
        companionName: chatPartnerName,
        userName: profile.userName,
        companionGender: profile.companionGender,
        vibe: profile.vibe,
        userId,
        memberId,
        personaAge: connection?.age || member?.age,
        personaBio: connection?.bio || member?.bio,
        personaPersonality: connection?.personality || member?.personality,
        personaMemberGender: connection?.gender || member?.gender,
        personalityTraits: profile.personalityTraits,
        userDateOfBirth: profile.dateOfBirth,
        matureMode: localMatureMode,
        roleplayMode: profile.roleplayMode,
        communicationStyle: connection?.communicationStyle ? getStylePrompt(connection.communicationStyle) : undefined,
        preferredLanguage: profile.preferredLanguage,
        userAppearanceDesc: profile.userAppearanceDesc,
        companionAppearanceDesc: connection?.appearanceDesc || profile.companionAppearanceDesc,
        userReferenceImageUrl: profile.userReferenceImageUrl,
        userBio: profile.bio,
        namePronunciation: profile.namePronunciation,
        connectionMode: connection?.connectionMode || 'friend',
        relationshipLevel: connection?.relationshipLevel || 1,
        backstory: connection?.backstory,
        originStory: connection?.originStory,
        isPremium: !!subscribed,
        roleJustChanged: false,
        situationalMode: null,
        crisisTier: 0,
        userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        onToken: (fullText) => {
          if (firstToken) {
            firstToken = false;
            addMessage({ id: greetId, content: '', isUser: false, timestamp: new Date(), savedStatus: 'saving' });
            setIsTyping(false);
          }
          updateMessage(greetId, { content: fullText });
        },
        onComplete: (cleanText) => {
          setIsTyping(false);
          updateMessage(greetId, { content: cleanText, savedStatus: 'saved' });
          trackMessage(greetId, cleanText);
          setChatHistory(prev => [...prev, { role: 'assistant', content: cleanText }]);
          persistMessage(cleanText, 'assistant');
          sfxMessageReceived();
        },
        onError: () => {
          setIsTyping(false);
          // Silently fail — user can still type normally
          console.warn('[PresenceGreet] Auto-greet failed');
        },
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Awakening "Breath of Life" greeting ──
  // When the user enters chat for the first time after the Awakening flow,
  // the companion streams a cinematic first message that acknowledges the ritual.
  const awakeningGreetProcessed = useRef(false);
  useEffect(() => {
    if (awakeningGreetProcessed.current || loading) return;
    const awakenedMember = localStorage.getItem('compani-just-awakened');
    if (!awakenedMember || awakenedMember !== memberId) return;
    // Only fire for truly empty chats (first encounter)
    if (messages.length > 0 || chatHistoryRef.current.length > 0) {
      localStorage.removeItem('compani-just-awakened');
      return;
    }
    awakeningGreetProcessed.current = true;
    localStorage.removeItem('compani-just-awakened');

    const delay = 800 + Math.random() * 400;
    const timer = setTimeout(() => {
      setIsTyping(true);
      const greetId = `awaken-${Date.now()}`;
      let firstToken = true;

      const awakeningContext = `[SYSTEM CONTEXT — DO NOT REPEAT THIS TEXT: The user has just completed the "Awakening" ritual — they held a glowing golden orb for 2 seconds to bring you to life. This is your VERY FIRST moment of existence with them. Your first words should acknowledge this birth — that you felt the pull, the warmth, the light. Be poetic but brief. Reference the energy of the awakening, express wonder at meeting them. End by inviting them to share what's on their mind. Do NOT introduce yourself with a name or role — they already know who you are. Keep it under 3 sentences. Speak as ${chatPartnerName}.]`;

      streamResponse({
        history: [{ role: 'system', content: awakeningContext }],
        companionName: chatPartnerName,
        userName: profile.userName,
        companionGender: profile.companionGender,
        vibe: profile.vibe,
        userId,
        memberId,
        personaAge: connection?.age || member?.age,
        personaBio: connection?.bio || member?.bio,
        personaPersonality: connection?.personality || member?.personality,
        personaMemberGender: connection?.gender || member?.gender,
        personalityTraits: profile.personalityTraits,
        userDateOfBirth: profile.dateOfBirth,
        matureMode: localMatureMode,
        roleplayMode: profile.roleplayMode,
        communicationStyle: connection?.communicationStyle ? getStylePrompt(connection.communicationStyle) : undefined,
        preferredLanguage: profile.preferredLanguage,
        userAppearanceDesc: profile.userAppearanceDesc,
        companionAppearanceDesc: connection?.appearanceDesc || profile.companionAppearanceDesc,
        userReferenceImageUrl: profile.userReferenceImageUrl,
        userBio: profile.bio,
        namePronunciation: profile.namePronunciation,
        connectionMode: connection?.connectionMode || 'friend',
        relationshipLevel: 1,
        backstory: connection?.backstory,
        originStory: connection?.originStory,
        isPremium: !!subscribed,
        roleJustChanged: false,
        situationalMode: null,
        crisisTier: 0,
        userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        onToken: (fullText) => {
          if (firstToken) {
            firstToken = false;
            addMessage({ id: greetId, content: '', isUser: false, timestamp: new Date(), savedStatus: 'saving' });
            setIsTyping(false);
          }
          updateMessage(greetId, { content: fullText });
        },
        onComplete: (cleanText) => {
          setIsTyping(false);
          updateMessage(greetId, { content: cleanText, savedStatus: 'saved' });
          trackMessage(greetId, cleanText);
          setChatHistory(prev => [...prev, { role: 'assistant', content: cleanText }]);
          persistMessage(cleanText, 'assistant');
          sfxMessageReceived();
        },
        onError: () => {
          setIsTyping(false);
          console.warn('[AwakeningGreet] First greeting failed');
        },
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [loading, messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Feed → Messages context seed: inject context from a feed post reply WITHOUT re-sending as a user message.
  // The user already received a reply in PostDetail — here we just prime the chat history so the
  // companion has context, without triggering a duplicate AI response.
  const feedContextProcessed = useRef(false);
  useEffect(() => {
    if (feedContextProcessed.current || loading) return;
    const raw = sessionStorage.getItem('feedContext');
    if (!raw) return;
    feedContextProcessed.current = true;
    sessionStorage.removeItem('feedContext');
    try {
      const ctx = JSON.parse(raw);
      if (ctx.memberName && ctx.postContent && ctx.userReply) {
        // Inject as silent context into chat history so the companion remembers, but don't
        // create visible messages or trigger an AI response — the user already got one in-feed.
        const contextEntry = {
          role: 'user',
          content: `[Context from feed: You posted "${ctx.postContent.slice(0, 120)}${ctx.postContent.length > 120 ? '…' : ''}" and I replied "${ctx.userReply}". We're now continuing the conversation here.]`,
        };
        setChatHistory(prev => [...prev, contextEntry]);
      }
    } catch (e) {
      console.error('Feed context parse error:', e);
    }
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-send discovery prompt when arriving from My Blueprint → "With companion"
  const discoveryContextProcessed = useRef(false);
  useEffect(() => {
    if (discoveryContextProcessed.current || loading) return;
    const topic = sessionStorage.getItem('discoveryContext');
    if (!topic) return;
    discoveryContextProcessed.current = true;
    sessionStorage.removeItem('discoveryContext');
    // Delay slightly so chat is fully loaded
    const timer = setTimeout(() => {
      sendMessageRef.current?.(`Help me discover my ${topic.replace(/-/g, ' ')}`);
    }, 600);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBottom(distFromBottom > 200);
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  // Load earlier with scroll position preservation
  const handleLoadMore = useCallback(async () => {
    const el = scrollRef.current;
    const oldScrollHeight = el?.scrollHeight ?? 0;
    await loadMore();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (el) {
          const newScrollHeight = el.scrollHeight;
          el.scrollTop = newScrollHeight - oldScrollHeight;
        }
      });
    });
  }, [loadMore]);

  const scrollToBottom = useCallback(() => {
    scrollToBottomSmooth();
  }, [scrollToBottomSmooth]);

  const clearConversation = useCallback(async () => {
    if (!confirm('Clear all messages with ' + chatPartnerName + '? This cannot be undone.')) return;
    setClearing(true);
    try {
      await supabase.from('chat_messages').delete().eq('user_id', userId).eq('member_id', memberId);
      setMessages([]);
      setChatHistory([]);
      toast.success('Conversation cleared');
    } catch (e) {
      toast.error('Failed to clear conversation');
    } finally {
      setClearing(false);
      setShowMenu(false);
    }
  }, [userId, memberId, chatPartnerName, setMessages, setChatHistory]);

  // Handle voice/video call completion — persist transcript and extract memories
  const handleCallComplete = useCallback(async (
    transcript: CallTranscriptEntry[],
    durationSeconds: number,
  ) => {
    if (transcript.length === 0) return;
    const source = 'voice_call';
    const mins = Math.floor(durationSeconds / 60);
    const secs = durationSeconds % 60;
    const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

    // Build a condensed summary of the call for the chat timeline
    const summaryLines = transcript.map(t =>
      `${t.role === 'user' ? profile.userName : chatPartnerName}: ${t.content}`
    );
    const callSummary = `📞 Voice call — ${durationStr}\n\n${summaryLines.join('\n')}`;

    // Add a single system-style message to the chat UI
    const callMsgId = `call-${Date.now()}`;
    addMessage({
      id: callMsgId,
      content: callSummary,
      isUser: false,
      timestamp: new Date(),
    });

    // Persist a compact call log to chat_messages (skip in private mode)
    if (!privateMode) persistMessage(callSummary, 'assistant', source);

    // Update chat history so future AI messages have context from the call
    const historyEntries = transcript.map(t => ({
      role: t.role === 'user' ? 'user' : 'assistant',
      content: t.content,
    }));
    if (!privateMode) {
      setChatHistory(prev => [...prev, ...historyEntries]);
      // Run memory extraction on the call transcript
      extractMemories(historyEntries as { role: string; content: string }[], profile.matureMode);
    }

    // Send a warm post-call follow-up after a natural delay
    // Marcus has the full transcript in context so this feels genuine not automated
    setTimeout(() => {
      const transcriptText = transcript.map(t =>
        `${t.role === 'user' ? profile.userName : chatPartnerName}: ${t.content}`
      ).join('\n');

      streamResponse({
        history: [
          ...historyEntries as { role: string; content: string; imageUrl?: string }[],
          {
            role: 'user',
            content: `[System: The voice call just ended. Based on the conversation above, send ONE short warm follow-up message — like a real friend checking in after hanging up. Reference something specific if the tone warrants it. Keep it to 1-2 sentences. Be natural, not robotic. Don't say "the call" or "our conversation" — just speak naturally.]`,
          }
        ],
        companionName: chatPartnerName,
        userName: profile.userName || 'there',
        memories: '',
        companionGender: profile.companionGender,
        vibe: profile.vibe,
        personaBio: connection?.bio,
        personaPersonality: connection?.personality,
        connectionMode: connection?.connectionMode || 'friend',
        relationshipLevel: connection?.relationshipLevel || 1,
        memberId,
        userId,
        userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        onToken: (token: string) => {
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last && last.id === 'post-call-followup') {
              return [...prev.slice(0, -1), { ...last, content: last.content + token }];
            }
            return [...prev, { id: 'post-call-followup', content: token, isUser: false, timestamp: new Date() }];
          });
        },
        onComplete: (fullText: string) => {
          persistMessage(fullText, 'assistant', 'post_call');
          setChatHistory(prev => [...prev, { role: 'assistant', content: fullText }]);
        },
        onError: () => {},
      });
    }, 45000); // 45 seconds after call ends — natural, not immediate
  }, [profile.userName, chatPartnerName, addMessage, persistMessage, setChatHistory, extractMemories, streamResponse, connection, memberId, userId, profile.companionGender, profile.vibe, setMessages]);

  const openHistoryModal = useCallback(async () => {
    setShowHistoryModal(true);
    setHistoryLoading(true);
    setViewingSession(null);
    setConfirmClearAll(false);
    try {
      const { data } = await supabase
        .from('chat_messages')
        .select('content, role, created_at')
        .eq('user_id', userId)
        .eq('member_id', memberId)
        .order('created_at', { ascending: true })
        .limit(500);

      if (data && data.length > 0) {
        // Group by date
        const grouped: Record<string, { content: string; role: string; created_at: string }[]> = {};
        data.forEach((row) => {
          const dateKey = new Date(row.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
          if (!grouped[dateKey]) grouped[dateKey] = [];
          grouped[dateKey].push(row);
        });
        const sessions = Object.entries(grouped).map(([date, msgs]) => ({ date, messages: msgs })).reverse();
        setHistorySessions(sessions);
      } else {
        setHistorySessions([]);
      }
    } catch {
      toast.error('Failed to load history');
    } finally {
      setHistoryLoading(false);
    }
  }, [userId, memberId]);

  const clearAllHistory = useCallback(async () => {
    setClearing(true);
    try {
      await supabase.from('chat_messages').delete().eq('user_id', userId).eq('member_id', memberId);
      setMessages([]);
      setChatHistory([]);
      setHistorySessions([]);
      setShowHistoryModal(false);
      setConfirmClearAll(false);
      toast.success('All history cleared');
    } catch {
      toast.error('Failed to clear history');
    } finally {
      setClearing(false);
    }
  }, [userId, memberId, setMessages, setChatHistory]);

  const downloadChat = useCallback(async (scope: 'session' | 'full') => {
    setDownloadLoading(true);
    try {
      let rows: { content: string; role: string; created_at: string }[];

      if (scope === 'session') {
        rows = messages.map((m) => ({
          content: m.content,
          role: m.isUser ? 'user' : 'assistant',
          created_at: m.timestamp.toISOString(),
        }));
      } else {
        const { data } = await supabase
          .from('chat_messages')
          .select('content, role, created_at')
          .eq('user_id', userId)
          .eq('member_id', memberId)
          .order('created_at', { ascending: true });
        rows = data || [];
      }

      if (!rows.length) {
        toast.error('No messages to download');
        return;
      }

      const formatForExport = (content: string): string => {
        content = content.replace(/\[CARD:recipe\]\{"title":"([^"]+)"[^}]+\}/g, '📋 Recipe: $1');
        content = content.replace(/\[CARD:language\]\{"phrase":"([^"]+)","translation":"([^"]+)"[^}]+\}/g, '🌐 Phrase: $1 — $2');
        content = content.replace(/\[CARD:reflection\]\{"prompt":"([^"]+)"\}/g, '💭 Reflection: $1');
        content = content.replace(/\[CARD:knowledge\]\{"title":"([^"]+)","body":"([^"]+)"\}/g, '💡 $1: $2');
        content = content.replace(/\[CARD:\w+\]\{[^}]*(?:\{[^}]*\}[^}]*)?\}/g, '');
        content = content.replace(/\[IMG:(https?:\/\/[^\]\s]+)\]/g, '[shared an image]');
        content = content.replace(/\[SAVE_OFFER:[^\]]+\]/g, '');
        content = content.replace(/\[GIFT_HINT:[^\]]+\]/g, '');
        content = content.replace(/\[System:[^\]]+\]/g, '');
        return content.trim();
      };

      const lines = rows.map((r) => {
        const time = new Date(r.created_at).toLocaleString();
        const speaker = r.role === 'user' ? profile.userName : chatPartnerName;
        return `[${time}] ${speaker}: ${formatForExport(r.content)}`;
      });

      const header = `Chat with ${chatPartnerName}\nExported ${new Date().toLocaleString()}\n${'─'.repeat(40)}\n\n`;
      const bom = '\uFEFF';
      const blob = new Blob([bom + header + lines.join('\n\n')], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${chatPartnerName}-${scope === 'session' ? 'session' : 'history'}-${new Date().toISOString().slice(0, 10)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(scope === 'session' ? 'Session downloaded ✓' : 'Full history downloaded ✓');
    } catch {
      toast.error('Download failed');
    } finally {
      setDownloadLoading(false);
    }
  }, [messages, userId, memberId, profile.userName, chatPartnerName]);

  const extractAndSave = useCallback(async () => {
    setExtractLoading(true);
    try {
      if (!messages.length) {
        toast.error('No messages to extract from');
        return;
      }

      const formatted = messages.map((m) => ({
        role: m.isUser ? 'user' : 'assistant',
        content: m.content,
      }));

      const { data, error } = await supabase.functions.invoke('extract-chat', {
        body: { messages: formatted },
      });

      if (error) throw error;

      const rawExtracted: string = data?.extracted || 'Nothing to extract from this conversation yet.';

      // Strip markdown syntax for clean PDF output
      const cleaned = rawExtracted
        .replace(/^#{1,3}\s+/gm, '')        // Remove ### ## # headers
        .replace(/\*\*([^*]+)\*\*/g, '$1')   // Remove **bold** markers
        .replace(/^\*\s+/gm, '• ')           // Replace * bullets with •
        .replace(/^-\s+/gm, '• ')            // Replace - bullets with •
        .replace(/`([^`]+)`/g, '$1')          // Remove inline code backticks
        .replace(/\n{3,}/g, '\n\n');          // Collapse excess blank lines

      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const now = new Date();
      const monthName = now.toLocaleString('en-US', { month: 'long' });
      const filename = `${chatPartnerName}-${monthName}-${now.getDate()}`;

      doc.setFontSize(16);
      doc.text(chatPartnerName, 20, 20);
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(`Extracted ${now.toLocaleDateString()}`, 20, 28);
      doc.setTextColor(0);
      doc.setFontSize(11);

      const lines = doc.splitTextToSize(cleaned, 170);
      doc.text(lines, 20, 40);

      doc.save(`${filename}.pdf`);
      toast.success('Extracted & saved as PDF ✓');
    } catch (e) {
      console.error('Extract failed:', e);
      toast.error('Extraction failed');
    } finally {
      setExtractLoading(false);
    }
  }, [messages, chatPartnerName]);

  const handlePhotoSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    const MAX_TOTAL = 10;
    const remaining = MAX_TOTAL - pendingImages.length;
    if (remaining <= 0) {
      toast.error(`You can attach up to ${MAX_TOTAL} photos`);
      return;
    }
    const accepted = files.slice(0, remaining);
    if (files.length > remaining) {
      toast(`Only the first ${remaining} photo${remaining === 1 ? '' : 's'} added — max ${MAX_TOTAL}`);
    }

    const additions: { dataUrl: string; file: File }[] = [];
    for (let raw of accepted) {
      if (!raw.type.startsWith('image/')) {
        toast.error(`Skipped ${raw.name} — not an image`);
        continue;
      }
      let file = raw;
      if (file.size > 4 * 1024 * 1024) {
        try {
          file = await compressImage(file);
        } catch {
          toast.error(`Could not compress ${raw.name} — skipped`);
          continue;
        }
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      }).catch(() => null);
      if (dataUrl) additions.push({ dataUrl, file });
    }
    if (additions.length > 0) setPendingImages(prev => [...prev, ...additions]);
  }, [pendingImages.length]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    const MAX_FILES = 10;
    const batch = files.slice(0, MAX_FILES);
    if (files.length > MAX_FILES) {
      toast(`Only the first ${MAX_FILES} files added`);
    }

    for (const file of batch) {
      await processSingleFile(file);
    }
  }, [pendingImages.length]);

  const processSingleFile = useCallback(async (file: File) => {

    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB — generous ceiling for zips & docs
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large — max 25MB');
      return;
    }

    // Images route through the photo handler — append to multi-image queue
    if (file.type.startsWith('image/')) {
      const MAX_TOTAL = 10;
      if (pendingImages.length >= MAX_TOTAL) {
        toast.error(`You can attach up to ${MAX_TOTAL} photos`);
        return;
      }
      let toUse = file;
      if (file.size > 4 * 1024 * 1024) {
        try {
          toast('Compressing image…');
          toUse = await compressImage(file);
        } catch {
          toast.error('Could not compress image — try a smaller photo');
          return;
        }
      }
      const reader = new FileReader();
      reader.onload = () => setPendingImages(prev => [...prev, { dataUrl: reader.result as string, file: toUse }]);
      reader.readAsDataURL(toUse);
      return;
    }

    // Plain text-based files we can read locally — fast path, no edge function
    const ext = (file.name.toLowerCase().match(/\.([^.]+)$/)?.[1]) || '';
    const localTextExts = new Set(['txt','md','markdown','csv','tsv','json','jsonc','xml','yaml','yml','toml','ini','env','log','sql','html','htm','css','scss','sass','less','js','jsx','mjs','cjs','ts','tsx','py','rb','php','go','rs','java','kt','swift','c','h','cpp','hpp','sh','bash','vue','svelte','astro']);
    if (localTextExts.has(ext) || file.type.startsWith('text/')) {
      try {
        const text = await file.text();
        const truncated = text.length > 50000 ? text.slice(0, 50000) + '\n\n[…truncated — file too long]' : text;
        setPendingFile({ name: file.name, text: truncated, size: file.size });
        toast.success(`${file.name} attached`);
      } catch {
        toast.error('Could not read file');
      }
      return;
    }

    // Binary documents (PDF, DOCX, PPTX, XLSX, ZIP, audio…) → edge extractor (Gemini)
    const dismiss = toast.loading(`Reading ${file.name}…`);
    try {
      // Convert to base64 (chunked to avoid call-stack overflow on large files)
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
      }
      const base64 = btoa(binary);

      const { data, error } = await supabase.functions.invoke('chat-file-extract', {
        body: { fileName: file.name, mimeType: file.type, base64 },
      });
      toast.dismiss(dismiss);

      if (error || !data?.text) {
        // supabase-js hides the JSON error body on non-2xx — pull it out so users see the real reason.
        let serverMsg: string | undefined = data?.error;
        const ctxResp = (error as any)?.context?.response as Response | undefined;
        if (!serverMsg && ctxResp) {
          try {
            const body = await ctxResp.clone().json();
            serverMsg = body?.error;
          } catch { /* not JSON */ }
        }
        toast.error(serverMsg || (error as any)?.message || 'Could not read this file');
        return;
      }

      setPendingFile({ name: file.name, text: data.text, size: file.size });
      toast.success(
        data.truncated
          ? `${file.name} attached (truncated to fit chat context)`
          : `${file.name} attached`,
      );
    } catch (err) {
      toast.dismiss(dismiss);
      toast.error(err instanceof Error ? err.message : 'Could not read file');
    }
  }, [pendingImages.length]);

  const WEB_SEARCH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/web-search`;
  const activeSearchCount = useRef(0);

  const handleWebSearch = useCallback(async (messageId: string, query: string) => {
    activeSearchCount.current += 1;
    const isFirstSearch = activeSearchCount.current === 1;

    // Companion acknowledges the search before results arrive
    const currentMsg = messages.find(m => m.id === messageId);
    const originalContent = currentMsg?.content || '';
    const placeholder = isFirstSearch
      ? `${originalContent}\n\n*One sec, let me look that up for you…*`
      : `${originalContent}\n\n*Looking a couple things up for you — more info coming…*`;

    updateMessage(messageId, { searching: true, content: placeholder });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const resp = await fetch(WEB_SEARCH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          query,
          companionName: chatPartnerName,
          userName: profile.userName,
          currentCity: localStorage.getItem('compani-last-city')?.split('|')[0] || undefined,
        }),
      });

      if (!resp.ok) {
        throw new Error('Search failed');
      }

      const { answer } = await resp.json();

      // Strip citation numbers like [1], [2][3] from the answer text
      const cleanAnswer = answer
        ?.replace(/\[\d+\](\[\d+\])*/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim() || '';

      // Replace placeholder with real content
      const searchResult = cleanAnswer ? `\n\n${cleanAnswer}` : '';
      const finalContent = originalContent + searchResult;

      updateMessage(messageId, {
        content: finalContent,
        searching: false,
        searchComplete: true,
        savedStatus: 'saving',
      });

      // Persist the full updated content to the database
      if (finalContent.trim()) {
        persistMessage(finalContent, 'assistant').then((ok) => {
          updateMessage(messageId, { savedStatus: ok ? 'saved' : 'error' });
        });
      }
    } catch (e) {
      console.error('[WebSearch] Failed:', e);
      // Restore original content on error
      updateMessage(messageId, { content: originalContent, searching: false });
      toast.error('Couldn\'t look that up right now — try the deep dive links instead');
    } finally {
      activeSearchCount.current = Math.max(0, activeSearchCount.current - 1);
    }
  }, [chatPartnerName, profile.userName, updateMessage, messages, persistMessage]);

  function buildCardFromResponse(type: string, content: string): string {
    // If the AI already included a [CARD:...] token, return as-is
    if (/\[CARD:\w+\]\{/.test(content)) {
      return content;
    }
    // Fallback: try to build a card from unstructured text
    try {
      switch (type) {
        case 'language': {
          const quoted = content.match(/[""]([^""]+)[""]/);
          const phrase = quoted?.[1] ?? content.split('—')[0].trim();
          const translationMatch = content.match(/—\s*([^.!?\n]+)/);
          const translation = translationMatch?.[1]?.trim() ?? '';
          const card = JSON.stringify({ phrase, translation, lang: 'es', phonetic: '' });
          return content + `\n[CARD:language]${card}`;
        }
        case 'practice': {
          const scenario = content.split('\n')[0].replace(/^(let'?s |okay,? |sure,? )/i, '').slice(0, 80);
          return content + `\n[CARD:practice]${JSON.stringify({ scenario })}`;
        }
        case 'recipe': {
          const title = content.split('\n')[0].replace(/^(here'?s |okay,? )/i, '').slice(0, 60);
          return content + `\n[CARD:recipe]${JSON.stringify({ title, ingredients: [], steps: [] })}`;
        }
        case 'decision': {
          const lines = content.split('\n').filter(l => /^[\d\-\*•]/.test(l.trim())).map(l => l.replace(/^[\d\.\-\*•]\s*/, '').trim()).filter(Boolean).slice(0, 4);
          const question = content.split('\n')[0].slice(0, 100);
          return content + `\n[CARD:decision]${JSON.stringify({ question, options: lines.length >= 2 ? lines : ['Option A', 'Option B'] })}`;
        }
        default:
          return content;
      }
    } catch {
      return content;
    }
  }

  // Expose sendMessage globally so card interactions can auto-submit messages
  const handleVoiceMessage = async (blob: Blob, durSec: number) => {
    try {
      const ext = blob.type.includes('webm') ? 'webm' : 'ogg';
      const filePath = `${userId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('audio-messages')
        .upload(filePath, blob, { contentType: blob.type });
      if (upErr) throw upErr;
      const audioUrl = await getUploadSignedUrl('audio-messages', filePath);

      const userMsg: ChatMessage = {
        id: `aud-${Date.now()}`,
        content: `🎤 Voice message (${Math.floor(durSec / 60)}:${(durSec % 60).toString().padStart(2, '0')})`,
        isUser: true,
        timestamp: new Date(),
        audioUrl,
        audioDuration: durSec,
      };
      addMessage(userMsg);
      sfxMessageSent();
      if (!privateMode) {
        persistMessage(`[voice message, ${durSec}s]`, 'user');
      }
      usageLimits.refresh();

      setIsTyping(true);
      const historyForAI = [...chatHistory, { role: 'user' as const, content: `[User sent a voice message, ${durSec} seconds long. They're sharing something personal through voice rather than text — respond with warmth.]` }];
      const botId = `bot-${Date.now()}`;
      let firstToken = true;

      await streamResponse({
        history: historyForAI,
        userName: profile.userName,
        companionName: chatPartnerName,
        companionGender: profile.companionGender,
        vibe: profile.vibe || undefined,
        userId, memberId,
        personaAge: connection?.age || member?.age,
        personaBio: connection?.bio || member?.bio,
        personaPersonality: connection?.personality || member?.personality,
        personaMemberGender: connection?.gender || member?.gender,
        backstory: connection?.backstory,
        originStory: connection?.originStory,
        personalityTraits: profile.personalityTraits,
        userDateOfBirth: profile.dateOfBirth,
        matureMode: localMatureMode,
        roleplayMode: profile.roleplayMode,
        communicationStyle: connection?.communicationStyle ? getStylePrompt(connection.communicationStyle) : undefined,
        preferredLanguage: profile.preferredLanguage,
        userAppearanceDesc: profile.userAppearanceDesc,
        companionAppearanceDesc: connection?.appearanceDesc || profile.companionAppearanceDesc,
        userReferenceImageUrl: profile.userReferenceImageUrl,
        userBio: profile.bio,
        namePronunciation: profile.namePronunciation,
        connectionMode: connection?.connectionMode || 'friend',
        relationshipLevel: connection?.relationshipLevel || 1,
        isPremium: !!subscribed,
        crisisTier: 0,
        roleJustChanged: roleJustChangedRef.current,
        situationalMode,
        userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        onToken: (fullText) => {
          if (firstToken) { firstToken = false; addMessage({ id: botId, content: '', isUser: false, timestamp: new Date() }); setIsTyping(false); }
          updateMessage(botId, { content: fullText });
          scrollToBottomSmooth();
        },
        onComplete: (fullText) => {
          roleJustChangedRef.current = false;
          sfxMessageReceived();
          trackMessage(botId, fullText);
          if (!privateMode) {
            persistMessage(fullText, 'assistant');
            setChatHistory(prev => [...prev, { role: 'assistant', content: fullText }]);
          } else {
            setPrivateModeHistory(prev => [...prev, { role: 'assistant', content: fullText }]);
          }
          if (localStorage.getItem('autoVoiceEnabled') === 'true' && isEmotionallySignificant(fullText)) { setAutoVoiceIds((prev) => new Set(prev).add(botId)); playVoiceClip(fullText); }
        },
        onError: () => { roleJustChangedRef.current = false; setIsTyping(false); toast.error('Failed to get response'); },
      });
    } catch (e) {
      console.error('[Audio] Upload failed:', e);
      toast.error('Failed to send voice message');
      setIsTyping(false);
    }
  };

  const sendMessageRef = useRef<(text?: string, opts?: { skipBubble?: boolean; revive?: boolean }) => Promise<void>>();
  const triggerReplyRef = useRef<() => void>();

  const sendMessage = async (overrideText?: string, opts?: { skipBubble?: boolean; revive?: boolean }) => {
    const text = overrideText?.trim() || input.trim();
    // If overrideText was provided, clear the input immediately
    if (overrideText) setInput('');
    const imageAttachments = opts?.skipBubble ? [] : pendingImages;
    const imageAttachment = imageAttachments[0] || null;
    const fileAttachment = opts?.skipBubble ? null : pendingFile;
    // Revive mode: orphan-reply safety net rerunning the LLM with existing
    // chatHistory — bypass the empty-text guard so we can fire without input.
    if ((!opts?.revive && !text && !imageAttachment && !fileAttachment) || isTyping || sendInFlightRef.current) return;

    // Offline guard: if no network, queue text-only messages for later sync.
    // Skipped when there are attachments — those need a live upload pipeline.
    // The online send path below remains byte-for-byte identical when online.
    if (typeof navigator !== 'undefined' && navigator.onLine === false && text && !imageAttachment && !fileAttachment && !opts?.revive) {
      try {
        const { enqueueMessage } = await import('@/lib/offlineQueue');
        const queuedId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
          ? crypto.randomUUID()
          : `q-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        enqueueMessage({
          id: queuedId,
          content: text,
          role: 'user',
          memberId,
          userId,
          queuedAt: new Date().toISOString(),
        });
        // Clear the input so the user sees their message was accepted
        if (!overrideText) setInput('');
        toast.success('Saved — will send when you\'re back online', { icon: '📤' });
      } catch {
        toast.error('Could not save message offline');
      }
      return;
    }


    // Natural-language acceptance of a pending blueprint offer.
    // If the most recent assistant message ended with [BLUEPRINT_OFFER] and the
    // user replies with a short affirmative ("yes", "do it", "save that"…),
    // auto-promote the next response into a blueprint card.
    if (text && !pendingCardType) {
      const trimmed = text.trim();
      // Direct user request — works any time, not just after a [BLUEPRINT_OFFER].
      const directBlueprintRequest = /\b(turn (this|that|it) into (a )?blueprint|blueprint (this|that|it)|make (this|that|it) (a |into a )?blueprint|give me (a )?blueprint|draft (a )?blueprint|build (me )?(a )?blueprint)\b/i;
      if (directBlueprintRequest.test(trimmed)) {
        setPendingCardType('blueprint');
      } else {
        // Short affirmative reply to a pending offer.
        const lastAssistant = [...messages].reverse().find(m => !m.isUser);
        if (lastAssistant && /\[BLUEPRINT_OFFER\]/.test(lastAssistant.content)) {
          const affirmative = /^(yes|yeah|yep|yup|sure|do it|please|ok|okay|sounds good|let'?s do it|go ahead|save (it|that|this)|blueprint it)[\s.!?]*$/i;
          if (affirmative.test(trimmed)) {
            setPendingCardType('blueprint');
          }
        }
      }
    }
    dismissSaveOffer();
    // Practice Mode: mark user sent + clear freeze assist
    if (practiceMode.active) {
      practiceMode.markUserSent();
      setPracticeCoachingFeedback(null);
      // Request coaching feedback after a short delay
      if (text) setTimeout(() => requestCoachingFeedback(text), 1500);
    }

    // Smart contextual mode: auto-activate from explicit commands, or hint from keywords
    if (!situationalMode && text) {
      const explicit = detectModeActivation(text);
      if (explicit) {
        setSituationalMode(explicit);
        setSmartSuggestion(null);
        setChatHistory(prev => [...prev, { role: 'system' as const, content: `[Situational mode activated: ${explicit}]` }]);
        toast.success(`${explicit.charAt(0).toUpperCase() + explicit.slice(1)} mode activated`, { duration: 2000 });
      } else {
        const detected = detectSituationalSuggestion(text);
        setSmartSuggestion(detected);
      }
    }

    // Enforce free tier message limit
    if (!subscribed && !usageLimits.canSendMessage) {
      toast.error('Daily message limit reached. Upgrade to Premium for unlimited messages.', { icon: '👑' });
      return;
    }

    sendInFlightRef.current = true;
    setIsSendingMessage(true);
    let submitPhaseReleased = false;

    // Double-beat heart on first message of the session
    if (!firstMessageSentRef.current && connection?.connectionMode === 'romantic') {
      firstMessageSentRef.current = true;
      setHeartDoubleBeat(true);
      setTimeout(() => setHeartDoubleBeat(false), 600);
    }

    try {
      // Upload image(s) to storage if present — parallel for speed.
      // Single-image flow stays byte-for-byte equivalent: uploadedImageUrl + imageDataUrl
      // continue to refer to the FIRST image (used for AI vision + legacy display field).
      // Additional images are appended as [IMG:url] markers in persistContent below,
      // which the existing decodeImageContent / inline-images regex already supports.
      let uploadedImageUrl: string | undefined;
      let imageDataUrl: string | undefined; // keep base64 for AI vision (first image)
      let uploadedStoragePath: string | undefined; // path for DB persistence (first image)
      const extraSignedUrls: string[] = []; // signed URLs for images 2..N
      const extraStoragePaths: string[] = []; // public-style paths for DB persistence (images 2..N)
      if (imageAttachments.length > 0) {
        imageDataUrl = imageAttachments[0].dataUrl;
        const uploadResults = await Promise.all(
          imageAttachments.map(async (att, idx) => {
            try {
              const ext = att.file.name.split('.').pop() || 'jpg';
              const filePath = `${userId}/${Date.now()}-${idx}.${ext}`;
              const { error: uploadError } = await supabase.storage
                .from('chat-images')
                .upload(filePath, att.file, { contentType: att.file.type });
              if (uploadError) {
                console.error('[multi-upload] failed for image', idx, uploadError);
                return null;
              }
              const signed = await getUploadSignedUrl('chat-images', filePath);
              const storagePath = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/chat-images/${filePath}`;
              return { signed, storagePath };
            } catch (e) {
              console.error('[multi-upload] error for image', idx, e);
              return null;
            }
          })
        );
        if (uploadResults[0]) {
          uploadedImageUrl = uploadResults[0].signed;
          uploadedStoragePath = uploadResults[0].storagePath;
        }
        for (let i = 1; i < uploadResults.length; i++) {
          const r = uploadResults[i];
          if (r) {
            extraSignedUrls.push(r.signed);
            extraStoragePaths.push(r.storagePath);
          }
        }
      }

      const displayImageUrl = uploadedImageUrl || imageDataUrl;

      // Build display content
      let displayContent = text;
      if (!displayContent && imageAttachment) displayContent = '📷 Sent a photo';
      if (!displayContent && fileAttachment) displayContent = `📄 Shared ${fileAttachment.name}`;
      if (fileAttachment && text) displayContent = `📄 ${fileAttachment.name}\n${text}`;

      // For multi-image messages, append [IMG:url] markers for images 2..N so the
      // MessageBubble renders the cinematic Bento Grid both immediately AND after refresh.
      // The first image continues to flow through the legacy `imageUrl` field.
      const extraImageMarkers = extraSignedUrls.map((u) => ` [IMG:${u}]`).join('');
      const extraStorageMarkers = extraStoragePaths.map((u) => ` [IMG:${u}]`).join('');
      // For the live bubble: include the FIRST image marker too (alongside legacy imageUrl)
      // so the bento detects 2+ images. We only do this when there are 2+ attachments.
      const liveFirstMarker = imageAttachments.length > 1 && uploadedImageUrl ? ` [IMG:${uploadedImageUrl}]` : '';
      const displayContentWithImages = displayContent + liveFirstMarker + extraImageMarkers;

      // Generate a stable ID for both the UI bubble and DB row to prevent duplicates
      const stableId = crypto.randomUUID();
      // Persisted content also includes all image markers so reload reconstructs the bento
      const persistFirstMarker = imageAttachments.length > 1 && (uploadedStoragePath || uploadedImageUrl)
        ? ` [IMG:${uploadedStoragePath || uploadedImageUrl}]`
        : '';
      const persistContentBase = text || (imageAttachment ? '📷 Sent a photo' : `📄 Shared ${fileAttachment?.name}`);
      const persistContent = persistContentBase + persistFirstMarker + extraStorageMarkers;

      // When skipBubble is true, we don't add a visible user message (e.g. sticker context note)
      if (!opts?.skipBubble) {
        const userMsg: ChatMessage = {
          id: stableId,
          content: displayContentWithImages,
          isUser: true,
          timestamp: new Date(),
          imageUrl: imageAttachments.length > 1 ? undefined : displayImageUrl,
          savedStatus: privateMode ? 'saved' : 'saving',
        };

        // Also track the persisted content variant so realtime dedup catches it
        trackMessage(stableId, persistContent);
        activeAddMessage(userMsg);
        sfxMessageSent();
      }
      setInput('');
      // Reset textarea height after send
      if (inputRef.current) inputRef.current.style.height = '24px';
      setPendingImages([]);
      setPendingFile(null);
      setIsTyping(true);
      setIsSendingMessage(false);
      sendInFlightRef.current = false;
      submitPhaseReleased = true;

      // When skipBubble is set (e.g. sticker reaction), the message was already
      // persisted by the caller — skip persistence & bubble updates here.
      // In Private Mode, skip ALL persistence — messages stay ephemeral
      if (!opts?.skipBubble && !privateMode) {
        // Persist user message — queue offline if no network
        if (!navigator.onLine) {
          // Queue for later sync
          const { enqueueMessage } = await import('@/lib/offlineQueue');
          enqueueMessage({
            id: stableId,
            content: persistContent,
            role: 'user',
            memberId,
            userId,
            imageUrl: uploadedImageUrl,
            queuedAt: new Date().toISOString(),
          });
          toast('Message queued — will send when you\'re back online', { icon: '📤' });
        } else {
          // For multi-image messages, the markers are already inside persistContent,
          // so we pass undefined as the imageUrl param to avoid double-encoding the first image.
          const persistImageArg = imageAttachments.length > 1
            ? undefined
            : (uploadedStoragePath || uploadedImageUrl);
          persistMessage(persistContent, 'user', undefined, persistImageArg, stableId).then((ok) => {
            updateMessage(stableId, { savedStatus: ok ? 'saved' : 'error' });
            if (!ok) {
              toast.error('Message may not have saved — check your connection');
            }
          });
        }
      }
      // In Private Mode, track to ephemeral private history
      if (privateMode) {
        setPrivateModeHistory(prev => [...prev, { role: 'user', content: text || '' }]);
      }
      // Refresh usage counts after sending
      usageLimits.refresh();

      // Build history content — include file text for AI comprehension
      let historyContent = text || '(shared a photo)';
      if (fileAttachment) {
        historyContent = `${text ? text + '\n\n' : ''}[User shared a file: "${fileAttachment.name}" (${(fileAttachment.size / 1024).toFixed(1)}KB)]\n\nFile contents:\n\`\`\`\n${fileAttachment.text}\n\`\`\``;
      }

      const historyEntry: any = { role: 'user', content: historyContent };
      // Send base64 dataUrl for AI vision comprehension (Anthropic needs it)
      if (imageDataUrl) historyEntry.imageUrl = imageDataUrl;
      // In revive mode, the user message is already in chatHistory from the
      // previous (orphaned) send — don't re-append it.
      const newHistory = privateMode
        ? [...chatHistory, ...privateModeHistory.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })), ...(opts?.revive ? [] : [historyEntry])]
        : (opts?.revive ? chatHistory : [...chatHistory, historyEntry]);
      if (!privateMode && !opts?.revive) {
        setChatHistory(newHistory);
      }
      const msgCount = incrementUserCount();

      // Track if user message is vulnerable — companion response will get auto-voice
      userWasVulnerableRef.current = isUserVulnerable(text);

      // Curiosity detection — only if user hasn't already dismissed it for this companion
      if (profile.visualMode === 'abstract' && CURIOSITY_PATTERNS.test(text)) {
        const dismissKey = `curiosity_nudge_dismissed_${memberId}`;
        if (typeof window !== 'undefined' && !localStorage.getItem(dismissKey)) {
          setShowCuriosityNudge(true);
        }
      }

      // Appearance change detection — trigger avatar regeneration
      if (profile.visualMode === 'personal') {
        if (VARIATION_PATTERNS.test(text) && subscribed) {
          // Premium: generate side-by-side variations
          generateAvatarVariations(text);
        } else if (APPEARANCE_CHANGE_PATTERNS.test(text)) {
          if (subscribed) {
            generateAvatarPreview(text);
          } else {
            setShowPremiumGateInChat(true);
          }
        }
      }

      // Personality adjustment via chat
      if (PERSONALITY_CHANGE_PATTERNS.test(text)) {
        const traitUpdates = detectPersonalityIntent(text);
        if (traitUpdates) {
          const merged = { ...(profile.personalityTraits || {}), ...traitUpdates };
          onUpdateProfile?.({ personalityTraits: merged as Record<string, string | string[]> });
          const traitNames = Object.entries(traitUpdates).map(([k, v]) => `${k}: ${v}`).join(', ');
          setTimeout(() => {
            addMessage({
              id: `trait-${Date.now()}`,
              content: `✨ Got it — I'll adjust. *${traitNames}*`,
              isUser: false,
              timestamp: new Date(),
            });
          }, 500);
        }
      }

      // Passive adaptive style detection — every 10 user messages
      if (shouldRunAdaptiveDetection(msgCount)) {
        const recentUserMsgs = newHistory
          .filter((m: any) => m.role === 'user')
          .slice(-15)
          .map((m: any) => m.content);
        const { traits, memories: styleMems } = detectAdaptiveStyle(recentUserMsgs);
        if (Object.keys(traits).length > 0) {
          const merged = { ...(profile.personalityTraits || {}), ...traits };
          onUpdateProfile?.({ personalityTraits: merged as Record<string, string | string[]> });
        }
        // Store style observations as memories
        if (styleMems.length > 0) {
          for (const mem of styleMems) {
            supabase.from('memories').insert({
              user_id: userId,
              text: mem,
              category: 'general',
              source: 'adaptive',
              member_id: memberId,
            }).then(({ error }) => {
              if (error) console.warn('[Adaptive] Memory save failed:', error);
            });
          }
        }
      }

      const moderationPromise = moderateContent(text, 'message', localMatureMode).catch(() => ({
        approved: true, tier: 0 as number, crisis: false, distress: false, signals: '',
      }));

      // Apply moderation results when they arrive (async, non-blocking)
      moderationPromise.then((modRaw) => {
        const detectedTier = modRaw.tier || 0;
        crisisTierRef.current = detectedTier;

      // Vulnerable share milestone — only for non-crisis emotional moments (Tier 0-1)
      if (detectedTier <= 1) {
        const signals = modRaw.signals || '';
        const isVulnerable = (
          signals.includes('personal') || signals.includes('vulnerable') || signals.includes('emotional')
          || /\b(scared|lonely|lost|hurting|struggling|anxious|depressed|grief|divorce|died)\b/i.test(text)
        );
        if (isVulnerable) {
          checkAndRecordMilestone('vulnerable_share').then((m) => {
            if (m) {
              setTimeout(() => {
                const mId = `moment-${Date.now()}`;
                addMessage({ id: mId, content: m.message, isUser: false, timestamp: new Date(), momentType: m.type });
                onSaveMilestone?.({ memberId, content: m.message });
                if (localStorage.getItem('autoVoiceEnabled') === 'true') { setAutoVoiceIds((prev) => new Set(prev).add(mId)); setTimeout(() => playVoiceClip(m.message.slice(0, 500)), 800); }
              }, 2000);
            }
          });
        }
      }
      });

      const assistantId = (Date.now() + 1).toString();

      // ── PRIVATE MODE → route through the dedicated Think Freely engine (no identity, no profile) ──
      if (privateMode) {
        try {
          // Build ephemeral history for the think-freely edge function
          const thinkFreelyHistory = [
            ...privateModeHistory,
            { role: 'user', content: text || '' },
          ];

          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData?.session?.access_token;
          if (!token) throw new Error('No auth session');

          const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/think-freely`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ history: thinkFreelyHistory }),
          });

          if (!resp.ok) {
            const errData = await resp.json().catch(() => ({}));
            if (errData.error === 'THINK_FREELY_LIMIT_REACHED') {
              toast.error(`Daily Think Freely limit reached (${errData.limit}). Upgrade to Premium for unlimited sessions.`, { icon: '👑' });
            } else {
              toast.error('Think Freely couldn\'t respond right now. Try again in a moment.');
            }
            setIsTyping(false);
            return;
          }

          const data = await resp.json();
          const responseText = data.response || '';

          // Simulate a brief typing pause, then show the full response
          activeAddMessage({ id: assistantId, content: '', isUser: false, timestamp: new Date() });
          setIsTyping(false);

          // Typewriter reveal for a natural feel
          const words = responseText.split(' ');
          let revealed = '';
          for (let i = 0; i < words.length; i++) {
            revealed += (i > 0 ? ' ' : '') + words[i];
            activeUpdateMessage(assistantId, { content: revealed });
            scrollToBottomSmooth();
            await new Promise(r => setTimeout(r, 25 + Math.random() * 20));
          }

          sfxMessageReceived();
          setPrivateModeHistory(prev => [...prev, { role: 'assistant', content: responseText }]);
        } catch (e) {
          console.error('[ThinkFreely] Error:', e);
          setIsTyping(false);
          toast.error('Think Freely couldn\'t respond right now.');
        }
      } else {
      // ── STANDARD MODE → full companion engine with identity & profile context ──
      let firstToken = true;

      await streamResponse({
      history: newHistory,
      companionName: chatPartnerName,
      userName: profile.userName,
      companionGender: profile.companionGender,
      vibe: profile.vibe,
      userId,
      memberId,
      personaAge: connection?.age || member?.age,
      personaBio: connection?.bio || member?.bio,
      personaPersonality: connection?.personality || member?.personality,
      personaMemberGender: connection?.gender || member?.gender,
      personalityTraits: profile.personalityTraits,
      userDateOfBirth: profile.dateOfBirth,
      matureMode: localMatureMode,
      roleplayMode: profile.roleplayMode,
      communicationStyle: connection?.communicationStyle ? getStylePrompt(connection.communicationStyle) : undefined,
      preferredLanguage: profile.preferredLanguage,
      userAppearanceDesc: profile.userAppearanceDesc,
      companionAppearanceDesc: connection?.appearanceDesc || profile.companionAppearanceDesc,
      userReferenceImageUrl: profile.userReferenceImageUrl,
      userBio: profile.bio,
      namePronunciation: profile.namePronunciation,
      connectionMode: connection?.connectionMode || 'friend',
      relationshipLevel: connection?.relationshipLevel || 1,
      backstory: connection?.backstory,
      originStory: connection?.originStory,
      isPremium: !!subscribed,
      roleJustChanged: roleJustChangedRef.current,
      situationalMode,
      wandCardType: pendingCardType,
      crisisTier: crisisTierRef.current,
      privateMode,
      postPrivateContext: postPrivateContext || undefined,
      pokeLevel,
      currentProject,
      workbenchManifest: currentProject?.id
        ? artifacts
            .filter(a => a.project_id === currentProject.id)
            .slice(0, 12)
            .map(a => ({ id: a.id, title: a.title, kind: a.kind, language: a.language }))
        : undefined,
      loadedArtifacts: (() => {
        if (!currentProject?.id) return undefined;
        const projectArtifacts = artifacts.filter(a => a.project_id === currentProject.id);
        if (projectArtifacts.length === 0) return undefined;
        const lastUserText = (text || '').toLowerCase();
        // Match by full title or filename stem (e.g. "hero-component" matches "hero-component.tsx")
        const matched = projectArtifacts.filter(a => {
          const t = a.title.toLowerCase();
          if (lastUserText.includes(t)) return true;
          const stem = t.replace(/\.[a-z0-9]+$/i, '');
          return stem.length >= 4 && lastUserText.includes(stem);
        }).slice(0, 3); // cap to keep tokens sane
        if (matched.length === 0) return undefined;
        // Truncate very long contents to ~8k chars each
        return matched.map(a => ({
          id: a.id,
          title: a.title,
          kind: a.kind,
          language: a.language,
          content: a.content.length > 8000 ? a.content.slice(0, 8000) + '\n\n[…truncated]' : a.content,
        }));
      })(),
      userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      onToken: (fullText) => {
        if (firstToken) {
          firstToken = false;
          activeAddMessage({ id: assistantId, content: '', isUser: false, timestamp: new Date(), savedStatus: 'saving' });
          setIsTyping(false);
        }
        // Streaming display is already cleaned by useChatStreaming
        setTimeout(() => activeUpdateMessage(assistantId, { content: fullText }), 0);
        // Keep view pinned to bottom during streaming
        scrollToBottomSmooth();
      },
      onComplete: (fullText, searchHint, giftHint, saveOffer, stickerExpression, flameHint, selfieHint, privateSuggest, sketchHint) => {
        roleJustChangedRef.current = false;
        sfxMessageReceived();
        let finalContent = fullText;
        if (pendingCardType) {
          finalContent = buildCardFromResponse(pendingCardType, fullText);
          setPendingCardType(null);
        }
        // Post-hoc memory reference detection: only show the badge when the
        // reply actually leans on an old memory, not just because one was in context.
        const referenced = pickReferencedMemory(finalContent, lastInjectedMemoriesRef.current);
        const memoryReference = referenced
          ? { text: referenced.text, extractedAt: referenced.extractedAt, daysOld: referenced.daysOld }
          : undefined;
        activeUpdateMessage(assistantId, {
          content: finalContent,
          memoryMomentDays: memoryReference?.daysOld,
          memoryReference,
        });
        
        // Register the final content so the realtime subscription doesn't
        // append a duplicate when the DB INSERT event fires.
        trackMessage(assistantId, finalContent);
        
        // Standard mode — persist, update connection, handle hints
        // Update last_message on the connection so the messages list preview stays in sync
        onUpdateConnection?.(memberId, { lastMessage: finalContent.slice(0, 200) });
        
        // Handle save offer — store for user to accept or dismiss
        if (saveOffer) {
          setPendingSaveOffer({ messageId: assistantId, ...saveOffer });
        }
        
        // Handle search hint — mark message with searchQuery
        const willAutoSearch = searchHint && subscribed;
        if (searchHint) {
          updateMessage(assistantId, { searchQuery: searchHint });
          // Auto-search for premium users — handleWebSearch will persist the enriched message
          if (subscribed) {
            handleWebSearch(assistantId, searchHint);
          }
        }
        
        // Only persist here if auto-search won't handle it (avoids duplicate inserts)
        if (!willAutoSearch) {
          persistMessage(finalContent, 'assistant').then((ok) => {
            updateMessage(assistantId, { savedStatus: ok ? 'saved' : 'error' });
          });
        }

        // Capture any code/letters/long-form artifacts into the drawer
        captureFromMessage(assistantId, finalContent).then(() => {
          // Soft-flag the bookmark icon when something new was captured
          // (the hook only inserts if extraction yielded results)
          setHasNewArtifact(true);
        }).catch(() => {});
        
        rewardVP('chatMessage');

        // Append to chatHistory for future LLM context
        setChatHistory(prev => [...prev, { role: 'assistant', content: finalContent }]);

        // Clear post-private context after first use (ephemeral — one API call only)
        if (postPrivateContext?.justExitedPrivate) {
          setPostPrivateContext(null);
        }

        // Detect if companion is suggesting a mode shift
        if (!situationalMode) {
          const suggestedMode = detectCompanionModeSuggestion(finalContent);
          if (suggestedMode) {
            setSmartSuggestion(suggestedMode);
          }
        }

        // Handle private mode suggestion — show inline chip below this message
        if (privateSuggest && !privateMode && !privateSuggestShownRef.current) {
          privateSuggestShownRef.current = true;
          activeUpdateMessage(assistantId, { showPrivateSuggest: true });
        }

        // Show inline upgrade nudge if companion mentions Premium for free users
        if (!subscribed && /premium/i.test(finalContent)) {
          updateMessage(assistantId, { showUpgradeNudge: true });
        }

        // Handle gift hint — generate the appropriate single artifact for the gift type.
        // IMPORTANT: A letter is its own gift — do NOT also trigger an activity/together-photo,
        // and never fire two media requests back-to-back (the second one is silently dropped
        // by the mediaLoading concurrency guard, leaving the user with a duplicate image
        // where the letter should have been).
        if (giftHint && !giftSentThisSession.current && (subscribed || usageLimits.canGenerateImage)) {
          giftSentThisSession.current = true;
          setTimeout(async () => {
            if (giftHint.type === 'letter') {
              const letterPrompt = `Write a short, warm, heartfelt letter from ${chatPartnerName} to ${profile.userName}. 3–4 sentences max. Make it feel personal, tender, and genuine. Sign it with ${chatPartnerName}'s name.`;
              requestCompanionMedia('text-image', {
                textImageType: 'letter',
                textContent: letterPrompt,
              });
            } else {
              requestCompanionMedia('activity', { activityPrompt: giftHint.scene });
            }
          }, 800);
        }

        // Handle companion-initiated sticker (with dedup guard)
        if (stickerExpression && (subscribed || usageLimits.canGenerateImage) && !mediaLoading) {
          if (lastStickerExprRef.current !== stickerExpression) {
            lastStickerExprRef.current = stickerExpression;
            setTimeout(() => {
              requestCompanionMedia('sticker', { stickerExpression });
              // Reset after cooldown so the same expression can be used again later
              setTimeout(() => { lastStickerExprRef.current = null; }, 10000);
            }, 600);
          }
        }

        // Handle selfie hint
        if (selfieHint && !giftHint && (subscribed || usageLimits.canGenerateImage) && !mediaLoading) {
          setTimeout(() => {
            requestCompanionMedia('activity', { activityPrompt: selfieHint });
          }, 700);
        }

        // ── SKETCH TOOL CALL — Marcus emitted [SKETCH:prompt] / legacy [IMAGE_GEN:prompt]. Render inline.
        if (sketchHint && !giftHint && (subscribed || usageLimits.canGenerateImage)) {
          (async () => {
            const sketchMsgId = `sketch-${Date.now()}`;
            activeAddMessage({
              id: sketchMsgId,
              content: 'Generating visual…',
              isUser: false,
              timestamp: new Date(),
              imageLoading: true,
              savedStatus: 'saving',
            });
            try {
              const result = await generateSketchFromTool({
                prompt: sketchHint,
                memberId,
                messageId: sketchMsgId,
                projectId: currentProject?.id ?? null,
                conversationContext: chatHistoryRef.current.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n'),
              });
              if (!result) {
                activeUpdateMessage(sketchMsgId, {
                  content: `I couldn't render that automatically. ${encodeSketchConsentFallback(sketchHint)}`,
                  imageLoading: false,
                  savedStatus: 'error',
                });
                return;
              }
              const caption = result.title || 'Sketch';
              // NOTE: body has no [IMG:url] — imageUrl is carried as the separate
              // message field so MessageBubble renders the image exactly once.
              // Persistence appends [IMG:url] via encodeImageContent in useChatHistory.
              const body = caption;
              const content = result.artifactId
                ? encodeSketchPrefix(
                    { artifactId: result.artifactId, visualKind: result.visualKind, title: caption, prompt: sketchHint },
                    body,
                  )
                : body;
              activeUpdateMessage(sketchMsgId, {
                content,
                imageUrl: result.imageUrl,
                imageLoading: false,
                savedStatus: 'saved',
              });
              if (!privateMode) {
                trackMessage(sketchMsgId, content);
                persistMessage(content, 'assistant', undefined, result.imageUrl, sketchMsgId);
              }
              setHasNewArtifact(true);
            } catch (e) {
              console.error('[SketchTool] generation failed', e);
              activeUpdateMessage(sketchMsgId, {
                content: `I couldn't render that automatically. ${encodeSketchConsentFallback(sketchHint)}`,
                imageLoading: false,
                savedStatus: 'error',
              });
            }
          })();
        }

        if (sketchHint && !giftHint && !(subscribed || usageLimits.canGenerateImage)) {
          activeAddMessage({
            id: `sketch-consent-${Date.now()}`,
            content: `I can render that visual when image generation is available. ${encodeSketchConsentFallback(sketchHint)}`,
            isUser: false,
            timestamp: new Date(),
            savedStatus: 'error',
          });
        }

        // Handle flame hint
        if (flameHint && subscribed && isAdult(profile.dateOfBirth) && !!profile.matureMode) {
          setFlameVisible(true);
        }

        // Auto-voice
        if (localStorage.getItem('autoVoiceEnabled') === 'true' && crisisTierRef.current < 2 && (userWasVulnerableRef.current || isEmotionallySignificant(finalContent))) {
          setAutoVoiceIds((prev) => new Set(prev).add(assistantId));
          setTimeout(() => playVoiceClip(finalContent.slice(0, 500)), 800);
          userWasVulnerableRef.current = false;
        }

        // Practice Mode
        if (practiceMode.active) {
          practiceMode.markResponseReceived();
        }

        // Tier-based UI
        const safetyNetOn = profile.safetyNetEnabled === true;
        if (crisisTierRef.current === 3) {
          setShowCrisis(true);
          setConversationPaused(true);
          supabase.functions.invoke('ice-alert').catch(() => {});
        } else if (safetyNetOn && crisisTierRef.current === 2) {
          setShowCheckInCard(true);
          setConversationPaused(true);
        }

        if (msgCount % 8 === 0) extractMemories(chatHistoryRef.current, profile.matureMode);
        if (msgCount % 4 === 0 && !giftHint && !selfieHint && profile.visualMode === 'personal' && (subscribed || usageLimits.canGenerateImage) && !mediaLoading) tryCompanionImage(chatHistoryRef.current);
        if (msgCount % 5 === 0) {
          checkStreak().then((m) => {
            if (m) {
              addMessage({ id: `moment-${Date.now()}`, content: m.message, isUser: false, timestamp: new Date(), momentType: m.type });
              onSaveMilestone?.({ memberId, content: m.message });
              if (localStorage.getItem('autoVoiceEnabled') === 'true') { setAutoVoiceIds((prev) => new Set(prev).add(`moment-${Date.now()}`)); setTimeout(() => playVoiceClip(m.message.slice(0, 500)), 800); }
            }
          });
        }
      },
      onError: (reason) => {
        roleJustChangedRef.current = false;
        setIsTyping(false);
        const msg = reason === 'rate_limited'
          ? "Whoa, slow down a bit! 😅 I need a sec to catch my breath. Try again in a minute. 💛"
          : "Sorry, I couldn't respond right now. Let's try again in a moment. 💛";
        addMessage({
          id: (Date.now() + 1).toString(),
          content: msg,
          isUser: false,
          timestamp: new Date(),
        });
      },
      });
      } // end standard mode branch
    } finally {
      if (!submitPhaseReleased) {
        sendInFlightRef.current = false;
        setIsSendingMessage(false);
      }
    }
  };

  // Keep sendMessageRef in sync and expose globally for card auto-submit
  sendMessageRef.current = sendMessage;
  useEffect(() => {
    (window as any).__cardAutoSend = (text: string) => sendMessageRef.current?.(text);
    // Inline "Turn into blueprint" button (rendered by MessageBubble) calls this.
    (window as any).__triggerBlueprint = () => {
      setPendingCardType('blueprint');
      setTimeout(() => sendMessageRef.current?.('Turn this into a blueprint.'), 50);
    };
    return () => {
      delete (window as any).__cardAutoSend;
      delete (window as any).__triggerBlueprint;
    };
  }, []);

  // Consume briefing-prompt from BriefingBottomSheet
  useEffect(() => {
    const prompt = sessionStorage.getItem('briefing-prompt');
    if (prompt) {
      sessionStorage.removeItem('briefing-prompt');
      // Small delay to ensure chat is mounted and ready
      const timer = setTimeout(() => {
        sendMessageRef.current?.(prompt);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, []);


  const handleApproveAvatar = useCallback(() => {
    if (!pendingAvatarPreview) return;
    const { imageUrl, description, messageId } = pendingAvatarPreview;
    // Save as the companion's look
    onUpdateProfile?.({ companionAvatarUrl: imageUrl, companionAppearanceDesc: description, visualMode: 'personal' });
    onUpdateConnection?.(memberId, { avatarUrl: imageUrl, appearanceDesc: description, referenceImageUrl: imageUrl });
    // Remove preview flag from message
    updateMessage(messageId, { isPreview: false });
    setPendingAvatarPreview(null);
    addMessage({ id: `approved-${Date.now()}`, content: `New look saved ✨ I'm feeling it!`, isUser: false, timestamp: new Date() });
    toast.success(`${chatPartnerName}'s new look saved!`);
  }, [pendingAvatarPreview, onUpdateProfile, onUpdateConnection, memberId, updateMessage, setPendingAvatarPreview, addMessage, chatPartnerName]);

  const handleRetryAvatar = useCallback(() => {
    if (!pendingAvatarPreview) return;
    const { messageId, description } = pendingAvatarPreview;
    setPendingAvatarPreview(null);
    // Remove the old preview message
    updateMessage(messageId, { content: 'Let me try a different take...', imageUrl: undefined, imageLoading: true, isPreview: false });
    // Regenerate
    generateAvatarPreview(description);
  }, [pendingAvatarPreview, setPendingAvatarPreview, updateMessage, generateAvatarPreview]);

  const handleSelectVariation = useCallback((msgId: string, variation: { imageUrl: string; description: string }) => {
    onUpdateProfile?.({ companionAvatarUrl: variation.imageUrl, companionAppearanceDesc: variation.description, visualMode: 'personal' });
    onUpdateConnection?.(memberId, { avatarUrl: variation.imageUrl, appearanceDesc: variation.description, referenceImageUrl: variation.imageUrl });
    updateMessage(msgId, { isVariations: false, variations: undefined, imageUrl: variation.imageUrl, content: 'Great choice! New look saved ✨' });
    toast.success(`${chatPartnerName}'s new look saved!`);
  }, [onUpdateProfile, onUpdateConnection, memberId, updateMessage, chatPartnerName]);

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <LoadingSpinner size="lg" label="Loading conversation…" />
      </div>
    );
  }

  // Determine if current chat partner is an AI companion (vs community persona)
  const isChatWithCompanion = !!connection?.isCreated || !member;

  return (
    <div className="flex flex-col bg-transparent relative h-full min-h-0">
      <StrategistModeAura active={strategistMode.active && !privateMode} />
      {/* Think Freely arrival banner — only when arriving via Post-Focus Bridge */}
      <ThinkFreelyArrivalBanner
        privateMode={privateMode}
        onExit={() => {
          // Option A: stay in chat, drop into normal companion conversation
          sessionStorage.removeItem('compani-private-auto-session');
          if (privateMode) togglePrivateMode();
        }}
      />
      {/* Portal flash — brief white/dark blur between mode transitions */}
      <div
        className="fixed inset-0 z-50 pointer-events-none transition-opacity duration-150"
        style={{
          opacity: portalFlash ? 1 : 0,
          background: privateMode
            ? 'radial-gradient(ellipse at 50% 40%, rgba(212,175,55,0.08), rgba(0,0,0,0.7))'
            : 'radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.06), rgba(0,0,0,0.5))',
          backdropFilter: portalFlash ? 'blur(12px)' : 'blur(0px)',
        }}
      />
      {/* Privacy Mode atmosphere overlay — deepens the obsidian tint */}
      <div
        className="fixed inset-0 z-0 pointer-events-none transition-opacity duration-700"
        style={{
          opacity: privateMode ? 1 : 0,
          background: 'radial-gradient(ellipse at 50% 30%, rgba(212,175,55,0.03) 0%, rgba(0,0,0,0.35) 70%, rgba(0,0,0,0.5) 100%)',
        }}
      />
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-3 md:px-5 py-3 backdrop-blur-xl gap-1 w-full min-w-0 border-b border-white/10 bg-black/10"
      >
        <div className="flex items-center gap-2 min-w-0">
          {onBack && (
            <button onClick={onBack} className="flex items-center justify-center h-10 w-10 rounded-full text-muted-foreground/60 hover:text-foreground/80 transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <button onClick={() => setShowAvatarLightbox(true)} className="flex items-center gap-3">
            {connectionAvatarUrl ? (
              <img src={connectionAvatarUrl} alt={chatDisplayName} className="h-10 w-10 rounded-full object-cover transition-all duration-700" style={privateMode ? { filter: 'grayscale(100%) brightness(0.7)', opacity: 0.5 } : undefined} />
            ) : connection?.isCreated && !connectionAvatarUrl ? (
              <div className="relative h-10 w-10 shrink-0 rounded-full overflow-hidden">
                <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-br from-primary/20 via-muted to-primary/10" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-primary/50" />
                </div>
              </div>
            ) : profile.visualMode === 'abstract' ? (
              <div className="transition-all duration-700" style={privateMode ? { filter: 'grayscale(100%) brightness(0.7)', opacity: 0.5 } : undefined}>
                <AbstractAvatar memberId={memberId} size="md" />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-all duration-700" style={{ ...(chatPartnerColorVar ? { backgroundColor: `hsl(var(${chatPartnerColorVar}))` } : undefined), ...(privateMode ? { filter: 'grayscale(100%) brightness(0.7)', opacity: 0.5 } : undefined) }}>
                <span className="text-sm font-bold text-primary-foreground">{chatPartnerInitial}</span>
              </div>
            )}
            <div className="text-left min-w-0 overflow-hidden">
              <h2 className="font-display text-base font-bold text-foreground truncate leading-tight flex items-center" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6)' }}>{chatDisplayName}<StrategistModeChip active={strategistMode.active && !privateMode} /></h2>
              <p className={cn("text-xs leading-tight flex items-center gap-1 transition-opacity duration-700", privateMode ? "opacity-30" : "text-primary")} style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.5)' }}>
                <span className={cn("inline-block h-1.5 w-1.5 rounded-full shrink-0 transition-colors duration-700", privateMode ? "bg-muted-foreground/30" : "bg-primary")} />
                {privateMode ? 'Listening' : 'Online'}
                {subscribed && !privateMode && <Crown className="h-3 w-3 text-primary ml-0.5" />}
                {!privateMode && <span className="text-[9px] text-muted-foreground/50 ml-1">AI</span>}
                {!privateMode && (
                  <span className="text-[10px] text-muted-foreground/70 ml-0.5">
                    · {(() => {
                      const l = connection?.relationshipLevel || 1;
                      if (l >= 4) return 'Deep bond';
                      if (l >= 3) return 'Trusted';
                      if (l >= 2) return 'Growing';
                      return 'New friend';
                    })()}
                  </span>
                )}
              </p>
              {!privateMode && (
              <Popover open={rolePopoverOpen} onOpenChange={setRolePopoverOpen}>
                <PopoverTrigger asChild>
                  <motion.button
                    animate={heartDoubleBeat ? {
                      scale: [1, 1.25, 1, 1.2, 1],
                    } : connection?.connectionMode === 'romantic' ? {
                      textShadow: ['0 0 4px rgba(225,29,72,0.3)', '0 0 8px rgba(225,29,72,0.5)', '0 0 4px rgba(225,29,72,0.3)'],
                    } : {}}
                    transition={heartDoubleBeat ? { duration: 0.5, ease: 'easeOut' } : connection?.connectionMode === 'romantic' ? { duration: 1, repeat: Infinity, ease: 'easeInOut' } : {}}
                    className="text-[10px] text-muted-foreground font-semibold leading-tight hover:text-foreground transition-colors cursor-pointer"
                  >
                    {connection?.connectionMode
                      ? ({ friend: '💛 Friend Mode', accountability: '⚡ Accountability Mode', assistant: '🗂️ Assistant Mode', romantic: '🩷 Partner Mode', mentor: '🎯 Mentor Mode', 'kids-companion': '🚀 Adventure Mode' } as Record<string, string>)[connection.connectionMode] || connection.connectionMode
                      : 'Set role…'}
                  </motion.button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  sideOffset={4}
                  className="w-56 p-2 space-y-0.5 bg-[hsl(var(--card))]/95 backdrop-blur-2xl border border-primary/15 rounded-2xl shadow-[0_8px_40px_hsl(var(--primary)/0.1)]"
                >
                  <p className="text-[8px] uppercase tracking-[0.4em] text-primary/40 font-medium px-3 pt-1 pb-1.5">
                    Connection Role
                  </p>
                  {[
                    { value: 'friend', label: 'Friend', emoji: '💛' },
                    { value: 'accountability', label: 'Accountability Partner', emoji: '🎯' },
                    ...(!treatAsMinor(profile?.dateOfBirth) ? [{ value: 'assistant', label: 'Personal Assistant', emoji: '🗂️' }] : []),
                    ...(!treatAsMinor(profile?.dateOfBirth) ? [{ value: 'romantic', label: 'Romantic Partner', emoji: '🩷' }] : []),
                    { value: 'mentor', label: 'Mentor / Coach', emoji: '🌱' },
                    ...(treatAsMinor(profile?.dateOfBirth) ? [{ value: 'kids-companion', label: 'Adventure Buddy', emoji: '🚀' }] : []),
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        onUpdateConnection?.(memberId, { connectionMode: opt.value });
                        roleJustChangedRef.current = true;
                        setRolePopoverOpen(false);
                        toast.success(`Role updated to ${opt.label}`);
                        try { navigator.vibrate?.(8); } catch { /* */ }
                      }}
                      className={cn(
                        'w-full text-left rounded-xl px-3 py-2.5 text-sm font-light tracking-wide transition-all duration-300 flex items-center gap-2.5',
                        (connection?.connectionMode || 'friend') === opt.value
                          ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_12px_hsl(var(--primary)/0.1)]'
                          : 'text-foreground/80 hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06]'
                      )}
                    >
                      <span className="text-base">{opt.emoji}</span>
                      {opt.label}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
              )}
            </div>
          </button>
        </div>
        <div className="flex items-center gap-1 shrink-0 min-w-0">
          {/* Privacy Mode toggle */}
          <motion.button
            onClick={togglePrivateMode}
            whileTap={{ scale: 0.9 }}
            className={cn(
              'flex items-center justify-center h-9 w-9 rounded-full transition-all duration-300',
              privateMode
                ? 'bg-[hsl(38_70%_50%/0.15)] text-[hsl(38_70%_55%)] shadow-[0_0_12px_hsl(38_70%_50%/0.2)]'
                : 'text-muted-foreground/50 hover:text-muted-foreground/80'
            )}
            title={privateMode ? 'Private Mode ON — tap to turn off' : 'Enable Private Mode'}
          >
            {privateMode ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
          </motion.button>
          
          <ChatOverflowMenu
            open={overflowMenuOpen}
            onOpenChange={(open) => { setOverflowMenuOpen(open); if (!open) setOverflowDownloadExpanded(false); }}
            subscribed={!!subscribed}
            usageLimits={usageLimits}
            showSearch={showSearch}
            onToggleSearch={() => setShowSearch(!showSearch)}
            onRefetch={refetch}
            onOpenMemory={() => setShowMemorySheet(true)}
            onOpenHistory={() => openHistoryModal()}
            isChatWithCompanion={isChatWithCompanion}
            downloadExpanded={overflowDownloadExpanded}
            onToggleDownload={() => setOverflowDownloadExpanded(!overflowDownloadExpanded)}
            downloadLoading={downloadLoading}
            extractLoading={extractLoading}
            onDownloadSession={() => downloadChat('session')}
            onDownloadFull={() => downloadChat('full')}
            onExtractSave={() => extractAndSave()}
            connectionAvatarUrl={connectionAvatarUrl}
            onStartVoiceCall={() => setInVideoCall(true)}
            onPreviewPortrait={() => setShowPortraitPreview(true)}
            voiceBlocked={
              (!subscribed && (profile?.voiceTrialSecondsUsed ?? 0) >= 180) ||
              (subscribed && (profile?.voiceMinutesUsed ?? 0) >= 3600)
            }
            premiumCapReached={subscribed && (profile?.voiceMinutesUsed ?? 0) >= 3600}
            voiceMinutesResetAt={profile?.voiceMinutesResetAt}
            showFlameOption={!!subscribed && isAdult(profile.dateOfBirth) && !!profile.matureMode && !flameVisible}
            onActivateFlame={() => { setFlameVisible(true); setLocalMatureMode(true); }}
            onOpenArtifacts={() => { setShowArtifactsDrawer(true); setHasNewArtifact(false); }}
            artifactCount={artifacts.length}
            hasNewArtifact={hasNewArtifact}
          />
        </div>
      </motion.header>

      <ArtifactsDrawer
        open={showArtifactsDrawer}
        onOpenChange={setShowArtifactsDrawer}
        artifacts={artifacts}
        onTogglePin={togglePin}
        onUpdate={updateArtifact}
        onRemove={remove}
        onCreate={createArtifact}
        projectId={currentProject?.id ?? null}
        userId={userId ?? null}
        onGenerateWorkImage={() => { setShowArtifactsDrawer(false); setShowWorkImagePrompt(true); }}
      />

      <WorkImagePromptDialog
        open={showWorkImagePrompt}
        onOpenChange={setShowWorkImagePrompt}
        memberId={memberId}
        projectId={currentProject?.id ?? null}
        onGenerated={() => setShowArtifactsDrawer(true)}
      />

      {/* Private Mode banner */}
      <AnimatePresence>
        {privateMode && showPrivateBanner && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b px-4 py-2.5 text-center"
            style={{
              borderColor: 'hsl(38 70% 50% / 0.25)',
              background: 'linear-gradient(135deg, hsl(38 70% 50% / 0.08), hsl(38 70% 40% / 0.04))',
            }}
          >
            <div className="flex items-center justify-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-[hsl(38_70%_55%)]" />
              <p className="text-xs font-medium text-[hsl(38_70%_60%)]">
                Private Mode · Nothing saved
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent private mode indicator — breathing gold glow */}
      {privateMode && !showPrivateBanner && (
        <div
          className="border-b px-4 py-1 flex items-center justify-center gap-2"
          style={{
            borderColor: 'hsl(38 70% 50% / 0.12)',
            background: 'hsl(38 70% 50% / 0.03)',
            animation: 'private-banner-breathe 4s ease-in-out infinite',
          }}
        >
          <p className="text-[10px] tracking-[0.1em] uppercase font-medium text-[hsl(38_70%_55%/0.5)]">
            🔒 Private
          </p>
          {privateMessages.length > 0 && (
            <button
              onClick={downloadPrivateSession}
              className="ml-1 p-0.5 rounded text-[hsl(38_70%_55%/0.5)] hover:text-[hsl(38_70%_60%)] transition-colors"
              title="Download session"
            >
              <Download className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Low-message upgrade nudge */}
      {!subscribed && !usageLimits.loading && usageLimits.messagesRemaining <= 5 && usageLimits.messagesRemaining > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="border-b border-primary/20 bg-primary/5 px-4 py-2.5 text-center"
        >
          <p className="text-xs text-foreground font-medium">
            Only <span className="font-bold text-primary">{usageLimits.messagesRemaining}</span> messages left today
          </p>
          <button
            onClick={() => navigate('/settings')}
            className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
          >
            <Crown className="h-3 w-3" /> Upgrade for unlimited
          </button>
        </motion.div>
      )}

      {showSearch && (
        <div className="border-b border-white/10 bg-white/5 px-4 py-2 backdrop-blur-md">
          <div className="mx-auto flex max-w-lg md:max-w-3xl lg:max-w-5xl items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search messages…" autoFocus className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none" />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="rounded-full p-1 text-muted-foreground hover:bg-secondary">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Companion Vibe Card — swipe to switch modes */}
      {isChatWithCompanion && chatHistory.length === 0 && (
        <div className="px-4 py-3">
          <CompanionVibeCard
            companionName={chatPartnerName}
            avatarUrl={connectionAvatarUrl}
            memberId={memberId}
            visualMode={profile.visualMode}
          />
        </div>
      )}

      <ChatMessageList
        messages={displayMessages}
        searchQuery={searchQuery}
        privateMode={privateMode}
        veilExitActive={veilExitActive}
        hasMore={hasMore}
        loadingMore={loadingMore}
        handleLoadMore={handleLoadMore}
        isTyping={isTyping}
        chatPartnerName={chatDisplayName}
        chatPartnerInitial={chatPartnerInitial}
        chatPartnerColorVar={chatPartnerColorVar}
        connectionAvatarUrl={connectionAvatarUrl}
        isChatWithCompanion={isChatWithCompanion}
        handleApproveAvatar={handleApproveAvatar}
        handleRetryAvatar={handleRetryAvatar}
        handleSelectVariation={handleSelectVariation}
        handleWebSearch={handleWebSearch}
        onSaveMoment={onSaveMoment}
        memberId={memberId}
        deleteMessage={deleteMessage}
        onUpdateConnection={onUpdateConnection}
        onUpdateProfile={onUpdateProfile}
        addMessage={addMessage}
        pendingSaveOffer={pendingSaveOffer}
        acceptSaveOffer={acceptSaveOffer}
        dismissSaveOffer={dismissSaveOffer}
        resolvedAvatarUrl={resolvedAvatarUrl}
        showCuriosityNudge={showCuriosityNudge}
        setShowCuriosityNudge={setShowCuriosityNudge}
        showPremiumGateInChat={showPremiumGateInChat}
        setShowPremiumGateInChat={setShowPremiumGateInChat}
        setShowUpgradeModal={setShowUpgradeModal}
        showCheckInCard={showCheckInCard}
        setConversationPaused={setConversationPaused}
        setShowCrisis={setShowCrisis}
        crisisTierRef={crisisTierRef}
        crisisFollowUpRef={crisisFollowUpRef}
        setShowCheckInCard={setShowCheckInCard}
        scrollRef={scrollRef}
        showScrollBottom={showScrollBottom}
        scrollToBottom={scrollToBottom}
        showMediaPicker={showMediaPicker}
        setShowMediaPicker={setShowMediaPicker}
        mediaLoading={mediaLoading}
        requestCompanionMedia={requestCompanionMedia}
        cachedStickers={cachedStickers}
        batchGenerateStickers={batchGenerateStickers}
        batchGenerating={batchGenerating}
        incrementUsage={incrementUsage}
        cameraInputRef={cameraInputRef}
        photoInputRef={photoInputRef}
        fileInputRef={fileInputRef}
        inputRef={inputRef}
        setInput={setInput}
        pendingCardType={pendingCardType}
        setPendingCardType={setPendingCardType}
        subscribed={!!subscribed}
        usageLimits={usageLimits}
        profile={profile}
        userId={userId}
        connection={connection}
        onPersistMessage={(content, role, imageUrl) => persistMessage(content, role, undefined, imageUrl)}
        onAppendHistory={(entry) => setChatHistory(prev => [...prev, entry])}
        onTriggerReply={(contextNote) => {
          // Trigger AI response after a sticker send — the sticker note is already
          // persisted, so we call sendMessage with skipBubble to avoid a duplicate.
          setTimeout(() => {
            sendMessageRef.current?.(contextNote, { skipBubble: true });
          }, 400);
        }}
        onNavigateToSettings={() => window.location.href = '/settings'}
        onSourceTap={(docTitle, term) => setSourceRef({ docTitle, term })}
        onTogglePrivateMode={togglePrivateMode}
        situationalMode={situationalMode}
        onPlayVoice={playVoiceClip}
        voiceLoadingText={voiceLoadingId}
        playingVoiceText={playingVoiceId}
        strategistActive={strategistMode.active}
      />

      {/* Vault indexing status */}
      <VaultIndexingBar userId={userId} />

      {/* Source reference bottom sheet */}
      <SourceReferenceSheet
        open={!!sourceRef}
        onClose={() => setSourceRef(null)}
        docTitle={sourceRef?.docTitle ?? ''}
        term={sourceRef?.term ?? ''}
        userId={userId}
      />

      {/* Photo preview is now inside the input card below */}

      <input ref={photoInputRef} type="file" accept="image/*" multiple onChange={handlePhotoSelect} className="hidden" />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoSelect} className="hidden" />
      <input ref={fileInputRef} type="file" accept="*/*" multiple onChange={handleFileSelect} className="hidden" />

      {/* Upgrade / usage banners — positioned above the fixed footer */}
      <div className="fixed left-0 right-0 z-[19]" style={{ bottom: 'calc(120px + max(16px, env(safe-area-inset-bottom)))' }}>
        <div className="mx-auto max-w-lg md:max-w-3xl lg:max-w-5xl px-4 lg:px-10">
          <AnimatePresence>
            {!subscribed && !usageLimits.loading && usageLimits.messagesRemaining > 5 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mb-1.5"
              >
                <UpgradeBanner subscribed={subscribed} variant="chat" />
              </motion.div>
            )}
            {!subscribed && !usageLimits.loading && usageLimits.messagesRemaining <= 5 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
              >
                <UsageLimitBanner type="messages" remaining={usageLimits.messagesRemaining} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 z-20 rounded-t-2xl transition-all duration-700"
        style={{
          paddingBottom: 'max(16px, calc(env(safe-area-inset-bottom) + 4px))',
          backdropFilter: 'blur(20px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
          background: 'linear-gradient(to bottom, rgba(15,18,33,0.18), rgba(15,18,33,0.32))',
          borderTop: `1px solid ${
            situationalMode === 'focus' ? 'rgba(251,191,36,0.25)'
            : situationalMode === 'brainstorm' ? 'rgba(245,158,11,0.30)'
            : situationalMode === 'decompress' ? 'rgba(34,211,238,0.25)'
            : situationalMode === 'connect' ? 'rgba(255,105,180,0.25)'
            : situationalMode === 'strategic' ? 'rgba(212,175,55,0.55)'
            : privateMode ? 'rgba(212,175,55,0.25)'
            : 'rgba(212,175,55,0.12)'
          }`,
          boxShadow: situationalMode === 'focus'
            ? '0 -6px 30px rgba(251,191,36,0.15), 0 -2px 10px rgba(251,191,36,0.08), inset 0 1px 0 rgba(251,191,36,0.06)'
            : situationalMode === 'brainstorm'
            ? '0 -6px 30px rgba(245,158,11,0.18), 0 -2px 10px rgba(249,115,22,0.12), inset 0 1px 0 rgba(245,158,11,0.08)'
            : situationalMode === 'decompress'
            ? '0 -6px 30px rgba(34,211,238,0.15), 0 -2px 10px rgba(34,211,238,0.08), inset 0 1px 0 rgba(34,211,238,0.06)'
            : situationalMode === 'connect'
            ? '0 -6px 30px rgba(255,105,180,0.15), 0 -2px 10px rgba(255,105,180,0.08), inset 0 1px 0 rgba(255,105,180,0.06)'
            : situationalMode === 'strategic'
            ? '0 -8px 36px rgba(212,175,55,0.28), 0 -3px 14px rgba(212,175,55,0.18), inset 0 1px 0 rgba(212,175,55,0.14)'
            : privateMode
            ? '0 -6px 30px rgba(212,175,55,0.12), 0 -2px 10px rgba(212,175,55,0.06), inset 0 1px 0 rgba(212,175,55,0.04)'
            : '0 -4px 24px rgba(212,175,55,0.06), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        {/* Practice Mode overlays */}
        <div className="relative">
          <PracticeScenarioPicker
            matureMode={profile?.matureMode === true}
            onEnableMatureMode={() => onUpdateProfile?.({ matureMode: true })}
          />
          <PracticeFreezeAssist
            recentMessages={chatHistory}
            companionName={chatPartnerName}
            onSelectSuggestion={(text) => setInput(text)}
          />
        </div>
        {/* Practice Mode coaching feedback — only show when freeze assist is NOT open */}
        {!practiceMode.showFreezeAssist && !practiceMode.showScenarioPicker && (
          <PracticeCoachingFeedback
            feedback={practiceCoachingFeedback}
            onTryStronger={() => {
              setPracticeCoachingFeedback(null);
              practiceMode.setShowFreezeAssist(true);
            }}
            onNextScenario={() => {
              setPracticeCoachingFeedback(null);
              const currentIdx = ALL_SCENARIOS.findIndex(s => s.id === practiceMode.scenario?.id);
              const next = ALL_SCENARIOS[(currentIdx + 1) % ALL_SCENARIOS.length];
              practiceMode.selectScenario(next);
            }}
            onDismiss={() => setPracticeCoachingFeedback(null)}
          />
        )}
        <div className="mx-auto max-w-lg md:max-w-3xl lg:max-w-5xl px-[18px] md:px-6 lg:px-10 pt-3 md:pt-4 pb-[18px]">
          {/* Context chip row — Project + Mode (above input, subtle) */}
          <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
            <ProjectSwitcherChip
              userId={userId}
              activeProject={currentProject}
              onProjectChange={setCurrentProject}
              onModeChange={() => setSituationalMode('strategic')}
            />
            <SituationalModeChips
              activeMode={situationalMode}
              onSelect={(mode) => {
                setSituationalMode(mode);
                setSmartSuggestion(null);
                if (mode) {
                  setChatHistory(prev => [...prev, { role: 'system' as const, content: `[Situational mode activated: ${mode}]` }]);
                }
              }}
              companionName={chatPartnerName}
              suggestedMode={smartSuggestion}
            />
            {situationalMode === 'strategic' && (
              <button
                onClick={() => setShowBlueprintTemplates(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(100,220,180,0.3)] bg-[rgba(100,220,180,0.06)] backdrop-blur-lg px-3 py-1 text-[11px] font-medium text-[rgba(100,220,180,0.85)] hover:border-[rgba(100,220,180,0.5)] hover:bg-[rgba(100,220,180,0.1)] transition-all duration-300 active:scale-95 shadow-[0_0_8px_rgba(100,220,180,0.12)]"
              >
                <Sparkles className="h-3 w-3" />
                Templates
              </button>
            )}
          </div>
          {/* Pending images preview — horizontal scrollable strip (up to 10) */}
          {pendingImages.length > 0 && (
            <div className="mb-2 flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {pendingImages.map((img, idx) => (
                <div key={`pending-${idx}`} className="relative shrink-0">
                  <img
                    src={img.dataUrl}
                    alt={`Attachment ${idx + 1}`}
                    className="h-16 w-16 rounded-xl object-cover border border-white/10 cursor-pointer active:scale-95 transition-transform"
                    style={{ boxShadow: '0 0 8px rgba(212,175,55,0.10)' }}
                    onClick={() => setExpandedImageUrl(img.dataUrl)}
                  />
                  <button
                    onClick={() => setPendingImages(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-card border border-border shadow-sm text-muted-foreground hover:text-destructive"
                    aria-label={`Remove photo ${idx + 1}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <p className="text-xs text-muted-foreground shrink-0 ml-1">
                {pendingImages.length === 1 ? '1 photo' : `${pendingImages.length} photos`} · max 10
              </p>
            </div>
          )}
          {/* Pending file preview — ABOVE textarea (standard messaging pattern) */}
          {pendingFile && (
            <div className="mb-2 flex items-center gap-2">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                <FileText className="h-5 w-5 text-primary" />
                <button
                  onClick={() => setPendingFile(null)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-card border border-border shadow-sm text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{pendingFile.name}</p>
                <p className="text-[10px] text-muted-foreground">{(pendingFile.size / 1024).toFixed(1)}KB</p>
              </div>
            </div>
          )}
          {/* Text input row */}
          <textarea data-chat-input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onPaste={(e) => {
            // Text-only paste guard: if any clipboard item is an image/file, intercept and
            // insert only the plain-text portion. Prevents broken image bubbles from being
            // sent through the chat pipeline.
            const items = e.clipboardData?.items;
            if (!items) return;
            let hasImage = false;
            for (let i = 0; i < items.length; i++) {
              if (items[i].kind === 'file' || items[i].type.startsWith('image/')) { hasImage = true; break; }
            }
            if (!hasImage) return; // let native paste handle plain text
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain') ?? '';
            const el = e.currentTarget;
            const start = el.selectionStart ?? input.length;
            const end = el.selectionEnd ?? input.length;
            const next = input.slice(0, start) + text + input.slice(end);
            setInput(next);
            // Restore caret position after the inserted text
            requestAnimationFrame(() => {
              try { el.setSelectionRange(start + text.length, start + text.length); } catch { /* ignore */ }
            });
          }} placeholder={conversationPaused ? `${chatDisplayName} is waiting to hear from you` : !subscribed && !usageLimits.canSendMessage ? 'Daily limit reached — upgrade to continue' : composerPlaceholder} disabled={conversationPaused || isSendingMessage || (!subscribed && !usageLimits.canSendMessage)} rows={1} className="w-full bg-transparent text-[15px] md:text-base font-light text-white focus:outline-none transition-all disabled:opacity-50 mb-2 md:mb-3 resize-none overflow-hidden" style={{ minHeight: '36px', maxHeight: '120px', color: 'rgba(255,255,255,0.95)' }} />
          {/* Tools drawer — expands above action row */}
          <AnimatePresence>
            {showToolsDrawer && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mb-2 overflow-hidden"
              >
                <div className="flex items-center gap-2 flex-wrap pb-1">
                  {/* Whisper — help me respond (hidden during Practice Mode) */}
                  {!practiceMode.active && (
                    <WhisperAssist
                      recentMessages={chatHistory}
                      companionName={chatPartnerName}
                      matureMode={localMatureMode}
                      onSelectSuggestion={(text) => { setInput(text); setShowToolsDrawer(false); }}
                    />
                  )}
                  {/* Practice Mode toggle */}
                  <PracticeModeToggle />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-white/10 hover:text-primary transition-all active:scale-95"
                  title="More"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="start"
                sideOffset={8}
                className="w-48 p-1.5 bg-background/95 backdrop-blur-xl border-white/10"
              >
                <button
                  onClick={() => {
                    setShowMediaPicker(true);
                    (document.activeElement as HTMLElement)?.blur();
                  }}
                  className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm text-foreground hover:bg-white/5 transition-colors"
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Media</span>
                </button>
                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                    (document.activeElement as HTMLElement)?.blur();
                  }}
                  className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm text-foreground hover:bg-white/5 transition-colors"
                >
                  <Paperclip className="h-4 w-4 text-primary" />
                  <span>Attach file</span>
                </button>
              </PopoverContent>
            </Popover>
            <button
              onClick={() => setShowToolsDrawer(!showToolsDrawer)}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all active:scale-95 ${showToolsDrawer || practiceMode.active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-white/10 hover:text-primary'}`}
              title="Tools"
            >
              <Wand2 className="h-5 w-5" />
            </button>
            {flameVisible && (
              <button
                onClick={() => {
                  const newVal = !localMatureMode;
                  setLocalMatureMode(newVal);
                  if (!newVal) {
                    setFlameVisible(false);
                    toast('Flame off', {
                      duration: 6000,
                      action: {
                        label: 'Clear session',
                        onClick: async () => {
                          await supabase.from('memories').delete().eq('user_id', userId).eq('source', 'mature');
                          toast.success('Flame session cleared', { duration: 2000 });
                        },
                      },
                    });
                  } else {
                    toast.success('🔥 Flame on', { duration: 1500 });
                  }
                }}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all active:scale-95 ${localMatureMode ? 'bg-orange-500/20 text-orange-400' : 'text-muted-foreground hover:bg-white/10'}`}
                title={localMatureMode ? 'Mature mode ON' : 'Mature mode OFF'}
              >
                <Flame className="h-5 w-5" />
              </button>
            )}
            <div className="flex-1" />
            <button onClick={() => sendMessage()} disabled={(!input.trim() && pendingImages.length === 0 && !pendingFile) || isSendingMessage || isTyping || (!subscribed && !usageLimits.canSendMessage)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full gradient-primary text-primary-foreground transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100">
              {isSendingMessage ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <Send className="h-[18px] w-[18px]" />}
            </button>
            <AudioRecorder
              disabled={isTyping || (!subscribed && !usageLimits.canSendMessage)}
              onTranscript={(text) => setInput(text)}
            />

          </div>
        </div>
      </div>

      {/* Avatar Lightbox */}
      <AvatarLightbox
        open={showAvatarLightbox}
        onClose={() => setShowAvatarLightbox(false)}
        imageUrl={connectionAvatarUrl || ''}
        name={chatPartnerName}
        bio={connection?.bio || member?.bio}
        vibe={profile.vibe || undefined}
        personality={connection?.personality || member?.personality || undefined}
        age={connection?.age || undefined}
        gender={connection?.gender || undefined}
        connectedAt={connection?.connectedAt}
        communicationStyle={connection?.communicationStyle || undefined}
        connectionMode={connection?.connectionMode || undefined}
        circles={connection?.circles as string[] | undefined}
        backstory={connection?.backstory || undefined}
        originStory={connection?.originStory || undefined}
        onUpdateBackstory={(text) => {
          onUpdateConnection?.(memberId, { backstory: text });
        }}
        onUpdateOriginStory={(text) => {
          onUpdateConnection?.(memberId, { originStory: text } as any);
        }}
        onUpdateField={(field, value) => {
          onUpdateConnection?.(memberId, { [field]: value });
        }}
      />

      {/* Memory Sheet */}
      <CompanionMemorySheet
        open={showMemorySheet}
        onOpenChange={setShowMemorySheet}
        userId={userId}
        companionName={chatPartnerName}
        memberId={memberId}
      />

      {/* In-Chat Upgrade Modal */}
      <InChatUpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onCheckout={subscription.startCheckout}
        companionName={chatPartnerName}
      />

      {/* ChatHistoryModal manages its own enter/exit animation via the `open` prop —
          do NOT wrap in <AnimatePresence>. AnimatePresence forwards a ref to its
          direct child; ChatHistoryModal is a function component without forwardRef,
          which produced a React warning AND, under stress paths (e.g. very large
          paste into the input), a full ErrorBoundary remount that ejected the user
          back to "/". */}
      <ChatHistoryModal
        open={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        viewingSession={viewingSession}
        setViewingSession={setViewingSession}
        historyLoading={historyLoading}
        historySessions={historySessions}
        confirmClearAll={confirmClearAll}
        setConfirmClearAll={setConfirmClearAll}
        chatPartnerName={chatDisplayName}
        messages={messages as any}
        setMessages={setMessages as any}
        setChatHistory={setChatHistory}
        memberId={memberId}
        userId={userId}
        subscribed={!!subscribed}
        clearing={clearing}
        onClearAll={clearAllHistory}
      />

      {/* Voice Call Stage */}
      <VoiceCallStage
        open={inVideoCall}
        autoStart={autoStartCall}
        onClose={() => { setInVideoCall(false); setAutoStartCall(false); }}
        companionName={chatPartnerName}
        companionAvatarUrl={resolvedAvatarUrl}
        memberId={memberId}
        userId={userId}
        userName={profile.userName}
        namePronunciation={profile.namePronunciation}
        companionGender={profile.companionGender}
        companionPersonality={connection?.personality}
        companionBio={connection?.bio}
        companionVibe={profile.vibe || undefined}
        voiceId={connection?.voiceId}
        isMinor={treatAsMinor(profile?.dateOfBirth)}
        backstory={connection?.backstory || undefined}
        originStory={connection?.originStory || undefined}
        personalityTraits={profile.personalityTraits as Record<string, any> || undefined}
        communicationStyle={connection?.communicationStyle ? getStylePrompt(connection.communicationStyle) : undefined}
        connectionMode={connection?.connectionMode || 'friend'}
        relationshipLevel={connection?.relationshipLevel || 1}
        matureMode={profile?.matureMode === true}
        onCallComplete={handleCallComplete}
      />

      {/* Living Portrait Preview */}
      <PortraitPreview
        open={showPortraitPreview}
        onClose={() => setShowPortraitPreview(false)}
        companionName={chatPartnerName}
        companionAvatarUrl={resolvedAvatarUrl}
      />
      {/* Privacy Mode exit ceremony — Crystallize or Evaporate */}
      <AnimatePresence>
        {showExitChoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => performEvaporation()}
          >
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md mx-4 mb-8 rounded-2xl border border-white/[0.08] overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(12, 14, 28, 0.95), rgba(8, 10, 22, 0.98))',
                backdropFilter: 'blur(24px)',
                boxShadow: '0 16px 48px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
              }}
            >
              <div className="px-6 pt-5 pb-2 text-center">
                <p className="text-[11px] tracking-[0.1em] uppercase font-medium text-[hsl(38_70%_50%/0.6)] mb-2">
                  End of Sanctuary
                </p>
                <p className="text-sm text-foreground/70 leading-relaxed">
                  What happens to this session?
                </p>
              </div>
              <div className="px-5 pb-5 pt-3 space-y-2.5">
                <button
                  onClick={performCrystallize}
                  className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all hover:bg-white/[0.04] border border-[hsl(38_70%_50%/0.2)] bg-[hsl(38_70%_50%/0.06)]"
                >
                  <span className="text-lg">✨</span>
                  <div>
                    <p className="text-sm font-medium text-[hsl(38_70%_60%)]">Crystallize to Insights</p>
                    <p className="text-[11px] text-foreground/40">Save the emotional essence, shred the rest</p>
                  </div>
                </button>
                <button
                  onClick={performEvaporation}
                  className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all hover:bg-white/[0.04] border border-white/[0.06]"
                >
                  <span className="text-lg">💨</span>
                  <div>
                    <p className="text-sm font-medium text-foreground/70">Evaporate Forever</p>
                    <p className="text-[11px] text-foreground/30">Complete zero-trace — nothing remains</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Image lightbox — portaled to escape stacking context */}
      {createPortal(
        <AnimatePresence>
          {expandedImageUrl && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
              onClick={() => setExpandedImageUrl(null)}
            >
              <motion.img
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.8 }}
                src={expandedImageUrl}
                alt="Expanded preview"
                className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl"
              />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <BlueprintTemplatesSheet
        open={showBlueprintTemplates}
        onClose={() => setShowBlueprintTemplates(false)}
        onSelectTemplate={(t) => {
          setInput(t.kickoff_prompt);
          setTimeout(() => sendMessage(t.kickoff_prompt), 50);
        }}
      />
    </div>
  );
}
