import { useState, useRef, useCallback } from 'react';
import { Play, Pause } from 'lucide-react';
import { motion } from 'framer-motion';

interface AudioMessagePlayerProps {
  audioUrl: string;
  duration: number;
  isUser?: boolean;
}

export default function AudioMessagePlayer({ audioUrl, duration, isUser }: AudioMessagePlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animRef = useRef<number>(0);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${Math.round(s % 60).toString().padStart(2, '0')}`;

  const tick = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    setProgress(a.currentTime / (a.duration || duration));
    if (!a.paused) animRef.current = requestAnimationFrame(tick);
  }, [duration]);

  const toggle = useCallback(() => {
    if (!audioRef.current) {
      const a = new Audio(audioUrl);
      audioRef.current = a;
      a.onended = () => { setPlaying(false); setProgress(0); };
      a.onplay = () => { setPlaying(true); animRef.current = requestAnimationFrame(tick); };
      a.onpause = () => { setPlaying(false); cancelAnimationFrame(animRef.current); };
    }
    const a = audioRef.current;
    if (a.paused) a.play(); else a.pause();
  }, [audioUrl, tick]);

  // Generate random bars for visual
  const bars = useRef(Array.from({ length: 20 }, () => 0.2 + Math.random() * 0.8)).current;

  return (
    <button onClick={toggle} className="flex items-center gap-2.5 w-full min-w-[180px] group">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
        isUser ? 'bg-primary-foreground/20' : 'bg-primary/15'
      }`}>
        {playing
          ? <Pause className="h-4 w-4" />
          : <Play className="h-4 w-4 ml-0.5" />
        }
      </div>

      <div className="flex-1 flex flex-col gap-1">
        {/* Waveform */}
        <div className="flex items-center gap-px h-5">
          {bars.map((h, i) => {
            const filled = progress > i / bars.length;
            return (
              <motion.div
                key={i}
                className={`w-[3px] rounded-full transition-colors duration-150 ${
                  filled
                    ? isUser ? 'bg-primary-foreground' : 'bg-primary'
                    : isUser ? 'bg-primary-foreground/30' : 'bg-primary/25'
                }`}
                style={{ height: `${h * 100}%` }}
              />
            );
          })}
        </div>
        <span className={`text-[10px] leading-none ${isUser ? 'text-primary-foreground/60' : 'text-muted-foreground/60'}`}>
          {playing ? formatTime((audioRef.current?.currentTime || 0)) : formatTime(duration)}
        </span>
      </div>
    </button>
  );
}
