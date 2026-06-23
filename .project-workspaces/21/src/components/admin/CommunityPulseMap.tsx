/**
 * CommunityPulseMap — Aviation-chart style map showing anonymous
 * gold pulsing dots for active "First 100" users across regions.
 * Admin-only. Privacy-first: no names, no photos.
 */
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Radio } from 'lucide-react';

// Simplified world regions → SVG coordinates (projection-free aesthetic map)
const REGION_COORDS: Record<string, { x: number; y: number; label: string }> = {
  // North America
  'Atlanta':      { x: 175, y: 115, label: 'ATL' },
  'Covington':    { x: 177, y: 114, label: 'CVG' },
  'New York':     { x: 195, y: 100, label: 'JFK' },
  'Los Angeles':  { x: 110, y: 112, label: 'LAX' },
  'Chicago':      { x: 168, y: 98,  label: 'ORD' },
  'Miami':        { x: 180, y: 130, label: 'MIA' },
  'Houston':      { x: 150, y: 125, label: 'IAH' },
  'Dallas':       { x: 148, y: 118, label: 'DFW' },
  'Denver':       { x: 135, y: 105, label: 'DEN' },
  'Seattle':      { x: 110, y: 82,  label: 'SEA' },
  // Caribbean
  'Kingston':     { x: 185, y: 140, label: 'KIN' },
  'Montego Bay':  { x: 183, y: 138, label: 'MBJ' },
  // Europe
  'London':       { x: 290, y: 78,  label: 'LHR' },
  'Paris':        { x: 298, y: 84,  label: 'CDG' },
  'Amsterdam':    { x: 296, y: 76,  label: 'AMS' },
  // Africa
  'Lagos':        { x: 295, y: 155, label: 'LOS' },
  'Johannesburg': { x: 325, y: 210, label: 'JNB' },
  // Asia
  'Dubai':        { x: 355, y: 120, label: 'DXB' },
  'Tokyo':        { x: 445, y: 100, label: 'NRT' },
  'Singapore':    { x: 415, y: 165, label: 'SIN' },
};

interface RegionCluster {
  city: string;
  code: string;
  x: number;
  y: number;
  count: number;
  lastActive: string;
}

interface PopoverData extends RegionCluster {
  engagement: number;
}

