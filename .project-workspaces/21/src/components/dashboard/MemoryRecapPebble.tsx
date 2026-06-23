/**
 * MemoryRecapPebble — A frosted "glass pebble" on the dashboard that surfaces
 * a random past memory, encouraging users to explore the Story timeline.
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface MemoryRecapPebbleProps {
  userId: string;
  companionName?: string;
  onOpenTimeline?: () => void;
}

interface MemorySnippet {
  text: string;
  category: string;
  extracted_at: string;
}

export default function MemoryRecapPebble({ userId, companionName, onOpenTimeline }: MemoryRecapPebbleProps) {
  const [memory, setMemory] = useState<MemorySnippet | null>(null);

  useEffect(() => {
    if (!userId) return;
    const fetch = async () => {
      // Grab a random memory from 7+ days ago for nostalgic value
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('memories')
        .select('text, category, extracted_at')
        .eq('user_id', userId)
        .lt('extracted_at', cutoff)
        .order('extracted_at', { ascending: false })
        .limit(20);

      if (data && data.length > 0) {
        // Pick a pseudo-random one based on the day
        const daySeed = new Date().getDate() + new Date().getMonth() * 31;
        setMemory(data[daySeed % data.length]);
      }
    };
    fetch();
  }, [userId]);

  if (!memory) return null;

  const daysAgo = Math.floor(
    (Date.now() - new Date(memory.extracted_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  const timeLabel = daysAgo >= 30
    ? `${Math.floor(daysAgo / 30)} month${Math.floor(daysAgo / 30) > 1 ? 's' : ''} ago`
    : `${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`;

  return (
    <motion.button
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05, ease: 'easeOut' }}
      onClick={() => onOpenTimeline?.()}
      className="w-full text-left rounded-2xl px-4 py-3 mb-2 bg-white/5 backdrop-blur-sm border-[0.5px] border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_0_1px_rgba(212,175,80,0.25),0_0_12px_rgba(212,175,80,0.08)] active:scale-[0.98] transition-transform overflow-hidden"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
          <Clock className="h-4 w-4 text-primary/60" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium tracking-wide uppercase text-white/60 mb-1" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
            💭 A Memory · {timeLabel}
          </p>
          <p className="text-sm text-foreground/80 italic leading-relaxed line-clamp-2">
            "{memory.text}"
          </p>
          {companionName && (
            <p className="text-[10px] text-muted-foreground/40 mt-1.5">
              remembered by {companionName}
            </p>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-white/30 shrink-0 mt-2" />
      </div>
    </motion.button>
  );
}
