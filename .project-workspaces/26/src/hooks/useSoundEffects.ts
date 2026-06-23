import { useCallback, useRef } from "react";

// Simple sound effect URLs (royalty-free, base64 encoded tone generators)
const SOUNDS = {
  coinCollect: "data:audio/wav;base64,UklGRl9vT19telefonWAVEZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU",
  achievement: "data:audio/wav;base64,UklGRl9vT19telefonWAVEZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU",
  buttonTap: "data:audio/wav;base64,UklGRl9vT19telefonWAVEZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU",
  success: "data:audio/wav;base64,UklGRl9vT19telefonWAVEZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU",
  piggyBank: "data:audio/wav;base64,UklGRl9vT19telefonWAVEZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU",
  swoosh: "data:audio/wav;base64,UklGRl9vT19telefonWAVEZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU",
  pop: "data:audio/wav;base64,UklGRl9vT19telefonWAVEZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU",
  celebration: "data:audio/wav;base64,UklGRl9vT19telefonWAVEZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU",
};

type SoundType = keyof typeof SOUNDS;

// Web Audio API based sound generator for kids-friendly sounds
const createSound = (type: SoundType): AudioBuffer | null => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    
    let duration = 0.2;
    let frequencies: number[] = [];
    let waveType: OscillatorType = "sine";
    
    switch (type) {
      case "coinCollect":
        duration = 0.15;
        frequencies = [800, 1200, 1600];
        break;
      case "achievement":
        duration = 0.4;
        frequencies = [523, 659, 784, 1047]; // C5, E5, G5, C6 chord
        break;
      case "buttonTap":
        duration = 0.05;
        frequencies = [600];
        break;
      case "success":
        duration = 0.3;
        frequencies = [440, 554, 659]; // A4, C#5, E5
        break;
      case "piggyBank":
        duration = 0.25;
        frequencies = [300, 400, 500];
        waveType = "triangle";
        break;
      case "swoosh":
        duration = 0.15;
        frequencies = [200, 800];
        break;
      case "pop":
        duration = 0.08;
        frequencies = [400, 200];
        break;
      case "celebration":
        duration = 0.5;
        frequencies = [523, 659, 784, 1047, 1319];
        break;
    }
    
    const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      let sample = 0;
      
      frequencies.forEach((freq, idx) => {
        const delay = idx * 0.02;
        if (t >= delay) {
          const adjustedT = t - delay;
          const envelope = Math.exp(-adjustedT * 8);
          sample += Math.sin(2 * Math.PI * freq * adjustedT) * envelope * 0.3;
        }
      });
      
      data[i] = Math.max(-1, Math.min(1, sample));
    }
    
    return buffer;
  } catch {
    return null;
  }
};

export const useSoundEffects = (enabled: boolean = true) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundBuffersRef = useRef<Map<SoundType, AudioBuffer>>(new Map());
  
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);
  
  const playSound = useCallback((type: SoundType) => {
    if (!enabled) return;
    
    try {
      const audioContext = getAudioContext();
      
      // Get or create the sound buffer
      let buffer = soundBuffersRef.current.get(type);
      if (!buffer) {
        buffer = createSound(type) as AudioBuffer;
        if (buffer) {
          soundBuffersRef.current.set(type, buffer);
        }
      }
      
      if (!buffer) return;
      
      // Create a new buffer source and play
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0.4; // Keep volume kid-friendly
      
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      source.start(0);
    } catch (error) {
      console.log("Sound playback not available");
    }
  }, [enabled, getAudioContext]);
  
  return {
    playCoinCollect: useCallback(() => playSound("coinCollect"), [playSound]),
    playAchievement: useCallback(() => playSound("achievement"), [playSound]),
    playButtonTap: useCallback(() => playSound("buttonTap"), [playSound]),
    playSuccess: useCallback(() => playSound("success"), [playSound]),
    playPiggyBank: useCallback(() => playSound("piggyBank"), [playSound]),
    playSwoosh: useCallback(() => playSound("swoosh"), [playSound]),
    playPop: useCallback(() => playSound("pop"), [playSound]),
    playCelebration: useCallback(() => playSound("celebration"), [playSound]),
  };
};
