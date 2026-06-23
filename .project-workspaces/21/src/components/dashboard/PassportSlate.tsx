/**
 * PassportSlate — Horizontal stamp gallery for the user dashboard.
 * Shows recent travel entries as miniature passport stamps with
 * an aura glow on the most recent one. Links to /passport.
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plane, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface PassportSlateProps {
  userId: string;
}

interface TravelEntry {
  id: string;
  city_name: string;
  region: string | null;
  country: string | null;
  airport_code: string | null;
  companion_name: string | null;
  visited_at: string;
}

export default function PassportSlate({ userId }: PassportSlateProps) {
  const [entries, setEntries] = useState<TravelEntry[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId) return;
    const fetchEntries = async () => {
      const { data } = await supabase
        .from('travel_log')
        .select('id, city_name, region, country, airport_code, companion_name, visited_at')
        .eq('user_id', userId)
        .order('visited_at', { ascending: false })
        .limit(8);
      if (data) setEntries(data);
    };
    fetchEntries();
  }, [userId]);

  if (entries.length === 0) return null;

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch { return ''; }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mb-2"
    >
      {/* Section header */}
      <button
        onClick={() => navigate('/passport')}
        className="flex items-center justify-between w-full px-1 mb-2"
      >
        <span className="text-[11px] font-semibold tracking-wider uppercase text-white/60" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
          ✈️ Inscribed Journey
        </span>
        <span className="flex items-center gap-0.5 text-[10px] text-primary/60 hover:text-primary transition-colors">
          {entries.length} {entries.length === 1 ? 'city' : 'cities'}
          <ChevronRight className="h-3 w-3" />
        </span>
      </button>

      {/* Horizontal scroll of stamps */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide px-0.5">
        {entries.map((entry, i) => {
          const isLatest = i === 0;
          return (
            <button
              key={entry.id}
              onClick={() => navigate('/passport')}
              className="shrink-0 flex flex-col items-center active:scale-95 transition-transform"
            >
              {/* Stamp circle */}
              <div
                className={`relative flex flex-col items-center justify-center h-16 w-16 rounded-full border-2 border-double transition-colors ${
                  isLatest
                    ? 'border-primary/50'
                    : 'border-white/15'
                }`}
              >
                {/* Aura glow on latest */}
                {isLatest && (
                  <div
                    className="absolute -inset-1.5 rounded-full pointer-events-none animate-pulse"
                    style={{
                      background: 'radial-gradient(circle, rgba(212,175,80,0.2) 0%, transparent 70%)',
                    }}
                  />
                )}

                <span className={`text-[7px] uppercase tracking-[0.15em] font-medium ${
                  isLatest ? 'text-primary/70' : 'text-white/40'
                }`}>
                  {entry.airport_code || 'Visit'}
                </span>
                <Plane className={`h-3.5 w-3.5 -rotate-45 ${
                  isLatest ? 'text-primary/60' : 'text-white/25'
                }`} />
                <span className={`text-[6px] font-mono ${
                  isLatest ? 'text-primary/50' : 'text-white/30'
                }`}>
                  {formatDate(entry.visited_at)}
                </span>
              </div>

              {/* City name below */}
              <span className={`mt-1.5 text-[10px] font-medium truncate max-w-[68px] ${
                isLatest ? 'text-foreground' : 'text-white/50'
              }`}>
                {entry.city_name}
              </span>
              {entry.companion_name && (
                <span className="text-[8px] text-muted-foreground/40 truncate max-w-[68px]">
                  w/ {entry.companion_name}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
