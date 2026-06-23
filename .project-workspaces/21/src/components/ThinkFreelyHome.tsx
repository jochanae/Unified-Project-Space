import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Mic, Download, BookOpen, Users, MoreHorizontal, Share2, Lock, KeyRound, X, Waves, ChevronRight } from 'lucide-react';
import CompaniLogo from './CompaniLogo';
import { supabase } from '@/integrations/supabase/client';
import { callEdgeFunction } from '@/lib/edgeFunction';
import { cn } from '@/lib/utils';
import { useWellness } from '@/hooks/useWellness';
import { loadMemory, saveMemory, mergeNewMemories } from '@/lib/memory';
import { useCompanionExpressionStore } from '@/stores/useCompanionExpressionStore';
import { savePrivateInsight } from './PrivateInsightCard';
import { getTodayIntent } from './MorningIntentOverlay';
import { consumeSpaceUnlocked } from './WelcomeEnvelope';
import { sanctuarySendHaptic, privacyShieldHaptic } from '@/lib/sanctuaryHaptics';
import { isFocusModeActive } from '@/hooks/useFocusMode';
import { playSendWhoosh, playHeldWithCare } from '@/lib/sanctuarySfx';
import ClosingRitual, { hasSeenClosingTonight } from './ClosingRitual';
import MorningSunrise, { hasSeenSunriseToday, isSunriseWindow } from './MorningSunrise';


type ThinkMsg = { role: 'user' | 'assistant'; content: string };

interface CompanionBasic {
  memberId: string;
  name: string;
  avatarUrl?: string;
}

interface ThinkFreelyHomeProps {
  userId: string;
  userName: string;
  connections?: CompanionBasic[];
  isPremium?: boolean;
  onFindFriend?: () => void;
}

