import { useState, useEffect, useRef, useCallback } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { format } from 'date-fns';

export interface VisionSouvenir {
  image: string;
  whisper: string;
  timestamp: number;
  dominantColor: string;
  participants: string[];
}

const STORAGE_KEY = 'soul-lounge-visions';

export function getVisions(): VisionSouvenir[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

export function saveVision(v: VisionSouvenir) {
  const existing = getVisions();
  existing.unshift(v);
  // Keep max 50
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(0, 50)));
}

interface VisionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReLive?: (gradient: string) => void;
}

export default function VisionDrawer({ open, onOpenChange, onReLive }: VisionDrawerProps) {
  const [visions, setVisions] = useState<VisionSouvenir[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) setVisions(getVisions());
  }, [open]);

  const handleScroll = useCallback(() => {
    try { navigator.vibrate?.(5); } catch { }
  }, []);

  const handleLongPressStart = useCallback((color: string) => {
    longPressTimer.current = setTimeout(() => {
      if (onReLive && color) {
        onReLive(`radial-gradient(ellipse at 50% 50%, ${color}, hsl(225 25% 6%))`);
        try { navigator.vibrate?.(30); } catch { }
      }
    }, 600);
  }, [onReLive]);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[40dvh]">
        <DrawerHeader>
          <DrawerTitle className="text-sm font-display">Vision Archive</DrawerTitle>
        </DrawerHeader>
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto px-4 pb-6 pt-2 snap-x snap-mandatory"
          onScroll={handleScroll}
        >
          {visions.length === 0 ? (
            <div className="flex flex-col items-center justify-center w-full py-8 text-center">
              <span className="text-2xl mb-2">✨</span>
              <p className="text-xs text-muted-foreground">No visions yet. Huddle and crush a spark to capture one.</p>
            </div>
          ) : (
            visions.map((v, i) => (
              <div
                key={v.timestamp}
                className="shrink-0 snap-center w-48 rounded-xl overflow-hidden border-2 border-white/20 shadow-lg cursor-pointer select-none"
                style={{ transform: `rotate(${i % 2 === 0 ? -2 : 2}deg)` }}
                onPointerDown={() => handleLongPressStart(v.dominantColor)}
                onPointerUp={handleLongPressEnd}
                onPointerLeave={handleLongPressEnd}
              >
                <img src={v.image} alt="Vision souvenir" className="w-full h-32 object-cover" />
                <div className="p-2 bg-card/80 backdrop-blur-sm">
                  <p className="text-[10px] text-foreground/80 leading-tight line-clamp-2 mb-1" style={{ letterSpacing: '0.05em' }}>
                    {v.whisper}
                  </p>
                  <p className="text-[8px] text-muted-foreground/50">
                    {format(new Date(v.timestamp), 'MMM d, yyyy · h:mm a')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

