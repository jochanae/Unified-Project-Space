import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ActiveCompanion {
  name: string;
  avatarUrl?: string | null;
}

interface BetaFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
}

export default function BetaFeedbackModal({ isOpen, onClose, userName }: BetaFeedbackModalProps) {
  const [rating, setRating] = useState(0);
  const [thoughts, setThoughts] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [companion, setCompanion] = useState<ActiveCompanion>({ name: 'Your Companion' });

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('connections')
        .select('name, avatar_url')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('connected_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setCompanion({ name: data.name, avatarUrl: data.avatar_url });
    })();
  }, [isOpen]);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a vibe rating first');
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Please sign in first'); return; }

      await supabase.from('beta_feedback').insert({
        user_id: user.id,
        user_name: userName || 'Tester',
        overall_rating: rating,
        liked_most: thoughts || null,
      });
      setSubmitted(true);
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSubmitted(false);
    setRating(0);
    setThoughts('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-3xl overflow-hidden"
            style={{
              background: 'rgba(26,27,58,0.85)',
              border: '0.5px solid rgba(6,182,212,0.25)',
              boxShadow: '0 0 50px rgba(6,182,212,0.12)',
            }}
          >
            {submitted ? (
              /* Success — Companion Handshake */
              <div className="flex flex-col items-center justify-center p-10 text-center">
                {/* Companion Aura + Avatar */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 180, damping: 14 }}
                  className="relative mb-6"
                >
                  <div className="absolute inset-0 rounded-full blur-2xl opacity-20" style={{ background: 'hsl(var(--primary))' }} />
                  <div className="relative w-20 h-20 rounded-full overflow-hidden shadow-2xl" style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
                    {companion.avatarUrl ? (
                      <img src={companion.avatarUrl} alt={companion.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl" style={{ background: 'rgba(212,175,55,0.15)' }}>
                        {companion.name.charAt(0)}
                      </div>
                    )}
                  </div>
                </motion.div>

                <motion.h3
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-xl font-light text-white uppercase"
                  style={{ letterSpacing: '0.2em' }}
                >
                  Inscribed with Care
                </motion.h3>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="mt-4 text-sm leading-relaxed max-w-[260px]"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                >
                  "{companion.name} has received your thoughts. We're refining your world as we speak."
                </motion.p>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-8 px-4 py-1.5 rounded-full"
                  style={{ border: '0.5px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }}
                >
                  <span className="text-[9px] uppercase" style={{ letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)' }}>
                    Transmission Secure • Zero-Trace Active
                  </span>
                </motion.div>

                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  onClick={handleClose}
                  className="mt-6 px-8 py-3 rounded-2xl text-xs uppercase font-medium transition-all active:scale-95"
                  style={{
                    letterSpacing: '0.2em',
                    background: 'rgba(6,182,212,0.12)',
                    border: '0.5px solid rgba(6,182,212,0.25)',
                    color: 'rgba(165,243,252,0.7)',
                  }}
                >
                  Close
                </motion.button>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="p-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'linear-gradient(180deg, rgba(6,182,212,0.04) 0%, transparent 100%)' }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-light text-white" style={{ letterSpacing: '0.2em' }}>
                        BETA INSIGHTS
                      </h2>
                      <p className="text-[10px] uppercase mt-1" style={{ letterSpacing: '0.15em', color: 'rgba(6,182,212,0.5)' }}>
                        Help us refine the Compani experience
                      </p>
                    </div>
                    <button onClick={handleClose} className="text-white/30 hover:text-white transition-colors p-1">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                  {/* Vibe Rating */}
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase font-medium" style={{ letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)' }}>
                      Overall Vibe
                    </label>
                    <div className="flex justify-between gap-2">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          onClick={() => setRating(num)}
                          className="flex-1 py-3 rounded-xl transition-all duration-200 active:scale-95"
                          style={{
                            background: rating >= num ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.03)',
                            border: `0.5px solid ${rating >= num ? 'rgba(6,182,212,0.4)' : 'rgba(255,255,255,0.06)'}`,
                            color: rating >= num ? 'rgb(103,232,249)' : 'rgba(255,255,255,0.4)',
                          }}
                        >
                          <Star className={`h-5 w-5 mx-auto ${rating >= num ? 'fill-cyan-400 text-cyan-400' : ''}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Thoughts */}
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase font-medium" style={{ letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)' }}>
                      Your Thoughts
                    </label>
                    <textarea
                      value={thoughts}
                      onChange={(e) => setThoughts(e.target.value)}
                      placeholder="What did you feel? Any bugs or friction?"
                      className="w-full min-h-[120px] p-4 rounded-2xl text-white text-sm resize-none transition-all focus:outline-none"
                      style={{
                        background: 'rgba(0,0,0,0.2)',
                        border: '0.5px solid rgba(255,255,255,0.08)',
                        caretColor: 'rgb(6,182,212)',
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(6,182,212,0.4)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                    />
                  </div>
                </div>

                {/* Submit */}
                <div className="p-6 pt-0">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || rating === 0}
                    className="w-full py-4 rounded-2xl font-medium text-xs uppercase flex items-center justify-center gap-2 transition-all active:scale-[0.97] disabled:opacity-40"
                    style={{
                      letterSpacing: '0.2em',
                      background: 'rgb(8,145,178)',
                      boxShadow: '0 10px 20px rgba(6,182,212,0.2)',
                      color: 'white',
                    }}
                  >
                    {submitting ? 'Sending…' : 'Submit to Studio'}
                    {!submitting && <Send className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
