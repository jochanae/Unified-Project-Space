import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, VideoOff, Sparkles, Palette } from 'lucide-react';
import AbstractAvatar from '@/components/AbstractAvatar';

/* ── Atmosphere Deck definitions ─────────────── */
export const ATMOSPHERE_DECKS = [
  { id: 'none', label: 'None', gradient: 'linear-gradient(135deg, hsl(225 25% 6%), hsl(262 30% 12%), hsl(225 25% 8%))', preview: 'linear-gradient(135deg, hsl(225 25% 18%), hsl(262 30% 24%), hsl(225 25% 20%))' },
  { id: 'rainy-cafe', label: '☕ Rainy Café', gradient: 'linear-gradient(135deg, hsl(30 15% 10%), hsl(25 20% 8%), hsl(35 10% 6%))', preview: 'linear-gradient(135deg, hsl(30 35% 35%), hsl(25 30% 28%), hsl(35 25% 22%))' },
  { id: 'neon-city', label: '🌃 Neon City', gradient: 'linear-gradient(135deg, hsl(270 50% 10%), hsl(320 40% 12%), hsl(240 45% 8%))', preview: 'linear-gradient(135deg, hsl(270 60% 35%), hsl(320 50% 38%), hsl(240 55% 30%))' },
  { id: 'sunset-beach', label: '🌅 Sunset Beach', gradient: 'linear-gradient(135deg, hsl(20 60% 12%), hsl(35 50% 10%), hsl(200 30% 8%))', preview: 'linear-gradient(135deg, hsl(20 70% 45%), hsl(35 60% 40%), hsl(200 40% 30%))' },
  { id: 'cozy-fire', label: '🔥 Cozy Fire', gradient: 'linear-gradient(135deg, hsl(15 50% 10%), hsl(25 45% 8%), hsl(10 40% 6%))', preview: 'linear-gradient(135deg, hsl(15 60% 35%), hsl(25 55% 30%), hsl(10 50% 25%))' },
  { id: 'aurora', label: '🌌 Aurora', gradient: 'linear-gradient(135deg, hsl(160 40% 8%), hsl(200 50% 10%), hsl(280 40% 12%))', preview: 'linear-gradient(135deg, hsl(160 50% 30%), hsl(200 60% 35%), hsl(280 50% 38%))' },
  { id: 'midnight-jazz', label: '🎷 Midnight Jazz', gradient: 'linear-gradient(135deg, hsl(225 30% 8%), hsl(240 25% 10%), hsl(210 20% 6%))', preview: 'linear-gradient(135deg, hsl(225 40% 25%), hsl(240 35% 30%), hsl(210 30% 22%))' },
] as const;

export type AtmosphereDeckId = typeof ATMOSPHERE_DECKS[number]['id'];

interface Participant {
  id: string;
  name: string;
  avatar?: string | null;
  type: 'human' | 'companion';
  memberId?: string;
}

interface VideoStageProps {
  isLive: boolean;
  participants: Participant[];
  lastSpeakingCompanion: string | null;
  atmosphereDeck: AtmosphereDeckId;
  onAtmosphereChange: (id: AtmosphereDeckId) => void;
  isOwner: boolean;
  isWideScreen?: boolean;
  localStream?: MediaStream | null;
  localUserId?: string;
}

