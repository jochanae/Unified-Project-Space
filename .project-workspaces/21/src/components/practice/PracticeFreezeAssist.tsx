import { useState, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePracticeMode, PRACTICE_TONES, type PracticeTone } from './PracticeModeContext';

interface PracticeFreezeAssistProps {
  recentMessages: { role: string; content: string }[];
  companionName: string;
  onSelectSuggestion: (text: string) => void;
}

interface ToneResponse {
  tone: PracticeTone;
  responses: string[];
}

export default function PracticeFreezeAssist({
  recentMessages,
  companionName,
  onSelectSuggestion,
}: PracticeFreezeAssistProps) {
  const { showFreezeAssist, setShowFreezeAssist, scenario } = usePracticeMode();
  const [selectedTone, setSelectedTone] = useState<PracticeTone | null>(null);
  const [toneResponses, setToneResponses] = useState<ToneResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Drag-to-peek: track vertical drag offset
  const dragY = useMotionValue(0);
  const backdropOpacity = useTransform(dragY, [0, 300], [0.25, 0]);

  const fetchResponses = useCallback(async (tone: PracticeTone) => {
    setSelectedTone(tone);
    setLoading(true);
    setToneResponses(null);

    try {
      const { data, error } = await supabase.functions.invoke('practice-coach', {
        body: {
          action: 'suggest_responses',
          tone,
          messages: recentMessages.slice(-6),
          companionName,
          scenarioId: scenario?.id,
          coachingFocus: scenario?.coachingFocus,
        },
      });

      if (error) throw error;

      setToneResponses({
        tone,
        responses: data?.responses || [
          "That's an interesting way to put it…",
          "Hmm… I need a second with that one.",
        ],
      });
    } catch (e) {
      console.error('[Practice] Failed to fetch responses:', e);
      setToneResponses({
        tone,
        responses: [
          "That's an interesting way to put it…",
          "Hmm… I need a second with that one.",
          "What made you say that?",
        ],
      });
    } finally {
      setLoading(false);
    }
  }, [recentMessages, companionName, scenario]);

  const handleSelect = (text: string) => {
    onSelectSuggestion(text);
    setShowFreezeAssist(false);
    setSelectedTone(null);
    setToneResponses(null);
  };

  const handleDismiss = () => {
    setShowFreezeAssist(false);
    setSelectedTone(null);
    setToneResponses(null);
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y > 120) {
      handleDismiss();
    }
  };

  // Extract the scenario prompt for context display
  const scenarioPrompt = scenario?.prompt;

  return (
    <AnimatePresence>
      {showFreezeAssist && (
        <>
          {/* Semi-transparent backdrop — allows seeing chat above */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 pointer-events-auto"
            style={{ backgroundColor: 'rgba(0,0,0,0.25)', opacity: backdropOpacity }}
            onClick={handleDismiss}
          />

          {/* Partial-height bottom sheet with drag-to-peek */}
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={handleDragEnd}
            style={{ y: dragY, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[55dvh]"
          >
            <div
              className="rounded-t-2xl border-t border-white/[0.12] overflow-hidden flex flex-col max-h-[55dvh]"
              style={{
                backdropFilter: 'blur(24px) saturate(1.6)',
                WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
                background: 'linear-gradient(to bottom, rgba(15,18,33,0.94), rgba(15,18,33,0.98))',
                boxShadow: '0 -8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,175,80,0.12), inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-2.5 pb-1 cursor-grab active:cursor-grabbing">
                <div className="w-10 h-1 rounded-full bg-white/25" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 pb-1.5">
                <span
                  className="text-[10px] uppercase tracking-[0.2em] text-primary/60 font-bold"
                  style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}
                >
                  {selectedTone ? 'Choose a response' : 'Need help responding?'}
                </span>
                <button
                  onClick={handleDismiss}
                  className="text-[10px] text-white/40 hover:text-white/60 transition-colors"
                >
                  I've got it
                </button>
              </div>

              {/* Scenario prompt context — always visible (#2) */}
              {scenarioPrompt && (
                <div className="mx-3 mb-2 px-3 py-2 rounded-xl border border-primary/15 bg-primary/[0.06]">
                  <p
                    className="text-[12px] text-white/70 italic leading-relaxed"
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}
                  >
                    "{scenarioPrompt}"
                  </p>
                </div>
              )}

              <div className="px-3 pb-4 overflow-y-auto overscroll-contain flex-1 min-h-0">
                {!selectedTone ? (
                  /* Tone selection */
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-white/40 px-1 mb-2" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                      Choose your approach
                    </p>
                    {PRACTICE_TONES.map((tone, i) => (
                      <motion.button
                        key={tone.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        onClick={() => fetchResponses(tone.id)}
                        className="w-full text-left rounded-xl border border-white/[0.08] p-3 hover:border-primary/30 hover:bg-white/[0.04] transition-all active:scale-[0.98] group flex items-center gap-3"
                        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}
                      >
                        <span className="text-lg">{tone.emoji}</span>
                        <div>
                          <span className="text-[12px] font-semibold text-white/80 group-hover:text-primary/90 transition-colors">
                            {tone.label}
                          </span>
                          <p className="text-[10px] text-white/40">{tone.description}</p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                ) : loading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 text-primary/40 animate-spin" />
                    <span className="ml-2 text-xs text-white/40">Crafting responses…</span>
                  </div>
                ) : toneResponses ? (
                  /* Response options */
                  <div className="space-y-2">
                    <button
                      onClick={() => { setSelectedTone(null); setToneResponses(null); }}
                      className="text-[10px] text-white/40 hover:text-white/60 transition-colors mb-1"
                    >
                      ← back to tones
                    </button>
                    {toneResponses.responses.map((text, i) => (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        onClick={() => handleSelect(text)}
                        className="w-full text-left rounded-xl border border-white/[0.08] p-3 hover:border-primary/30 hover:bg-white/[0.04] transition-all active:scale-[0.98]"
                        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}
                      >
                        <p
                          className="text-[13px] text-white/80 leading-relaxed"
                          style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
                        >
                          "{text}"
                        </p>
                      </motion.button>
                    ))}
                    <p className="text-[10px] text-white/25 text-center pt-1">
                      Tap to draft · edit to make it yours
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}