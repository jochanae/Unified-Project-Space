import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Video, VideoOff } from 'lucide-react';

interface PresenterPiPProps {
  /** Only the speaker/presenter sees the toggle & streams their cam */
  isSpeaker: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
}

export default function PresenterPiP({ isSpeaker, size = 'md' }: PresenterPiPProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const dim = size === 'sm' ? 96 : 140;

  const startCam = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 320, facingMode: 'user' },
        audio: false,
      });
      setStream(s);
      setActive(true);
    } catch {
      /* user denied or no camera */
    }
  }, []);

  const stopCam = useCallback(() => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setActive(false);
  }, [stream]);

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stream?.getTracks().forEach(t => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isSpeaker) return null;

  return (
    <>
      {/* Toggle button — only visible to speaker */}
      {!active && (
        <button
          onClick={startCam}
          className="absolute bottom-3 right-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-card/60 border border-border/30 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:bg-card/80 transition-colors"
          title="Turn on camera"
        >
          <Video className="h-4 w-4" />
        </button>
      )}

      {/* Draggable PiP bubble */}
      {active && (
        <motion.div
          className="absolute z-20 cursor-grab active:cursor-grabbing"
          style={{
            bottom: 12,
            right: 12,
            width: dim,
            height: dim,
          }}
          drag
          dragConstraints={{ top: -(500), left: -(800), right: 0, bottom: 0 }}
          dragElastic={0.08}
          dragMomentum={false}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
        >
          <div
            className="relative w-full h-full rounded-full overflow-hidden border-2 border-primary/40 shadow-lg"
            style={{
              boxShadow: '0 0 20px 4px hsl(var(--primary) / 0.15)',
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
            />

            {/* Off button */}
            <button
              onClick={(e) => { e.stopPropagation(); stopCam(); }}
              className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive/70 text-destructive-foreground hover:bg-destructive transition-colors"
              title="Turn off camera"
            >
              <VideoOff className="h-3 w-3" />
            </button>
          </div>
        </motion.div>
      )}
    </>
  );
}
