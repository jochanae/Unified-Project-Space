import { useState, useEffect, useRef, useMemo } from 'react';
import { StreamPhase } from '@/features/quinn/hooks/use-build-stream';

export type IntelligencePhase = 'dormant' | 'listening' | 'processing' | 'ready';

interface IntelligenceState {
  phase: IntelligencePhase;
  pulse: number; // 0-1 normalized heartbeat
  statusText: string;
  intensity: number; // 0-1 for glow/blur scaling
}

const STATUS_MAP: Record<IntelligencePhase, string[]> = {
  dormant: [
    'Intelligence standing by.',
    'Awaiting your vision.',
    'Ready to turn ideas into assets.',
  ],
  listening: [
    'Listening to your signal…',
    'Absorbing context…',
    'Mapping your intent…',
  ],
  processing: [
    'Synthesizing strategy…',
    'Building your blueprint…',
    'Refining the funnel architecture…',
  ],
  ready: [
    'Blueprint locked. Ready to deploy.',
    'Intelligence applied. Your asset awaits.',
    'Strategy complete. Launch when ready.',
  ],
};

const PHASE_SPEEDS: Record<IntelligencePhase, number> = {
  dormant: 0.4,
  listening: 0.8,
  processing: 1.8,
  ready: 0.5,
};

const PHASE_INTENSITY: Record<IntelligencePhase, number> = {
  dormant: 0.2,
  listening: 0.5,
  processing: 1.0,
  ready: 0.7,
};

function pickRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Map build stream phases to intelligence phases */
function deriveIntelligencePhase(streamPhase: StreamPhase): IntelligencePhase {
  switch (streamPhase) {
    case 'idle': return 'dormant';
    case 'generating': return 'listening';
    case 'strategy':
    case 'funnel':
    case 'page': return 'processing';
    case 'complete': return 'ready';
    case 'error': return 'dormant';
    default: return 'dormant';
  }
}

export function useIntelligenceState(streamPhase: StreamPhase = 'idle'): IntelligenceState {
  const intelligencePhase = useMemo(() => deriveIntelligencePhase(streamPhase), [streamPhase]);
  
  const [pulse, setPulse] = useState(0);
  const [statusText, setStatusText] = useState(pickRandom(STATUS_MAP.dormant));
  const [intensity, setIntensity] = useState(PHASE_INTENSITY.dormant);
  const rafRef = useRef<number>(0);
  const targetIntensityRef = useRef(PHASE_INTENSITY.dormant);

  // Smooth intensity interpolation — no jumps
  useEffect(() => {
    targetIntensityRef.current = PHASE_INTENSITY[intelligencePhase];
  }, [intelligencePhase]);

  // Heartbeat pulse — continuous sine wave with phase-dependent speed
  useEffect(() => {
    const start = performance.now();
    const speed = PHASE_SPEEDS[intelligencePhase];

    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      setPulse((Math.sin(elapsed * Math.PI * speed) + 1) / 2);
      
      // Smooth intensity lerp (no jumps)
      setIntensity(prev => prev + (targetIntensityRef.current - prev) * 0.03);
      
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [intelligencePhase]);

  // Status text cycles
  useEffect(() => {
    setStatusText(pickRandom(STATUS_MAP[intelligencePhase]));
    const interval = intelligencePhase === 'processing' ? 3000 : 6000;
    const iv = setInterval(() => {
      setStatusText(pickRandom(STATUS_MAP[intelligencePhase]));
    }, interval);
    return () => clearInterval(iv);
  }, [intelligencePhase]);

  return { phase: intelligencePhase, pulse, statusText, intensity };
}
