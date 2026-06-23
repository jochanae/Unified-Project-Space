/**
 * VaultIndexingBar — a "Micro-Thread" that mirrors the dashboard ThoughtStream.
 * Shows a 1px gold line with traveling spark and dynamic status text
 * when Your Vault documents are being processed/extracted.
 * On completion, emits a soft "Aura Bleed" glow with a checkmark.
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface VaultIndexingBarProps {
  userId: string;
  /** When true, renders the full vault-page variant with metadata text */
  detailed?: boolean;
}

// Simulated status phases for the metadata readout
const STATUS_PHASES = [
  'Parsing document structure',
  'Mapping sections & headings',
  'Indexing key terms',
  'Building reference index',
  'Calibrating smart retrieval',
];

export default function VaultIndexingBar({ userId, detailed = false }: VaultIndexingBarProps) {
  const [processing, setProcessing] = useState<{ id: string; title: string }[]>([]);
  const [justCompleted, setJustCompleted] = useState(false);
  const [statusPhase, setStatusPhase] = useState(0);
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (!userId) return;
    let active = true;

    const check = async () => {
      const { data } = await supabase
        .from('knowledge_documents' as any)
        .select('id, title')
        .eq('user_id', userId)
        .eq('content_text', '⏳ Extracting content...')
        .limit(5);

      if (!active) return;
      const current = (data as any[]) || [];

      // Detect completion: was processing, now done
      if (prevCountRef.current > 0 && current.length === 0) {
        setJustCompleted(true);
        setTimeout(() => { if (active) setJustCompleted(false); }, 3500);
      }
      prevCountRef.current = current.length;
      setProcessing(current);
    };

    check();
    const interval = setInterval(check, 3000);
    return () => { active = false; clearInterval(interval); };
  }, [userId]);

  // Cycle through status phases for visual interest
  useEffect(() => {
    if (processing.length === 0) return;
    const interval = setInterval(() => {
      setStatusPhase(prev => (prev + 1) % STATUS_PHASES.length);
    }, 3200);
    return () => clearInterval(interval);
  }, [processing.length]);

  const isActive = processing.length > 0;
  const docName = processing.length === 1 ? processing[0].title : `${processing.length} documents`;

  return (
    <AnimatePresence>
      {(isActive || justCompleted) && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden"
        >
          {/* The 1px Micro-Thread line */}
          <div className="relative h-[1px] w-full">
            {/* Base line */}
            <div
              className="absolute inset-0"
              style={{
                background: justCompleted
                  ? 'linear-gradient(90deg, transparent 5%, hsl(142 70% 50% / 0.5) 50%, transparent 95%)'
                  : 'linear-gradient(90deg, transparent 5%, hsl(var(--primary) / 0.2) 50%, transparent 95%)',
                transition: 'background 0.8s ease',
              }}
            />

            {/* Traveling spark */}
            {isActive && (
              <motion.div
                className="absolute top-0 h-[1px] rounded-full"
                style={{
                  width: 40,
                  background: 'linear-gradient(90deg, transparent, hsl(var(--primary)), hsl(var(--primary) / 0.8), transparent)',
                  boxShadow: '0 0 8px 2px hsl(var(--primary) / 0.4), 0 0 16px 4px hsl(var(--primary) / 0.15)',
                }}
                animate={{ left: ['-10%', '110%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.8 }}
              />
            )}

            {/* Completion glow (Aura Bleed) */}
            {justCompleted && (
              <motion.div
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0.6, 0] }}
                transition={{ duration: 2.5, ease: 'easeOut' }}
                style={{
                  background: 'linear-gradient(90deg, transparent, hsl(142 70% 50% / 0.6), transparent)',
                  boxShadow: '0 0 12px 4px hsl(142 70% 50% / 0.3)',
                }}
              />
            )}
          </div>

          {/* Metadata readout — detailed variant for Vault page */}
          {detailed && (
            <div className="flex items-center gap-2 px-4 py-1.5">
              {justCompleted ? (
                <motion.div
                  className="flex items-center gap-1.5"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                >
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  <span className="text-[8px] uppercase tracking-[0.15em] font-semibold text-emerald-400/80">
                    Index Complete — Ready for queries
                  </span>
                </motion.div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.span
                    key={statusPhase}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.3 }}
                    className="text-[8px] uppercase tracking-[0.15em] font-medium text-primary/60"
                  >
                    {STATUS_PHASES[statusPhase]}… "{docName}"
                  </motion.span>
                </AnimatePresence>
              )}
            </div>
          )}

          {/* Compact label for chat variant */}
          {!detailed && isActive && (
            <div className="flex items-center gap-1.5 px-4 py-1">
              <span className="text-[8px] uppercase tracking-[0.12em] font-medium text-primary/50">
                Indexing {docName}…
              </span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
