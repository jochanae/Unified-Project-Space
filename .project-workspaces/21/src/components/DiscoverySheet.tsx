import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Compass, ChevronLeft } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import type { DiscoveryTopic, DiscoveryResult } from '@/lib/discoveryTopics';
import { supabase } from '@/integrations/supabase/client';

interface DiscoverySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topic: DiscoveryTopic | null;
  userId: string;
  onComplete?: () => void;
}

const DiscoverySheet: React.FC<DiscoverySheetProps> = ({ open, onOpenChange, topic, userId, onComplete }) => {
  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<DiscoveryResult | null>(null);

  const reset = useCallback(() => {
    setStep(-1);
    setAnswers({});
    setResult(null);
  }, []);

  const handleOpenChange = useCallback((val: boolean) => {
    if (!val) reset();
    onOpenChange(val);
  }, [onOpenChange, reset]);

  if (!topic) return null;

  const totalQ = topic.questions.length;
  const currentQ = step >= 0 && step < totalQ ? topic.questions[step] : null;

  const handleSelect = async (qId: string, optionKey: string) => {
    const next = { ...answers, [qId]: optionKey };
    setAnswers(next);

    if (step + 1 >= totalQ) {
      const res = topic.score(next);
      setResult(res);

      await supabase.from('discovery_results').upsert({
        user_id: userId,
        topic: topic.id,
        result_key: res.key,
        result_label: res.label,
        result_emoji: res.emoji,
        result_description: res.description,
        secondary_key: res.secondaryKey ?? null,
        secondary_label: res.secondaryLabel ?? null,
        answers: next,
        completed_at: new Date().toISOString(),
      }, { onConflict: 'user_id,topic' } as any);

      onComplete?.();
    } else {
      setTimeout(() => setStep(step + 1), 300);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      const prevQ = topic.questions[step - 1];
      const next = { ...answers };
      delete next[prevQ.id];
      setAnswers(next);
      setStep(step - 1);
    } else if (step === 0) {
      setStep(-1);
      setAnswers({});
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl bg-background/95 backdrop-blur-xl border-t border-white/10 px-6 pb-10 pt-4 max-h-[85vh] overflow-y-auto"
        style={{ background: 'radial-gradient(ellipse at center top, hsl(43 74% 49% / 0.06), transparent 60%), hsl(var(--background) / 0.95)' }}
      >
        <SheetTitle className="sr-only">{topic.title}</SheetTitle>

        {/* Drag handle */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* ── Result View ── */}
        {result ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="text-center py-6 relative"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute left-1/2 top-0 pointer-events-none"
                initial={{ x: 0, y: 0, opacity: 0.9, scale: 0.7 }}
                animate={{
                  x: [0, (i - 1) * 40, (i - 1) * 60],
                  y: [0, -80, -160],
                  opacity: [0.9, 0.6, 0],
                  scale: [0.7, 0.5, 0.3],
                }}
                transition={{ delay: 0.8 + i * 0.15, duration: 1.2, ease: 'easeOut' }}
              >
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/20 border border-primary/30 backdrop-blur-sm">
                  <span className="text-xs">{result.emoji}</span>
                  <span className="text-[9px] font-bold text-primary/80">SAVED</span>
                </div>
              </motion.div>
            ))}

            {/* Result emoji with gold glow */}
            <div className="relative w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, hsl(43 74% 49% / 0.15), transparent 70%)' }} />
              <motion.span
                initial={{ scale: 0.5, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.2 }}
                className="text-6xl relative z-10"
              >
                {result.emoji}
              </motion.span>
            </div>

            <div className="flex items-center justify-center gap-1.5 mb-2">
              <Sparkles size={14} className="text-primary/60" />
              <p className="text-[10px] uppercase tracking-widest text-primary/60 font-semibold">
                {topic.title}
              </p>
            </div>
            <p className="font-serif font-bold text-xl text-foreground mb-2" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>{result.label}</p>
            <p className="text-sm text-muted-foreground/80 leading-relaxed max-w-sm mx-auto">
              {result.description}
            </p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="mt-6 inline-flex items-center gap-1.5 text-[11px] text-primary/50"
            >
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ delay: 1, duration: 0.6, ease: 'easeInOut' }}
              >
                <Compass size={12} />
              </motion.div>
              <span>Saved to your Blueprint</span>
            </motion.div>
            <button
              onClick={() => handleOpenChange(false)}
              className="mt-6 w-full rounded-full bg-primary/10 hover:bg-primary/20 px-4 py-3.5 text-sm font-medium text-primary transition-colors"
            >
              Done
            </button>
          </motion.div>
        ) : step === -1 ? (
          /* ── Intro View ── */
          <div className="py-4">
            <div className="text-center mb-6">
              <div className="relative w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, hsl(43 74% 49% / 0.15), transparent 70%)' }} />
                <span className="text-5xl relative z-10">{topic.emoji}</span>
              </div>
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Compass size={12} className="text-primary/50" />
                <p className="text-[10px] uppercase tracking-widest text-primary/50 font-semibold">My Blueprint</p>
              </div>
              <p className="font-serif font-bold text-xl text-foreground" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>{topic.title}</p>
              <p className="text-sm text-muted-foreground/70 mt-1">{topic.subtitle}</p>
            </div>
            <button
              onClick={() => setStep(0)}
              className="w-full flex items-center justify-center gap-2 rounded-full gradient-primary px-4 py-3.5 text-sm font-medium text-primary-foreground transition-colors"
            >
              <Sparkles size={16} />
              Let's find out
            </button>
            <p className="text-center text-[11px] text-muted-foreground/40 mt-3">
              {totalQ} quick questions • ~1 min • completely private
            </p>
          </div>
        ) : (
          /* ── Question View ── */
          <div className="py-2">
            {/* Energy-line progress bar */}
            <div className="flex items-center justify-center gap-2 mb-3">
              {topic.questions.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-300 ${
                    i < step
                      ? 'h-2 w-2 bg-primary scale-110'
                      : i === step
                        ? 'h-2 w-2 bg-primary'
                        : 'h-2 w-2 bg-muted/30'
                  }`}
                />
              ))}
            </div>
            <div className="onboarding-progress-container" style={{ margin: '0 auto 16px', width: '80%' }}>
              <div className="blueprint-energy-line" />
            </div>

            {/* Back button */}
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-[12px] text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors mb-3"
            >
              <ChevronLeft size={14} />
              <span>{step === 0 ? 'Back to intro' : 'Previous question'}</span>
            </button>

            <AnimatePresence mode="wait">
              {currentQ && (
                <motion.div
                  key={currentQ.id}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.25 }}
                >
                  {/* Step counter */}
                  <p className="text-[11px] text-primary/60 uppercase tracking-[0.2em] font-bold mb-1.5">
                    Step {step + 1} of {totalQ}
                  </p>

                  {/* Question prompt */}
                  <p
                    className="font-serif font-bold text-lg text-foreground mb-4 leading-relaxed"
                    style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
                  >
                    {currentQ.prompt}
                  </p>

                  <div className="flex flex-col gap-2">
                    {currentQ.options.map((opt) => {
                      const isSelected = answers[currentQ.id] === opt.key;
                      return (
                        <button
                          key={opt.key}
                          onClick={() => handleSelect(currentQ.id, opt.key)}
                          className={`flex items-center gap-3.5 rounded-2xl px-4 py-4 text-left transition-all ${
                            isSelected
                              ? 'border border-primary'
                              : 'border border-white/[0.14] bg-white/[0.03] hover:bg-white/[0.06] hover:border-primary/30'
                          }`}
                          style={isSelected ? {
                            background: 'linear-gradient(135deg, hsl(43 74% 49% / 0.12), hsl(43 74% 49% / 0.04))',
                            boxShadow: '0 0 20px hsl(43 74% 49% / 0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
                          } : undefined}
                        >
                          <span
                            className="text-2xl"
                            style={isSelected ? { filter: 'drop-shadow(0 0 5px hsl(43 74% 49%))' } : undefined}
                          >
                            {opt.emoji}
                          </span>
                          <span
                            className={`text-sm font-medium transition-colors ${isSelected ? 'text-white' : 'text-white/70'}`}
                            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
                          >
                            {opt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default DiscoverySheet;
