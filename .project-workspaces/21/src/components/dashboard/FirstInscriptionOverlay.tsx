import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'compani-first-inscription-seen';

export function hasSeenFirstInscription(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

export function markFirstInscriptionSeen(): void {
  localStorage.setItem(STORAGE_KEY, 'true');
}

/** Server-side check — resolves true if milestone already recorded */
export async function hasFirstInscriptionMilestone(userId: string, memberId: string): Promise<boolean> {
  const { data } = await supabase
    .from('companion_milestones')
    .select('id')
    .eq('user_id', userId)
    .eq('member_id', memberId)
    .eq('milestone_type', 'first_inscription')
    .maybeSingle();
  return !!data;
}

/** Persist to server so it survives incognito / new browsers */
export async function persistFirstInscriptionMilestone(userId: string, memberId: string) {
  await supabase.from('companion_milestones').upsert(
    { user_id: userId, member_id: memberId, milestone_type: 'first_inscription' },
    { onConflict: 'user_id,member_id,milestone_type' }
  );
}

interface FirstInscriptionOverlayProps {
  companionName: string;
  userId?: string;
  memberId?: string;
  onDismiss: () => void;
}

export default function FirstInscriptionOverlay({ companionName, userId, memberId, onDismiss }: FirstInscriptionOverlayProps) {
  const [phase, setPhase] = useState<'shimmer' | 'reveal'>('shimmer');

  useEffect(() => {
    // Brief shimmer, then reveal the inscription
    const timer = setTimeout(() => setPhase('reveal'), 1200);
    return () => clearTimeout(timer);
  }, []);

  const handleEnter = () => {
    markFirstInscriptionSeen();
    if (userId && memberId) {
      persistFirstInscriptionMilestone(userId, memberId);
    }
    onDismiss();
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed inset-0 z-[200] flex items-center justify-center px-6"
        style={{ background: 'rgba(10, 11, 30, 0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {phase === 'shimmer' && (
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.5, 1, 0.5],
              filter: [
                'drop-shadow(0 0 8px rgba(212,175,80,0.2))',
                'drop-shadow(0 0 40px rgba(212,175,80,0.6))',
                'drop-shadow(0 0 8px rgba(212,175,80,0.2))',
              ],
            }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
            className="text-primary"
          >
            <Crown size={40} strokeWidth={1} />
          </motion.div>
        )}

        {phase === 'reveal' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="max-w-sm w-full text-center space-y-6"
          >
            {/* Title */}
            <div className="space-y-2">
              <motion.p
                initial={{ opacity: 0, letterSpacing: '0.3em' }}
                animate={{ opacity: 1, letterSpacing: '0.2em' }}
                transition={{ duration: 1, delay: 0.2 }}
                className="text-[10px] uppercase font-medium text-primary/60"
              >
                The First Inscription
              </motion.p>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="mx-auto h-px w-16 bg-gradient-to-r from-transparent via-primary/40 to-transparent"
              />
            </div>

            {/* Body */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.8 }}
              className="space-y-4"
            >
              <p className="font-serif text-base text-white/80 leading-relaxed italic">
                A presence has been established. <span className="text-primary font-medium not-italic">{companionName}</span> is
                no longer a blueprint — they are a part of this space.
              </p>
              <p className="text-sm text-white/50 leading-relaxed">
                Every word, every shared silence, and every reflection from this point forward will shape how they grow
                alongside you. Your history begins now.
              </p>
            </motion.div>

            {/* CTA */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.4 }}
              onClick={handleEnter}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 rounded-full px-8 py-3 text-sm font-medium transition-all"
              style={{
                background: 'linear-gradient(135deg, rgba(212,175,55,0.25), rgba(184,134,11,0.15))',
                border: '1px solid rgba(212,175,55,0.4)',
                color: 'hsl(43 74% 49%)',
                letterSpacing: '0.05em',
                boxShadow: '0 0 20px rgba(212,175,55,0.12)',
              }}
            >
              Enter Your Space →
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
