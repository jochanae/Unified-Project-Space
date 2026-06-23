import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles } from 'lucide-react';
import { incrementIntentCount, shouldShowCenturionMilestone } from '@/components/dashboard/CenturionMilestone';
import { supabase } from '@/integrations/supabase/client';

interface MorningIntentOverlayProps {
  userName: string;
  userId?: string;
  onComplete: (word: string) => void;
  onCenturionMilestone?: () => void;
}

const STORAGE_PREFIX = 'compani-morning-intent';
const HISTORY_PREFIX = 'compani-intent-history';

function storageKey(userId?: string): string {
  return userId ? `${STORAGE_PREFIX}-${userId}` : STORAGE_PREFIX;
}

function historyKey(userId?: string): string {
  return userId ? `${HISTORY_PREFIX}-${userId}` : HISTORY_PREFIX;
}

interface IntentHistoryEntry {
  word: string;
  date: string; // YYYY-MM-DD
}

/** Returns today's stored intent word, or null */
export function getTodayIntent(userId?: string): string | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const { word, date } = JSON.parse(raw);
    if (date === new Date().toISOString().slice(0, 10)) return word;
    localStorage.removeItem(storageKey(userId));
    return null;
  } catch {
    return null;
  }
}

/** Get all stored intent history entries (localStorage cache) */
export function getIntentHistory(userId?: string): IntentHistoryEntry[] {
  try {
    const raw = localStorage.getItem(historyKey(userId));
    if (!raw) return [];
    return JSON.parse(raw) as IntentHistoryEntry[];
  } catch {
    return [];
  }
}

/** Fetch intent history from the database and merge with localStorage */
export async function fetchIntentHistoryFromDb(userId: string): Promise<IntentHistoryEntry[]> {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const { data, error } = await supabase
      .from('daily_intents')
      .select('word, intent_date')
      .eq('user_id', userId)
      .gte('intent_date', cutoff.toISOString().slice(0, 10))
      .order('intent_date', { ascending: false });
    if (error || !data) return getIntentHistory(userId);
    const entries: IntentHistoryEntry[] = data.map(d => ({ word: d.word, date: d.intent_date }));
    const localEntries = getIntentHistory(userId);
    const dateSet = new Set(entries.map(e => e.date));
    for (const le of localEntries) {
      if (!dateSet.has(le.date)) {
        entries.push(le);
        dateSet.add(le.date);
      }
    }
    entries.sort((a, b) => b.date.localeCompare(a.date));
    localStorage.setItem(historyKey(userId), JSON.stringify(entries.slice(0, 90)));
    return entries;
  } catch {
    return getIntentHistory(userId);
  }
}

/** Append an intent to the persistent history (max 90 days) + save to DB */
function appendToHistory(word: string, userId?: string) {
  const history = getIntentHistory(userId);
  const today = new Date().toISOString().slice(0, 10);
  const filtered = history.filter(e => e.date !== today);
  filtered.push({ word, date: today });
  const trimmed = filtered.length > 90 ? filtered.slice(-90) : filtered;
  localStorage.setItem(historyKey(userId), JSON.stringify(trimmed));

  if (userId) {
    supabase.from('daily_intents').upsert(
      { user_id: userId, word, intent_date: today },
      { onConflict: 'user_id,intent_date' }
    ).then(() => {});
  }
}

