import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Star, Search, X, ChevronRight, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import VolumeDetailSheet from './library/VolumeDetailSheet';

interface VaultVolume {
  id: string;
  title: string;
  subtitle: string;
  memoryCount: number;
  type: 'monthly' | 'theme';
}

interface CoreMemory {
  id: string;
  text: string;
  category: string;
  date: string;
}

interface LibraryOfYouProps {
  userId: string;
  companionName: string;
}

function SpineCard({ volume, index, onTap }: { volume: VaultVolume; index: number; onTap: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className="library-spine shrink-0 snap-start"
      whileTap={{ scale: 0.95, rotateY: -5 }}
      onClick={onTap}
    >
      <div className="flex-1 flex items-start pt-1">
        <Brain className="h-3 w-3 shrink-0" style={{ color: 'hsl(43 74% 49% / 0.5)' }} />
      </div>
      <div className="flex flex-col gap-1">
        <span className="spine-title">{volume.title}</span>
        <span className="text-[9px] text-muted-foreground/60 mt-1">
          {volume.memoryCount} memories
        </span>
      </div>
    </motion.button>
  );
}

function CoreMemoryCard({ memory, index }: { memory: CoreMemory; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className="core-memory-card"
    >
      {/* Ember sparkle positioned top-right */}
      <span className="core-memory-sparkle">✨</span>

      <div className="flex items-start gap-3">
        <Star className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'hsl(43 74% 49%)' }} fill="hsl(43 74% 49%)" />
        <div className="min-w-0 flex-1">
          <p
            className="text-sm leading-[1.7] italic"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              color: 'hsl(0 0% 100% / 0.88)',
              textShadow: '0 1px 6px rgba(0,0,0,0.5)',
            }}
          >
            "{memory.text}"
          </p>
          <p className="text-[10px] mt-2.5 font-medium uppercase tracking-[0.12em]" style={{ color: 'hsl(43 74% 49% / 0.6)' }}>
            {memory.category} · {memory.date}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function LibraryOfYou({ userId, companionName }: LibraryOfYouProps) {
  const [volumes, setVolumes] = useState<VaultVolume[]>([]);
  const [coreMemories, setCoreMemories] = useState<CoreMemory[]>([]);
  const [reflectOpen, setReflectOpen] = useState(false);
  const [reflectQuery, setReflectQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CoreMemory[]>([]);
  const [openVolume, setOpenVolume] = useState<VaultVolume | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Build monthly volumes from memories
    const loadLibrary = async () => {
      const { data: memories } = await supabase
        .from('memories')
        .select('id, text, category, extracted_at, source')
        .eq('user_id', userId)
        .order('extracted_at', { ascending: false })
        .limit(200);

      if (!memories || memories.length === 0) return;

      // Group by month
      const monthMap = new Map<string, typeof memories>();
      for (const m of memories) {
        const d = new Date(m.extracted_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthMap.has(key)) monthMap.set(key, []);
        monthMap.get(key)!.push(m);
      }

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const vols: VaultVolume[] = [];
      for (const [key, items] of monthMap) {
        const [y, m] = key.split('-');
        const monthIdx = parseInt(m) - 1;
        // Pick a thematic subtitle from the most common category
        const cats = items.map(i => i.category);
        const topCat = cats.sort((a, b) =>
          cats.filter(c => c === b).length - cats.filter(c => c === a).length
        )[0] || 'growth';

        vols.push({
          id: key,
          title: `${monthNames[monthIdx]} ${y}`,
          subtitle: topCat.charAt(0).toUpperCase() + topCat.slice(1),
          memoryCount: items.length,
          type: 'monthly',
        });
      }
      setVolumes(vols.slice(0, 12));

      // Core memories: emotional category or consolidated
      const core = memories
        .filter(m => m.category === 'emotional' || m.source === 'consolidated')
        .slice(0, 5)
        .map(m => ({
          id: m.id,
          text: m.text,
          category: m.category,
          date: new Date(m.extracted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        }));
      setCoreMemories(core);
    };

    loadLibrary();
  }, [userId]);

  const handleReflect = async () => {
    if (!reflectQuery.trim()) return;
    const { data } = await supabase
      .from('memories')
      .select('id, text, category, extracted_at')
      .eq('user_id', userId)
      .ilike('text', `%${reflectQuery}%`)
      .order('extracted_at', { ascending: false })
      .limit(10);

    setSearchResults(
      (data || []).map(m => ({
        id: m.id,
        text: m.text,
        category: m.category,
        date: new Date(m.extracted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      }))
    );
  };

  if (volumes.length === 0 && coreMemories.length === 0) return null;

  return (
    <div className="mt-6 mb-4">
      {/* Section header */}
      <div className="flex items-center justify-between px-4 mb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" style={{ color: 'hsl(43 74% 49% / 0.7)' }} />
          <h3
            className="font-serif text-sm font-bold tracking-wide"
            style={{
              background: 'linear-gradient(135deg, hsl(43 74% 65%), hsl(43 74% 49%))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Library of You
          </h3>
        </div>
        <button
          onClick={() => setReflectOpen(true)}
          className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors"
          style={{
            background: 'hsl(0 0% 100% / 0.05)',
            color: 'hsl(43 74% 49% / 0.7)',
            border: '1px solid hsl(43 74% 49% / 0.15)',
          }}
        >
          <Search className="h-3 w-3" /> Reflect
        </button>
      </div>

      {/* Book Spine Carousel — The Vault */}
      {volumes.length > 0 && (
        <div className="overflow-x-auto scrollbar-hide px-4 -mx-0">
          <div className="flex gap-3 pb-2 snap-x snap-mandatory">
            {volumes.map((v, i) => (
              <SpineCard key={v.id} volume={v} index={i} onTap={() => setOpenVolume(v)} />
            ))}
          </div>
        </div>
      )}

      {/* Core Memories */}
      {coreMemories.length > 0 && (
        <div className="px-4 mt-4">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Star className="h-3 w-3" style={{ color: 'hsl(43 74% 49%)' }} fill="hsl(43 74% 49%)" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">
              Core Memories
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {coreMemories.map((m, i) => (
              <CoreMemoryCard key={m.id} memory={m} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Reflect Sheet */}
      <AnimatePresence>
        {reflectOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setReflectOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg rounded-t-2xl p-5 max-h-[70vh] overflow-y-auto pb-24"
              style={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(0 0% 100% / 0.08)',
                borderBottom: 'none',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3
                  className="font-serif text-base font-bold"
                  style={{
                    background: 'linear-gradient(135deg, hsl(43 74% 65%), hsl(43 74% 49%))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Reflect
                </h3>
                <button onClick={() => setReflectOpen(false)} className="rounded-full p-1 hover:bg-muted transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <div className="flex gap-2 mb-4">
                <input
                  value={reflectQuery}
                  onChange={e => setReflectQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleReflect()}
                  placeholder="Search your memories…"
                  className="flex-1 rounded-xl px-3 py-2 text-sm bg-background/50 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-amber-500/30"
                />
                <button
                  onClick={handleReflect}
                  className="rounded-xl px-3 py-2 text-xs font-medium"
                  style={{
                    background: 'hsl(43 74% 49% / 0.15)',
                    color: 'hsl(43 74% 49%)',
                    border: '1px solid hsl(43 74% 49% / 0.25)',
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {searchResults.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {searchResults.map((m, i) => (
                    <CoreMemoryCard key={m.id} memory={m} index={i} />
                  ))}
                </div>
              ) : reflectQuery && (
                <p className="text-xs text-muted-foreground/50 text-center py-6">
                  No memories found for "{reflectQuery}"
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Volume Detail Sheet */}
      <VolumeDetailSheet
        open={!!openVolume}
        onClose={() => setOpenVolume(null)}
        userId={userId}
        monthKey={openVolume?.id || ''}
        title={openVolume?.title || ''}
      />
    </div>
  );
}
