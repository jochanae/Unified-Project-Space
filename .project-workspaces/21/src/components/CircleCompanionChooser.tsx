import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { X, Sparkles, ChevronRight, Brain, Heart, Lightbulb, Coffee } from 'lucide-react';
import type { Connection } from '@/hooks/useProfile';
import AbstractAvatar from '@/components/AbstractAvatar';
import { ATMOSPHERE_DECKS, type AtmosphereDeckId } from '@/components/VideoStage';

/* ── Vibe definitions ─────────────────────────────── */
export const CIRCLE_VIBES = [
  {
    id: 'deep-dive',
    label: 'Deep Dive',
    icon: Brain,
    colorGrade: 'linear-gradient(135deg, hsl(230 55% 10%), hsl(250 45% 14%), hsl(220 40% 8%))',
    colorGradeLight: 'linear-gradient(135deg, hsl(230 30% 92%), hsl(250 25% 94%), hsl(220 20% 96%))',
    accent: 'hsl(230 70% 65%)',
    aiMode: 'Analytical/Reflective',
    description: 'Thoughtful, exploratory conversations',
  },
  {
    id: 'venting',
    label: 'Venting',
    icon: Heart,
    colorGrade: 'linear-gradient(135deg, hsl(25 55% 10%), hsl(35 50% 12%), hsl(15 40% 8%))',
    colorGradeLight: 'linear-gradient(135deg, hsl(25 40% 93%), hsl(35 35% 95%), hsl(15 30% 96%))',
    accent: 'hsl(25 80% 60%)',
    aiMode: 'Empathetic/Listener',
    description: 'Safe space to let it all out',
  },
  {
    id: 'brainstorm',
    label: 'Brainstorm',
    icon: Lightbulb,
    colorGrade: 'linear-gradient(135deg, hsl(50 40% 10%), hsl(45 50% 12%), hsl(55 35% 8%))',
    colorGradeLight: 'linear-gradient(135deg, hsl(50 30% 93%), hsl(45 35% 95%), hsl(55 25% 96%))',
    accent: 'hsl(45 85% 60%)',
    aiMode: 'Creative/Energetic',
    description: 'Wild ideas, no judgement',
  },
  {
    id: 'chill',
    label: 'Chill',
    icon: Coffee,
    colorGrade: 'linear-gradient(135deg, hsl(180 30% 8%), hsl(200 25% 10%), hsl(160 20% 7%))',
    colorGradeLight: 'linear-gradient(135deg, hsl(180 20% 93%), hsl(200 18% 95%), hsl(160 15% 96%))',
    accent: 'hsl(175 50% 55%)',
    aiMode: 'Casual/Playful',
    description: 'Relaxed vibes only',
  },
] as const;

export type CircleVibeId = typeof CIRCLE_VIBES[number]['id'];

export interface CircleEntryResult {
  companions: Connection[];
  vibe: CircleVibeId;
  atmosphere: AtmosphereDeckId;
}

interface CircleCompanionChooserProps {
  open: boolean;
  connections: Connection[];
  onSelect: (result: CircleEntryResult) => void;
  onClose: () => void;
}

