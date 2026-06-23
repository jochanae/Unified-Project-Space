import { createContext, useContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { SoundDeckId } from '@/hooks/useAmbientSoundscape';

interface SoundscapeContextType {
  activeDeck: SoundDeckId;
  volume: number;
  sfxEnabled: boolean;
  switchDeck: (deckId: SoundDeckId) => void;
  setVolume: (v: number) => void;
  toggleSfx: () => void;
  isPlaying: boolean;
}

const SoundscapeContext = createContext<SoundscapeContextType | null>(null);

export function useSoundscape() {
  const ctx = useContext(SoundscapeContext);
  if (!ctx) throw new Error('useSoundscape must be used within SoundscapeProvider');
  return ctx;
}

export function useSoundscapeSafe() {
  return useContext(SoundscapeContext);
}

// ── Procedural generators (moved from hook for global use) ──

function createBrownNoise(ctx: AudioContext, master: GainNode) {
  const bufferSize = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buffer.getChannelData(ch);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      d[i] = lastOut * 3.5;
    }
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(300, ctx.currentTime);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  src.connect(filter).connect(gain).connect(master);
  src.start();
  return [src];
}

function createRainVinyl(ctx: AudioContext, master: GainNode) {
  const nodes: AudioNode[] = [];
  const bufferSize = ctx.sampleRate * 4;
  const rainBuf = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = rainBuf.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      d[i] = (b0 + b1 + b2 + white * 0.5362) * 0.11;
    }
  }
  const rain = ctx.createBufferSource();
  rain.buffer = rainBuf;
  rain.loop = true;
  const rainFilter = ctx.createBiquadFilter();
  rainFilter.type = 'lowpass';
  rainFilter.frequency.setValueAtTime(4000, ctx.currentTime);
  const rainGain = ctx.createGain();
  rainGain.gain.setValueAtTime(0.05, ctx.currentTime);
  rain.connect(rainFilter).connect(rainGain).connect(master);
  rain.start();
  nodes.push(rain);

  const crackleSize = ctx.sampleRate * 2;
  const crackleBuf = ctx.createBuffer(1, crackleSize, ctx.sampleRate);
  const cd = crackleBuf.getChannelData(0);
  for (let i = 0; i < crackleSize; i++) cd[i] = (Math.random() * 2 - 1) * 0.003;
  const crackle = ctx.createBufferSource();
  crackle.buffer = crackleBuf;
  crackle.loop = true;
  const crackleFilter = ctx.createBiquadFilter();
  crackleFilter.type = 'bandpass';
  crackleFilter.frequency.setValueAtTime(3000, ctx.currentTime);
  crackleFilter.Q.setValueAtTime(0.5, ctx.currentTime);
  const crackleGain = ctx.createGain();
  crackleGain.gain.setValueAtTime(0.6, ctx.currentTime);
  crackle.connect(crackleFilter).connect(crackleGain).connect(master);
  crackle.start();
  nodes.push(crackle);
  return nodes;
}

function createSynthCosmos(ctx: AudioContext, master: GainNode) {
  const nodes: AudioNode[] = [];
  const freqs = [174.6, 220, 261.6, 349.2];
  freqs.forEach((f, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, ctx.currentTime);
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(0.05 + idx * 0.02, ctx.currentTime);
    lfoGain.gain.setValueAtTime(2, ctx.currentTime);
    lfo.connect(lfoGain).connect(osc.detune);
    lfo.start();
    nodes.push(lfo);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 12);
    filter.frequency.linearRampToValueAtTime(500, ctx.currentTime + 24);
    gain.gain.setValueAtTime(0.012, ctx.currentTime);
    osc.connect(filter).connect(gain).connect(master);
    osc.start();
    nodes.push(osc);
  });
  return nodes;
}