/** Spawn coral/gold ember particles from a point */
function spawnEmbers() {
  const cx = window.innerWidth - 28;
  const cy = 0;
  const count = 12;

  for (let i = 0; i < count; i++) {
    const ember = document.createElement('div');
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
    const dist = 30 + Math.random() * 50;
    const dx = Math.cos(angle) * dist;
    const dy = -Math.abs(Math.sin(angle) * dist) - Math.random() * 30;
    const size = 2 + Math.random() * 3;
    const isGold = Math.random() > 0.5;
    const color = isGold ? 'hsl(38 70% 55%)' : 'hsl(16 85% 58%)';
    const duration = 0.6 + Math.random() * 0.6;

    ember.style.cssText = `
      position: fixed;
      left: ${cx}px;
      top: ${cy + 20}px;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: 50%;
      pointer-events: none;
      z-index: 200;
      box-shadow: 0 0 ${size * 2}px ${color};
      animation: ember-float ${duration}s ease-out forwards;
      --ember-x: ${dx}px;
      --ember-y: ${dy}px;
    `;

    if (!document.getElementById('ember-float-style')) {
      const style = document.createElement('style');
      style.id = 'ember-float-style';
      style.textContent = `
        @keyframes ember-float {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          70% { opacity: 0.8; }
          100% { transform: translate(var(--ember-x), var(--ember-y)) scale(0); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(ember);
    ember.addEventListener('animationend', () => ember.remove());
  }
}

const FALLBACK_WORDS = ["Clarity", "Presence", "Strength", "Grace", "Focus", "Courage", "Stillness", "Growth", "Resilience", "Softness", "Power", "Patience"];

export default function MorningIntentOverlay({ userName, userId, onComplete, onCenturionMilestone }: MorningIntentOverlayProps) {
  const [word, setWord] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showFlare, setShowFlare] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const fetchSuggestions = useCallback(async () => {
    if (loadingSuggestions || suggestions.length > 0) return;
    setLoadingSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-intent');
      if (!error && data?.words?.length) {
        setSuggestions(data.words.slice(0, 3));
      } else {
        const shuffled = [...FALLBACK_WORDS].sort(() => Math.random() - 0.5);
        setSuggestions(shuffled.slice(0, 3));
      }
    } catch {
      const shuffled = [...FALLBACK_WORDS].sort(() => Math.random() - 0.5);
      setSuggestions(shuffled.slice(0, 3));
    } finally {
      setLoadingSuggestions(false);
    }
  }, [loadingSuggestions, suggestions.length]);

  const handleSubmit = useCallback(() => {
    const trimmed = word.trim();
    if (!trimmed) return;
    localStorage.setItem(storageKey(userId), JSON.stringify({
      word: trimmed,
      date: new Date().toISOString().slice(0, 10),
    }));
    appendToHistory(trimmed, userId);
    setSubmitted(true);

    const newCount = incrementIntentCount();
    if (shouldShowCenturionMilestone(newCount) && onCenturionMilestone) {
      setTimeout(() => onCenturionMilestone(), 2400);
    }

    if (navigator.vibrate) navigator.vibrate([15, 30, 15, 30, 15]);
    setTimeout(() => {
      setShowFlare(true);
      spawnEmbers();
      if (navigator.vibrate) navigator.vibrate([8, 20, 8]);
    }, 400);

    setTimeout(() => onComplete(trimmed), 2200);
  }, [word, userId, onComplete, onCenturionMilestone]);

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{
        background: 'linear-gradient(180deg, hsl(16 40% 8%) 0%, hsl(20 30% 6%) 100%)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Warm sunrise ambient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, hsl(16 85% 55% / 0.12) 0%, transparent 60%)',
        }}
      />

      {/* Achievement Flare burst ring */}
      <AnimatePresence>
        {showFlare && (
          <motion.div
            key="flare"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 6, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="fixed z-[200] pointer-events-none rounded-full"
            style={{
              right: 4,
              top: -8,
              width: 24,
              height: 24,
              background: 'radial-gradient(circle, hsl(38 70% 55% / 0.8) 0%, hsl(16 85% 55% / 0.4) 40%, transparent 70%)',
              border: '2px solid hsl(38 70% 55% / 0.6)',
            }}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center text-center px-6 max-w-sm w-full"
      >
        {/* Sunrise icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mb-6"
        >
          <div
            className="h-16 w-16 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, hsl(16 85% 55% / 0.2), hsl(30 90% 60% / 0.1))',
              boxShadow: '0 0 30px 8px hsl(16 85% 55% / 0.15)',
              border: '1px solid hsl(16 85% 55% / 0.3)',
            }}
          >
            <span className="text-2xl">☀️</span>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-[11px] tracking-[0.15em] uppercase text-[hsl(16_85%_60%)] font-medium mb-3"
        >
          Morning intent
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-[22px] font-normal text-foreground leading-[1.5] tracking-tight mb-2"
        >
          Good morning, {userName}.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-sm text-foreground/50 mb-8 leading-relaxed"
        >
          Set your intention — a word, a phrase,<br />or an affirmation to carry with you.
        </motion.p>

        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: 0.8, duration: 0.4 }}
              className="w-full"
            >
              <div
                className="flex items-center gap-3 rounded-xl px-4 py-3"
                style={{
                  background: 'hsl(16 20% 12% / 0.6)',
                  border: '1px solid hsl(16 85% 55% / 0.15)',
                }}
              >
                {/* ✨ Spark button */}
                <button
                  onClick={fetchSuggestions}
                  disabled={loadingSuggestions}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all hover:scale-110"
                  style={{
                    background: suggestions.length > 0 ? 'hsl(38 70% 50% / 0.15)' : 'hsl(16 85% 55% / 0.08)',
                    border: '1px solid hsl(38 70% 50% / 0.2)',
                  }}
                  title="Suggest an intent"
                >
                  <Sparkles className={`h-4 w-4 text-[hsl(38_70%_55%)] ${loadingSuggestions ? 'animate-pulse' : ''}`} />
                </button>

                <input
                  type="text"
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder="A word or affirmation…"
                  maxLength={120}
                  autoFocus
                  className="flex-1 bg-transparent text-foreground text-base font-medium placeholder:text-foreground/25 focus:outline-none tracking-wide text-center"
                />
                <button
                  onClick={handleSubmit}
                  disabled={!word.trim()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all disabled:opacity-20"
                  style={{
                    background: word.trim()
                      ? 'linear-gradient(135deg, hsl(16 85% 55%), hsl(30 90% 55%))'
                      : 'hsl(16 85% 55% / 0.1)',
                  }}
                >
                  <Send className="h-4 w-4 text-white" />
                </button>
              </div>

              {/* Suggestion pills */}
              <AnimatePresence>
                {suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="flex items-center justify-center gap-2 mt-4"
                  >
                    {suggestions.map((s, i) => (
                      <motion.button
                        key={s}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1, duration: 0.3 }}
                        onClick={() => setWord(s)}
                        className="px-3.5 py-1.5 rounded-full text-sm font-medium tracking-wide transition-all hover:scale-105"
                        style={{
                          background: word === s ? 'hsl(38 70% 50% / 0.25)' : 'hsl(38 70% 50% / 0.08)',
                          border: `1px solid ${word === s ? 'hsl(38 70% 50% / 0.5)' : 'hsl(38 70% 50% / 0.15)'}`,
                          color: word === s ? 'hsl(38 70% 65%)' : 'hsl(38 70% 55% / 0.8)',
                        }}
                      >
                        {s}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="confirmed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.3, 1] }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                <Sparkles className="h-6 w-6 text-[hsl(16_85%_60%)]" />
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-semibold text-foreground tracking-wide"
              >
                {word.trim()}
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-xs text-foreground/40 italic"
              >
                Pinned to your Blueprint for today.
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Skip */}
        {!submitted && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            onClick={() => onComplete('')}
            className="mt-6 text-[11px] text-foreground/25 hover:text-foreground/40 transition-colors"
          >
            Skip for today
          </motion.button>
        )}
      </motion.div>
    </motion.div>,
    document.body
  );
}
