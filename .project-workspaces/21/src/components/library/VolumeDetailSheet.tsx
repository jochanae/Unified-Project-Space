import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Sparkles, Shield, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Memory {
  id: string;
  text: string;
  category: string;
  extracted_at: string;
}

interface VolumeDetailSheetProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  /** e.g. "2026-03" */
  monthKey: string;
  /** e.g. "Mar 2026" */
  title: string;
}

const CATEGORY_META: Record<string, { icon: typeof Heart; color: string }> = {
  general: { icon: Sparkles, color: 'text-primary' },
  emotional: { icon: Heart, color: 'text-accent' },
  wellness: { icon: Shield, color: 'text-primary' },
};

export default function VolumeDetailSheet({ open, onClose, userId, monthKey, title }: VolumeDetailSheetProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !userId || !monthKey) return;

    const [year, month] = monthKey.split('-').map(Number);
    const start = new Date(year, month - 1, 1).toISOString();
    const end = new Date(year, month, 1).toISOString();

    setLoading(true);
    supabase
      .from('memories')
      .select('id, text, category, extracted_at')
      .eq('user_id', userId)
      .gte('extracted_at', start)
      .lt('extracted_at', end)
      .order('extracted_at', { ascending: false })
      .then(({ data }) => {
        setMemories((data as Memory[]) || []);
        setLoading(false);
      });
  }, [open, userId, monthKey]);

  // Group by day
  const groups = useMemo(() => {
    const map = new Map<string, Memory[]>();
    for (const m of memories) {
      const day = new Date(m.extracted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(m);
    }
    return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
  }, [memories]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-lg rounded-t-2xl max-h-[80vh] overflow-y-auto pb-28"
            style={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(0 0% 100% / 0.08)',
              borderBottom: 'none',
            }}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 pt-5 pb-3 rounded-t-2xl" style={{ background: 'hsl(var(--card))' }}>
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: 'hsl(43 74% 49% / 0.15)', border: '1px solid hsl(43 74% 49% / 0.25)' }}>
                  <BookOpen className="h-3.5 w-3.5" style={{ color: 'hsl(43 74% 49%)' }} />
                </div>
                <h3
                  className="font-serif text-base font-bold"
                  style={{
                    background: 'linear-gradient(135deg, hsl(43 74% 65%), hsl(43 74% 49%))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {title}
                </h3>
              </div>
              <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Animated divider */}
            <div className="onboarding-progress-container mx-5 mb-4" style={{ width: 'calc(100% - 2.5rem)' }}>
              <div className="blueprint-energy-line" />
            </div>

            {/* Content */}
            <div className="px-5">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
              ) : memories.length === 0 ? (
                <p className="text-xs text-muted-foreground/50 text-center py-10">
                  No memories found for this month.
                </p>
              ) : (
                <div className="space-y-5">
                  {groups.map(group => (
                    <div key={group.label}>
                      <div className="flex items-center gap-3 mb-2.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                          {group.label}
                        </span>
                        <div className="flex-1 h-px bg-border/30" />
                      </div>

                      <div className="space-y-2 pl-1">
                        {group.items.map((m, i) => {
                          const meta = CATEGORY_META[m.category] || CATEGORY_META.general;
                          const Icon = meta.icon;
                          return (
                            <motion.div
                              key={m.id}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.03 }}
                              className="flex items-start gap-3"
                            >
                              <div className="flex flex-col items-center mt-1 shrink-0">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-card border border-border/40">
                                  <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                                </div>
                              </div>
                              <div className="flex-1 rounded-2xl px-4 py-3 bg-card/40 backdrop-blur-sm border border-white/10">
                                <p className="text-[13px] text-foreground/90 leading-relaxed">
                                  {m.text}
                                </p>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  <p className="text-[10px] text-muted-foreground/40 text-center pt-2 pb-4">
                    {memories.length} {memories.length === 1 ? 'memory' : 'memories'} in {title}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