function createLoFi(ctx: AudioContext, master: GainNode) {
  const nodes: AudioNode[] = [];
  const freqs = [261.6, 329.6, 392.0, 523.3];
  freqs.forEach(f => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(f, ctx.currentTime);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(600, ctx.currentTime + 8);
    filter.frequency.linearRampToValueAtTime(300, ctx.currentTime + 16);
    gain.gain.setValueAtTime(0.012, ctx.currentTime);
    osc.connect(filter).connect(gain).connect(master);
    osc.start();
    nodes.push(osc);
  });
  const bufferSize = ctx.sampleRate * 2;
  const noiseBuf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.003;
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf;
  noise.loop = true;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.setValueAtTime(3000, ctx.currentTime);
  noiseFilter.Q.setValueAtTime(0.5, ctx.currentTime);
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.8, ctx.currentTime);
  noise.connect(noiseFilter).connect(noiseGain).connect(master);
  noise.start();
  nodes.push(noise);
  return nodes;
}

function createFireCrackling(ctx: AudioContext, master: GainNode) {
  const nodes: AudioNode[] = [];
  const bufferSize = ctx.sampleRate * 4;
  const fireBuf = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = fireBuf.getChannelData(ch);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.15 * white) / 1.15;
      d[i] = lastOut * 3.5;
    }
  }
  const fireBase = ctx.createBufferSource();
  fireBase.buffer = fireBuf;
  fireBase.loop = true;
  const bassFilter = ctx.createBiquadFilter();
  bassFilter.type = 'lowpass';
  bassFilter.frequency.setValueAtTime(180, ctx.currentTime);
  bassFilter.Q.setValueAtTime(0.8, ctx.currentTime);
  const baseGain = ctx.createGain();
  baseGain.gain.setValueAtTime(0.18, ctx.currentTime);
  fireBase.connect(bassFilter).connect(baseGain).connect(master);
  fireBase.start();
  nodes.push(fireBase);

  const crackleBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const cd = crackleBuf.getChannelData(0);
  for (let i = 0; i < crackleBuf.length; i++) {
    cd[i] = Math.random() < 0.003
      ? (Math.random() * 2 - 1) * 0.9
      : (Math.random() * 2 - 1) * 0.004;
  }
  const crackle = ctx.createBufferSource();
  crackle.buffer = crackleBuf;
  crackle.loop = true;
  const crackleFilter = ctx.createBiquadFilter();
  crackleFilter.type = 'bandpass';
  crackleFilter.frequency.setValueAtTime(1800, ctx.currentTime);
  crackleFilter.Q.setValueAtTime(0.4, ctx.currentTime);
  const crackleGain = ctx.createGain();
  crackleGain.gain.setValueAtTime(0.7, ctx.currentTime);
  crackle.connect(crackleFilter).connect(crackleGain).connect(master);
  crackle.start();
  nodes.push(crackle);
  return nodes;
}

