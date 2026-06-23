import { useRef, useEffect, useState, useCallback, useMemo, PointerEvent as ReactPointerEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronUp, ChevronDown, Mic, MicOff, Send, X, Image, Monitor, Share2 } from 'lucide-react';
import LinkEmbed, { extractUrl, getTextWithoutUrl } from '@/components/LinkEmbed';
import { sfxMessageSent } from '@/hooks/useAppSfx';
import VisionDrawer from './VisionDrawer';

/* ── Auto-join: remember that user has joined audio before ── */
const AUDIO_JOINED_KEY = 'circle-audio-joined';

interface CircleMessage {
  id: string;
  circle_id: string;
  user_id: string;
  sender_name: string;
  sender_type: string;
  content: string;
  created_at: string;
}

type SensitivityPreset = 'low' | 'med' | 'high';

const SENSITIVITY_PRESETS: { key: SensitivityPreset; label: string; value: number }[] = [
  { key: 'low', label: 'Low', value: 20 },
  { key: 'med', label: 'Med', value: 50 },
  { key: 'high', label: 'High', value: 80 },
];

function MiniWaveform({ amplitude, active, muted }: { amplitude: number; active: boolean; muted?: boolean }) {
  const bars = 5;
  const heights = useMemo(() => {
    if (muted || !active) return Array(bars).fill(3);
    // Boost sensitivity: square-root curve so low amplitudes are more visible
    const boosted = Math.sqrt(amplitude) * 1.4;
    return Array.from({ length: bars }, (_, i) => {
      const phase = Math.sin((i / bars) * Math.PI);
      return 3 + boosted * 18 * phase + boosted * Math.random() * 6;
    });
  }, [Math.round(amplitude * 30), active, muted]); // finer bucket = more responsive

  return (
    <div className="flex items-center justify-center gap-[2.5px] h-6">
      {heights.map((h, i) => (
        <motion.div
          key={i}
          className={`w-[3px] rounded-full ${muted ? 'bg-muted-foreground/30' : active ? 'bg-primary-foreground' : 'bg-muted-foreground/40'}`}
          animate={{ height: h }}
          transition={{ type: 'spring', damping: 10, stiffness: 260 }}
        />
      ))}
    </div>
  );
}

interface TranscriptSheetProps {
  messages: CircleMessage[];
  currentUserId: string;
  isOwner: boolean;
  companionTypingName?: string | null;
  onDeleteMessage: (id: string) => void;
  circleEmoji?: string;
  input: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  sending: boolean;
  participantCount?: number;
  isAudioJoined?: boolean;
  isMuted?: boolean;
  onToggleMute?: () => void;
  isSpeaking?: boolean;
  /** Current amplitude 0-1 from VAD */
  amplitude?: number;
  /** Current sensitivity level 0-100 */
  sensitivityLevel?: number;
  /** Called when user changes sensitivity from quick toggle */
  onSensitivityChange?: (level: number) => void;
  /** Called to request joining audio (for auto-join) */
  onJoinAudio?: () => void;
  /** Called when user taps re-live on a vision */
  onReLiveAtmosphere?: (gradient: string) => void;
  /** Whether presentation mode is active */
  isPresenting?: boolean;
  /** Called to toggle presentation mode */
  onTogglePresent?: () => void;
  /** Called when user taps invite */
  onInvite?: () => void;
}

