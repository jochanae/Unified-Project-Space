import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { logger } from '@/utils/logger';
import { PhoneOff, Mic, MicOff, Volume2, VolumeOff, Sparkles, Loader2, Phone, Camera, X } from 'lucide-react';
import { useConversation } from '@elevenlabs/react';
import AbstractAvatar from '@/components/AbstractAvatar';
import AnimatedPortrait from '@/components/AnimatedPortrait';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sfxRingStart, sfxRingStop, sfxCallConnected, sfxCallEnded } from '@/hooks/useAppSfx';
import { getPortraitAnimationsEnabled } from '@/hooks/usePortraitAnimations';

export type CallTranscriptEntry = { role: 'user' | 'assistant'; content: string };

interface VoiceCallStageProps {
  open: boolean;
  autoStart?: boolean;
  onClose: () => void;
  companionName: string;
  companionAvatarUrl?: string | null;
  memberId: string;
  userId: string;
  userName: string;
  namePronunciation?: string;
  companionGender: 'male' | 'female' | 'neutral';
  companionPersonality?: string;
  companionBio?: string;
  companionVibe?: string;
  voiceId?: string;
  isMinor?: boolean;
  backstory?: string;
  originStory?: string;
  personalityTraits?: Record<string, any>;
  communicationStyle?: string;
  connectionMode?: string;
  relationshipLevel?: number;
  matureMode?: boolean;
  onCallComplete?: (transcript: CallTranscriptEntry[], durationSeconds: number) => void;
}