/* ── Single human video frame ─────────────── */
function HumanFrame({ h, isWideScreen, localStream, isLocal }: {
  h: Participant; isWideScreen?: boolean; localStream?: MediaStream | null; isLocal: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isLocal && localStream && videoRef.current) {
      videoRef.current.srcObject = localStream;
    }
  }, [isLocal, localStream]);

  return (
    <div
      className={`relative rounded-2xl overflow-hidden glass-card ${isWideScreen ? 'aspect-[4/3]' : 'aspect-[3/2]'}`}
    >
      {isLocal && localStream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-cover rounded-2xl"
          style={{ transform: 'scaleX(-1)' }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-full gap-2">
          {h.avatar ? (
            <img src={h.avatar} alt="" className={`rounded-full object-cover ${isWideScreen ? 'h-16 w-16' : 'h-12 w-12'}`} />
          ) : (
            <div className={`flex items-center justify-center rounded-full text-muted-foreground font-bold bg-secondary ${isWideScreen ? 'h-16 w-16 text-xl' : 'h-12 w-12 text-base'}`}>
              {h.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-[11px] text-muted-foreground font-medium">{h.name}</span>
          <div className="flex items-center gap-1 rounded-full px-2 py-1 bg-secondary/60">
            <VideoOff className="h-3 w-3 text-muted-foreground" />
            <span className="text-[9px] text-muted-foreground">Camera off</span>
          </div>
        </div>
      )}

      {/* Name overlay when streaming */}
      {isLocal && localStream && (
        <div className="absolute bottom-2 left-2 rounded-full px-2 py-0.5 glass">
          <span className="text-[10px] text-foreground/70 font-medium">{h.name}</span>
        </div>
      )}

      <div className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
    </div>
  );
}

/* ── Single companion portrait ─────────────── */
function CompanionFrame({ c, isSpeaking, isWideScreen }: {
  c: Participant; isSpeaking: boolean; isWideScreen?: boolean;
}) {
  return (
    <motion.div
      className={`relative rounded-2xl overflow-hidden border ${isSpeaking ? 'border-accent/40' : 'border-accent/15'} ${isWideScreen ? 'aspect-[4/3]' : 'aspect-[3/2]'}`}
      animate={isSpeaking ? { boxShadow: [
        '0 0 16px 4px hsl(var(--accent) / 0.2)',
        '0 0 28px 8px hsl(var(--accent) / 0.35)',
        '0 0 16px 4px hsl(var(--accent) / 0.2)',
      ] } : {}}
      transition={isSpeaking ? { repeat: Infinity, duration: 2, ease: 'easeInOut' } : {}}
    >
      {/* Full-bleed avatar image filling the frame like a video feed */}
      {c.avatar ? (
        <motion.img
          src={c.avatar}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          animate={isSpeaking ? { scale: [1, 1.03, 1] } : {}}
          transition={isSpeaking ? { repeat: Infinity, duration: 2 } : {}}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-accent/10" style={{ backdropFilter: 'blur(12px)' }}>
          <motion.div
            className={`flex items-center justify-center rounded-full bg-accent/20 ${isWideScreen ? 'h-20 w-20' : 'h-16 w-16'}`}
            animate={isSpeaking ? { scale: [1, 1.05, 1] } : {}}
            transition={isSpeaking ? { repeat: Infinity, duration: 1.8 } : {}}
          >
            <Sparkles className={`text-accent ${isWideScreen ? 'h-8 w-8' : 'h-6 w-6'}`} />
          </motion.div>
        </div>
      )}

      {/* Gradient overlay at bottom for name readability */}
      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/60 to-transparent" />

      {/* Name label */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center">
        <span className="text-[11px] text-white/90 font-semibold flex items-center gap-1 drop-shadow-md">
          {c.name} <Sparkles className="h-2.5 w-2.5" />
        </span>
      </div>

      {/* Speaking indicator */}
      {isSpeaking && (
        <div className="absolute top-2 left-2">
          <span className="text-[9px] text-accent bg-black/40 rounded-full px-2 py-0.5 animate-pulse backdrop-blur-sm">Speaking…</span>
        </div>
      )}

      {/* Companion badge */}
      <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 border border-accent/30 backdrop-blur-sm">
        <Sparkles className="h-2.5 w-2.5 text-accent" />
      </div>
    </motion.div>
  );
}

/* ── Atmosphere Deck Picker ─────────────── */
function DeckPicker({ atmosphereDeck, onAtmosphereChange, currentDeck }: {
  atmosphereDeck: AtmosphereDeckId;
  onAtmosphereChange: (id: AtmosphereDeckId) => void;
  currentDeck: typeof ATMOSPHERE_DECKS[number];
}) {
  const [showDeckPicker, setShowDeckPicker] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowDeckPicker(!showDeckPicker)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary bg-secondary/60 border border-border/50"
      >
        <Palette className="h-3 w-3" /> {currentDeck.label}
      </button>
      <AnimatePresence>
        {showDeckPicker && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute right-0 top-full mt-1 rounded-xl shadow-lg z-20 overflow-hidden min-w-[160px] bg-popover border border-border"
          >
            {ATMOSPHERE_DECKS.map(deck => (
              <button
                key={deck.id}
                onClick={() => { onAtmosphereChange(deck.id); setShowDeckPicker(false); }}
                className={`flex items-center gap-2 w-full px-3 py-2 text-left text-xs transition-colors hover:bg-secondary ${atmosphereDeck === deck.id ? 'text-primary font-semibold' : 'text-muted-foreground'}`}
              >
                {deck.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Main VideoStage ─────────────── */
export default function VideoStage({
  isLive,
  participants,
  lastSpeakingCompanion,
  atmosphereDeck,
  onAtmosphereChange,
  isOwner,
  isWideScreen,
  localStream,
  localUserId,
}: VideoStageProps) {
  const humans = participants.filter(p => p.type === 'human');
  const companions = participants.filter(p => p.type === 'companion');
  const currentDeck = ATMOSPHERE_DECKS.find(d => d.id === atmosphereDeck) || ATMOSPHERE_DECKS[0];
  const totalParticipants = humans.length + companions.length;
  const gridCols = totalParticipants <= 2 ? 'grid-cols-2' : totalParticipants <= 4 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      className="relative z-10 overflow-hidden"
    >
      <div className="absolute inset-0" style={{ background: currentDeck.gradient }} />
      <div className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle at 30% 40%, hsl(0 0% 100% / 0.03) 0%, transparent 60%), radial-gradient(circle at 70% 60%, hsl(0 0% 100% / 0.02) 0%, transparent 50%)',
        }}
      />

      <div className={`relative p-3 ${isWideScreen ? 'p-4' : ''}`}>
        {/* Header: Live indicator + Deck picker */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Live Stage</span>
          </div>
          {isOwner && (
            <DeckPicker
              atmosphereDeck={atmosphereDeck}
              onAtmosphereChange={onAtmosphereChange}
              currentDeck={currentDeck}
            />
          )}
        </div>

        {/* Video grid */}
        <div className={`grid ${gridCols} gap-2 ${isWideScreen ? 'gap-3' : ''}`}>
          {humans.map(h => (
            <HumanFrame
              key={h.id}
              h={h}
              isWideScreen={isWideScreen}
              localStream={localStream}
              isLocal={!!localUserId && h.id === localUserId}
            />
          ))}
          {companions.map(c => (
            <CompanionFrame
              key={c.id}
              c={c}
              isSpeaking={c.memberId === lastSpeakingCompanion}
              isWideScreen={isWideScreen}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
