import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Minimize2, Sparkles } from 'lucide-react';
import PresenterPiP from './PresenterPiP';

interface CinemaParticipant {
  id: string;
  name: string;
  avatar?: string | null;
  type: 'human' | 'companion';
  hue: number;
  isSpeaking: boolean;
}

interface CinemaSnippet {
  participantId: string;
  text: string;
  ts: number;
}

interface CinemaModeProps {
  slides: string[];
  currentSlide: number;
  onSlideChange: (index: number) => void;
  mode: 'iframe' | 'image';
  isSpeaker: boolean;
  participants: CinemaParticipant[];
  snippets: CinemaSnippet[];
  onExit: () => void;
  onStopPresenting?: () => void;
  atmosphereGradient: string;
}

export default function CinemaMode({
  slides,
  currentSlide,
  onSlideChange,
  mode,
  isSpeaker,
  participants,
  snippets,
  onExit,
  onStopPresenting,
  atmosphereGradient,
}: CinemaModeProps) {
  const total = slides.length;
  const currentUrl = slides[currentSlide] || '';
  const lastTapRef = useRef(0);

  const goPrev = useCallback(() => {
    if (currentSlide > 0) onSlideChange(currentSlide - 1);
  }, [currentSlide, onSlideChange]);

  const goNext = useCallback(() => {
    if (currentSlide < total - 1) onSlideChange(currentSlide + 1);
  }, [currentSlide, total, onSlideChange]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
      if (!isSpeaker) return;
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isSpeaker, goPrev, goNext, onExit]);

  // Double-tap to exit
  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      onExit();
    }
    lastTapRef.current = now;
  }, [onExit]);

  // Find active speaker snippet (most recent)
  const activeSpeakerSnippet = snippets.length > 0
    ? snippets.reduce((a, b) => b.ts > a.ts ? b : a)
    : null;
  const speakerParticipant = activeSpeakerSnippet
    ? participants.find(p => p.id === activeSpeakerSnippet.participantId)
    : null;

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      onClick={handleTap}
    >
      {/* Dimmed atmosphere background */}
      <div className="absolute inset-0" style={{ background: atmosphereGradient, opacity: 0.3 }} />
      <div className="absolute inset-0 bg-black/70" />

      {/* Top bar — minimize + stop */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-3 pb-2">
        <button
          onClick={(e) => { e.stopPropagation(); onExit(); }}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card/40 border border-border/30 backdrop-blur-md text-muted-foreground hover:text-foreground transition-colors"
        >
          <Minimize2 className="h-4 w-4" />
        </button>

        <span className="text-[11px] text-muted-foreground/60 font-medium">Double-tap to exit</span>

        {isSpeaker && onStopPresenting && (
          <button
            onClick={(e) => { e.stopPropagation(); onStopPresenting(); onExit(); }}
            className="flex h-9 items-center gap-1.5 rounded-full px-3 bg-destructive/20 border border-destructive/30 backdrop-blur-md text-destructive hover:bg-destructive/30 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            <span className="text-[11px] font-semibold">Stop</span>
          </button>
        )}

        {!isSpeaker && !onStopPresenting && <div className="w-9" />}
      </div>

      {/* ═══ Main slide — fills 95% of screen ═══ */}
      <div className="relative flex-1 flex items-center justify-center px-3 pb-2" onClick={(e) => e.stopPropagation()}>
        <div
          className="relative w-[95%] max-w-[1400px] rounded-2xl overflow-hidden border border-white/5 shadow-2xl"
          style={{
            aspectRatio: '16 / 9',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            background: 'hsl(var(--card) / 0.2)',
            boxShadow: '0 0 60px 12px hsl(var(--primary) / 0.06), 0 12px 48px -12px hsl(0 0% 0% / 0.5)',
          }}
          onDoubleClick={onExit}
        >
          {mode === 'iframe' ? (
            <iframe
              src={currentUrl}
              title="Presentation"
              className="absolute inset-0 w-full h-full border-0 rounded-2xl"
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
          ) : (
            <img
              src={currentUrl}
              alt={`Slide ${currentSlide + 1}`}
              className="absolute inset-0 w-full h-full object-contain"
              draggable={false}
            />
          )}

          {/* Slide controls — speaker only */}
          {isSpeaker && total > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-4 rounded-full px-4 py-2 bg-card/50 border border-border/30 backdrop-blur-md z-10">
              <button
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
                disabled={currentSlide === 0}
                className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted/50 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-foreground" />
              </button>
              <span className="text-[12px] font-semibold text-foreground/80 tabular-nums min-w-[40px] text-center">
                {currentSlide + 1} / {total}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); goNext(); }}
                disabled={currentSlide === total - 1}
                className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted/50 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-foreground" />
              </button>
            </div>
          )}

          {/* Presenter PiP webcam */}
          <PresenterPiP isSpeaker={isSpeaker} size="md" />

          {/* ═══ Floating speech bubble over slide ═══ */}
          <AnimatePresence>
            {activeSpeakerSnippet && speakerParticipant && (
              <motion.div
                key={activeSpeakerSnippet.ts}
                className="absolute top-3 right-3 flex items-center gap-2 max-w-[280px] rounded-xl px-3 py-2 z-20"
                style={{
                  background: `hsl(${speakerParticipant.hue} 40% 15% / 0.75)`,
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: `1px solid hsl(${speakerParticipant.hue} 50% 40% / 0.3)`,
                }}
                initial={{ opacity: 0, y: -8, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                {speakerParticipant.avatar ? (
                  <img src={speakerParticipant.avatar} referrerPolicy="no-referrer" alt="" className="h-6 w-6 rounded-full object-cover shrink-0" />
                ) : (
                  <div
                    className="h-6 w-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white/80"
                    style={{ background: `hsl(${speakerParticipant.hue} 50% 40%)` }}
                  >
                    {speakerParticipant.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[9px] font-semibold text-white/60 uppercase tracking-wider">
                    {speakerParticipant.name}
                    {speakerParticipant.type === 'companion' && ' ✨'}
                  </p>
                  <p className="text-[11px] text-white/90 leading-tight line-clamp-2">{activeSpeakerSnippet.text}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ═══ Front Row — floating participant orbs ═══ */}
      <div className="relative z-10 flex items-center justify-center gap-3 px-4 pb-4 pt-1">
        {participants.map(p => (
          <motion.div
            key={p.id}
            className="flex flex-col items-center gap-0.5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <motion.div
              className="relative rounded-full overflow-hidden"
              style={{
                width: 36,
                height: 36,
                border: `2px solid hsl(${p.hue} 60% 55% / ${p.isSpeaking ? 0.9 : 0.4})`,
                boxShadow: p.isSpeaking
                  ? `0 0 12px 4px hsl(${p.hue} 60% 50% / 0.4)`
                  : `0 0 6px 1px hsl(${p.hue} 60% 50% / 0.2)`,
              }}
              animate={p.isSpeaking ? { scale: [1, 1.1, 1] } : {}}
              transition={p.isSpeaking ? { repeat: Infinity, duration: 1.2 } : {}}
            >
              {p.avatar ? (
                <img src={p.avatar} referrerPolicy="no-referrer" alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-[12px] font-bold text-white/70"
                  style={{ background: `hsl(${p.hue} 40% 25%)` }}
                >
                  {p.name.charAt(0)}
                </div>
              )}
              {p.type === 'companion' && (
                <div className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent/40 backdrop-blur-sm">
                  <Sparkles className="h-2 w-2 text-accent" />
                </div>
              )}
            </motion.div>
            <span className="text-[8px] text-white/40 font-medium max-w-[40px] truncate">{p.name}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