export default function TranscriptSheet({
  messages,
  currentUserId,
  isOwner,
  companionTypingName,
  onDeleteMessage,
  circleEmoji,
  input,
  onInputChange,
  onSend,
  sending,
  participantCount = 0,
  isAudioJoined = false,
  isMuted = false,
  onToggleMute,
  isSpeaking = false,
  amplitude = 0,
  sensitivityLevel = 50,
  onSensitivityChange,
  onJoinAudio,
  onReLiveAtmosphere,
  isPresenting = false,
  onTogglePresent,
  onInvite,
}: TranscriptSheetProps) {
  const [expanded, setExpanded] = useState(false);
  const [minimized, setMinimized] = useState(false);
  
  const [showVisionDrawer, setShowVisionDrawer] = useState(false);
  const [showSensitivity, setShowSensitivity] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const handleMutePointerDown = useCallback(() => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setShowSensitivity(prev => !prev);
    }, 500);
  }, []);

  const handleMutePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (!didLongPress.current) {
      onToggleMute?.();
    }
  }, [onToggleMute]);

  const handleMutePointerLeave = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Auto-join: if user joined audio before, auto-join in muted state
  useEffect(() => {
    if (isAudioJoined) {
      localStorage.setItem(AUDIO_JOINED_KEY, '1');
    }
  }, [isAudioJoined]);

  useEffect(() => {
    if (!isAudioJoined && localStorage.getItem(AUDIO_JOINED_KEY) === '1' && onJoinAudio) {
      onJoinAudio();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTextSend = useCallback(() => {
    if (!input.trim() || sending) return;
    sfxMessageSent();
    onSend();
  }, [input, sending, onSend]);

  useEffect(() => {
    if (expanded && scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages.length, expanded]);

  const drawerHeight = expanded ? '40dvh' : '0px';

  return (
    <div className="absolute bottom-0 left-0 right-0 z-[35] flex flex-col pointer-events-none">
      {/* Minimized state — floating restore pill */}
      {minimized && (
        <button
          onClick={() => setMinimized(false)}
          className="fixed bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-4 py-1.5 rounded-full bg-card/80 border border-border/40 shadow-lg pointer-events-auto z-40"
          style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
        >
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10px] font-medium text-muted-foreground">Chat</span>
        </button>
      )}

      {!minimized && (
        <>
          {/* ═══ EXPANDABLE DRAWER (transcript history) ═══ */}
          <motion.div
            className="rounded-t-3xl overflow-hidden bg-card/60 flex flex-col"
            animate={{ height: drawerHeight }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            style={{
              backdropFilter: 'blur(32px) saturate(180%)',
              WebkitBackdropFilter: 'blur(32px) saturate(180%)',
            }}
          >
            {expanded && (
              <>
                {/* Minimize button */}
                <button
                  onClick={() => setMinimized(true)}
                  className="absolute top-2 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-muted/60 border border-border/30 text-muted-foreground hover:text-foreground transition-colors z-10 pointer-events-auto"
                  title="Minimize"
                >
                  <X className="h-3 w-3" />
                </button>

                <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 pb-6 space-y-3 pointer-events-auto">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-8 text-center">
                      <span className="text-2xl">{circleEmoji || '🫧'}</span>
                      <p className="text-xs text-muted-foreground">No messages yet</p>
                    </div>
                  ) : (
                    messages.map(msg => {
                      const isMe = msg.user_id === currentUserId && msg.sender_type !== 'companion';
                      const isCompanion = msg.sender_type === 'companion';
                      const linkUrl = extractUrl(msg.content);
                      const displayText = linkUrl ? getTextWithoutUrl(msg.content, linkUrl) : msg.content;

                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 16, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ type: 'spring', damping: 28, stiffness: 180, delay: 0.06 }}
                          className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2 group`}
                        >
                          {!isMe && (
                            <div className="shrink-0 mt-auto mb-1">
                              {isCompanion ? (
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 border border-accent/30 shadow-sm">
                                  <Sparkles className="h-3 w-3 text-accent" />
                                </div>
                              ) : (
                                <div className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-muted-foreground bg-secondary shadow-sm">
                                  {msg.sender_name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                          )}
                          <div className="relative max-w-[78%]">
                            <div className={`rounded-2xl px-3.5 py-2.5 shadow-sm ${
                              isMe
                                ? 'rounded-br-sm bg-primary/15 border border-primary/20 backdrop-blur-sm'
                                : isCompanion
                                  ? 'rounded-bl-sm bg-accent/10 border border-accent/15 backdrop-blur-sm'
                                  : 'rounded-bl-sm glass-card'
                            }`}>
                              {!isMe && (
                                <p className={`text-[10px] font-semibold mb-0.5 tracking-wide uppercase ${isCompanion ? 'text-accent' : 'text-primary/80'}`}>
                                  {msg.sender_name} {isCompanion ? '✨' : ''}
                                </p>
                              )}
                              {displayText && <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-foreground">{displayText}</p>}
                              {linkUrl && <LinkEmbed url={linkUrl} compact />}
                              {msg.content.match(/\[📸 Photo\]\((https?:\/\/[^\s)]+)\)/) && (() => {
                                const imgMatch = msg.content.match(/\[📸 Photo\]\((https?:\/\/[^\s)]+)\)/);
                                return imgMatch ? (
                                  <img src={imgMatch[1]} alt="Shared photo" className="mt-1.5 rounded-lg max-w-full max-h-48 object-cover border border-border/20" loading="lazy" />
                                ) : null;
                              })()}
                            </div>
                            <p className={`text-[9px] mt-0.5 px-1 text-muted-foreground/50 ${isMe ? 'text-right' : 'text-left'}`}>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {(isMe || isOwner || (isCompanion && msg.user_id === currentUserId)) && (
                              <button onClick={() => onDeleteMessage(msg.id)} className="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 active:opacity-100 focus:opacity-100 sm:transition-opacity flex h-5 w-5 items-center justify-center rounded-full bg-muted/80 backdrop-blur-sm border border-border/30 text-muted-foreground hover:text-foreground hover:bg-muted touch-manipulation md:opacity-0 opacity-70">
                                <X className="h-2.5 w-2.5" />
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })
                  )}

                  {companionTypingName && (
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 border border-accent/30">
                        <Sparkles className="h-3 w-3 text-accent" />
                      </div>
                      <div className="rounded-2xl px-3 py-2 glass-card rounded-bl-md">
                        <p className="text-[10px] text-accent font-semibold mb-0.5">{companionTypingName} ✨</p>
                        <div className="flex gap-1">
                          <div className="h-1.5 w-1.5 rounded-full bg-accent/50 animate-pulse" />
                          <div className="h-1.5 w-1.5 rounded-full bg-accent/50 animate-pulse" style={{ animationDelay: '0.2s' }} />
                          <div className="h-1.5 w-1.5 rounded-full bg-accent/50 animate-pulse" style={{ animationDelay: '0.4s' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>

          {/* ═══ PERSISTENT STRIP — always visible ═══ */}
          <div
            className="bg-card/70 border-t border-border/20 pointer-events-auto"
            style={{
              backdropFilter: 'blur(32px) saturate(180%)',
              WebkitBackdropFilter: 'blur(32px) saturate(180%)',
            }}
          >
            {/* Drawer handle — prominent tappable area */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex flex-col items-center py-2 active:bg-muted/20 transition-colors touch-manipulation"
            >
              <div className="h-1 w-10 rounded-full bg-foreground/25 mb-1" />
              <div className="flex items-center gap-1">
                {expanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span className="text-[10px] font-medium text-muted-foreground">
                  {expanded ? 'Hide chat' : messages.length > 0 ? `${messages.length} message${messages.length !== 1 ? 's' : ''}` : 'Chat'}
                </span>
              </div>
            </button>

            {/* Latest message peek when collapsed */}
            {!expanded && messages.length > 0 && (
              <div className="px-4 pb-1.5 overflow-hidden">
                {companionTypingName ? (
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-accent shrink-0" />
                    <span className="text-[11px] font-semibold text-accent">{companionTypingName}</span>
                    <div className="flex gap-0.5 items-center">
                      <div className="h-1 w-1 rounded-full bg-accent/60 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '0.8s' }} />
                      <div className="h-1 w-1 rounded-full bg-accent/60 animate-bounce" style={{ animationDelay: '150ms', animationDuration: '0.8s' }} />
                      <div className="h-1 w-1 rounded-full bg-accent/60 animate-bounce" style={{ animationDelay: '300ms', animationDuration: '0.8s' }} />
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground truncate leading-tight">
                    <span className="font-semibold text-foreground/70">{messages[messages.length - 1].sender_name}:</span>{' '}
                    {messages[messages.length - 1].content.slice(0, 50)}
                  </p>
                )}
              </div>
            )}

            {/* Control row: Mute + Waveform | Input pill | Gallery/Present/Invite */}
            <div className="flex items-center gap-1 [@media(min-width:380px)]:gap-1.5 px-2 [@media(min-width:380px)]:px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-1">
              {/* Mute button + inline waveform */}
              {/* Mute + long-press sensitivity */}
              <div className="relative shrink-0">
                <button
                  onPointerDown={handleMutePointerDown}
                  onPointerUp={handleMutePointerUp}
                  onPointerLeave={handleMutePointerLeave}
                  className="flex items-center justify-center touch-manipulation select-none"
                >
                  <div className={`flex h-8 [@media(min-width:380px)]:h-9 items-center gap-1 rounded-full px-1.5 [@media(min-width:380px)]:px-2 transition-colors ${
                    !isAudioJoined
                      ? 'bg-muted/40 border border-border/30'
                      : isMuted
                        ? 'bg-destructive/20 border border-destructive/40'
                        : 'bg-primary/20 border border-primary/30'
                  }`}>
                    {!isAudioJoined || isMuted ? (
                      <MicOff className={`h-3.5 w-3.5 [@media(min-width:380px)]:h-4 [@media(min-width:380px)]:w-4 ${isMuted ? 'text-destructive' : 'text-muted-foreground'}`} />
                    ) : (
                      <Mic className="h-3.5 w-3.5 [@media(min-width:380px)]:h-4 [@media(min-width:380px)]:w-4 text-primary" />
                    )}
                    <div className="hidden [@media(min-width:340px)]:block">
                      <MiniWaveform amplitude={amplitude} active={isAudioJoined && !isMuted && (isSpeaking || amplitude > 0.02)} muted={!isAudioJoined || isMuted} />
                    </div>
                  </div>
                </button>

                {/* Sensitivity presets popup */}
                <AnimatePresence>
                  {showSensitivity && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.9 }}
                      transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                      className="absolute bottom-full left-0 mb-2 flex gap-1 rounded-xl bg-card/90 border border-border/40 px-2 py-1.5 shadow-lg z-50"
                      style={{ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
                    >
                      {SENSITIVITY_PRESETS.map(p => {
                        const isActive = Math.abs(sensitivityLevel - p.value) < 10;
                        return (
                          <button
                            key={p.key}
                            onClick={() => { onSensitivityChange?.(p.value); setShowSensitivity(false); }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                              isActive
                                ? 'bg-primary/20 text-primary border border-primary/30'
                                : 'text-muted-foreground hover:bg-muted/40'
                            }`}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Compact message input pill */}
              <div className="flex-1 flex items-center gap-1 [@media(min-width:380px)]:gap-1.5 rounded-full bg-muted/30 border border-border/30 px-2 [@media(min-width:380px)]:px-3 py-1.5 min-w-0">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => onInputChange(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleTextSend();
                    }
                  }}
                  placeholder="Message…"
                  maxLength={1000}
                  className="flex-1 min-w-0 bg-transparent text-xs [@media(min-width:380px)]:text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                />
                <button
                  onClick={(e) => { e.stopPropagation(); handleTextSend(); }}
                  disabled={!input.trim() || sending}
                  className="shrink-0 flex h-6 w-6 [@media(min-width:380px)]:h-7 [@media(min-width:380px)]:w-7 items-center justify-center rounded-full gradient-primary transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
                >
                  <Send className="h-3 w-3 [@media(min-width:380px)]:h-3.5 [@media(min-width:380px)]:w-3.5 text-primary-foreground" />
                </button>
              </div>

              {/* Gallery */}
              <button onClick={() => setShowVisionDrawer(true)} className="shrink-0 flex items-center justify-center">
                <div className="flex h-7 w-7 [@media(min-width:380px)]:h-8 [@media(min-width:380px)]:w-8 items-center justify-center rounded-full bg-muted/40 border border-border/30 transition-colors hover:bg-muted/60">
                  <Image className="h-3.5 w-3.5 [@media(min-width:380px)]:h-4 [@media(min-width:380px)]:w-4 text-muted-foreground" />
                </div>
              </button>

              {/* Present — hidden on very narrow screens */}
              {onTogglePresent && (
                <button onClick={onTogglePresent} className="shrink-0 hidden [@media(min-width:360px)]:flex items-center justify-center">
                  <div className={`relative flex h-7 w-7 [@media(min-width:380px)]:h-8 [@media(min-width:380px)]:w-8 items-center justify-center rounded-full transition-colors ${
                    isPresenting ? 'bg-primary/20 border border-primary/30' : 'bg-muted/40 border border-border/30 hover:bg-muted/60'
                  }`}>
                    <Monitor className={`h-3.5 w-3.5 [@media(min-width:380px)]:h-4 [@media(min-width:380px)]:w-4 ${isPresenting ? 'text-primary' : 'text-muted-foreground'}`} />
                    {isPresenting && (
                      <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-primary">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground animate-pulse" />
                      </span>
                    )}
                  </div>
                </button>
              )}

              {/* Invite */}
              {onInvite && (
                <button onClick={onInvite} className="shrink-0 flex items-center justify-center">
                  <div className="flex h-7 w-7 [@media(min-width:380px)]:h-8 [@media(min-width:380px)]:w-8 items-center justify-center rounded-full bg-primary/20 border border-primary/30 transition-colors hover:bg-primary/30">
                    <Share2 className="h-3.5 w-3.5 [@media(min-width:380px)]:h-4 [@media(min-width:380px)]:w-4 text-primary" />
                  </div>
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Vision History Drawer */}
      <VisionDrawer
        open={showVisionDrawer}
        onOpenChange={setShowVisionDrawer}
        onReLive={onReLiveAtmosphere}
      />
    </div>
  );
}
