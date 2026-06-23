import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Sparkles } from 'lucide-react';
import SmartCard from './SmartCard';
import type { DiscoveryTopic, DiscoveryResult } from '@/lib/discoveryTopics';

interface DiscoveryCardProps {
  topic: DiscoveryTopic;
  companionName?: string;
  onComplete: (result: DiscoveryResult, answers: Record<string, string>) => void;
}

const DiscoveryCard: React.FC<DiscoveryCardProps> = ({ topic, companionName, onComplete }) => {
  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [animatingResult, setAnimatingResult] = useState(false);

  const totalQ = topic.questions.length;
  const currentQ = step >= 0 && step < totalQ ? topic.questions[step] : null;

  const handleSelect = useCallback((qId: string, optionKey: string) => {
    const next = { ...answers, [qId]: optionKey };
    setAnswers(next);

    if (step + 1 >= totalQ) {
      const res = topic.score(next);
      setResult(res);
      setAnimatingResult(true);
      setTimeout(() => setAnimatingResult(false), 1200);
      onComplete(res, next);
    } else {
      setTimeout(() => setStep(step + 1), 300);
    }
  }, [answers, step, totalQ, topic, onComplete]);

  // ── Result state ──
  if (result) {
    return (
      <SmartCard type="knowledge" className="!border-l-primary/60">
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: 'radial-gradient(ellipse at center top, hsl(43 74% 49% / 0.06), transparent 60%)' }} />
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="text-center py-2 relative z-10"
          >
            {/* Emoji with gold glow */}
            <div className="relative w-16 h-16 mx-auto mb-3 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, hsl(43 74% 49% / 0.15), transparent 70%)' }} />
              <motion.span
                initial={{ scale: 0.5, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.2 }}
                className="text-4xl relative z-10"
              >
                {result.emoji}
              </motion.span>
            </div>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Sparkles size={14} className="text-primary/60" />
              <p className="text-[10px] uppercase tracking-widest text-primary/60 font-semibold">My Blueprint</p>
            </div>
            <p className="font-serif font-bold text-lg text-foreground" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>{result.label}</p>
            <p className="text-[12px] text-white/60 leading-relaxed mt-2 px-2">{result.description}</p>
            <div className="mt-3 inline-flex items-center gap-1 text-[10px] text-primary/50">
              <Compass size={12} />
              <span>Saved to your Blueprint</span>
            </div>
          </motion.div>
        </div>
      </SmartCard>
    );
  }

  // ── Intro state ──
  if (step === -1) {
    return (
      <SmartCard type="knowledge" className="!border-l-primary/60">
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: 'radial-gradient(ellipse at center top, hsl(43 74% 49% / 0.06), transparent 60%)' }} />
          <div className="relative z-10">
            <div className="text-center mb-3">
              <div className="relative w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, hsl(43 74% 49% / 0.15), transparent 70%)' }} />
                <span className="text-5xl relative z-10">{topic.emoji}</span>
              </div>
              <div className="flex items-center justify-center gap-1.5 mb-0.5">
                <Compass size={12} className="text-primary/50" />
                <p className="text-[10px] uppercase tracking-widest text-primary/50 font-semibold">My Blueprint</p>
              </div>
              <p className="font-serif font-bold text-base text-foreground" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>{topic.title}</p>
              <p className="text-[13px] text-muted-foreground/70 mt-0.5">{topic.subtitle}</p>
            </div>
            <button
              onClick={() => setStep(0)}
              className="w-full flex items-center justify-center gap-2 rounded-full gradient-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors"
            >
              Let's find out
            </button>
            <p className="text-center text-[10px] text-white/40 mt-2">{totalQ} quick questions • ~1 min</p>
          </div>
        </div>
      </SmartCard>
    );
  }

  // ── Question state ──
  return (
    <SmartCard type="knowledge" className="!border-l-primary/60">
      <div className="relative">
        <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: 'radial-gradient(ellipse at center top, hsl(43 74% 49% / 0.06), transparent 60%)' }} />
        <div className="relative z-10">
          {/* Hybrid progress: ambient sweep + step-aware fill */}
          <div className="flex items-center justify-center gap-2 mb-3">
            {topic.questions.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i < step
                    ? 'h-1.5 w-1.5 bg-primary scale-110'
                    : i === step
                      ? 'h-1.5 w-1.5 bg-primary'
                      : 'h-1.5 w-1.5 bg-muted/30'
                }`}
              />
            ))}
          </div>
          <div className="onboarding-progress-container" style={{ margin: '0 auto 12px', width: '80%' }}>
            <div className="blueprint-energy-line" />
          </div>

          <AnimatePresence mode="wait">
            {currentQ && (
              <motion.div
                key={currentQ.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <p className="text-[10px] uppercase tracking-[0.2em] text-primary/60 font-bold mb-2">
                  {topic.title}
                </p>
                <p className="font-serif font-bold text-base text-foreground mb-3" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
                  {currentQ.prompt}
                </p>
                <div className="flex flex-col gap-1.5">
                  {currentQ.options.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => handleSelect(currentQ.id, opt.key)}
                      className="flex items-center gap-3 rounded-2xl border border-white/[0.14] bg-white/[0.03] px-3 py-3 text-left transition-transform active:scale-[0.98]"
                    >
                      <span className="text-xl">{opt.emoji}</span>
                      <span className="text-[13px] font-medium text-white/80" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </SmartCard>
  );
};

export default DiscoveryCard;