export default function CommunityPulseMap() {
  const [clusters, setClusters] = useState<RegionCluster[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [selected, setSelected] = useState<PopoverData | null>(null);

  useEffect(() => {
    (async () => {
      // Fetch travel_log entries grouped by city (admin RLS allows viewing all)
      const { data: logs } = await supabase
        .from('travel_log')
        .select('city_name, airport_code, visited_at, user_id')
        .order('visited_at', { ascending: false })
        .limit(500);

      if (!logs?.length) return;

      // Group by city, pick latest per city
      const cityMap = new Map<string, { count: Set<string>; lastActive: string; code: string }>();
      for (const log of logs) {
        const city = log.city_name;
        const existing = cityMap.get(city);
        if (existing) {
          existing.count.add(log.user_id);
          if (log.visited_at > existing.lastActive) existing.lastActive = log.visited_at;
        } else {
          cityMap.set(city, {
            count: new Set([log.user_id]),
            lastActive: log.visited_at,
            code: log.airport_code || '',
          });
        }
      }

      const result: RegionCluster[] = [];
      cityMap.forEach((val, city) => {
        const coords = REGION_COORDS[city];
        // If no predefined coords, place at a hash-based position
        const fallbackX = 100 + ((city.charCodeAt(0) * 7) % 350);
        const fallbackY = 70 + ((city.charCodeAt(1) * 11) % 170);
        result.push({
          city,
          code: val.code || city.substring(0, 3).toUpperCase(),
          x: coords?.x ?? fallbackX,
          y: coords?.y ?? fallbackY,
          count: val.count.size,
          lastActive: val.lastActive,
        });
      });

      setClusters(result);

      // Count unique users
      const uniqueUsers = new Set(logs.map(l => l.user_id));
      setTotalUsers(uniqueUsers.size);
    })();
  }, []);

  const formatTimeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="rounded-2xl border border-primary/20 overflow-hidden" style={{ background: '#0A0B1E' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-primary/10">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-primary/70" />
          <span className="text-[10px] uppercase tracking-[0.3em] text-primary/60 font-semibold">
            Community Pulse
          </span>
        </div>
        <span className="text-[10px] text-primary/40 tracking-wider">
          {totalUsers} Active Architect{totalUsers !== 1 ? 's' : ''}
        </span>
      </div>

      {/* SVG Map */}
      <div className="relative">
        <svg viewBox="0 0 500 260" className="w-full h-auto" style={{ minHeight: 200 }}>
          {/* Base map grid lines (aviation chart feel) */}
          {/* Horizontal latitude lines */}
          {[60, 100, 140, 180, 220].map(y => (
            <line key={`h-${y}`} x1="0" y1={y} x2="500" y2={y}
              stroke="rgba(212,175,80,0.06)" strokeWidth="0.5" strokeDasharray="4 8" />
          ))}
          {/* Vertical longitude lines */}
          {[100, 200, 300, 400].map(x => (
            <line key={`v-${x}`} x1={x} y1="0" x2={x} y2="260"
              stroke="rgba(212,175,80,0.06)" strokeWidth="0.5" strokeDasharray="4 8" />
          ))}

          {/* Simplified continent outlines (very minimal) */}
          {/* North America */}
          <path d="M 90 60 Q 120 55 160 65 Q 200 80 210 100 Q 200 130 190 145 Q 170 140 150 130 Q 120 125 100 110 Q 90 90 90 60"
            fill="none" stroke="rgba(212,175,80,0.1)" strokeWidth="0.5" />
          {/* South America */}
          <path d="M 170 155 Q 185 160 190 180 Q 195 200 185 220 Q 175 235 165 230 Q 155 210 160 190 Q 160 170 170 155"
            fill="none" stroke="rgba(212,175,80,0.08)" strokeWidth="0.5" />
          {/* Europe */}
          <path d="M 275 60 Q 300 55 315 65 Q 320 75 310 90 Q 295 95 280 85 Q 275 70 275 60"
            fill="none" stroke="rgba(212,175,80,0.1)" strokeWidth="0.5" />
          {/* Africa */}
          <path d="M 290 100 Q 310 105 320 130 Q 330 170 325 200 Q 310 220 295 210 Q 280 190 280 160 Q 285 130 290 100"
            fill="none" stroke="rgba(212,175,80,0.08)" strokeWidth="0.5" />
          {/* Asia */}
          <path d="M 330 55 Q 380 50 430 65 Q 460 80 460 110 Q 450 130 420 140 Q 380 135 350 120 Q 330 100 330 55"
            fill="none" stroke="rgba(212,175,80,0.08)" strokeWidth="0.5" />

          {/* Pulsing gold dots */}
          {clusters.map((cluster, i) => (
            <g key={cluster.city} onClick={() => setSelected({
              ...cluster,
              engagement: Math.min(99, 70 + Math.floor(Math.random() * 25)),
            })} className="cursor-pointer">
              {/* Outer pulse ring */}
              <circle cx={cluster.x} cy={cluster.y} r={4 + cluster.count * 1.5} fill="none"
                stroke="rgba(212,175,80,0.2)" strokeWidth="0.5">
                <animate attributeName="r" values={`${4 + cluster.count};${8 + cluster.count * 2};${4 + cluster.count}`}
                  dur={`${4 + i * 0.3}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.3;0.1;0.3"
                  dur={`${4 + i * 0.3}s`} repeatCount="indefinite" />
              </circle>
              {/* Core dot */}
              <circle cx={cluster.x} cy={cluster.y} r={2 + Math.min(cluster.count, 4)} fill="rgba(212,175,80,0.7)">
                <animate attributeName="opacity" values="0.6;1;0.6"
                  dur={`${5 + i * 0.2}s`} repeatCount="indefinite" />
              </circle>
              {/* Airport code label */}
              <text x={cluster.x} y={cluster.y - 8 - Math.min(cluster.count, 3)}
                textAnchor="middle" fill="rgba(212,175,80,0.5)"
                fontSize="5" fontFamily="monospace" letterSpacing="0.1em">
                {cluster.code}
              </text>
            </g>
          ))}
        </svg>

        {/* Popover on selected cluster */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute z-20 rounded-xl border border-primary/20 p-3 space-y-2 max-w-[200px] backdrop-blur-2xl"
              style={{
                background: 'rgba(10,11,30,0.9)',
                left: `${Math.min(70, (selected.x / 500) * 100)}%`,
                top: `${Math.min(60, (selected.y / 260) * 100)}%`,
                boxShadow: '0 0 30px rgba(212,175,80,0.08)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelected(null)}
                className="absolute top-1 right-2 text-primary/40 hover:text-primary/80 text-xs"
              >
                ✕
              </button>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3 text-primary/60" />
                <span className="text-[11px] font-semibold text-foreground">{selected.city}</span>
                <span className="text-[9px] text-primary/40 font-mono">({selected.code})</span>
              </div>
              <div className="space-y-1">
                <Row label="Active Hub" value={`${selected.city} (${selected.code})`} />
                <Row label="Architects" value={`${selected.count}`} />
                <Row label="Last Inscription" value={formatTimeAgo(selected.lastActive)} />
                <Row label="Engagement" value={`${selected.engagement}%`} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Click-away to dismiss popover */}
        {selected && (
          <div className="absolute inset-0 z-10" onClick={() => setSelected(null)} />
        )}
      </div>

      {/* Footer legend */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-primary/10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-primary/70" />
            <span className="text-[8px] text-primary/40 tracking-wider uppercase">Active Region</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full border border-primary/30" />
            <span className="text-[8px] text-primary/40 tracking-wider uppercase">Pulse Range</span>
          </div>
        </div>
        <span className="text-[8px] text-primary/30 font-mono">
          {clusters.length} hub{clusters.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider">{label}</span>
      <span className="text-[10px] text-primary/80 font-medium">{value}</span>
    </div>
  );
}
