import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { logger } from '@/utils/logger';
import CompanionImageReveal from '@/components/CompanionImageReveal';

interface AnimatedPortraitProps {
  src: string;
  alt: string;
  isSpeaking: boolean;
  /** Optional: pass an audio MediaStream for real-time volume-reactive glow */
  audioStream?: MediaStream | null;
  /** When false, all breathing/glow/motion animations are disabled */
  enabled?: boolean;
  className?: string;
}

/**
 * Living portrait component — makes companion photos feel alive with:
 * - Idle breathing (slow scale + gentle sway)
 * - Talking pulse (scale + brightness + reactive glow)
 * - Parallax drift (subtle 3D perspective shift)
 * - Audio-reactive ring when MediaStream available
 */
export default function AnimatedPortrait({
  src,
  alt,
  isSpeaking,
  audioStream,
  enabled = true,
  className = '',
}: AnimatedPortraitProps) {
  const [volume, setVolume] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const tick = useCallback(() => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    const avg = data.reduce((sum, v) => sum + v, 0) / data.length / 255;
    setVolume(avg);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (!audioStream) {
      setVolume(0);
      return;
    }
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(audioStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      sourceRef.current = source;
      analyserRef.current = analyser;
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      logger.warn('[AnimatedPortrait] Audio analyser setup failed:', e);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      sourceRef.current?.disconnect();
      audioCtxRef.current?.close().catch(() => {});
      analyserRef.current = null;
      audioCtxRef.current = null;
      sourceRef.current = null;
    };
  }, [audioStream, tick]);

  const hasRealAudio = !!audioStream && volume > 0.01;
  const glowIntensity = hasRealAudio ? volume : isSpeaking ? 0.7 : 0.15;

  // When disabled, render a static portrait with no animations
  if (!enabled) {
    return (
      <div className={`relative overflow-hidden rounded-3xl ${className}`}>
        <CompanionImageReveal src={src} alt={alt} className="h-full w-full" />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-3xl ${className}`}>
      {/* Outer glow ring — animated pulse in idle, audio-reactive when speaking */}
      <motion.div
        className="absolute inset-0 rounded-3xl pointer-events-none z-10"
        animate={isSpeaking || hasRealAudio ? {
          boxShadow: [
            `0 0 ${Math.round(18 + glowIntensity * 65)}px ${Math.round((18 + glowIntensity * 65) * 0.4)}px hsl(var(--accent) / ${(0.08 + glowIntensity * 0.45).toFixed(2)})`,
          ],
        } : {
          boxShadow: [
            '0 0 22px 9px hsl(var(--accent) / 0.12)',
            '0 0 38px 15px hsl(var(--accent) / 0.32)',
            '0 0 22px 9px hsl(var(--accent) / 0.12)',
          ],
        }}
        transition={isSpeaking || hasRealAudio ? { duration: 0.15 } : {
          repeat: Infinity,
          duration: 4,
          ease: 'easeInOut',
        }}
      />

      {/* Inner ambient ring — pulses in both idle and speaking */}
      <motion.div
        className="absolute inset-0 rounded-3xl pointer-events-none z-10"
        style={{
          border: `2px solid hsl(var(--accent) / 0.1)`,
        }}
        animate={isSpeaking ? {
          borderColor: [
            'hsl(var(--accent) / 0.2)',
            'hsl(var(--accent) / 0.5)',
            'hsl(var(--accent) / 0.2)',
          ],
        } : {
          borderColor: [
            'hsl(var(--accent) / 0.08)',
            'hsl(var(--accent) / 0.25)',
            'hsl(var(--accent) / 0.08)',
          ],
        }}
        transition={isSpeaking ? { repeat: Infinity, duration: 1.2, ease: 'easeInOut' } : { repeat: Infinity, duration: 4, ease: 'easeInOut' }}
      />

      {/* The portrait image — with parallax drift, breathing, and talking effects */}
      <motion.div
        className="h-full w-full"
        // Slight over-scale to allow parallax movement without showing edges
        style={{ scale: 1.04 }}
        animate={isSpeaking ? {
          // Talking: subtle head-like movement
          x: [0, 2, -1.5, 1, -0.5, 0],
          y: [0, -2, 1, -1.5, 0.5, 0],
          rotateZ: [0, 0.6, -0.4, 0.3, -0.15, 0],
          scale: [1.04, 1.06, 1.03, 1.06, 1.04],
        } : {
          // Idle: gentle breathing sway
          x: [0, 2, 0, -2, 0],
          y: [0, -3, 0, -1.5, 0],
          rotateZ: [0, 0.4, 0, -0.4, 0],
          scale: [1.03, 1.06, 1.03, 1.05, 1.03],
        }}
        transition={isSpeaking ? {
          repeat: Infinity,
          duration: 1.6,
          ease: 'easeInOut',
        } : {
          repeat: Infinity,
          duration: 6,
          ease: 'easeInOut',
        }}
      >
        <CompanionImageReveal src={src} alt={alt} className="h-full w-full" />
      </motion.div>

      {/* Bottom gradient with breathing simulation — light moves up/down */}
      <motion.div
        className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none z-10"
        style={{
          background: 'linear-gradient(to top, hsl(var(--accent) / 0.06), transparent)',
        }}
        animate={isSpeaking ? {
          opacity: [0.4, 1, 0.3, 0.9, 0.4],
          y: [0, -8, 0, -5, 0],
        } : {
          opacity: [0.2, 0.65, 0.2],
          y: [0, -6, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: isSpeaking ? 1.2 : 4,
          ease: 'easeInOut',
        }}
      />

      {/* Talking mouth glow — soft light in lower third when speaking */}
      {isSpeaking && (
        <motion.div
          className="absolute inset-x-0 pointer-events-none z-10"
          style={{
            bottom: '20%',
            height: '25%',
            background: 'radial-gradient(ellipse at center, hsl(var(--accent) / 0.15), transparent 70%)',
          }}
          animate={{
            opacity: [0, 0.6, 0],
            scale: [0.9, 1.1, 0.9],
          }}
          transition={{
            repeat: Infinity,
            duration: 0.8,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Volume indicator dot — only with real audio analysis */}
      {hasRealAudio && (
        <div
          className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-accent transition-transform duration-100 z-20"
          style={{ transform: `scale(${0.6 + glowIntensity * 1.2})` }}
        />
      )}
    </div>
  );
}
