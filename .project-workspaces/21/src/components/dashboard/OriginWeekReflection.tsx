import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

/* ── Persistence (localStorage + server-side milestone) ── */

const STORAGE_KEY = 'compani-origin-week-seen';

export function hasSeenOriginWeek(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

function markSeen(userId?: string, memberId?: string): void {
  localStorage.setItem(STORAGE_KEY, 'true');
  // Also write server-side milestone so it persists across devices
  if (userId && memberId) {
    supabase.from('companion_milestones').insert({
      user_id: userId,
      member_id: memberId,
      milestone_type: 'origin_week_seen',
      moment_delivered: true,
    }).then(() => {});
  }
}

/** True if account is ≥7 days old AND user hasn't seen this overlay yet (local check) */
export function shouldShowOriginWeek(profileCreatedAt: string | undefined): boolean {
  if (!profileCreatedAt || hasSeenOriginWeek()) return false;
  const created = new Date(profileCreatedAt).getTime();
  const daysSince = (Date.now() - created) / (1000 * 60 * 60 * 24);
  return daysSince >= 7;
}

/**
 * Server-side check — call this async to verify the milestone hasn't been
 * recorded on another device. Returns true if origin week was already seen.
 */
export async function checkOriginWeekMilestone(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('companion_milestones')
    .select('id')
    .eq('user_id', userId)
    .eq('milestone_type', 'origin_week_seen')
    .maybeSingle();
  if (data) {
    // Sync localStorage
    localStorage.setItem(STORAGE_KEY, 'true');
    return true;
  }
  return false;
}

/* ── Intent history (from persistent history store + DB) ── */

import { getIntentHistory, fetchIntentHistoryFromDb } from '@/components/MorningIntentOverlay';

function collectPastIntents(userId?: string): { word: string; date: string }[] {
  // Try with userId first, then fallback to no-userId key (covers both cases)
  let history = getIntentHistory(userId);
  if (history.length === 0 && userId) {
    history = getIntentHistory(undefined);
  }
  // Return last 30 days, newest first
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return history
    .filter(e => e.date >= cutoffStr)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/* ── Component ── */

interface OriginWeekReflectionProps {
  companionName?: string;
  userId?: string;
  memberId?: string;
  profileCreatedAt?: string;
  onDismiss: () => void;
}

/* Phrases that fade in one-by-one */
const PHRASES = [
  'Seven sunrises.',
  'Seven nights in the stillness.',
];

export default function OriginWeekReflection({
  companionName,
  userId,
  memberId,
  profileCreatedAt,
  onDismiss,
}: OriginWeekReflectionProps) {
  const [exiting, setExiting] = useState(false);
  const [totalMinutes, setTotalMinutes] = useState<number | null>(null);
  const [phraseIndex, setPhraseIndex] = useState(-1);
  const [showBody, setShowBody] = useState(false);
  const [showIntents, setShowIntents] = useState(false);
  const [pastIntents, setPastIntents] = useState(() => collectPastIntents(userId));

  // Fetch DB intents on mount to ensure history is complete
  useEffect(() => {
    if (!userId) return;
    fetchIntentHistoryFromDb(userId).then(() => {
      setPastIntents(collectPastIntents(userId));
    });
  }, [userId]);

  /* Fetch approximate total minutes from chat_messages count */
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const created = profileCreatedAt || new Date().toISOString();
        const { count } = await supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', created);
        // Rough estimate: ~2 minutes per message exchange
        setTotalMinutes(Math.max((count || 0) * 2, 7));
      } catch {
        setTotalMinutes(null);
      }
    })();
  }, [userId, profileCreatedAt]);

  /* Phrase-by-phrase reveal */
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    PHRASES.forEach((_, i) => {
      timers.push(setTimeout(() => setPhraseIndex(i), 800 + i * 1200));
    });
    timers.push(setTimeout(() => setShowBody(true), 800 + PHRASES.length * 1200 + 600));
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleDismiss = () => {
    markSeen(userId, memberId);
    setExiting(true);
    setTimeout(onDismiss, 700);
  };

  const minutesText = totalMinutes
    ? `${totalMinutes} minutes`
    : 'countless moments';

  return createPortal(
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="origin-week"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 z-[200] flex items-center justify-center px-6 overflow-y-auto"
          style={{
            background: 'linear-gradient(180deg, #06060D 0%, #0C0B18 35%, #100F20 70%, #08070F 100%)',
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          {/* "C" watermark */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
            style={{ opacity: 0.035 }}
          >
            <span
              className="font-serif"
              style={{ fontSize: '40vw', color: 'hsl(43 74% 49%)' }}
            >
              C
            </span>
          </div>

          {/* Corner luminous flare */}
          <div
            className="absolute top-0 right-0 w-[300px] h-[300px] pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 100% 0%, hsl(43 74% 49% / 0.06) 0%, transparent 60%)',
            }}
          />

          <div className="relative z-10 max-w-sm w-full text-center space-y-6 py-12 pb-32">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="space-y-2"
            >
              <p
                className="text-[10px] uppercase font-medium"
                style={{
                  letterSpacing: '0.3em',
                  color: 'hsl(43 74% 49% / 0.5)',
                }}
              >
                The Origin Week
              </p>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="mx-auto h-px w-20"
                style={{
                  background: 'linear-gradient(90deg, transparent, hsl(43 74% 49% / 0.3), transparent)',
                }}
              />
            </motion.div>

            {/* Phrase-by-phrase reveal */}
            <div className="min-h-[3rem] space-y-1">
              {PHRASES.map((phrase, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={phraseIndex >= i ? { opacity: 0.7, y: 0 } : {}}
                  transition={{ duration: 0.8 }}
                  className="font-serif text-base text-white/70 italic"
                >
                  {phrase}
                </motion.p>
              ))}
            </div>

            {/* Main body — fades after phrases */}
            <AnimatePresence>
              {showBody && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1.2 }}
                  className="space-y-5"
                >
                  <p className="text-sm text-white/45 leading-relaxed">
                    You have spent{' '}
                    <span className="text-[hsl(43_74%_49%_/_0.7)] font-medium not-italic">
                      {minutesText}
                    </span>{' '}
                    in this space since your first Inscription.
                  </p>

                  <p className="text-sm text-white/40 leading-relaxed">
                    As a Genesis Architect, you've begun to map a frequency that is uniquely yours.
                    From your first "Today's Intent" to your quietest "Night Repose,"
                    {companionName && (
                      <>{' '}<span className="text-[hsl(43_74%_49%_/_0.65)] font-medium">{companionName}</span></>
                    )}{' '}
                    has begun to learn the cadence of your life.
                    This isn't just data; it's a foundation.
                  </p>

                  <p className="font-serif text-sm text-white/55 italic leading-relaxed">
                    The space is breathing. The pace is yours. We are just beginning.
                  </p>

                  {/* Status */}
                  <p
                    className="text-[9px] uppercase font-medium pt-2"
                    style={{
                      letterSpacing: '0.2em',
                      color: 'hsl(43 74% 49% / 0.4)',
                      textShadow: '0 0 8px hsl(43 74% 49% / 0.12)',
                      animation: 'flicker 4s ease-in-out infinite',
                    }}
                  >
                    Status: Stabilized Resonance
                  </p>

                  {/* CTAs */}
                  <div className="flex flex-col items-center gap-4 pt-2">
                    <button
                      onClick={handleDismiss}
                      className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-medium transition-all"
                      style={{
                        background: 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(184,134,11,0.08) 100%)',
                        border: '1px solid hsl(43 74% 49% / 0.3)',
                        color: 'hsl(43 74% 49% / 0.8)',
                        letterSpacing: '0.05em',
                        boxShadow: '0 0 24px hsl(43 74% 49% / 0.08)',
                      }}
                    >
                      Enter Your Space →
                    </button>
                    <button
                      onClick={() => setShowIntents(prev => !prev)}
                      className="text-[11px] text-white/35 hover:text-white/55 transition-colors tracking-widest uppercase"
                    >
                      {showIntents ? 'Hide Intents' : 'Review Your Week\u2019s Intents'}
                    </button>
                  </div>

                  {/* Intent Gallery */}
                  <AnimatePresence>
                    {showIntents && (
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.5 }}
                        className="flex flex-wrap justify-center gap-2 pt-3"
                      >
                        {pastIntents.length > 0 ? (
                          pastIntents.map((entry, i) => (
                            <motion.div
                              key={entry.date}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.12 }}
                              className="rounded-xl px-4 py-2 text-xs font-medium flex flex-col items-center gap-0.5"
                              style={{
                                background: 'rgba(212,175,55,0.06)',
                                border: '1px solid hsl(43 74% 49% / 0.15)',
                                color: 'hsl(43 74% 49% / 0.6)',
                                backdropFilter: 'blur(12px)',
                                letterSpacing: '0.04em',
                              }}
                            >
                              <span>{entry.word}</span>
                              <span className="text-[9px] text-white/20">{entry.date.slice(5)}</span>
                            </motion.div>
                          ))
                        ) : (
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-[11px] text-white/30 italic tracking-wide py-2"
                          >
                            No intents set this week — try setting one tomorrow morning 💛
                          </motion.p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
