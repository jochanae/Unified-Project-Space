import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings2, Volume2, Trees, CloudRain, Headphones, VolumeX, ChevronDown, Shield, Play, Square, Palette, MapPin, Mic, MicOff, Radio } from 'lucide-react';
import { SOUNDSCAPE_DECKS } from '@/hooks/useAmbientSoundscape';
import { ATMOSPHERE_DECKS, type AtmosphereDeckId } from '@/components/VideoStage';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import type { CircleType } from '@/components/circle/SpatialRoom';
import type { Participant } from '@/components/circle/SpatialRoom';

const FIREFLY_PALETTES = [
  { label: 'Gold Rush', hue: 45, color: 'hsl(45 85% 55%)' },
  { label: 'Neon Purple', hue: 280, color: 'hsl(280 70% 60%)' },
  { label: 'Electric Blue', hue: 210, color: 'hsl(210 80% 55%)' },
  { label: 'Hot Pink', hue: 330, color: 'hsl(330 75% 55%)' },
  { label: 'Lime', hue: 120, color: 'hsl(120 65% 50%)' },
  { label: 'Sunset', hue: 25, color: 'hsl(25 90% 55%)' },
];

interface HostOverridePanelProps {
  isOwner: boolean;
  isCoHost?: boolean;
  circleType: CircleType;
  onCircleTypeChange: (type: CircleType) => void;
  activeSoundDeck: string;
  onSoundDeckChange: (deckId: string) => void;
  soundVolume: number;
  onSoundVolumeChange: (v: number) => void;
  sessionActive?: boolean;
  onToggleSession?: () => void;
  circleId?: string;
  activeFireflyHue?: number;
  onFireflyColorChange?: (hue: number) => void;
  activeAtmosphere?: AtmosphereDeckId;
  onAtmosphereChange?: (deck: AtmosphereDeckId) => void;
  participants?: Participant[];
  activeSpeakerId?: string | null;
  onPassMic?: (userId: string) => void;
  onReclaimMic?: () => void;
  onOpenFloor?: () => void;
}

const CIRCLE_TYPE_OPTIONS: { type: CircleType; label: string; emoji: string; desc: string }[] = [
  { type: 'circle', label: 'Circle', emoji: '🏛️', desc: 'Stage layout, speaker focus' },
  { type: 'social', label: 'Social', emoji: '⚡', desc: 'Bouncy orbs, reactions' },
  { type: 'personal', label: 'Personal', emoji: '🌙', desc: 'Calm floating, gentle' },
  { type: 'fireside', label: 'Fireside', emoji: '🔥', desc: 'Intimate ring, focused' },
];

const DECK_ICONS: Record<string, typeof Volume2> = {
  'lo-fi': Headphones,
  'nature': Trees,
  'rain': CloudRain,
  'none': VolumeX,
};

