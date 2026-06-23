import { useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Minimize2, Send, Sparkles } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import LinkEmbed, { extractUrl, getTextWithoutUrl } from '@/components/LinkEmbed';

interface CircleMessage {
  id: string;
  circle_id: string;
  user_id: string;
  sender_name: string;
  sender_type: string;
  content: string;
  created_at: string;
}

interface Participant {
  id: string;
  name: string;
  avatar?: string | null;
  type: 'human' | 'companion';
}

interface SessionFocusModeProps {
  slides: string[];
  currentSlide: number;
  onSlideChange: (index: number) => void;
  mode: 'iframe' | 'image';
  isSpeaker: boolean;
  onExit: () => void;
  onStopPresenting?: () => void;
  // Chat
  messages: CircleMessage[];
  currentUserId: string;
  isOwner: boolean;
  companionTypingName?: string | null;
  onDeleteMessage: (id: string) => void;
  input: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  sending: boolean;
  // Participants
  participants: Participant[];
  speakingIds?: string[];
  presenterId?: string;
}

export default function SessionFocusMode({
  slides,
  currentSlide,
  onSlideChange,
  mode,
  isSpeaker,
  onExit,
  onStopPresenting,
  messages,
  currentUserId,
  isOwner,
  companionTypingName,
  onDeleteMessage,
  input,
  onInputChange,
  onSend,
  sending,
  participants,
  speakingIds = [],
  presenterId,
}: SessionFocusModeProps) {
  const isMobile = useIsMobile();
  const total = slides.length;
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const goPrev = useCallback(() => {
    if (currentSlide > 0) onSlideChange(currentSlide - 1);
  }, [currentSlide, onSlideChange]);

  const goNext = useCallback(() => {
    if (currentSlide < total - 1) onSlideChange(currentSlide + 1);
  }, [currentSlide, total, onSlideChange]);

  // Keyboard nav for speaker
  useEffect(() => {
    if (!isSpeaker) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isSpeaker, goPrev, goNext, onExit]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages.length]);

  const handleChatSend = useCallback(() => {
    if (!input.trim() || sending) return;
    onSend();
  }, [input, sending, onSend]);

  const currentUrl = slides[currentSlide] || '';
  const presenter = participants.find(p => p.id === presenterId);

  return (
    <motion.div
      className="fixed inset-0 z-40 flex bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* ═══ LEFT: Presentation area ═══ */}
      <div className={`relative flex flex-col ${isMobile ? 'w-full' : 'flex-1'}`}>
        {/* Presentation surface */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
          {mode === 'iframe' ? (
            <iframe
              src={currentUrl}
              title="Presentation"
              className="absolute inset-0 w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
              allow="fullscreen; autoplay"
            />
          ) : (
            <img
              src={currentUrl}
              alt={`Slide ${currentSlide + 1}`}
              className="max-w-full max-h-full object-contain"
              draggable={false}
            />
          )}

          {/* Exit focus mode */}
          <button
            onClick={onExit}
            className="absolute top-3 left-3 flex h-8 w-8 items-center justify-center rounded-full bg-card/70 border border-border/30 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:bg-card/90 transition-colors z-10"
            title="Exit Focus Mode"
          >
            <Minimize2 className="h-4 w-4" />
          </button>

          {/* Stop presenting — speaker only */}
          {isSpeaker && onStopPresenting && (
            <button
              onClick={onStopPresenting}
              className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-destructive/80 text-destructive-foreground hover:bg-destructive transition-colors z-10"
              title="Stop presenting"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Slide controls — speaker only */}
          {isSpeaker && total > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-full px-4 py-2 bg-card/70 border border-border/30 backdrop-blur-sm z-10">
              <button
                onClick={goPrev}
                disabled={currentSlide === 0}
                className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted/50 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-foreground" />
              </button>
              <span className="text-xs font-semibold text-foreground/80 tabular-nums min-w-[40px] text-center">
                {currentSlide + 1} / {total}
              </span>
              <button
                onClick={goNext}
                disabled={currentSlide === total - 1}
                className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted/50 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-foreground" />
              </button>
            </div>
          )}

          {/* Speaker pip */}
          {presenter && (
            <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full px-3 py-1.5 bg-card/70 border border-border/30 backdrop-blur-sm z-10">
              {presenter.avatar ? (
                <img src={presenter.avatar} referrerPolicy="no-referrer" alt="" className="h-6 w-6 rounded-full object-cover" />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                  {presenter.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-[11px] font-semibold text-foreground">{presenter.name}</span>
              <span className="text-[9px] text-primary bg-primary/15 rounded-full px-1.5 py-0.5 font-semibold">Presenting</span>
            </div>
          )}
        </div>

        {/* Participant row */}
        <div className="shrink-0 flex items-center gap-2 px-3 py-2 overflow-x-auto bg-card/80 border-t border-border/20 scrollbar-none">
          {participants.map(p => {
            const isSpeaking = speakingIds.includes(p.id);
            return (
              <div key={p.id} className="flex flex-col items-center gap-0.5 shrink-0">
                <div
                  className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-shadow ${
                    isSpeaking ? 'ring-2 ring-primary shadow-[0_0_12px_3px_hsl(var(--primary)/0.4)]' : ''
                  }`}
                >
                  {p.avatar ? (
                    <img src={p.avatar} referrerPolicy="no-referrer" alt="" className="h-9 w-9 rounded-full object-cover" />
                  ) : p.type === 'companion' ? (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/20 border border-accent/30">
                      <Sparkles className="h-4 w-4 text-accent" />
                    </div>
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-bold text-muted-foreground">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-muted-foreground max-w-[48px] truncate text-center">{p.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ RIGHT: Chat sidebar (desktop only) ═══ */}
      {!isMobile && (
        <div className="w-[320px] shrink-0 flex flex-col border-l border-border/20 bg-card/60 backdrop-blur-md">
          {/* Header */}
          <div className="shrink-0 px-4 py-3 border-b border-border/20">
            <h3 className="text-sm font-bold text-foreground">Chat</h3>
            <p className="text-[10px] text-muted-foreground">{messages.length} message{messages.length !== 1 ? 's' : ''}</p>
          </div>

          {/* Messages */}
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
            {messages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No messages yet</p>
            ) : (
              messages.map(msg => {
                const isMe = msg.user_id === currentUserId && msg.sender_type !== 'companion';
                const isCompanion = msg.sender_type === 'companion';
                const linkUrl = extractUrl(msg.content);
                const displayText = linkUrl ? getTextWithoutUrl(msg.content, linkUrl) : msg.content;

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-1.5 group`}
                  >
                    {!isMe && (
                      <div className="shrink-0 mt-auto mb-1">
                        {isCompanion ? (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 border border-accent/30">
                            <Sparkles className="h-2.5 w-2.5 text-accent" />
                          </div>
                        ) : (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-muted-foreground bg-secondary">
                            {msg.sender_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="relative max-w-[85%]">
                      <div className={`rounded-xl px-3 py-2 text-[12px] leading-relaxed ${
                        isMe
                          ? 'rounded-br-sm bg-primary/15 border border-primary/20'
                          : isCompanion
                            ? 'rounded-bl-sm bg-accent/10 border border-accent/15'
                            : 'rounded-bl-sm bg-muted/40 border border-border/20'
                      }`}>
                        {!isMe && (
                          <p className={`text-[9px] font-semibold mb-0.5 uppercase tracking-wide ${isCompanion ? 'text-accent' : 'text-primary/80'}`}>
                            {msg.sender_name}
                          </p>
                        )}
                        {displayText && <p className="whitespace-pre-wrap text-foreground">{displayText}</p>}
                        {linkUrl && <LinkEmbed url={linkUrl} compact />}
                      </div>
                      <p className={`text-[8px] mt-0.5 px-1 text-muted-foreground/40 ${isMe ? 'text-right' : 'text-left'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {(isMe || isOwner) && (
                        <button
                          onClick={() => onDeleteMessage(msg.id)}
                          className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity flex h-4 w-4 items-center justify-center rounded-full bg-muted/80 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-2 w-2" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {companionTypingName && (
              <div className="flex items-center gap-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 border border-accent/30">
                  <Sparkles className="h-2.5 w-2.5 text-accent" />
                </div>
                <div className="rounded-xl px-3 py-2 bg-accent/10 border border-accent/15 rounded-bl-sm">
                  <p className="text-[9px] text-accent font-semibold mb-0.5">{companionTypingName} ✨</p>
                  <div className="flex gap-0.5">
                    <div className="h-1 w-1 rounded-full bg-accent/50 animate-pulse" />
                    <div className="h-1 w-1 rounded-full bg-accent/50 animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <div className="h-1 w-1 rounded-full bg-accent/50 animate-pulse" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chat input */}
          <div className="shrink-0 border-t border-border/20 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => onInputChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
                placeholder="Message…"
                maxLength={1000}
                className="flex-1 rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-input border border-border"
              />
              <button
                onClick={handleChatSend}
                disabled={!input.trim() || sending}
                className="flex h-8 w-8 items-center justify-center rounded-full gradient-primary transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5 text-primary-foreground" />
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