export default function ThinkFreelyHome({ userId, userName, connections, isPremium = false, onFindFriend }: ThinkFreelyHomeProps) {
  const navigate = useNavigate();
  const wellness = useWellness(userId, userName);

  // Phase 4: Strategic Poke Level (0=Silent, 1=Strategic Pokes, 2=Active Co-Thinking)
  const [pokeLevel, setPokeLevel] = useState(0);
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('profiles')
      .select('think_freely_poke_level')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setPokeLevel((data as any).think_freely_poke_level ?? 0);
      });
  }, [userId]);

  // Input — sessionStorage-backed
  const [thinkInput, setThinkInputRaw] = useState(() => sessionStorage.getItem('compani-think-draft') || '');
  const setThinkInput = (val: string | ((prev: string) => string)) => {
    setThinkInputRaw(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      if (next) sessionStorage.setItem('compani-think-draft', next);
      else sessionStorage.removeItem('compani-think-draft');
      return next;
    });
  };

  // Conversation history — sessionStorage-backed
  const [thinkHistory, setThinkHistoryRaw] = useState<ThinkMsg[]>(() => {
    try { return JSON.parse(sessionStorage.getItem('compani-think-history') || '[]'); } catch { return []; }
  });
  const setThinkHistory = (val: ThinkMsg[] | ((prev: ThinkMsg[]) => ThinkMsg[])) => {
    setThinkHistoryRaw(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      if (next.length > 0) sessionStorage.setItem('compani-think-history', JSON.stringify(next));
      else sessionStorage.removeItem('compani-think-history');
      return next;
    });
  };

  const [thinkLoading, setThinkLoading] = useState(false);
  const [thinkResponse, setThinkResponse] = useState<string | null>(null);
  const [thinkShared, setThinkShared] = useState(false);
  const [thinkLastInput, setThinkLastInput] = useState('');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showCompanionPicker, setShowCompanionPicker] = useState(false);
  const [showLimitNotice, setShowLimitNotice] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);
  const [journalPhoto, setJournalPhoto] = useState<string | null>(null);
  const [journalPhotoUploading, setJournalPhotoUploading] = useState(false);
  const [vaultMood, setVaultMood] = useState<'neutral' | 'calm' | 'intense' | 'tender' | 'energized'>('neutral');
  const journalPhotoInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const thinkTextareaRef = useRef<HTMLTextAreaElement>(null);
  const thinkEndRef = useRef<HTMLDivElement>(null);
  const thinkScrollRef = useRef<HTMLDivElement>(null);
  const inputCardRef = useRef<HTMLDivElement>(null);

  // Golden dissolve animation state
  const [sendDissolving, setSendDissolving] = useState(false);
  const [privacyShield, setPrivacyShield] = useState(false);
  const [showWhisper, setShowWhisper] = useState(false);
  const [spaceUnlockedWhisper, setSpaceUnlockedWhisper] = useState(false);
  const { triggerExpression } = useCompanionExpressionStore();

  // Sanctuary exit dissolve
  const [exitDissolving, setExitDissolving] = useState(false);

  // Session duration timer — tracks minutes without storing content
  const sanctuaryStartRef = useRef(Date.now());

  // Inactivity warning
  const [inactiveWarning, setInactiveWarning] = useState(false);
  const [showEndNudge, setShowEndNudge] = useState(false);
  const [showSoundHint, setShowSoundHint] = useState(false);
  const [showClosingRitual, setShowClosingRitual] = useState(false);
  const [showMorningSunrise, setShowMorningSunrise] = useState(() => isSunriseWindow() && !hasSeenSunriseToday());
  
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const INACTIVITY_MS = 4 * 60 * 1000;
  const CLOSING_INACTIVITY_MS = 90 * 1000; // 90s idle in evening → closing ritual

  const resetInactivityTimer = useCallback(() => {
    setInactiveWarning(false);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (closingTimerRef.current) clearTimeout(closingTimerRef.current);
    if (thinkHistory.length > 0) {
      inactivityTimerRef.current = setTimeout(() => setInactiveWarning(true), INACTIVITY_MS);
    }
    // Evening closing ritual auto-trigger
    const hr = new Date().getHours();
    const isNight = hr >= 21 || hr < 5;
    if (isNight && !hasSeenClosingTonight()) {
      closingTimerRef.current = setTimeout(() => setShowClosingRitual(true), CLOSING_INACTIVITY_MS);
    }
  }, [thinkHistory.length]);

  useEffect(() => {
    resetInactivityTimer();
    return () => { if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current); };
  }, [thinkHistory.length]);

  // Session data is cleared only on intentional exits (End Session button
  // or sanctuary-exit event), NOT on component unmount — prevents data loss
  // from accidental navigation or browser hiccups.

  // "Space Unlocked" first-entry whisper
  useEffect(() => {
    if (consumeSpaceUnlocked()) {
      setTimeout(() => {
        setSpaceUnlockedWhisper(true);
        setTimeout(() => setSpaceUnlockedWhisper(false), 3000);
      }, 3500);
    }
  }, []);


  // ── Sanctuary exit dissolve listener ──
  useEffect(() => {
    const handleSanctuaryExit = () => {
      setExitDissolving(true);
      // Shredder haptic
      if (navigator.vibrate) {
        navigator.vibrate([15, 30, 15, 30, 15, 40, 10, 50, 8, 60, 5, 80, 3]);
      }
      // Save sanctuary duration (minutes only — never content)
      const durationMs = Date.now() - sanctuaryStartRef.current;
      const durationMin = Math.max(1, Math.round(durationMs / 60000));
      supabase.rpc('increment_sanctuary_minutes', { p_user_id: userId, p_minutes: durationMin }).then(() => {});
      // Clear session data
      sessionStorage.removeItem('compani-think-draft');
      sessionStorage.removeItem('compani-think-history');
      // Signal completion after animation
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('sanctuary-exit-complete'));
      }, 1300);
    };
    window.addEventListener('sanctuary-exit', handleSanctuaryExit);
    return () => window.removeEventListener('sanctuary-exit', handleSanctuaryExit);
  }, [userId]);

  // Dev shortcuts to force-trigger time-gated rituals (Shift+Alt+M/C/N)
  useEffect(() => {
    const handleDevShortcut = (e: KeyboardEvent) => {
      if (!e.shiftKey || !e.altKey) return;
      if (e.key === 'M') setShowMorningSunrise(true);
      if (e.key === 'C') setShowClosingRitual(true);
      
    };
    window.addEventListener('keydown', handleDevShortcut);
    return () => window.removeEventListener('keydown', handleDevShortcut);
  }, []);

  useEffect(() => {
    if (thinkInput) resetInactivityTimer();
  }, [thinkInput]);

  // Soundscape discovery hint
  useEffect(() => {
    const seen = localStorage.getItem('compani-soundscape-hint-tf');
    if (seen) return;
    const timer = setTimeout(() => {
      setShowSoundHint(true);
      setTimeout(() => setShowSoundHint(false), 5000);
      localStorage.setItem('compani-soundscape-hint-tf', 'true');
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  // ── Mood-reactive glow detection ──
  useEffect(() => {
    const text = (thinkInput + ' ' + thinkHistory.map(m => m.content).join(' ')).toLowerCase();
    if (!text.trim()) { setVaultMood('neutral'); return; }
    // Tender: love, miss, grief, vulnerability
    if (/\b(i miss|i love|i'm sorry|grief|lost someone|passed away|broken|alone|scared|empty)\b/.test(text)) {
      setVaultMood('tender');
    // Intense: anger, frustration, urgency
    } else if (/\b(angry|furious|hate|can't take|frustrated|rage|done with|sick of)\b/.test(text)) {
      setVaultMood('intense');
    // Energized: excited, ideas, plans, motivation
    } else if (/\b(excited|can't wait|amazing|idea|inspired|pumped|let's go|energy|motivated)\b/.test(text)) {
      setVaultMood('energized');
    // Calm: peaceful, grateful, content, reflective
    } else if (/\b(grateful|peaceful|calm|content|relax|breathe|quiet|gentle|thankful|serene)\b/.test(text)) {
      setVaultMood('calm');
    } else {
      setVaultMood('neutral');
    }
  }, [thinkInput, thinkHistory]);

  useEffect(() => {
    const el = thinkScrollRef.current;
    if (!el || thinkHistory.length === 0) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distFromBottom < 120) {
      thinkEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [thinkHistory]);

  const autoResizeTextarea = useCallback(() => {
    const el = thinkTextareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.max(el.scrollHeight, 96) + 'px';
  }, []);

  useEffect(() => { autoResizeTextarea(); }, [thinkInput, autoResizeTextarea]);

  /* ── Golden dissolve particle spawner ── */
  const spawnGoldenParticles = useCallback(() => {
    const card = inputCardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const count = 18 + Math.floor(Math.random() * 10);

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      const startX = rect.left + Math.random() * rect.width;
      const startY = rect.top + Math.random() * (rect.height * 0.5);
      const xDrift = (Math.random() - 0.5) * 80;

      // Target: bottom center of viewport (companion avatar area)
      const targetY = window.innerHeight - 40;
      const distY = targetY - startY;

      particle.style.cssText = `
        position: fixed;
        left: ${startX}px;
        top: ${startY}px;
        width: ${2 + Math.random() * 3}px;
        height: ${2 + Math.random() * 3}px;
        border-radius: 50%;
        background: hsl(38 70% ${50 + Math.random() * 20}%);
        box-shadow: 0 0 ${4 + Math.random() * 6}px hsl(38 70% 50% / 0.6);
        pointer-events: none;
        z-index: 9999;
        opacity: 1;
        animation: goldenFly ${0.6 + Math.random() * 0.5}s cubic-bezier(0.4, 0, 0.2, 1) ${i * 0.02}s forwards;
      `;
      // Inject keyframes dynamically for unique paths
      const styleId = 'golden-fly-keyframes';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          @keyframes goldenFly {
            0% { transform: translate(0, 0) scale(1); opacity: 1; }
            40% { opacity: 0.9; filter: blur(0.5px); }
            100% { transform: translate(var(--gf-x), var(--gf-y)) scale(0); opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }
      particle.style.setProperty('--gf-x', `${xDrift}px`);
      particle.style.setProperty('--gf-y', `${distY}px`);
      document.body.appendChild(particle);
      particle.addEventListener('animationend', () => particle.remove());
    }
  }, []);

  /* ── Evaporation particle spawner (shredder) ── */
  const spawnEvaporationParticles = useCallback(() => {
    const scrollEl = thinkScrollRef.current;
    if (!scrollEl) return;
    const bubbles = scrollEl.querySelectorAll('[data-msg-bubble]');
    if (bubbles.length === 0) return;

    bubbles.forEach((bubble, bubbleIdx) => {
      const rect = bubble.getBoundingClientRect();
      const particleCount = 14 + Math.floor(Math.random() * 10);
      const footerY = window.innerHeight - 80; // stop before footer

      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        const startX = rect.left + Math.random() * rect.width;
        const startY = rect.top + Math.random() * rect.height;
        const xDrift = (Math.random() - 0.5) * 100;
        // Fall DOWNWARD toward footer, dissolve before reaching it
        const maxFall = footerY - startY;
        const yDrift = Math.max(60, maxFall * (0.5 + Math.random() * 0.4));
        const isGold = Math.random() > 0.2; // mostly gold embers
        const size = 1.5 + Math.random() * 3;
        const delay = bubbleIdx * 0.06 + i * 0.012;
        const duration = 0.9 + Math.random() * 0.7;

        particle.style.cssText = `
          position: fixed;
          left: ${startX}px;
          top: ${startY}px;
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          background: ${isGold ? `hsl(38 70% ${45 + Math.random() * 25}%)` : `hsl(0 0% ${5 + Math.random() * 8}%)`};
          box-shadow: 0 0 ${isGold ? 8 : 2}px ${isGold ? 'hsl(38 70% 50% / 0.6)' : 'transparent'};
          pointer-events: none;
          z-index: 9999;
          opacity: 1;
          animation: emberFall ${duration}s cubic-bezier(0.4, 0, 0.8, 1) ${delay}s forwards;
        `;

        const styleId = 'ember-fall-keyframes';
        if (!document.getElementById(styleId)) {
          const style = document.createElement('style');
          style.id = styleId;
          style.textContent = `
            @keyframes emberFall {
              0% { transform: translate(0, 0) scale(1); opacity: 0.9; }
              20% { transform: translate(var(--ef-x20), var(--ef-y20)) scale(0.85); opacity: 0.8; }
              60% { transform: translate(var(--ef-x60), var(--ef-y60)) scale(0.5); opacity: 0.4; filter: blur(1px); }
              100% { transform: translate(var(--ef-x), var(--ef-y)) scale(0); opacity: 0; filter: blur(3px); }
            }
          `;
          document.head.appendChild(style);
        }
        particle.style.setProperty('--ef-x20', `${xDrift * 0.2}px`);
        particle.style.setProperty('--ef-y20', `${yDrift * 0.15}px`);
        particle.style.setProperty('--ef-x60', `${xDrift * 0.6}px`);
        particle.style.setProperty('--ef-y60', `${yDrift * 0.6}px`);
        particle.style.setProperty('--ef-x', `${xDrift}px`);
        particle.style.setProperty('--ef-y', `${yDrift}px`);
        document.body.appendChild(particle);
        particle.addEventListener('animationend', () => particle.remove());
      }
    });
  }, []);

  /* ── Send ── */
  const handleThinkSend = async () => {
    if (!thinkInput.trim() || thinkLoading) return;
    const userMessage = thinkInput.trim();

    // Trigger golden dissolve
    setSendDissolving(true);
    spawnGoldenParticles();

    // Flare the companion avatar
    triggerExpression('glow', 1200);

    // Signature haptic: catch → dissolve → heartbeat
    sanctuarySendHaptic();
    // Audio cue: soft whoosh on send, cello pluck on "held with care"
    playSendWhoosh();
    setTimeout(() => playHeldWithCare(), 500);

    // Brief dissolve delay before clearing
    await new Promise(r => setTimeout(r, 350));
    setSendDissolving(false);

    // Show "Held with care" whisper above the avatar
    setShowWhisper(true);
    setTimeout(() => setShowWhisper(false), 2600);

    setThinkLoading(true);
    setThinkResponse(null);
    setThinkLastInput(userMessage);
    setThinkInput('');

    const updatedHistory: ThinkMsg[] = [...thinkHistory, { role: 'user', content: userMessage }];
    setThinkHistory(updatedHistory);
    resetInactivityTimer();

    try {
      let data = await callEdgeFunction<{ response: string; isPremium?: boolean }>('think-freely', { history: updatedHistory, pokeLevel });
      let text = data?.response || '';

      // If first attempt returned empty, retry once after a short pause
      if (!text) {
        console.warn('[ThinkFreely] Empty response, retrying...');
        await new Promise(r => setTimeout(r, 1200));
        data = await callEdgeFunction<{ response: string; isPremium?: boolean }>('think-freely', { history: updatedHistory, pokeLevel });
        text = data?.response || '';
      }

      if (!text) {
        text = "I'm here — give me a moment and try again.";
      }

      setThinkResponse(text);
      setThinkHistory([...updatedHistory, { role: 'assistant', content: text }]);

      // Privacy: NO auto-save. Insight only saved if user explicitly opts in at session end.
    } catch (e: any) {
      if (e?.message?.includes('THINK_FREELY_LIMIT_REACHED') || e?.status === 429) {
        // Keep the user's message visible and add a warm "limit reached" reply as an assistant bubble
        const limitReply = "I really enjoyed this conversation 💛 Free accounts get 10 Think Freely sessions per day — come back tomorrow, or upgrade to Premium for unlimited sessions. I'll be right here.";
        setThinkHistory([...updatedHistory, { role: 'assistant', content: limitReply }]);
        setThinkResponse(limitReply);
        setShowLimitNotice(true);
      } else {
        console.error('[ThinkFreely] Failed:', e);
        setThinkResponse("Something went wrong — try sending that again.");
      }
    } finally {
      setThinkLoading(false);
    }
  };

  /* ── Mic ── */
  const handleMicToggle = useCallback(async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      recordingStream?.getTracks().forEach(t => t.stop());
      setRecordingStream(null);
      setIsRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setRecordingStream(stream);
      setIsRecording(true);
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;
          const formData = new FormData();
          formData.append('audio', blob, 'recording.webm');
          const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-transcribe`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: formData,
          });
          const data = await resp.json();
          if (data.text) setThinkInput(prev => prev ? prev + ' ' + data.text : data.text);
        } catch (err) {
          console.error('[ThinkFreely] Transcription failed:', err);
        }
      };
      mediaRecorder.start();
    } catch (err) {
      console.error('[ThinkFreely] Mic access denied:', err);
    }
  }, [isRecording, recordingStream]);

  /* ── Actions ── */
  const [showHandoverWhisper, setShowHandoverWhisper] = useState<string | null>(null);

  const handleShareWithCompanion = async (companionName?: string) => {
    if (thinkHistory.length === 0) return;
    const exchangeText = thinkHistory.map(m => `${m.role === 'user' ? 'User' : 'Reflection'}: ${m.content}`).join('\n\n');
    const label = companionName ? `Shared with ${companionName} from Think Freely` : 'Shared from Think Freely';
    await wellness.addJournalEntry(exchangeText, label, undefined, false, 'think_freely_shared');
    const memory = loadMemory();
    const newEntry = {
      text: `User shared a private reflection: "${thinkLastInput}". The insight they received: "${thinkHistory[thinkHistory.length - 1]?.content}"`,
      category: 'emotional' as const,
      extractedAt: new Date().toISOString(),
    };
    saveMemory(mergeNewMemories(memory, [newEntry]));
    setThinkShared(true);
    setShowCompanionPicker(false);
    setShowActionsMenu(false);
    // Show the handover whisper
    setShowHandoverWhisper(companionName || 'Your companion');
    setTimeout(() => setShowHandoverWhisper(null), 5000);
  };

  const handleShareButtonPress = () => {
    if (!connections || connections.length <= 1) {
      handleShareWithCompanion(connections?.[0]?.name);
    } else {
      setShowCompanionPicker(true);
    }
  };

  const handleSaveToJournal = async () => {
    if (thinkHistory.length === 0) return;
    const formatted = thinkHistory.map(m => `${m.role === 'user' ? 'You' : 'Reflection'}: ${m.content}`).join('\n\n');
    await wellness.addJournalEntry(formatted, 'Think Freely', undefined, true, 'think_freely', undefined, journalPhoto || undefined);
    setThinkShared(true);
    setJournalPhoto(null);
  };

  const handleJournalPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    e.target.value = '';
    setJournalPhotoUploading(true);
    try {
      const { compressImage } = await import('@/lib/imageCompression');
      const compressed = await compressImage(file);
      const fileName = `${userId}/journal-${Date.now()}.jpg`;
      const { error } = await supabase.storage.from('companion-avatars').upload(fileName, compressed, { contentType: compressed.type, upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('companion-avatars').getPublicUrl(fileName);
      setJournalPhoto(urlData.publicUrl);
    } catch {
      // silently fail — journal saves without photo
    } finally {
      setJournalPhotoUploading(false);
    }
  };

  const endNudgeRef = useRef<HTMLDivElement>(null);

  const handleDismissThought = () => {
    setShowEndNudge(true);
    setTimeout(() => {
      endNudgeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  };

  // Dissolve animation state for session clear
  const [dissolving, setDissolving] = useState(false);

  const [showOverviewPrompt, setShowOverviewPrompt] = useState(false);

  const handleConfirmEndSession = () => {
    setShowEndNudge(false);
    // If there's a conversation, ask user if they want an overview first
    if (thinkHistory.length >= 2) {
      setShowOverviewPrompt(true);
      return;
    }
    executeSessionPurge();
  };

  const handleOverviewChoice = (wantsOverview: boolean) => {
    setShowOverviewPrompt(false);
    if (wantsOverview && thinkHistory.length >= 2) {
      // Generate a concise overview from the last assistant message
      const lastAssistant = [...thinkHistory].reverse().find(m => m.role === 'assistant');
      if (lastAssistant) {
        savePrivateInsight({
          text: lastAssistant.content,
          companionName: 'Think Freely',
          timestamp: Date.now(),
        });
      }
    }
    executeSessionPurge();
  };

  const executeSessionPurge = () => {
    setDissolving(true);

    // Stage 1: Spawn evaporation particles from message bubbles
    spawnEvaporationParticles();

    // Shredder haptic — long soft purr that fades with the visuals
    if (navigator.vibrate) {
      navigator.vibrate([15, 30, 15, 30, 15, 40, 10, 50, 8, 60, 5, 80, 3]);
    }
    
    // Let the 3-stage evaporation play (1.2s), then clear
    setTimeout(() => {
      setThinkResponse(null);
      setThinkLastInput('');
      setThinkShared(false);
      setThinkHistory([]);
      sessionStorage.removeItem('compani-think-draft');
      sessionStorage.removeItem('compani-think-history');
      setDissolving(false);
    }, 1400);
  };

  const handleDownloadSession = () => {
    if (thinkHistory.length === 0) return;
    const timestamp = new Date().toLocaleString();
    const lines = [`Think Freely Session - ${timestamp}`, '-'.repeat(40), ''];
    thinkHistory.forEach(msg => {
      lines.push(msg.role === 'user' ? 'You:' : 'Reflection:');
      lines.push(msg.content);
      lines.push('');
    });
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `think-freely-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasSession = thinkHistory.length > 0;

  /* ── Evening mode detection ── */
  const currentHour = new Date().getHours();
  const currentMinute = new Date().getMinutes();
  const isEvening = currentHour > 20 || (currentHour === 20 && currentMinute >= 30) || currentHour < 5;
  const companionName = connections?.[0]?.name || 'Your friend';

  // Mood glow color map
  const moodGlow = {
    neutral: isEvening
      ? { border: 'hsla(260, 40%, 35%, 0.15)', shadow: '0 0 40px -10px hsla(260, 40%, 35%, 0.12), inset 0 0 60px -20px hsla(260, 40%, 35%, 0.06)' }
      : { border: 'hsla(38, 70%, 50%, 0.12)', shadow: '0 0 40px -10px hsla(38, 70%, 50%, 0.08), inset 0 0 60px -20px hsla(38, 70%, 50%, 0.04)' },
    calm: { border: 'hsla(180, 60%, 45%, 0.25)', shadow: '0 0 50px -8px hsla(180, 60%, 45%, 0.18), inset 0 0 60px -15px hsla(180, 60%, 45%, 0.06)' },
    intense: { border: 'hsla(15, 85%, 55%, 0.30)', shadow: '0 0 50px -8px hsla(15, 85%, 55%, 0.20), inset 0 0 60px -15px hsla(15, 85%, 55%, 0.08)' },
    tender: { border: 'hsla(330, 70%, 60%, 0.25)', shadow: '0 0 50px -8px hsla(330, 70%, 60%, 0.18), inset 0 0 60px -15px hsla(330, 70%, 60%, 0.06)' },
    energized: { border: 'hsla(45, 90%, 55%, 0.28)', shadow: '0 0 50px -8px hsla(45, 90%, 55%, 0.20), inset 0 0 60px -15px hsla(45, 90%, 55%, 0.08)' },
  }[vaultMood];

  return (
    <motion.div
      className="fixed inset-0 z-[50] flex flex-col transition-all duration-700"
      style={{
        perspective: '1200px',
        transformStyle: 'preserve-3d',
        background: isEvening ? '#050505' : '#0A0B1E',
        boxShadow: moodGlow.shadow,
        border: `1px solid ${moodGlow.border}`,
        borderTop: 'none',
      }}
    >
      {/* ── Exit: Aurora Bridge + Void Collapse + Quinn Core (OUTSIDE fold wrapper) ── */}
      <AnimatePresence>
        {exitDissolving && (
          <>
            {/* Aurora Bridge — gold sweep across screen */}
            <motion.div
              key="aurora-bridge"
              initial={{ opacity: 0, x: '-100%' }}
              animate={{ opacity: [0, 0.7, 0.7, 0], x: ['-100%', '0%', '0%', '100%'] }}
              transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1], times: [0, 0.3, 0.6, 1] }}
              className="fixed inset-0 z-[199] pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, hsl(38 70% 50% / 0.15) 0%, hsl(38 80% 55% / 0.25) 40%, hsl(38 70% 50% / 0.08) 100%)',
                backdropFilter: 'blur(2px)',
              }}
            />
            {/* Void collapse — dark circle shrinking to center */}
            <motion.div
              key="void-collapse"
              initial={{ clipPath: 'circle(100% at 50% 50%)' }}
              animate={{ clipPath: 'circle(0% at 50% 50%)' }}
              transition={{ duration: 1.0, ease: [0.55, 0.085, 0.68, 0.53], delay: 0.15 }}
              className="fixed inset-0 z-[198] pointer-events-none"
              style={{
                background: isEvening ? 'hsl(255 30% 7%)' : 'hsl(234 40% 10%)',
              }}
            />
            {/* Quinn Core signature pulse */}
            <motion.div
              key="quinn-core-exit"
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: [0, 0.7, 0], scale: [0.3, 1.4, 1.8] }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.1 }}
              className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none"
            >
              <div
                className="h-28 w-28 rounded-full"
                style={{
                  background: 'radial-gradient(circle, hsl(38 70% 50% / 0.5) 0%, hsl(38 70% 50% / 0) 70%)',
                  boxShadow: '0 0 80px 30px hsl(38 70% 50% / 0.2)',
                }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Inner wrapper for 3D fold-to-void */}
      <motion.div
        className="flex flex-col flex-1 min-h-0"
        animate={exitDissolving
          ? { opacity: 0, filter: 'blur(20px)', scale: 0 }
          : { opacity: 1, filter: 'blur(0px)', scale: 1 }
        }
        transition={exitDissolving
          ? { duration: 0.9, ease: [0.7, 0, 0.3, 1] }
          : { duration: 0 }
        }
        style={{ transformOrigin: '50% 50%', willChange: 'transform, opacity, filter' }}
      >
      {/* ── Closing Ritual Overlay ── */}
      {showClosingRitual && (
        <ClosingRitual
          userName={userName}
          companionName={connections?.[0]?.name}
          onComplete={() => setShowClosingRitual(false)}
        />
      )}

      {/* Soundscape discovery hint */}
      <AnimatePresence>
        {showSoundHint && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="fixed top-16 right-4 z-50 flex items-center gap-2 rounded-full bg-black/60 backdrop-blur-md px-4 py-2 border border-white/10 pointer-events-none"
          >
            <Waves className="h-3.5 w-3.5 text-primary/70" />
            <span className="text-[11px] text-white/60 font-light tracking-wide">
              Tap to set the mood
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Privacy Shield Overlay */}
      <AnimatePresence>
        {privacyShield && (
          <motion.div
            key="privacy-shield"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
          >
            {/* Gold ripple ring */}
            <motion.div
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ scale: 4, opacity: 0 }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              className="absolute h-32 w-32 rounded-full border-2 border-[hsl(38_70%_50%/0.4)]"
            />
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="flex flex-col items-center gap-2 bg-black/60 backdrop-blur-xl rounded-2xl px-6 py-4 border border-white/10"
            >
              <Lock className="h-6 w-6 text-primary" />
              <p className="text-sm font-medium text-foreground/90">Private & Protected</p>
              <p className="text-xs text-foreground/50 text-center max-w-[200px]">
                Your thoughts stay here. Your friend is your only witness.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Ambient glow — shifts to deeper purple in evening */}
      {/* Subtle ambient glow — very subdued on solid black */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isEvening
            ? 'radial-gradient(ellipse at 50% 30%, hsl(255 40% 12% / 0.15) 0%, transparent 55%)'
            : 'radial-gradient(ellipse at 60% 20%, hsl(38 60% 40% / 0.08) 0%, transparent 55%)',
        }}
      />
      {/* Breathing pulse — slows to 8s in evening */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0, 1, 0] }}
        transition={{
          duration: isEvening ? 8 : 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          background: 'radial-gradient(circle at 50% 50%, hsl(38 50% 30% / 0.04) 0%, transparent 50%)',
        }}
      />

      {/* Scrollable content area */}
      <div
        ref={thinkScrollRef}
        className="relative flex-1 flex flex-col overflow-y-auto no-scrollbar"
        style={{ touchAction: 'pan-y', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 4.5rem)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)' }}
      >
        <div className="mx-auto w-full max-w-lg flex flex-col flex-1 px-4 min-h-full">

          {/* Back arrow → Dashboard (right side, pointing right) */}
          <div className="fixed top-0 right-0 z-40 pt-[env(safe-area-inset-top,0px)]">
            <button
              onClick={() => navigate('/my-world')}
              className="flex items-center justify-center h-10 w-10 mr-2 mt-2 rounded-full text-muted-foreground/60 hover:text-foreground/80 transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Today's Intent banner — visible on Home too */}
          {(() => {
            const intent = getTodayIntent(userId);
            if (!intent) return null;
            const h = new Date().getHours();
            const isNight = h >= 22 || h < 5;
            const labelColor = isNight ? 'hsl(230 60% 72%)' : 'hsl(43 96% 58%)';
            const bgTint = isNight ? 'hsl(230 60% 72% / 0.06)' : 'hsl(43 96% 58% / 0.06)';
            const bgEdge = isNight ? 'hsl(230 60% 72% / 0.03)' : 'hsl(43 96% 58% / 0.03)';
            const borderTint = isNight ? 'hsl(230 60% 72% / 0.1)' : 'hsl(43 96% 58% / 0.1)';
            return (
              <div className="flex items-center justify-center gap-2 py-2 px-4 mb-2 rounded-xl"
                style={{
                  background: `linear-gradient(90deg, ${bgTint}, ${bgEdge}, ${bgTint})`,
                  border: `1px solid ${borderTint}`,
                }}
              >
                <span className="text-[10px] tracking-[0.15em] uppercase font-medium"
                  style={{ color: labelColor }}>
                  Today's intent
                </span>
                <span className="text-sm font-semibold text-foreground tracking-wide">
                  {intent}
                </span>
              </div>
            );
          })()}

          {/* Hero section — only when no active session */}
          {!hasSession && !dissolving && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-4 py-8">
              <p className="text-[12px] tracking-[0.12em] uppercase text-foreground/45 font-medium">
                {isFocusModeActive() ? 'Focus session' : isEvening ? 'Evening space' : 'Your space'}
              </p>
              <h1 className="text-[26px] font-normal text-foreground leading-[1.4] tracking-tight">
                {isEvening
                  ? <>The world is quiet now.<br />What are you carrying from today?</>
                  : <>Say the thing you haven't<br />said out loud yet.</>
                }
              </h1>

              {/* "Think Freely" sub-heading — fades in as the sanctuary's permission slip */}
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 1.5, ease: 'easeOut' }}
                className="text-[14px] font-light tracking-[0.06em] text-primary/50"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                {isFocusModeActive() ? (
                  <>
                    <span style={{ color: 'hsl(230 70% 70%)', opacity: 0.85 }}>Focus Session.</span>{' '}
                    <span style={{ color: 'hsl(230 60% 65%)', opacity: 0.45 }}>Deep work, zero noise.</span>
                  </>
                ) : (
                  <>
                    <span style={{ color: 'hsl(var(--primary))', opacity: 0.85 }}>Think Freely.</span>{' '}
                    <span style={{ color: 'hsl(var(--primary))', opacity: 0.45 }}>It stays here with you.</span>
                  </>
                )}
              </motion.h2>

              {/* Floating Privacy Seal — minimalist badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                onClick={() => { setPrivacyShield(true); privacyShieldHaptic(); setTimeout(() => setPrivacyShield(false), 2000); }}
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 cursor-pointer hover:opacity-80 transition-opacity mt-1"
                style={{
                  background: 'hsl(0 0% 100% / 0.02)',
                  border: '0.5px solid hsl(38 70% 50% / 0.3)',
                  backdropFilter: 'blur(5px)',
                  WebkitBackdropFilter: 'blur(5px)',
                }}
              >
                <Lock className="h-2.5 w-2.5 text-primary/50" />
                <span className="text-[9px] tracking-[0.12em] uppercase font-light" style={{ color: 'hsl(38 70% 55%)' }}>
                  End-to-End Private
                </span>
              </motion.div>

              {/* Zero-trace privacy disclaimer */}
              <p className="text-[10px] text-foreground/20 max-w-[240px] leading-[1.6] mt-2" style={{ fontFamily: 'Georgia, serif' }}>
                This space is temporary. Once you refresh, your words vanish unless you choose to keep them.
              </p>
            </div>
          )}

          {/* Conversation bubbles — when session is active */}
          {(hasSession || dissolving) && (
            <motion.div
              className="flex-1 flex flex-col gap-2 pt-8"
              animate={dissolving
                ? { opacity: 0, y: 60, scale: 0.88, filter: 'blur(12px)' }
                : { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }
              }
              transition={{ duration: dissolving ? 1.2 : 0.3, ease: [0.4, 0, 0.8, 0.5] }}
            >
              {/* Inactivity warning */}
              <AnimatePresence>
                {inactiveWarning && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5"
                  >
                    <p className="text-xs text-amber-400 leading-snug">
                      Still here? Your session is saved — tap to continue or download before leaving.
                    </p>
                    <button onClick={resetInactivityTimer} className="shrink-0 text-[11px] font-medium text-amber-400 hover:text-amber-300 transition-colors">
                      Still here
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {thinkHistory.map((msg, i) => (
                <motion.div
                  key={i}
                  data-msg-bubble
                  initial={{ opacity: 0, y: 6 }}
                  animate={dissolving
                    ? { opacity: 0, y: (40 + i * 8), x: (Math.random() - 0.5) * 15, scale: 0.85, filter: 'blur(4px)' }
                    : { opacity: 1, y: 0, x: 0, scale: 1, filter: 'blur(0px)' }
                  }
                  transition={dissolving
                    ? { duration: 0.7 + i * 0.06, ease: [0.4, 0, 0.8, 0.5], delay: i * 0.04 }
                    : { duration: 0.3 }
                  }
                  className={msg.role === 'user'
                    ? "ml-auto max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 bg-primary/15 text-sm text-foreground/90 leading-relaxed transition-all duration-700"
                    : "mr-auto max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-white/5 border border-white/10 text-sm text-foreground/80 leading-relaxed"
                  }
                  style={msg.role === 'user' ? {
                    border: `1px solid ${moodGlow.border}`,
                    boxShadow: `0 0 20px -8px ${moodGlow.border}`,
                  } : undefined}
                >
                  {msg.role === 'assistant' ? (() => {
                    // Phase 4: split [POKE] tokens into a separate gold-tinted aside
                    const parts = msg.content.split(/\n\[POKE\]\s*/);
                    const main = parts[0];
                    const pokes = parts.slice(1);
                    return (
                      <>
                        <div className="whitespace-pre-wrap">{main}</div>
                        {pokes.map((p, idx) => (
                          <div
                            key={idx}
                            className="mt-3 rounded-xl px-3 py-2.5 text-[12.5px] leading-relaxed"
                            style={{
                              background: 'linear-gradient(135deg, rgba(212,175,55,0.10), rgba(212,175,55,0.04))',
                              border: '1px solid rgba(212,175,55,0.28)',
                              color: 'rgba(232,210,140,0.95)',
                              boxShadow: '0 0 18px -10px rgba(212,175,55,0.45), inset 0 1px 0 rgba(255,235,170,0.06)',
                            }}
                          >
                            <span className="mr-2 text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">Poke</span>
                            {p}
                          </div>
                        ))}
                      </>
                    );
                  })() : msg.content}
                </motion.div>
              ))}
              {thinkLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="mr-auto max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-white/5 border border-white/10">
                  <Loader2 className="h-4 w-4 animate-spin text-foreground/40" />
                </motion.div>
              )}
              <div ref={thinkEndRef} />
              {thinkShared && (
                <p className="text-xs text-green-400 text-center py-1">✓ Saved</p>
              )}
            </motion.div>
          )}

          {/* "Clean Slate" confirmation after evaporation */}
          <AnimatePresence>
            {dissolving && (
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 0.5, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="text-center text-[12px] italic text-primary/40 py-6"
                style={{ fontFamily: 'Georgia, serif', textShadow: '0 0 12px hsl(var(--primary) / 0.15)' }}
              >
                The air is clear. Your words have vanished.
              </motion.p>
            )}
          </AnimatePresence>

          {/* Input card — glass morphism, matches mockup */}
          <div className="mt-auto pt-4 pb-6">
            {/* Daily limit notice — system level, not AI response */}
            {showLimitNotice && (
              <div className="mb-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-center">
                <p className="text-sm font-semibold text-white/80 mb-1">You've used today's Think Freely sessions</p>
                <p className="text-xs text-white/40 mb-2.5">Free users get 10 sessions per day. Come back tomorrow or upgrade for unlimited.</p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setShowLimitNotice(false)}
                    className="text-xs text-white/30 hover:text-white/50 transition-colors px-3 py-1.5"
                  >
                    Dismiss
                  </button>
                  <a
                    href="/settings"
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    👑 Upgrade to Premium
                  </a>
                </div>
              </div>
            )}

            <motion.div
              ref={inputCardRef}
              animate={sendDissolving ? { opacity: 0.3, scale: 0.97, filter: 'blur(2px)' } : { opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="rounded-[20px] border-[0.5px] bg-white/5 px-[18px] py-4 transition-all duration-700"
              style={{
                borderColor: moodGlow.border,
                boxShadow: moodGlow.shadow,
              }}
            >
              {/* Textarea with animated placeholder */}
              <div className="relative mb-6">
                {!thinkInput && (
                  <div className="absolute top-0 left-0 flex items-center gap-0.5 pointer-events-none">
                    <span className="text-[16px] italic text-foreground/30">Think freely...</span>
                  </div>
                )}
                <textarea
                  ref={thinkTextareaRef}
                  value={thinkInput}
                  onChange={e => setThinkInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleThinkSend(); } }}
                  disabled={showLimitNotice}
                  style={{ minHeight: '48px', border: 'none', outline: 'none', boxShadow: 'none', WebkitAppearance: 'none' }}
                  className="w-full resize-none bg-transparent text-[16px] text-foreground placeholder:text-transparent leading-relaxed overflow-hidden !border-0 !outline-none !shadow-none !ring-0 focus:!border-0 focus:!outline-none focus:!shadow-none focus:!ring-0 disabled:opacity-40"
                />
              </div>
              {/* Bottom row: privacy lock + buttons */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setPrivacyShield(true);
                    privacyShieldHaptic();
                    setTimeout(() => setPrivacyShield(false), 2000);
                  }}
                  className="flex items-center gap-1 text-[12px] text-foreground/25 hover:text-primary/60 transition-colors"
                >
                  <Lock className="h-3 w-3" />
                  <span>It stays here with you</span>
                </button>
                <div className="flex items-center gap-2.5">
                  <button
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full transition-all",
                      isRecording
                        ? "bg-red-500/20 border border-red-500/50 text-red-400 animate-pulse"
                        : "border border-primary/30 bg-primary/15 text-primary hover:bg-primary/25"
                    )}
                    title={isRecording ? "Stop recording" : "Voice input"}
                    onClick={handleMicToggle}
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleThinkSend}
                    disabled={!thinkInput.trim() || thinkLoading}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/85 text-primary-foreground transition-all hover:bg-primary disabled:opacity-40"
                  >
                    {thinkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Cami nudge — appears after 3+ exchanges for users with no companion */}
            {(!connections || connections.length === 0) && thinkHistory.length >= 6 && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2, duration: 0.5 }}
                className="flex justify-center pt-3 pb-0.5"
              >
                <button
                  onClick={onFindFriend}
                  className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-medium text-primary/80 hover:bg-primary/20 hover:text-primary transition-all active:scale-95"
                >
                  <span>💛</span>
                  <span>When you're ready, find your person</span>
                  <span className="opacity-60">→</span>
                </button>
              </motion.div>
            )}

            <div className="flex items-center justify-center gap-6 py-3 relative">
              {hasSession && (
                <div className="relative">
                  <button
                    onClick={() => setShowActionsMenu(prev => !prev)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-primary/20 bg-primary/8 text-primary/60 hover:text-primary/80 hover:bg-primary/15 transition-all text-[11px] font-medium"
                    style={{ boxShadow: '0 0 12px hsl(var(--primary) / 0.08)' }}
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Save or share
                  </button>

                  {/* ── Golden Bridge Export Menu ── */}
                  <AnimatePresence>
                    {showActionsMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.92 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-[280px] rounded-2xl border border-primary/15 overflow-hidden z-20"
                        style={{
                          background: 'linear-gradient(180deg, hsl(234 30% 10% / 0.95) 0%, hsl(234 25% 6% / 0.98) 100%)',
                          backdropFilter: 'blur(24px)',
                          WebkitBackdropFilter: 'blur(24px)',
                          boxShadow: '0 8px 40px -12px hsl(var(--primary) / 0.15), 0 0 0 1px hsl(var(--primary) / 0.06)',
                        }}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 pt-3 pb-1">
                          <p className="text-[10px] tracking-[0.14em] uppercase text-primary/40 font-medium" style={{ fontFamily: 'Georgia, serif' }}>
                            Choose your vault
                          </p>
                          <button onClick={() => setShowActionsMenu(false)} className="text-foreground/20 hover:text-foreground/40 transition-colors">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Vault 1: Personal Key (Download) */}
                        <button
                          onClick={() => { handleDownloadSession(); setShowActionsMenu(false); }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left group"
                        >
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/8 shrink-0 group-hover:bg-primary/15 transition-colors">
                            <KeyRound className="h-4 w-4 text-primary/70" />
                          </div>
                          <div>
                            <p className="text-[11px] tracking-[0.08em] uppercase font-semibold text-foreground/80 leading-tight">Private Download</p>
                            <p className="text-[10px] text-foreground/30 leading-snug mt-0.5">For your eyes only. Leaves the app completely.</p>
                          </div>
                        </button>

                        <div className="h-px mx-4 bg-white/5" />

                        {/* Vault 2: Sanctuary Journal */}
                        <button
                          onClick={() => {
                            if (isPremium) { handleSaveToJournal(); setShowActionsMenu(false); }
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 text-left group transition-colors",
                            isPremium ? "hover:bg-white/5" : "opacity-50 cursor-default"
                          )}
                        >
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/8 shrink-0">
                            <BookOpen className="h-4 w-4 text-primary/70" />
                          </div>
                          <div>
                            <p className="text-[11px] tracking-[0.08em] uppercase font-semibold text-foreground/80 leading-tight">
                              Secure Journal {!isPremium && <span className="text-[9px] text-primary/40 ml-1 normal-case tracking-normal">Premium</span>}
                            </p>
                            <p className="text-[10px] text-foreground/30 leading-snug mt-0.5">Remember how you felt. Private & encrypted.</p>
                          </div>
                        </button>

                        {isPremium && (
                          <>
                            <button
                              onClick={() => { journalPhotoInputRef.current?.click(); }}
                              className="w-full flex items-center gap-2 px-4 py-1.5 text-left"
                            >
                              {journalPhotoUploading ? (
                                <Loader2 className="h-3 w-3 animate-spin text-foreground/20 ml-12" />
                              ) : (
                                <span className="text-[10px] text-foreground/20 hover:text-foreground/40 transition-colors ml-12">
                                  {journalPhoto ? '📎 Photo attached — change' : '📎 Attach a photo'}
                                </span>
                              )}
                            </button>
                            <input
                              ref={journalPhotoInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleJournalPhotoUpload}
                            />
                          </>
                        )}

                        <div className="h-px mx-4 bg-white/5" />

                        {/* Vault 3: Entrust to Companion */}
                        {connections && connections.length > 0 && (
                          <button
                            onClick={() => { handleShareButtonPress(); }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left group"
                          >
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/8 shrink-0 overflow-hidden group-hover:bg-primary/15 transition-colors">
                              {connections[0].avatarUrl ? (
                                <img src={connections[0].avatarUrl} className="h-full w-full object-cover" alt="" />
                              ) : (
                                <span className="text-sm text-primary/70 font-serif">{connections[0].name[0]}</span>
                              )}
                            </div>
                            <div>
                              <p className="text-[11px] tracking-[0.08em] uppercase font-semibold text-foreground/80 leading-tight">Entrust to {connections[0].name}</p>
                              <p className="text-[10px] text-foreground/30 leading-snug mt-0.5">I trust you with this. Help me navigate it.</p>
                            </div>
                          </button>
                        )}

                        {/* Ghost text warning */}
                        <div className="px-4 py-3 border-t border-white/5">
                          <p className="text-[9px] text-foreground/15 text-center leading-[1.6] italic" style={{ fontFamily: 'Georgia, serif' }}>
                            Anything not saved or downloaded will be permanently deleted upon refresh. This is your safe space.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* End session — spaced far from export to prevent fat-finger */}
              {hasSession && (
                <button
                  onClick={handleDismissThought}
                  className="text-[12px] font-medium text-amber-400/70 hover:text-amber-400 transition-colors border border-amber-400/20 hover:border-amber-400/40 rounded-full px-3 py-1"
                >
                  End session
                </button>
              )}
            </div>
          </div>

          {/* End session nudge card */}
          {showEndNudge && (
            <div ref={endNudgeRef} className="mx-4 mb-3 rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-4 space-y-3">
              <p className="text-sm text-foreground/80 text-center">Your session will be cleared. Nothing is saved.</p>
              <p className="text-[10px] text-foreground/20 text-center italic" style={{ fontFamily: 'Georgia, serif' }}>
                Have you saved everything you need? Download or journal first.
              </p>
              <button onClick={handleConfirmEndSession} className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-foreground/50 hover:text-foreground/70 transition-colors text-center">
                End session
              </button>
              {(!connections || connections.length === 0) && (
                <button onClick={onFindFriend} className="text-xs text-foreground/30 hover:text-foreground/50 text-center transition-colors">
                  Want someone to explore this with? Find a friend to connect with.
                </button>
              )}
              <button onClick={() => setShowEndNudge(false)} className="w-full text-xs text-foreground/25 hover:text-foreground/40 transition-colors text-center pt-1">
                Keep going
              </button>
            </div>
          )}

          {/* Overview consent prompt — shown before shredding */}
          {showOverviewPrompt && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mx-4 mb-3 rounded-2xl border border-[hsl(38_70%_50%/0.2)] p-5 space-y-4"
              style={{
                background: 'linear-gradient(135deg, rgba(15, 18, 33, 0.95), rgba(10, 12, 24, 0.98))',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
              }}
            >
              <div className="flex items-center gap-2 justify-center">
                <Lock className="h-4 w-4 text-[hsl(38_70%_50%/0.6)]" />
                <p className="text-sm text-foreground/80 text-center">
                  Would you like a private overview sent to your dashboard?
                </p>
              </div>
              <p className="text-[10px] text-foreground/30 text-center italic" style={{ fontFamily: 'Georgia, serif' }}>
                Only you can see it. It auto-expires in 24 hours.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleOverviewChoice(true)}
                  className="flex-1 rounded-xl border border-[hsl(38_70%_50%/0.3)] px-4 py-2.5 text-sm font-medium text-[hsl(38_70%_50%)] hover:bg-[hsl(38_70%_50%/0.1)] transition-colors text-center"
                >
                  Yes, send overview
                </button>
                <button
                  onClick={() => handleOverviewChoice(false)}
                  className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-foreground/50 hover:text-foreground/70 transition-colors text-center"
                >
                  No, shred it all
                </button>
              </div>
            </motion.div>
          )}

      {/* ── Morning Sunrise Greeting ── */}
      {showMorningSunrise && (
        <MorningSunrise
          userName={userName}
          companionName={connections?.[0]?.name}
          companionAvatarUrl={connections?.[0]?.avatarUrl || undefined}
          onComplete={() => setShowMorningSunrise(false)}
        />
      )}


          {/* Companion picker */}
          <AnimatePresence>
            {showCompanionPicker && connections && connections.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mb-4 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/10 p-4"
              >
                <p className="text-xs font-medium text-foreground/70 mb-3">Which companion should receive this?</p>
                <div className="flex flex-col gap-2">
                  {connections.map(c => (
                    <button
                      key={c.memberId}
                      onClick={() => handleShareWithCompanion(c.name)}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left hover:bg-white/10 transition-colors"
                    >
                      {c.avatarUrl
                        ? <img src={c.avatarUrl} className="h-8 w-8 rounded-full object-cover shrink-0" />
                        : <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0"><span className="text-xs text-primary">{c.name[0]}</span></div>
                      }
                      <span className="text-sm font-medium text-foreground">{c.name}</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowCompanionPicker(false)} className="mt-3 w-full text-[11px] text-foreground/30 hover:text-foreground/50 transition-colors">
                  Cancel
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* "Held with care" whisper confirmation */}
      <AnimatePresence>
        {showWhisper && (
          <div
            key="whisper"
            className="fixed left-1/2 bottom-[80px] z-50 pointer-events-none font-serif italic text-[0.9rem] tracking-wide"
            style={{
              color: 'hsl(38 70% 50%)',
              animation: 'whisper-up 2.5s ease-out forwards',
            }}
          >
            Held with care
          </div>
        )}
      </AnimatePresence>

      {/* Companion handover acknowledgment whisper */}
      <AnimatePresence>
        {showHandoverWhisper && (
          <motion.div
            key="handover-whisper"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.6 }}
            className="fixed left-1/2 -translate-x-1/2 bottom-[100px] z-50 pointer-events-none max-w-[280px] text-center"
          >
            <div className="rounded-2xl border border-primary/15 bg-black/70 backdrop-blur-xl px-5 py-3.5"
              style={{ boxShadow: '0 8px 32px -8px hsl(var(--primary) / 0.2)' }}>
              <p className="text-[13px] text-foreground/70 leading-relaxed" style={{ fontFamily: 'Georgia, serif' }}>
                I've received what you shared from the stillness. I'm holding it with care. When you're ready, we can talk about it.
              </p>
              <p className="text-[10px] text-primary/50 mt-1.5 font-medium">— {showHandoverWhisper}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* "Space Unlocked" first-entry whisper */}
      <AnimatePresence>
        {spaceUnlockedWhisper && (
          <motion.div
            key="space-unlocked"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.6 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none font-serif italic text-[0.95rem] tracking-wide whitespace-nowrap"
            style={{
              color: 'hsl(var(--primary))',
              textShadow: '0 0 20px hsl(var(--primary) / 0.4)',
            }}
          >
            Space Unlocked ✨
          </motion.div>
        )}
      </AnimatePresence>

      </motion.div>
    </motion.div>
  );
}