function HostControlsContent({
  isCoHost = false,
  circleType,
  onCircleTypeChange,
  activeSoundDeck,
  onSoundDeckChange,
  soundVolume,
  onSoundVolumeChange,
  sessionActive = false,
  onToggleSession,
  activeFireflyHue = 45,
  onFireflyColorChange,
  activeAtmosphere = 'none',
  onAtmosphereChange,
  participants = [],
  activeSpeakerId,
  onPassMic,
  onReclaimMic,
  onOpenFloor,
}: Omit<HostOverridePanelProps, 'isOwner'>) {
  return (
    <div className="space-y-4">
      {/* ─── Start / End Meeting Button ─── */}
      {onToggleSession && (
        <div>
          <button
            onClick={onToggleSession}
            className={`w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all active:scale-95 ${
              sessionActive
                ? 'bg-destructive/15 border border-destructive/30 text-destructive hover:bg-destructive/25'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {sessionActive ? (
              <>
                <Square className="h-4 w-4" />
                End Meeting
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Start Meeting
              </>
            )}
          </button>
        </div>
      )}

      {/* Circle Physics Type */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Room Physics</p>
        <div className="grid grid-cols-2 gap-1.5">
          {CIRCLE_TYPE_OPTIONS.map(opt => (
            <button
              key={opt.type}
              onClick={() => onCircleTypeChange(opt.type)}
              className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-center transition-all ${
                circleType === opt.type
                  ? 'bg-primary/15 border border-primary/40 text-primary'
                  : 'bg-secondary/60 border border-transparent text-muted-foreground hover:bg-secondary'
              }`}
            >
              <span className="text-base">{opt.emoji}</span>
              <span className="text-[10px] font-semibold leading-tight">{opt.label}</span>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground/70 mt-1.5 text-center">
          {CIRCLE_TYPE_OPTIONS.find(o => o.type === circleType)?.desc}
        </p>
      </div>

      {/* Ambient Sound */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Ambient Sound</p>
        <div className="flex gap-1.5">
          {SOUNDSCAPE_DECKS.map(deck => {
            const Icon = DECK_ICONS[deck.id] || Volume2;
            return (
              <button
                key={deck.id}
                onClick={() => onSoundDeckChange(deck.id)}
                className={`flex-1 flex flex-col items-center gap-1 rounded-xl px-2 py-2 transition-all ${
                  activeSoundDeck === deck.id
                    ? 'bg-accent/15 border border-accent/40 text-accent'
                    : 'bg-secondary/60 border border-transparent text-muted-foreground hover:bg-secondary'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="text-[10px] font-semibold">{deck.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Volume slider */}
      {activeSoundDeck !== 'none' && (
        <div className="flex items-center gap-2">
          <Volume2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={soundVolume}
            onChange={e => onSoundVolumeChange(parseFloat(e.target.value))}
            className="flex-1 h-1 rounded-full accent-primary cursor-pointer"
          />
          <span className="text-[10px] text-muted-foreground w-7 text-right">{Math.round(soundVolume * 100)}%</span>
        </div>
      )}

      {/* Firefly Color (Social mode) */}
      {onFireflyColorChange && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
            <Palette className="h-3 w-3" /> Firefly Color
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {FIREFLY_PALETTES.map(p => (
              <button
                key={p.hue}
                onClick={() => onFireflyColorChange(p.hue)}
                className={`flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 transition-all ${
                  activeFireflyHue === p.hue
                    ? 'bg-secondary border border-primary/40'
                    : 'hover:bg-secondary/60 border border-transparent'
                }`}
              >
                <div
                  className="h-5 w-5 rounded-full shadow-lg"
                  style={{
                    background: p.color,
                    boxShadow: `0 0 10px 2px ${p.color}`,
                  }}
                />
                <span className="text-[9px] font-medium text-muted-foreground">{p.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Atmosphere / Location */}
      {onAtmosphereChange && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
            <MapPin className="h-3 w-3" /> Location
          </p>
          <div className="flex flex-col gap-1">
            {ATMOSPHERE_DECKS.map(deck => (
              <button
                key={deck.id}
                onClick={() => onAtmosphereChange(deck.id as AtmosphereDeckId)}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-all ${
                  activeAtmosphere === deck.id
                    ? 'bg-primary/15 border border-primary/40 text-primary'
                    : 'bg-secondary/60 border border-transparent text-muted-foreground hover:bg-secondary'
                }`}
              >
                <div
                  className="h-5 w-5 rounded shrink-0"
                  style={{ background: deck.preview }}
                />
                <span className="text-[10px] font-semibold">{deck.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Pass the Mic (Speaker Delegation) ─── */}
      {onPassMic && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
            <Mic className="h-3 w-3" /> Speaker
          </p>

          {activeSpeakerId ? (
            <div className="mb-2 flex items-center gap-2 rounded-xl bg-accent/10 border border-accent/30 px-3 py-2">
              <Radio className="h-3.5 w-3.5 text-accent animate-pulse" />
              <span className="text-[11px] font-semibold text-foreground flex-1 truncate">
                {participants.find(p => p.userId === activeSpeakerId || p.id === activeSpeakerId)?.name || 'Speaker'}
              </span>
              <button
                onClick={onReclaimMic}
                className="text-[10px] font-bold text-primary hover:text-primary/80 transition-colors"
              >
                Reclaim
              </button>
            </div>
          ) : (
            <div className="mb-2 flex items-center gap-2 rounded-xl bg-secondary/60 px-3 py-2">
              <MicOff className="h-3.5 w-3.5 text-muted-foreground/50" />
              <span className="text-[10px] text-muted-foreground">Open floor (auto-detect)</span>
            </div>
          )}

          <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
            {participants.filter(p => p.type === 'human').map(p => {
              const isCurrentSpeaker = activeSpeakerId && (p.userId === activeSpeakerId || p.id === activeSpeakerId);
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-all ${
                    isCurrentSpeaker
                      ? 'bg-accent/15 border border-accent/30'
                      : 'bg-secondary/40 border border-transparent hover:bg-secondary/70'
                  }`}
                >
                  {p.avatar ? (
                    <img src={p.avatar} referrerPolicy="no-referrer" alt="" className="h-5 w-5 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground shrink-0">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-[10px] font-semibold text-foreground flex-1 truncate">{p.name}</span>
                  {!isCurrentSpeaker && (
                    <button
                      onClick={() => p.userId && onPassMic(p.userId)}
                      className="text-[9px] font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-full px-2 py-0.5 transition-colors"
                    >
                      Give Mic
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {activeSpeakerId && onOpenFloor && (
            <button
              onClick={onOpenFloor}
              className="mt-2 w-full text-[10px] font-semibold text-muted-foreground hover:text-foreground py-1.5 rounded-lg bg-secondary/40 hover:bg-secondary/70 transition-all"
            >
              Open Floor (auto-detect)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function HostOverridePanel(props: HostOverridePanelProps) {
  const {
    isOwner,
    isCoHost = false,
    ...contentProps
  } = props;

  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  if (!isOwner) return null;

  const triggerButton = (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={() => setOpen(!open)}
      className="flex items-center gap-1.5 rounded-full px-3 py-2 glass-card border border-border/50 text-xs font-medium text-foreground shadow-lg"
    >
      <Settings2 className="h-3.5 w-3.5 text-primary" />
      <span className="hidden sm:inline">Host</span>
      <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
    </motion.button>
  );

  if (isMobile) {
    return (
      <div className="absolute top-[52px] right-2 z-30">
        {triggerButton}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[85dvh] pb-[calc(2rem+env(safe-area-inset-bottom))]">
            <SheetHeader className="mb-3">
              <SheetTitle className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-primary" />
                {isCoHost ? 'Co-Host Controls' : 'Host Controls'}
              </SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(85dvh-8rem)]">
              <div className="pr-3">
                <HostControlsContent isCoHost={isCoHost} {...contentProps} />
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return (
    <div className="absolute top-[52px] right-2 z-30">
      {triggerButton}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-2 w-72 max-h-[70vh] overflow-y-auto rounded-2xl p-4 glass-card border border-border/50 shadow-2xl"
          >
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold text-foreground">{isCoHost ? 'Co-Host Controls' : 'Host Controls'}</span>
            </div>
            <HostControlsContent isCoHost={isCoHost} {...contentProps} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
