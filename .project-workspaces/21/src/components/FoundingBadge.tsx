/**
 * FoundingBadge — Micro gold-bordered circle overlay showing the user's
 * beta serial number (e.g. #001). Renders at bottom-right of a parent
 * avatar via absolute positioning. Only shows if the user has a serial.
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface FoundingBadgeProps {
  /** Override: pass serial directly instead of fetching */
  serial?: number | null;
  /** Size variant */
  size?: 'sm' | 'md';
}

export default function FoundingBadge({ serial: serialOverride, size = 'md' }: FoundingBadgeProps) {
  const [fetched, setFetched] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (serialOverride !== undefined) return;
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from('beta_serial_numbers')
        .select('serial_number')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!cancelled && data) setFetched(data.serial_number);
    })();
    return () => { cancelled = true; };
  }, [serialOverride]);

  const serial = serialOverride ?? fetched;

  if (!serial || serial < 1) return null;

  const formatted = `#${String(serial).padStart(3, '0')}`;
  const isSm = size === 'sm';

  return (
    <motion.button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigate('/certificate');
      }}
      aria-label="View your founding member certificate"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.3 }}
      className="absolute flex items-center justify-center rounded-full select-none cursor-pointer hover:brightness-125 transition-[filter] z-10"
      style={{
        bottom: isSm ? '-2px' : '-3px',
        left: isSm ? '-2px' : '-4px',
        height: isSm ? '14px' : '16px',
        minWidth: isSm ? '22px' : '26px',
        padding: '0 3px',
        background: 'rgba(15,18,33,0.92)',
        border: '1.5px solid rgba(212,175,55,0.6)',
        boxShadow: '0 0 10px rgba(212,175,55,0.25), 0 2px 6px rgba(0,0,0,0.4)',
        fontSize: isSm ? '7px' : '8px',
        fontWeight: 700,
        letterSpacing: '0.04em',
        color: 'rgb(212,175,55)',
        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
        textShadow: '0 0 6px rgba(212,175,55,0.5)',
        lineHeight: 1,
      }}
    >
      {formatted}
    </motion.button>
  );
}
