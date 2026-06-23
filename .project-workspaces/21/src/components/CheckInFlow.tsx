import { useState, useMemo } from 'react';
import { useTypewriter } from '@/hooks/useTypewriter';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Send, BookOpen, Sparkles } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { getMoodPrompts, getMoodAffirmation, getMoodPromptType, type MoodLevel } from '@/lib/moodPrompts';

const MOOD_OPTIONS: { level: MoodLevel; emoji: string; label: string }[] = [
  { level: 1, emoji: '😔', label: 'Rough' },
  { level: 2, emoji: '😕', label: 'Low' },
  { level: 3, emoji: '😐', label: 'Okay' },
  { level: 4, emoji: '🙂', label: 'Good' },
  { level: 5, emoji: '😊', label: 'Great' },
];

const COMPANION_RESPONSES = [
  "Thanks for sharing that with me.",
  "I appreciate you opening up.",
  "I'm glad you took a moment to reflect.",
  "That sounds important — I'll remember.",
  "Thanks for letting me be part of that moment.",
];

type Step = 'mood' | 'prompt' | 'journal' | 'done';

interface CheckInFlowProps {
  onComplete: (data: {
    moodLevel: MoodLevel;
    moodEmoji: string;
    note?: string;
    journalContent?: string;
    promptShown?: string;
    promptType: string;
  }) => Promise<void>;
  onBack: () => void;
  companionName?: string;
}

