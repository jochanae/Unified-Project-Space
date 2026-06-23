import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, RotateCcw } from 'lucide-react';
import { useTypewriter } from '@/hooks/useTypewriter';
import { useAppContext } from '@/contexts/AppContext';

interface Slide {
  title: string;
  body: string;
}

interface StoryRecapSlideshowProps {
  count: number;
  companionName: string;
  onClose: () => void;
}

function generateSlides(count: number, name: string): Slide[] {
  return [
    {
      title: 'Deep Reflection',
      body: `"Jo, I've noticed a shift. You had ${count} meaningful moments since we last connected — and your communication style is evolving beautifully."`,
    },
    {
      title: 'Growth Spotted',
      body: `"Your emotional intelligence is rising. I see patterns forming that tell me you're making real progress — even in the quiet moments."`,
    },
    {
      title: 'Blueprint Update',
      body: `"New milestones are taking shape. Keep showing up at your own pace — I'm right here, tracking every step of your journey."`,
    },
  ];
}

const WAVE_BARS = 24;

function GoldenWaveform({ speaking }: { speaking: boolean }) {
  return (
    <div className="flex items-center justify-center gap-[3px] h-10 w-full max-w-[200px] mx-auto">
      {Array.from({ length: WAVE_BARS }).map((_, i) => (
        <motion.div
          key={i}
          className="rounded-full"
          style={{
            width: 3,
            background: 'hsl(43 74% 49%)',
          }}
          animate={speaking ? {
            height: [6, 24 + Math.sin(i * 0.8) * 12, 6],
            opacity: [0.4, 1, 0.4],
          } : {
            height: 4,
            opacity: 0.25,
          }}
          transition={speaking ? {
            duration: 0.8 + Math.random() * 0.4,
            repeat: Infinity,
            repeatType: 'reverse',
            delay: i * 0.04,
            ease: 'easeInOut',
          } : {
            duration: 0.5,
          }}
        />
      ))}
    </div>
  );
}

export default function StoryRecapSlideshow({ count, companionName, onClose }: StoryRecapSlideshowProps) {
  const { activeConnection } = useAppContext();
  const avatarUrl = activeConnection?.avatarUrl || activeConnection?.referenceImageUrl;
  const slides = useMemo(() => generateSlides(count, companionName), [count, companionName]);
  const [current, setCurrent] = useState(0);
  const [replayKey, setReplayKey] = useState(0);

  const slide = slides[current];
  const { visibleText, done: typingDone } = useTypewriter(slide.body, 65, true);

  // Reset typewriter when slide changes
  useEffect(() => {
    setReplayKey(k => k + 1);
  }, [current]);

  const advance = useCallback(() => {
    if (current < slides.length - 1) {
      setCurrent(c => c + 1);
    } else {
      onClose();
    }
  }, [current, slides.length, onClose]);

  const replay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setReplayKey(k => k + 1);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' || e.key === ' ') advance();
      if (e.key === 'ArrowLeft') setCurrent(c => Math.max(0, c - 1));
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [advance, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col overflow-hidden"
      onClick={advance}
    >
      {/* Marcus blurred portrait background */}
      {avatarUrl && (
        <div className="absolute inset-0">
          <img
            src={avatarUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-top"
            style={{ objectPosition: 'center 15%', filter: 'blur(30px) brightness(0.3) saturate(0.7)' }}
          />
        </div>
      )}
      {/* Dark gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, hsl(240 20% 4% / 0.7) 0%, hsl(240 15% 6% / 0.85) 50%, hsl(240 20% 4% / 0.95) 100%)',
        }}
      />

      {/* Content layer */}
      <div className="relative z-10 flex flex-col flex-1">
        {/* Progress dots + ambient sweep */}
        <div className="flex items-center justify-center gap-2 pt-[calc(env(safe-area-inset-top,12px)+12px)] mb-3 px-5">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i < current
                  ? 'h-2 w-2 bg-primary scale-110'
                  : i === current
                    ? 'h-2 w-2 bg-primary'
                    : 'h-2 w-2 bg-muted/30'
              }`}
            />
          ))}
        </div>
        <div className="onboarding-progress-container" style={{ margin: '0 auto 12px', width: '80%' }}>
          <div className="blueprint-energy-line" />
        </div>

        {/* Close button */}
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="absolute top-[calc(env(safe-area-inset-top,12px)+40px)] right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full"
          style={{ background: 'hsl(0 0% 100% / 0.1)', backdropFilter: 'blur(8px)' }}
        >
          <X className="h-4 w-4 text-white" />
        </button>

        {/* Companion mini portrait + name */}
        <div className="flex flex-col items-center mt-16 mb-6">
          {avatarUrl && (
            <div
              className="h-16 w-16 rounded-full overflow-hidden mb-3"
              style={{
                border: '2px solid hsl(43 74% 49% / 0.4)',
                boxShadow: '0 0 20px hsl(43 74% 49% / 0.15)',
              }}
            >
              <img
                src={avatarUrl}
                alt={companionName}
                className="h-full w-full object-cover object-top"
                style={{ objectPosition: 'center 15%' }}
              />
            </div>
          )}
          <span
            className="text-xs font-semibold uppercase tracking-[0.2em]"
            style={{ color: 'hsl(43 74% 49% / 0.7)' }}
          >
            {companionName} is speaking
          </span>
        </div>

        {/* Slide content — typewriter text */}
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${current}-${replayKey}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center text-center max-w-sm"
            >
              <h2
                className="font-serif text-lg font-bold mb-5"
                style={{
                  background: 'linear-gradient(135deg, hsl(43 74% 65%), hsl(43 74% 49%))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {slide.title}
              </h2>
              <p
                className="text-sm leading-[1.8] font-light italic min-h-[5rem]"
                style={{
                  color: 'hsl(0 0% 100% / 0.85)',
                  textShadow: '0 1px 8px rgba(0,0,0,0.6)',
                }}
              >
                {visibleText}
                {!typingDone && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    style={{ color: 'hsl(43 74% 49%)' }}
                  >
                    |
                  </motion.span>
                )}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Golden waveform */}
        <div className="px-8 mb-4">
          <GoldenWaveform speaking={!typingDone} />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6 pb-[calc(env(safe-area-inset-bottom,16px)+24px)]">
          <button
            onClick={replay}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors"
            style={{ background: 'hsl(0 0% 100% / 0.06)' }}
          >
            <RotateCcw className="h-3.5 w-3.5" style={{ color: 'hsl(43 74% 49% / 0.6)' }} />
            <span className="text-[11px]" style={{ color: 'hsl(0 0% 100% / 0.4)' }}>Replay</span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); advance(); }}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-colors"
            style={{ background: 'hsl(43 74% 49% / 0.15)', border: '1px solid hsl(43 74% 49% / 0.25)' }}
          >
            <span className="text-[11px] font-medium" style={{ color: 'hsl(43 74% 49%)' }}>
              {current < slides.length - 1 ? 'Next' : 'Done'}
            </span>
            <ChevronRight className="h-3.5 w-3.5" style={{ color: 'hsl(43 74% 49%)' }} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