/* ── Parallax Card ─────────────────────────────────── */
function CompanionCard({
  conn,
  selected,
  onToggle,
}: {
  conn: Connection;
  selected: boolean;
  onToggle: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useTransform(my, [-0.5, 0.5], [4, -4]);
  const rotateY = useTransform(mx, [-0.5, 0.5], [-4, 4]);
  const imgX = useTransform(mx, [-0.5, 0.5], [6, -6]);
  const imgY = useTransform(my, [-0.5, 0.5], [6, -6]);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const handlePointerLeave = () => { mx.set(0); my.set(0); };

  return (
    <motion.div
      ref={cardRef}
      layout
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={onToggle}
      style={{ rotateX, rotateY, perspective: 800 }}
      className="relative cursor-pointer select-none"
      whileTap={{ scale: 0.97 }}
    >
      <div
        className={`relative overflow-hidden rounded-2xl transition-all duration-300 glass-card ${
          selected
            ? 'ring-2 ring-primary shadow-[0_0_24px_4px_hsl(var(--primary)/0.35)]'
            : 'ring-1 ring-border'
        }`}
        style={{ aspectRatio: '3/4' }}
      >
        <motion.div className="absolute inset-0" style={{ x: imgX, y: imgY, scale: 1.08 }}>
          {conn.avatarUrl ? (
            <img src={conn.avatarUrl} alt={conn.name} className="h-full w-full object-cover" draggable={false} />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <AbstractAvatar memberId={conn.memberId} size="lg" />
            </div>
          )}
        </motion.div>

        {/* Dark scrim for text legibility — always dark since it overlays an image */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, hsl(0 0% 0% / 0.75) 0%, hsl(0 0% 0% / 0.2) 40%, transparent 70%)' }} />

        <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
            {/* White text here is intentional — always over dark image scrim */}
            <span className="font-display text-sm font-bold text-white truncate">{conn.name}</span>
          </div>
          {conn.personality && (
            <p className="text-[10px] text-white/50 line-clamp-1 leading-tight">{conn.personality}</p>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className={`mt-0.5 flex items-center justify-center gap-1.5 rounded-full py-1.5 text-[11px] font-semibold transition-all ${
              selected ? 'bg-primary text-primary-foreground shadow-md' : 'bg-secondary/60 text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {selected ? '✓ Joining' : 'Join'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Vibe Button ───────────────────────────────────── */
function VibeButton({
  vibe,
  selected,
  onSelect,
}: {
  vibe: typeof CIRCLE_VIBES[number];
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = vibe.icon;
  return (
    <motion.button
      onClick={onSelect}
      whileTap={{ scale: 0.95 }}
      className={`relative flex flex-col items-center gap-2 rounded-2xl p-4 transition-all duration-300 glass-card ${
        selected ? 'ring-2 shadow-lg' : ''
      }`}
      style={selected ? {
        boxShadow: `0 0 20px 2px ${vibe.accent}33, inset 0 0 0 2px ${vibe.accent}60`,
      } as any : undefined}
    >
      {/* Glowing pulse ring when selected */}
      {selected && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          animate={{
            boxShadow: [
              `0 0 8px 2px ${vibe.accent}20`,
              `0 0 20px 6px ${vibe.accent}40`,
              `0 0 8px 2px ${vibe.accent}20`,
            ],
          }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        />
      )}
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full transition-colors"
        style={{ background: selected ? `${vibe.accent}25` : undefined }}
      >
        <Icon className={`h-5 w-5 transition-colors ${selected ? '' : 'text-muted-foreground'}`} style={selected ? { color: vibe.accent } : undefined} />
      </div>
      <span className="text-xs font-semibold text-foreground">{vibe.label}</span>
      <span className="text-[10px] text-muted-foreground text-center leading-tight">{vibe.description}</span>
    </motion.button>
  );
}

/* ── Atmosphere Pill ────────────────────────────────── */
function AtmospherePill({
  deck,
  selected,
  onSelect,
}: {
  deck: typeof ATMOSPHERE_DECKS[number];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-all glass-card ${
        selected
          ? 'ring-2 ring-primary/60'
          : ''
      }`}
    >
      <div
        className="h-8 w-8 rounded-lg shrink-0"
        style={{ background: deck.preview }}
      />
      <span className="text-xs font-medium text-foreground">{deck.label}</span>
    </button>
  );
}

/* ── Main Overlay ──────────────────────────────────── */
export default function CircleCompanionChooser({
  open,
  connections,
  onSelect,
  onClose,
}: CircleCompanionChooserProps) {
  const [selectedCompanions, setSelectedCompanions] = useState<Set<string>>(new Set());
  const [selectedVibe, setSelectedVibe] = useState<CircleVibeId>('chill');
  const [selectedAtmosphere, setSelectedAtmosphere] = useState<AtmosphereDeckId>('none');
  const [entering, setEntering] = useState(false);
  const [warpPhase, setWarpPhase] = useState(0);

  const activeVibe = CIRCLE_VIBES.find(v => v.id === selectedVibe) || CIRCLE_VIBES[3];

  useEffect(() => {
    if (open) {
      setSelectedCompanions(connections.length > 0 ? new Set([connections[0].memberId]) : new Set());
      setSelectedVibe('chill');
      setSelectedAtmosphere('none');
      setEntering(false);
      setWarpPhase(0);
    }
  }, [open, connections]);

  const toggleCompanion = (id: string) => {
    setSelectedCompanions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleEnter = () => {
    setEntering(true);
    setWarpPhase(1);
    setTimeout(() => setWarpPhase(2), 400);
    setTimeout(() => setWarpPhase(3), 800);
    setTimeout(() => {
      const chosen = connections.filter((c) => selectedCompanions.has(c.memberId));
      onSelect({ companions: chosen, vibe: selectedVibe, atmosphere: selectedAtmosphere });
    }, 1100);
  };

  const isWide = typeof window !== 'undefined' && window.innerWidth >= 768;
  const isLight = typeof document !== 'undefined' && document.documentElement.classList.contains('light');
  const bgGradient = isLight ? activeVibe.colorGradeLight : activeVibe.colorGrade;

  return (
    <AnimatePresence>
      {open && !entering && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[60] flex flex-col"
          style={{
            background: bgGradient,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          {/* Ambient overlay that shifts with vibe */}
          <motion.div
            className="absolute inset-0 pointer-events-none transition-all duration-700"
            animate={{ opacity: 0.4 }}
            style={{
              background: `radial-gradient(ellipse at 30% 40%, ${activeVibe.accent}15 0%, transparent 60%), radial-gradient(ellipse at 70% 70%, ${activeVibe.accent}10 0%, transparent 50%)`,
            }}
          />

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between px-5 pt-[max(16px,env(safe-area-inset-top))] pb-2">
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">Who's Joining?</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Choose your vibe before you enter
              </p>
            </div>
            <button onClick={onClose} className="rounded-full p-2 hover:bg-secondary transition-colors">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-2">
            <div className={isWide
              ? 'grid grid-cols-3 gap-5 max-w-4xl mx-auto pt-4'
              : 'flex flex-col gap-5 max-w-sm mx-auto pt-3'
            }>
              {/* Col 1: Bringing Along */}
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">Bringing Along</p>
                <div className={`grid gap-3 ${connections.length > 1 && !isWide ? 'grid-cols-2' : 'grid-cols-1'}`}
                  style={connections.length === 1 && !isWide ? { maxWidth: '200px', margin: '0 auto' } : undefined}
                >
                  {connections.map((conn, i) => (
                    <motion.div
                      key={conn.memberId}
                      initial={{ opacity: 0, y: 30, scale: 0.92 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: 0.08 + i * 0.1, type: 'spring', damping: 22, stiffness: 260 }}
                    >
                      <CompanionCard
                        conn={conn}
                        selected={selectedCompanions.has(conn.memberId)}
                        onToggle={() => toggleCompanion(conn.memberId)}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Col 2: The Mood */}
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">The Mood <span className="normal-case text-muted-foreground/60">· sets color theme</span></p>
                <div className="grid grid-cols-2 gap-2.5">
                  {CIRCLE_VIBES.map((vibe, i) => (
                    <motion.div
                      key={vibe.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.06 }}
                    >
                      <VibeButton
                        vibe={vibe}
                        selected={selectedVibe === vibe.id}
                        onSelect={() => setSelectedVibe(vibe.id)}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Col 3: The Location */}
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">The Location</p>
                <div className="flex flex-col gap-2">
                  {ATMOSPHERE_DECKS.map((deck, i) => (
                    <motion.div
                      key={deck.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + i * 0.04 }}
                    >
                      <AtmospherePill
                        deck={deck}
                        selected={selectedAtmosphere === deck.id}
                        onSelect={() => setSelectedAtmosphere(deck.id)}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Enter button */}
          <div className="relative z-10 px-4 pb-[max(16px,calc(env(safe-area-inset-bottom)+8px))]">
            <div className="max-w-4xl mx-auto">
              <motion.button
                onClick={handleEnter}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
                className="w-full flex items-center justify-center gap-2.5 rounded-2xl py-4 text-sm font-bold transition-all glass-card text-foreground"
                style={{
                  border: `1px solid ${activeVibe.accent}40`,
                  boxShadow: `0 0 30px -8px ${activeVibe.accent}30`,
                }}
              >
                <span style={{ color: activeVibe.accent }}>●</span>
                {selectedCompanions.size === 0 ? 'Enter Solo' : 'Enter Lounge'}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Warp Exit Animation ──────────────────── */}
      {open && entering && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden"
          style={{ background: bgGradient }}
        >
          {warpPhase >= 1 && (
            <>
              {connections
                .filter((c) => selectedCompanions.has(c.memberId))
                .map((conn, i) => (
                  <motion.div
                    key={conn.memberId}
                    initial={{ scale: 1, y: 0, x: selectedCompanions.size > 1 ? (i === 0 ? -80 : 80) : 0, opacity: 1 }}
                    animate={{
                      scale: warpPhase >= 2 ? 0.15 : 0.5,
                      y: warpPhase >= 2 ? -300 : 0,
                      x: 0,
                      opacity: warpPhase >= 3 ? 0 : 1,
                    }}
                    transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                    className="absolute"
                  >
                    <div
                      className="w-28 rounded-2xl overflow-hidden ring-2 ring-primary shadow-[0_0_24px_4px_hsl(var(--primary)/0.35)]"
                      style={{ aspectRatio: '3/4' }}
                    >
                      {conn.avatarUrl ? (
                        <img src={conn.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-secondary">
                          <AbstractAvatar memberId={conn.memberId} size="lg" />
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
            </>
          )}

          {/* Phase 2: Warp speed lines */}
          {warpPhase >= 2 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: warpPhase >= 3 ? 0 : 0.8 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 pointer-events-none"
            >
              {Array.from({ length: 20 }).map((_, i) => {
                const angle = (i / 20) * 360;
                const rad = (angle * Math.PI) / 180;
                return (
                  <motion.div
                    key={i}
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ scaleY: 1, opacity: 0.6 }}
                    transition={{ duration: 0.3, delay: i * 0.01 }}
                    className="absolute"
                    style={{
                      width: '2px',
                      height: '40vh',
                      background: `linear-gradient(180deg, transparent, ${activeVibe.accent}80, transparent)`,
                      left: '50%',
                      top: '50%',
                      transformOrigin: 'center top',
                      transform: `rotate(${angle}deg) translateX(${Math.cos(rad) * 20}px)`,
                    }}
                  />
                );
              })}
            </motion.div>
          )}

          {/* Phase 3: Blur clears to reveal */}
          {warpPhase >= 3 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 bg-background"
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