export default function CheckInFlow({ onComplete, onBack, companionName }: CheckInFlowProps) {
  const [step, setStep] = useState<Step>('mood');
  const [selectedMood, setSelectedMood] = useState<MoodLevel | null>(null);
  const [note, setNote] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [wantsJournal, setWantsJournal] = useState(false);
  const [journalContent, setJournalContent] = useState('');
  const [saving, setSaving] = useState(false);

  const companionResponse = useMemo(
    () => COMPANION_RESPONSES[Math.floor(Math.random() * COMPANION_RESPONSES.length)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step === 'done']
  );
  const { visibleText: typedResponse, done: typingDone } = useTypewriter(
    companionResponse, 90, step === 'done'
  );

  const moodOption = MOOD_OPTIONS.find(m => m.level === selectedMood);
  const prompts = selectedMood ? getMoodPrompts(selectedMood, 3) : [];

  const handleMoodSelect = (level: MoodLevel) => {
    setSelectedMood(level);
    setSelectedPrompt(null);
    setNote('');
    setTimeout(() => setStep('prompt'), 150);
  };

  const handlePromptTap = (prompt: string) => {
    if (selectedPrompt === prompt) {
      setSelectedPrompt(null);
      setNote('');
    } else {
      setSelectedPrompt(prompt);
      setNote(prompt + '\n\n');
    }
  };

  const handleContinue = () => {
    if (step === 'prompt') {
      setStep('journal');
    }
  };

  const handleFinish = async () => {
    if (!selectedMood || saving) return;
    setSaving(true);
    await onComplete({
      moodLevel: selectedMood,
      moodEmoji: moodOption?.emoji || '😐',
      note: note.trim() || undefined,
      journalContent: wantsJournal && journalContent.trim() ? journalContent.trim() : undefined,
      promptShown: selectedPrompt || undefined,
      promptType: getMoodPromptType(selectedMood),
    });
    setSaving(false);
    setStep('done');
  };

  return (
    <div>
      {/* Only show internal step-back nav (not on first step — header handles that) */}
      {step !== 'done' && step !== 'mood' && (
        <button
          onClick={() => setStep(step === 'journal' ? 'prompt' : 'mood')}
          className="mb-3 flex items-center gap-1 text-sm text-white/70 hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
      )}

      {/* Progress dots + energy-line */}
      {step !== 'done' && (
        <>
          <div className="flex items-center justify-center gap-2 mb-3">
            {(['mood', 'prompt', 'journal'] as const).map((s, i) => {
              const stepOrder = ['mood', 'prompt', 'journal'] as const;
              const currentIdx = stepOrder.indexOf(step as typeof stepOrder[number]);
              return (
                <div
                  key={s}
                  className={`rounded-full transition-all duration-300 ${
                    i < currentIdx
                      ? 'h-2 w-2 bg-primary scale-110'
                      : i === currentIdx
                        ? 'h-2 w-2 bg-primary'
                        : 'h-2 w-2 bg-muted/30'
                  }`}
                />
              );
            })}
          </div>
          <div className="onboarding-progress-container" style={{ margin: '0 auto 16px', width: '80%' }}>
            <div className="blueprint-energy-line" />
          </div>
        </>
      )}

      <AnimatePresence mode="wait">
        {/* ─── Step 1: Mood Select ─── */}
        {step === 'mood' && (
          <motion.div
            key="mood"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <p className="text-[11px] uppercase tracking-[0.2em] text-primary/60 font-bold mb-2 text-center">
              😊 HOW ARE YOU FEELING
            </p>
            <h2 className="font-serif text-lg font-bold text-foreground text-center" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
              How are you feeling right now?
            </h2>
            <p className="text-sm text-muted-foreground text-center mt-1">
              Tap the one that fits right now.
            </p>

            <div className="mt-6 flex justify-between gap-2">
              {MOOD_OPTIONS.map(m => {
                const isSelected = selectedMood === m.level;
                return (
                  <button
                    key={m.level}
                    onClick={() => handleMoodSelect(m.level)}
                    className="flex flex-1 flex-col items-center gap-2 rounded-2xl border px-3 py-4 transition-all active:scale-90"
                    style={isSelected ? {
                      border: '1px solid hsl(var(--primary))',
                      background: 'linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.05))',
                      boxShadow: '0 0 20px hsl(43 74% 49% / 0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                    } : {
                      border: '1px solid rgba(255,255,255,0.14)',
                      background: 'rgba(255,255,255,0.03)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                    }}
                  >
                    <span
                      className="text-3xl"
                      style={isSelected ? { filter: 'drop-shadow(0 0 5px hsl(var(--primary)))' } : undefined}
                    >
                      {m.emoji}
                    </span>
                    <span
                      className={`text-[11px] font-semibold ${isSelected ? 'text-white' : 'text-white/50'}`}
                      style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
                    >
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ─── Step 2: Contextual Prompt + Note ─── */}
        {step === 'prompt' && selectedMood && (
          <motion.div
            key="prompt"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <p className="text-[11px] uppercase tracking-[0.2em] text-primary/60 font-bold mb-2 text-center">
              💭 GO DEEPER
            </p>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{moodOption?.emoji}</span>
              <h2 className="font-serif text-lg font-bold text-foreground" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
                Feeling {moodOption?.label?.toLowerCase()}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Pick a prompt or just write what's on your mind.
            </p>

            {/* Prompt cards */}
            <div className="flex flex-col gap-2 mb-4">
              {prompts.map((p, i) => {
                const isSelected = selectedPrompt === p;
                return (
                  <button
                    key={i}
                    onClick={() => handlePromptTap(p)}
                    className="rounded-2xl border px-4 py-3.5 text-left text-sm transition-all active:scale-[0.98]"
                    style={isSelected ? {
                      border: '1px solid hsl(var(--primary))',
                      background: 'linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.04))',
                      boxShadow: '0 0 16px hsl(43 74% 49% / 0.15)',
                    } : {
                      border: '1px solid rgba(255,255,255,0.14)',
                      background: 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <Sparkles className="inline h-3 w-3 mr-1.5 text-primary/60" />
                    <span
                      className={isSelected ? 'text-white' : 'text-white/80'}
                      style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
                    >
                      "{p}"
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Note area */}
            <div className="relative">
              <AnimatePresence>
                {selectedPrompt && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.25 }}
                    className="rounded-t-xl border border-b-0 border-border/30 bg-muted/30 px-3 py-2.5"
                  >
                    <p className="text-sm font-medium text-foreground/80">{selectedPrompt}</p>
                    <div className="mt-1.5 h-px bg-border/20" />
                  </motion.div>
                )}
              </AnimatePresence>
              <Textarea
                placeholder={selectedPrompt ? "Your thoughts..." : "What's on your mind? (optional)"}
                value={selectedPrompt ? note.replace(selectedPrompt + '\n\n', '') : note}
                onChange={e => {
                  if (selectedPrompt) {
                    setNote(selectedPrompt + '\n\n' + e.target.value);
                  } else {
                    setNote(e.target.value);
                  }
                }}
                className={`min-h-[80px] resize-none placeholder:text-muted-foreground/50 placeholder:italic ${
                  selectedPrompt ? 'rounded-t-none rounded-b-xl border-t-0' : 'rounded-xl'
                }`}
              />
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={handleContinue}
                className="flex-1 rounded-full py-3.5 text-sm font-semibold transition-all"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))',
                  color: 'hsl(var(--primary-foreground))',
                  boxShadow: '0 0 20px rgba(212,175,80,0.2), 0 4px 16px rgba(0,0,0,0.3)',
                }}
              >
                Continue
              </button>
              <button
                onClick={() => {
                  setNote('');
                  setSelectedPrompt(null);
                  handleContinue();
                }}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── Step 3: Journal Option ─── */}
        {step === 'journal' && selectedMood && (
          <motion.div
            key="journal"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <p className="text-[11px] uppercase tracking-[0.2em] text-primary/60 font-bold mb-2 text-center">
              📝 YOUR SPACE
            </p>
            <h2 className="font-serif text-lg font-bold text-foreground flex items-center gap-2" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
              <BookOpen className="h-5 w-5 text-primary" />
              Want to reflect more?
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Turn this check-in into a journal entry.
            </p>

            {/* Toggle */}
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setWantsJournal(false)}
                className="flex-1 rounded-2xl border px-3 py-3 text-sm font-medium transition-all"
                style={!wantsJournal ? {
                  border: '1px solid hsl(var(--primary))',
                  background: 'linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.04))',
                  boxShadow: '0 0 16px hsl(43 74% 49% / 0.15)',
                  color: 'white',
                } : {
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: 'rgba(255,255,255,0.03)',
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                Just the check-in
              </button>
              <button
                onClick={() => setWantsJournal(true)}
                className="flex-1 rounded-2xl border px-3 py-3 text-sm font-medium transition-all"
                style={wantsJournal ? {
                  border: '1px solid hsl(var(--primary))',
                  background: 'linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.04))',
                  boxShadow: '0 0 16px hsl(43 74% 49% / 0.15)',
                  color: 'white',
                } : {
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: 'rgba(255,255,255,0.03)',
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                ✍️ Write more
              </button>
            </div>

            {/* Expanded journal area */}
            <AnimatePresence>
              {wantsJournal && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="mt-3">
                    {note && (
                      <p className="text-xs text-muted-foreground mb-2 italic">
                        Starting from: "{note.slice(0, 60)}{note.length > 60 ? '…' : ''}"
                      </p>
                    )}
                    <Textarea
                      placeholder="Let your thoughts flow…"
                      value={journalContent}
                      onChange={e => setJournalContent(e.target.value)}
                      className="min-h-[120px] resize-none rounded-xl"
                      autoFocus
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={handleFinish}
              disabled={saving}
              className="mt-4 w-full rounded-full py-3.5 text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))',
                color: 'hsl(var(--primary-foreground))',
                boxShadow: '0 0 20px rgba(212,175,80,0.2), 0 4px 16px rgba(0,0,0,0.3)',
              }}
            >
              <Send className="h-4 w-4" />
              {saving ? 'Saving…' : wantsJournal ? 'Save Check-in & Journal' : 'Save Check-in'}
            </button>
          </motion.div>
        )}

        {/* ─── Step 4: Confirmation ─── */}
        {step === 'done' && selectedMood && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="text-center py-6"
          >
            <motion.span
              className="text-5xl block mb-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.1, stiffness: 200 }}
            >
              {moodOption?.emoji}
            </motion.span>

            <h2 className="font-serif text-lg font-bold text-foreground mb-2" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
              Check-in saved
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto mb-6">
              {getMoodAffirmation(selectedMood)}
            </p>

            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="rounded-2xl border p-4 mb-6 text-left"
              style={{
                border: '1px solid rgba(212,175,80,0.25)',
                background: 'linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.03))',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            >
              <p className="text-sm text-foreground/90 italic leading-relaxed" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
                "{typedResponse}{!typingDone && <span className="inline-block w-[2px] h-[14px] bg-foreground/40 ml-0.5 animate-pulse align-middle" />}"
              </p>
              {typingDone && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="text-[11px] text-muted-foreground mt-1.5"
                >
                  — {companionName || 'your companion'}
                </motion.p>
              )}
            </motion.div>

            <button
              onClick={onBack}
              className="w-full rounded-full py-3.5 text-sm font-semibold transition-all"
              style={{
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(255,255,255,0.03)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                color: 'white',
              }}
            >
              Back to Your Space
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