export default function VoiceCallStage({
  open, autoStart, onClose, companionName, companionAvatarUrl, memberId, userId,
  userName, namePronunciation, companionGender, companionPersonality, companionBio,
  companionVibe, voiceId, isMinor, backstory, originStory, personalityTraits, communicationStyle,
  connectionMode, relationshipLevel, matureMode, onCallComplete,
}: VoiceCallStageProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [camActive, setCamActive] = useState(false);
  const [speakerOff, setSpeakerOff] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const warningFiredRef = useRef(false);
  const portraitAnimEnabled = getPortraitAnimationsEnabled();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const consecutiveAgentResponsesRef = useRef(0);
  const forceEndRef = useRef<(() => void) | null>(null);
  const scheduleSilenceTimerRef = useRef<(() => void) | null>(null);
  const flushedRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptRef = useRef<CallTranscriptEntry[]>([]);
  const callDurationRef = useRef(0);
  const onCallCompleteRef = useRef<typeof onCallComplete>(onCallComplete);
  const userIdRef = useRef(userId);
  useEffect(() => { onCallCompleteRef.current = onCallComplete; }, [onCallComplete]);
  useEffect(() => { userIdRef.current = userId; }, [userId]);
  useEffect(() => { callDurationRef.current = callDuration; }, [callDuration]);

  const conversation = useConversation({
    onConnect: () => {
      logger.log('[VoiceCall] Connected to companion');
      sfxCallConnected();
      transcriptRef.current = [];
      consecutiveAgentResponsesRef.current = 0;
      flushedRef.current = false;
      // First-call heads-up about the 10-minute per-call limit (once per user)
      try {
        if (typeof window !== 'undefined' && !localStorage.getItem('voice_call_intro_seen')) {
          localStorage.setItem('voice_call_intro_seen', '1');
          setTimeout(() => {
            toast('Heads up — each voice call runs up to 10 minutes. I\'ll warn you before time\'s up.', { icon: '⏱', duration: 7000 });
          }, 1500);
        }
      } catch {}
      timerRef.current = setInterval(() => {
        setCallDuration(d => {
          const next = d + 1;
          // Per-call warnings (10-min session cap)
          if (next === 480) toast('2 minutes left in this call.', { icon: '⏱', duration: 5000 });
          else if (next === 540) toast('1 minute left — call will end soon.', { icon: '⏱', duration: 5000 });
          return next;
        });
        setRemainingSeconds(prev => {
          if (prev === null) return null;
          const next = Math.max(0, prev - 1);
          if (!warningFiredRef.current && prev > 600 && next <= 600) {
            warningFiredRef.current = true;
            toast('You have 10 minutes of voice time left this month.', { icon: '⏱', duration: 8000 });
          }
          return next;
        });
      }, 1000);
    },
    onDisconnect: () => {
      logger.log('[VoiceCall] Disconnected');
      sfxCallEnded();
      if (timerRef.current) clearInterval(timerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      // Flush transcript + record duration regardless of who ended the call.
      // Guarded so user-initiated endCall (which also flushes) doesn't double-fire.
      if (!flushedRef.current) {
        flushedRef.current = true;
        const transcript = [...transcriptRef.current];
        const duration = callDurationRef.current;
        if (duration > 0 && userIdRef.current) {
          supabase.functions.invoke('record-voice-duration', {
            body: { durationSeconds: duration },
          }).catch((err) => console.error('[VoiceCall] Failed to record duration:', err));
        }
        if (transcript.length > 0 && onCallCompleteRef.current) {
          onCallCompleteRef.current(transcript, duration);
        }
      }
      setCallDuration(0);
    },
    onMessage: (message: any) => {
      if (message.type === 'user_transcript' && message.user_transcription_event?.user_transcript) {
        transcriptRef.current.push({ role: 'user', content: message.user_transcription_event.user_transcript });
        consecutiveAgentResponsesRef.current = 0;
        scheduleSilenceTimerRef.current?.();
      } else if (message.type === 'agent_response' && message.agent_response_event?.agent_response) {
        transcriptRef.current.push({ role: 'assistant', content: message.agent_response_event.agent_response });
        consecutiveAgentResponsesRef.current += 1;
        if (consecutiveAgentResponsesRef.current >= 15) {
          toast.info('Taking a break — tap to reconnect when ready', { duration: 5000 });
          forceEndRef.current?.();
        }
      }
    },
    onError: (error) => {
      console.error('[VoiceCall] Error:', error);
      sfxRingStop();
      toast.error('Voice call connection failed. Please try again.');
      setIsConnecting(false);
    },
  });

  const startCall = useCallback(async () => {
    setIsConnecting(true);
    // If we were auto-started from an incoming-call accept, the user already heard
    // the ringtone — don't layer another dial tone on top.
    if (!autoStart) sfxRingStart();
    try {
      // Request mic with noise suppression + echo cancellation so background noise
      // doesn't confuse the companion mid-call.
      await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const defaultVoices: Record<string, string> = {
        male: 'TX3LPaxmHKxFdv7VOQHJ',
        female: 'EXAVITQu4vr4xnSDxMaL',
        neutral: 'SAz9YHcvj6GT2YYXdXww',
      };
      const resolvedVoiceId = voiceId || defaultVoices[companionGender] || defaultVoices.neutral;
      if (!voiceId) {
        logger.warn(`[VoiceCall] No voiceId for ${companionName} — falling back to default ${companionGender} voice`);
      }

      // Fetch recent chat context for greeting — include timestamps for recency awareness
      let recentContext = '';
      try {
        const { data: recentMsgs } = await supabase
          .from('chat_messages')
          .select('role, content, created_at')
          .eq('member_id', memberId)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(6);
        if (recentMsgs && recentMsgs.length > 0) {
          const now = new Date();
          recentContext = recentMsgs
            .reverse()
            .map(m => {
              const msgDate = new Date(m.created_at);
              const diffMs = now.getTime() - msgDate.getTime();
              const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
              const diffDays = Math.floor(diffHours / 24);
              let timeAgo = '';
              if (diffDays > 0) timeAgo = `(${diffDays} day${diffDays > 1 ? 's' : ''} ago)`;
              else if (diffHours > 0) timeAgo = `(${diffHours}h ago)`;
              else timeAgo = '(just now)';
              return `${m.role} ${timeAgo}: ${m.content.slice(0, 120)}`;
            })
            .join('\n');
        }
      } catch { /* continue without context */ }

      const { data, error } = await supabase.functions.invoke('elevenlabs-conversation-token', {
        body: {
          voiceId: resolvedVoiceId,
          memberId,
          companionName,
          companionPersonality,
          companionBio,
          userName,
          namePronunciation,
          isMinor,
          recentChatContext: recentContext,
          backstory,
          originStory,
          personalityTraits,
          communicationStyle,
          connectionMode: connectionMode || 'friend',
          relationshipLevel: relationshipLevel || 1,
          companionGender,
          vibe: companionVibe,
          matureMode: matureMode === true,
        },
      });

      // Handle voice limit / trial errors
      if (data?.error === 'voice_limit_reached' || data?.error === 'voice_trial_expired' || data?.error === 'trial_exhausted' || data?.error === 'monthly_cap_reached') {
        sfxRingStop();
        toast.error(data.message || 'Voice call limit reached.', { duration: 6000 });
        setIsConnecting(false);
        return;
      }

      // Store remaining seconds for premium cap display
      if (data?.remaining_seconds !== undefined) {
        setRemainingSeconds(data.remaining_seconds);
        warningFiredRef.current = false;
      }

      if (error || (!data?.signed_url && !data?.token)) {
        const msg = data?.message || 'Voice calls require additional setup.';
        toast.error(msg, { duration: 5000 });
        setIsConnecting(false);
        return;
      }

      if (data.token) {
        await conversation.startSession({
          conversationToken: data.token,
          connectionType: 'webrtc',
        });
      } else if (data.signed_url) {
        await conversation.startSession({
          signedUrl: data.signed_url,
        });
      }
    } catch (err) {
      console.error('[VoiceCall] Failed to start:', err);
      toast.error('Could not start voice call. Check microphone permissions.');
    } finally {
      setIsConnecting(false);
    }
  }, [conversation, voiceId, companionName, companionPersonality, companionBio, userName, namePronunciation, isMinor, memberId, companionGender]);

  const isConnected = conversation.status === 'connected';
  const isSpeaking = conversation.isSpeaking;

  // Auto-start the call when launched from an accepted incoming-call ring
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (open && autoStart && !autoStartedRef.current && !isConnected && !isConnecting) {
      autoStartedRef.current = true;
      startCall();
    }
    if (!open) autoStartedRef.current = false;
  }, [open, autoStart, isConnected, isConnecting, startCall]);

  const scheduleSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      silenceTimerRef.current = null;
      (conversation as any).sendMessage?.("I'm still here when you're ready — say something when you'd like to continue.");
      toast.info("Still listening — say something when you're ready", { duration: 3000 });
    }, 30000);
  }, [conversation]);

  useEffect(() => {
    scheduleSilenceTimerRef.current = scheduleSilenceTimer;
    return () => { scheduleSilenceTimerRef.current = null; };
  }, [scheduleSilenceTimer]);

  useEffect(() => {
    if (isConnected && !isSpeaking) {
      scheduleSilenceTimer();
    } else {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    }
    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };
  }, [isConnected, isSpeaking, scheduleSilenceTimer]);

  const endCall = useCallback(async () => {
    const transcript = [...transcriptRef.current];
    const duration = callDuration;
    // Claim the flush slot before onDisconnect fires so we don't double-record
    flushedRef.current = true;
    // Forcefully terminate: interrupt any in-progress speech, stop all streams, end session
    (conversation as any).interrupt?.();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    await conversation.endSession();
    setCallDuration(0);

    // Record voice duration server-side (handles both free trial + premium tracking)
    if (duration > 0 && userId) {
      supabase.functions.invoke('record-voice-duration', {
        body: { durationSeconds: duration },
      }).then((res) => {
        if (res.data?.warning) {
          toast('You\'re approaching your monthly voice limit — 10 minutes remaining.', { icon: '⏱', duration: 6000 });
        }
      }, (err) => {
        console.error('[VoiceCall] Failed to record duration:', err);
      });
    }

    if (transcript.length > 0 && onCallComplete) {
      onCallComplete(transcript, duration);
    }
    onClose();
  }, [conversation, onClose, callDuration, onCallComplete]);

  useEffect(() => {
    forceEndRef.current = endCall;
    return () => { forceEndRef.current = null; };
  }, [endCall]);

  const toggleSpeaker = useCallback(() => {
    const next = !speakerOff;
    setSpeakerOff(next);
    conversation.setVolume({ volume: next ? 0 : 1 });
  }, [speakerOff, conversation]);

  const toggleSelfView = useCallback(async () => {
    if (camActive && streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setCamActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCamActive(true);
      } catch {
        toast.error('Camera access denied');
      }
    }
  }, [camActive]);

  useEffect(() => {
    return () => {
      sfxRingStop();
      if (timerRef.current) clearInterval(timerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    logger.log('[VoiceCall] isSpeaking:', isSpeaking, '| isConnected:', isConnected);
  }, [isSpeaking, isConnected]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col bg-black"
      >
        {/* Full-screen companion background */}
        <div className="absolute inset-0">
          {companionAvatarUrl ? (
            <AnimatedPortrait
              src={companionAvatarUrl}
              alt={companionName}
              isSpeaking={isSpeaking}
              enabled={portraitAnimEnabled}
              className="h-[100dvh] w-screen !rounded-none"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-black">
              <AbstractAvatar memberId={memberId} size="lg" />
            </div>
          )}
        </div>

        {/* Top gradient overlay */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 to-transparent z-10 pointer-events-none" />

        {/* Bottom gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/85 to-transparent z-10 pointer-events-none" />

        {/* Top bar — overlaid */}
        <div className="relative z-20 flex items-center justify-between px-5 pt-12 pb-4">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm">
            {isConnected ? (
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            ) : (
              <div className="h-2 w-2 rounded-full bg-amber-400" />
            )}
            <span className="text-xs font-medium text-white/80">
              {isConnected
                ? `Voice Call · ${companionName}`
                : isConnecting
                  ? 'Connecting…'
                  : `Call ${companionName}`}
            </span>
            {isConnected && (
              <span className="text-xs text-white/50 font-mono tabular-nums ml-1">
                {formatTime(callDuration)}
              </span>
            )}
            {isConnected && remainingSeconds !== null && (
              <span className={`text-[10px] font-medium ml-1.5 px-1.5 py-0.5 rounded-full ${
                remainingSeconds <= 600
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-white/10 text-white/50'
              }`}>
                {Math.floor(remainingSeconds / 60)}m left
              </span>
            )}
          </div>

          {!isConnected && !isConnecting && (
            <button
              onClick={onClose}
              className="rounded-full p-2 text-white/50 hover:text-white/80 hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Voice-only — camera self-view intentionally disabled */}


        {/* Spacer to push controls to bottom */}
        <div className="flex-1" />

        {/* Speaking/Listening indicator — above controls */}
        <div className="relative z-20 flex items-center justify-center pb-4">
          <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-black/30 backdrop-blur-sm">
            {isSpeaking ? (
              <>
                <div className="flex items-end gap-0.5 h-4">
                  {[0, 1, 2, 3, 4].map(i => (
                    <motion.div
                      key={i}
                      className="w-1 rounded-full bg-accent"
                      animate={{ height: ['4px', `${12 + Math.random() * 8}px`, '4px'] }}
                      transition={{ repeat: Infinity, duration: 0.5 + Math.random() * 0.3, delay: i * 0.1 }}
                    />
                  ))}
                </div>
                <span className="text-xs text-white/70 font-medium ml-1">{companionName} is speaking…</span>
              </>
            ) : isConnected ? (
              <>
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                <span className="text-xs text-white/70 font-medium">{companionName} is listening…</span>
              </>
            ) : (
              <span className="text-xs text-white/50 font-medium">
                {isConnecting ? 'Setting up voice call…' : 'Tap call to start'}
              </span>
            )}
          </div>
        </div>

        {/* Call controls — 3 buttons: Mic, End/Start, Speaker */}
        <div className="relative z-20 flex items-center justify-center gap-6 pb-12 pt-2">
          <button
            onClick={() => {
              const next = !micMuted;
              setMicMuted(next);
              // Actually mute/unmute the microphone input
              try {
                (conversation as any).setMicrophoneEnabled?.(!next);
              } catch { /* fallback: some SDK versions may not support this */ }
            }}
            className={`flex h-14 w-14 items-center justify-center rounded-full backdrop-blur-sm transition-all ${
              micMuted ? 'bg-white/25 ring-1 ring-white/20' : 'bg-white/15'
            }`}
          >
            {micMuted ? <MicOff className="h-6 w-6 text-white" /> : <Mic className="h-6 w-6 text-white" />}
          </button>

          {isConnected ? (
            <button
              onClick={endCall}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg shadow-destructive/30 hover:bg-destructive/90 transition-all active:scale-95"
            >
              <PhoneOff className="h-7 w-7" />
            </button>
          ) : (
            <button
              onClick={startCall}
              disabled={isConnecting}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition-all active:scale-95 disabled:opacity-50"
            >
              {isConnecting ? (
                <Loader2 className="h-7 w-7 animate-spin" />
              ) : (
                <Phone className="h-7 w-7" />
              )}
            </button>
          )}

          <button
            onClick={toggleSpeaker}
            className={`flex h-14 w-14 items-center justify-center rounded-full backdrop-blur-sm transition-all ${
              speakerOff ? 'bg-white/25 ring-1 ring-white/20' : 'bg-white/15'
            }`}
          >
            {speakerOff ? <VolumeOff className="h-6 w-6 text-white" /> : <Volume2 className="h-6 w-6 text-white" />}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
