import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Sparkles, Shield, BookOpen, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Memory {
  id: string;
  text: string;
  category: string;
  extracted_at: string;
}

interface MemoryTimelineSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  companionName: string;
}

const CATEGORY_ICON: Record<string, { icon: typeof Heart; color: string }> = {
  general: { icon: Sparkles, color: 'text-primary' },
  emotional: { icon: Heart, color: 'text-accent' },
  wellness: { icon: Shield, color: 'text-primary' },
};

const FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'general', label: 'Life' },
  { key: 'emotional', label: 'Heart' },
  { key: 'wellness', label: 'Wellbeing' },
];

function formatTimelineDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function groupByDate(memories: Memory[]): { label: string; items: Memory[] }[] {
  const groups: Map<string, Memory[]> = new Map();

  for (const m of memories) {
    const label = formatTimelineDate(m.extracted_at);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(m);
  }

  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

export default function MemoryTimelineSheet({ open, onOpenChange, userId, companionName }: MemoryTimelineSheetProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!open || !userId) return;
    setLoading(true);
    supabase
      .from('memories')
      .select('id, text, category, extracted_at')
      .eq('user_id', userId)
      .order('extracted_at', { ascending: false })
      .then(({ data }) => {
        setMemories((data as Memory[]) || []);
        setLoading(false);
      });
  }, [open, userId]);

  const filtered = useMemo(() => {
    if (filter === 'all') return memories;
    return memories.filter(m => m.category === filter);
  }, [memories, filter]);

  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background touch-pan-y"
          style={{ overscrollBehavior: 'contain' }}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="flex flex-col h-full"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/30 shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onOpenChange(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors text-white/70"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 border border-primary/20">
                  <BookOpen className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-foreground">
                    Your Story with {companionName}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {memories.length} {memories.length === 1 ? 'moment' : 'moments'} remembered
                  </p>
                </div>
              </div>
            </div>

            {/* Filter chips */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-border/20 shrink-0 overflow-x-auto">
              {FILTER_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setFilter(opt.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors shrink-0 ${
                    filter === opt.key
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'bg-muted/40 text-muted-foreground hover:bg-muted/60 border border-transparent'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Timeline content */}
            <div className="flex-1 overflow-y-auto px-5 pb-40 touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                    <BookOpen className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No moments yet</p>
                  <p className="text-xs text-muted-foreground/70 max-w-[260px]">
                    Keep chatting with {companionName} — meaningful moments from your conversations will appear here.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-6">
                  {groups.map(group => (
                    <div key={group.label}>
                      {/* Date header */}
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                          {group.label}
                        </span>
                        <div className="flex-1 h-px bg-border/30" />
                      </div>

                      {/* Memory cards */}
                      <div className="space-y-2.5 pl-1">
                        {group.items.map((m, i) => {
                          const meta = CATEGORY_ICON[m.category] || CATEGORY_ICON.general;
                          const Icon = meta.icon;
                          return (
                            <motion.div
                              key={m.id}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.03 }}
                              className="flex items-start gap-3"
                            >
                              {/* Timeline dot */}
                              <div className="flex flex-col items-center mt-1 shrink-0">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-card border border-border/40">
                                  <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                                </div>
                              </div>

                              {/* Card */}
                              <div className="flex-1 rounded-2xl px-4 py-3 bg-card/40 backdrop-blur-sm border border-white/10">
                                <p className="text-[13px] text-foreground/90 leading-relaxed">
                                  {m.text}
                                </p>
                                <p className="text-[10px] text-muted-foreground/50 mt-1.5">
                                  {new Date(m.extracted_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </p>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