export function SoundscapeProvider({ children }: { children: ReactNode }) {
  const [activeDeck, setActiveDeck] = useState<SoundDeckId>(() =>
    (localStorage.getItem('compani-sound-deck') as SoundDeckId) || 'none'
  );
  const [volume, setVolumeState] = useState(() => {
    const v = localStorage.getItem('compani-sound-volume');
    return v ? Number(v) : 50;
  });
  const [sfxEnabled, setSfxEnabled] = useState(() =>
    localStorage.getItem('compani-sfx-enabled') !== 'false'
  );

  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const nodesRef = useRef<AudioNode[]>([]);

  const cleanup = useCallback(() => {
    nodesRef.current.forEach(n => {
      try { (n as any).stop?.(); } catch { /* */ }
      try { n.disconnect(); } catch { /* */ }
    });
    nodesRef.current = [];
    if (ctxRef.current && ctxRef.current.state !== 'closed') {
      try { ctxRef.current.close(); } catch { /* */ }
    }
    ctxRef.current = null;
    masterRef.current = null;
  }, []);

  const startAudio = useCallback((deckId: SoundDeckId, vol: number) => {
    cleanup();
    if (deckId === 'none') return;
    try {
      const ctx = new AudioContext();
      const master = ctx.createGain();
      master.gain.setValueAtTime(0, ctx.currentTime);
      // Honor a longer fade-in when Focus Mode requested it (memory fade)
      const fadeSeconds = (window as any).__compani_next_fade_seconds ?? 2;
      (window as any).__compani_next_fade_seconds = undefined;
      master.gain.linearRampToValueAtTime((vol / 100) * 0.6, ctx.currentTime + fadeSeconds);
      master.connect(ctx.destination);
      ctxRef.current = ctx;
      masterRef.current = master;

      let nodes: AudioNode[] = [];
      switch (deckId) {
        case 'brown': nodes = createBrownNoise(ctx, master); break;
        case 'rain': nodes = createRainVinyl(ctx, master); break;
        case 'synth': nodes = createSynthCosmos(ctx, master); break;
        case 'lofi': nodes = createLoFi(ctx, master); break;
        case 'fire': nodes = createFireCrackling(ctx, master); break;
      }
      nodesRef.current = nodes;
    } catch { /* non-critical */ }
  }, [cleanup]);

  const switchDeck = useCallback((deckId: SoundDeckId) => {
    setActiveDeck(deckId);
    localStorage.setItem('compani-sound-deck', deckId);
    startAudio(deckId, volume);
  }, [startAudio, volume]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    localStorage.setItem('compani-sound-volume', String(v));
    if (masterRef.current && ctxRef.current) {
      masterRef.current.gain.linearRampToValueAtTime(
        (v / 100) * 0.6,
        ctxRef.current.currentTime + 0.3
      );
    }
  }, []);

  const toggleSfx = useCallback(() => {
    setSfxEnabled(prev => {
      const next = !prev;
      localStorage.setItem('compani-sfx-enabled', next ? 'true' : 'false');
      return next;
    });
  }, []);

  // Listen for localStorage changes from other tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'compani-sound-deck') {
        const newDeck = (e.newValue as SoundDeckId) || 'none';
        setActiveDeck(newDeck);
        startAudio(newDeck, volume);
      }
      if (e.key === 'compani-sound-volume') {
        const v = e.newValue ? Number(e.newValue) : 50;
        setVolumeState(v);
      }
      if (e.key === 'compani-sfx-enabled') {
        setSfxEnabled(e.newValue !== 'false');
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [startAudio, volume]);

  // Listen for same-tab custom events from Settings
  useEffect(() => {
    const handler = (e: Event) => {
      const { key, value } = (e as CustomEvent).detail;
      if (key === 'deck') {
        const newDeck = value as SoundDeckId;
        setActiveDeck(newDeck);
        startAudio(newDeck, volume);
      }
      if (key === 'volume') {
        const v = Number(value);
        setVolumeState(v);
        if (masterRef.current && ctxRef.current) {
          masterRef.current.gain.linearRampToValueAtTime(
            (v / 100) * 0.6,
            ctxRef.current.currentTime + 0.3
          );
        }
      }
    };
    window.addEventListener('compani-sound-change', handler);
    return () => window.removeEventListener('compani-sound-change', handler);
  }, [startAudio, volume]);

  // Auto-start audio on mount if a deck was previously selected
  const hasAutoStarted = useRef(false);
  useEffect(() => {
    if (hasAutoStarted.current) return;
    hasAutoStarted.current = true;
    if (activeDeck !== 'none') {
      // Small delay to ensure AudioContext is allowed (needs user gesture history)
      const timer = setTimeout(() => startAudio(activeDeck, volume), 500);
      return () => clearTimeout(timer);
    }
  }, []); // intentionally empty — run once on mount

  // Resume AudioContext if iOS Safari suspends it during navigation
  useEffect(() => {
    const resumeAudio = () => {
      if (ctxRef.current && ctxRef.current.state === 'suspended') {
        ctxRef.current.resume();
      }
    };
    // iOS Safari may suspend on visibility change or route transitions
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') resumeAudio();
    });
    window.addEventListener('focus', resumeAudio);
    // Also listen for route changes (click events as proxy)
    window.addEventListener('popstate', resumeAudio);
    return () => {
      document.removeEventListener('visibilitychange', resumeAudio);
      window.removeEventListener('focus', resumeAudio);
      window.removeEventListener('popstate', resumeAudio);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup]);

  const isPlaying = activeDeck !== 'none' && nodesRef.current.length > 0;

  return (
    <SoundscapeContext.Provider value={{ activeDeck, volume, sfxEnabled, switchDeck, setVolume, toggleSfx, isPlaying }}>
      {children}
    </SoundscapeContext.Provider>
  );
}
