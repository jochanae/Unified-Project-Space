import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIncomingCalls } from '@/hooks/useIncomingCalls';
import { supabase } from '@/integrations/supabase/client';
import { sfxRingStart, sfxRingStop } from '@/hooks/useAppSfx';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

/**
 * Full-screen incoming-call sheet. Rings when a companion calls the user.
 * Accept → navigates to /chat/:memberId?call=1 (ChatInterface auto-opens VoiceCallStage).
 * Decline → marks the row declined.
 * Auto-misses after expires_at passes.
 */
export default function IncomingCallOverlay() {
  const { activeCall, dismiss } = useIncomingCalls();
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState(0);
  const ringingRef = useRef(false);

  // Start/stop ringtone with the call
  useEffect(() => {
    if (activeCall && !ringingRef.current) {
      ringingRef.current = true;
      try { toast.dismiss(); } catch {}
      try { sfxRingStart(); } catch {}
      try { if ('vibrate' in navigator) (navigator as any).vibrate?.([400, 200, 400, 200, 400]); } catch {}
    }
    return () => {
      if (ringingRef.current) {
        ringingRef.current = false;
        try { sfxRingStop(); } catch {}
      }
    };
  }, [activeCall?.id]);

  // Auto-miss when expires_at passes
  useEffect(() => {
    if (!activeCall) return;
    setElapsed(0);
    const expiresAt = new Date(activeCall.expires_at).getTime();
    const tick = setInterval(() => {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        handleMiss();
      } else {
        setElapsed((e) => e + 1);
      }
    }, 1000);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCall?.id]);

  const handleMiss = async () => {
    if (!activeCall) return;
    try {
      await supabase
        .from('incoming_calls')
        .update({ status: 'missed', ended_at: new Date().toISOString() })
        .eq('id', activeCall.id);
    } catch (e) {
      logger.warn('[IncomingCall] miss update failed', e);
    }
    dismiss();
  };

  const handleDecline = async () => {
    if (!activeCall) return;
    try {
      await supabase
        .from('incoming_calls')
        .update({ status: 'declined', ended_at: new Date().toISOString() })
        .eq('id', activeCall.id);
    } catch (e) {
      logger.warn('[IncomingCall] decline update failed', e);
    }
    dismiss();
  };

  const handleAccept = async () => {
    if (!activeCall) return;
    // Kill the ringtone + haptic immediately so it doesn't bleed into the call
    try { sfxRingStop(); } catch {}
    try { if ('vibrate' in navigator) (navigator as any).vibrate?.(0); } catch {}
    ringingRef.current = false;
    const memberId = activeCall.member_id;
    // Navigate first so the call screen mounts without delay; update row in background
    navigate(`/chat/${memberId}?call=1`, { replace: true });
    dismiss();
    try {
      await supabase
        .from('incoming_calls')
        .update({ status: 'answered', answered_at: new Date().toISOString() })
        .eq('id', activeCall.id);
    } catch (e) {
      logger.warn('[IncomingCall] accept update failed', e);
    }
  };

  if (!activeCall) return null;

  const overlay = (
    <AnimatePresence>
      <motion.div
        key={activeCall.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        style={{ zIndex: 2147483000 }}
        className="fixed inset-0 flex flex-col items-center justify-between text-white"
      >
        {/* Backdrop with companion avatar bloom — fades in gently so it doesn't feel like a refresh */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="absolute inset-0 bg-black/95"
        />
        {activeCall.companion_avatar_url && (
          <div
            className="absolute inset-0 opacity-30 blur-3xl scale-110"
            style={{
              backgroundImage: `url(${activeCall.companion_avatar_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
          className="relative z-10 flex flex-col items-center w-full px-6 pt-20"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 4rem)' }}
        >
          <p className="text-xs uppercase tracking-[0.3em] text-white/60 mb-3">
            Incoming call
          </p>
          <motion.div
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="relative"
          >
            {activeCall.companion_avatar_url ? (
              <img
                src={activeCall.companion_avatar_url}
                alt={activeCall.companion_name}
                className="w-40 h-40 rounded-2xl object-cover ring-1 ring-white/20 shadow-2xl"
              />
            ) : (
              <div className="w-40 h-40 rounded-2xl bg-white/10 ring-1 ring-white/20 flex items-center justify-center">
                <Phone className="w-12 h-12 text-white/40" />
              </div>
            )}
            <span className="absolute -inset-2 rounded-3xl ring-2 ring-yellow-400/30 animate-[ping_2.4s_ease-out_infinite]" />
          </motion.div>
          <h2 className="mt-8 text-3xl font-serif tracking-wide">
            {activeCall.companion_name}
          </h2>
          {activeCall.opener_line && (
            <p className="mt-3 text-sm text-white/70 italic text-center max-w-xs">
              "{activeCall.opener_line}"
            </p>
          )}
          <p className="mt-2 text-xs text-white/40">ringing… {elapsed}s</p>
        </motion.div>

        {/* Actions */}
        <div
          className="relative z-10 flex items-center justify-around w-full px-10 pb-12"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 3rem)' }}
        >
          <button
            onClick={handleDecline}
            aria-label="Decline call"
            className="flex flex-col items-center gap-2 group"
          >
            <span className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg group-active:scale-95 transition-transform">
              <PhoneOff className="w-7 h-7 text-white" />
            </span>
            <span className="text-xs text-white/70">Decline</span>
          </button>
          <button
            onClick={handleAccept}
            aria-label="Accept call"
            className="flex flex-col items-center gap-2 group"
          >
            <motion.span
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg group-active:scale-95 transition-transform"
            >
              <Phone className="w-7 h-7 text-white" />
            </motion.span>
            <span className="text-xs text-white/70">Accept</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
}
