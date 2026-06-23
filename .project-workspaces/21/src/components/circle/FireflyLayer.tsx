// PERF: 2026-03-15 — Verified resize listener cleanup — prevents memory leak on unmount
import { useRef, useEffect } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  hue: number;
  phase: number;
  orbitAngle: number;
  orbitSpeed: number;
}

interface FireflyLayerProps {
  dragOffset?: { x: number; y: number };
  amplitude?: number;
  huddleCenter?: { x: number; y: number } | null;
}

const PARTICLE_COUNT = 45;
const HUES = [45, 50, 280, 260, 200, 210, 35, 310]; // warm golds, purples, blues

export default function FireflyLayer({ dragOffset = { x: 0, y: 0 }, amplitude = 0, huddleCenter = null }: FireflyLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const propsRef = useRef({ dragOffset, amplitude, huddleCenter });
  propsRef.current = { dragOffset, amplitude, huddleCenter };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * devicePixelRatio;
      canvas.height = canvas.offsetHeight * devicePixelRatio;
    };
    resize();
    window.addEventListener('resize', resize);

    // Init particles
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: 1 + Math.random() * 2.5,
      opacity: 0.15 + Math.random() * 0.35,
      hue: HUES[Math.floor(Math.random() * HUES.length)],
      phase: Math.random() * Math.PI * 2,
      orbitAngle: Math.random() * Math.PI * 2,
      orbitSpeed: 0.005 + Math.random() * 0.015,
    }));

    let time = 0;
    const animate = () => {
      time += 0.016;
      const { dragOffset: offset, amplitude: amp, huddleCenter: hc } = propsRef.current;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const dpr = devicePixelRatio;
      const parallaxX = -offset.x * 0.3 * dpr;
      const parallaxY = -offset.y * 0.3 * dpr;
      const ampBoost = amp > 0.1 ? amp * 0.3 : 0;

      for (const p of particlesRef.current) {
        if (hc) {
          // Orbit mode around huddle center
          const cx = hc.x * dpr;
          const cy = hc.y * dpr;
          const radius = 60 * dpr + (p.phase / (Math.PI * 2)) * 60 * dpr;
          p.orbitAngle += p.orbitSpeed;
          p.x += (cx + Math.cos(p.orbitAngle) * radius - p.x) * 0.03;
          p.y += (cy + Math.sin(p.orbitAngle) * radius - p.y) * 0.03;
        } else {
          // Free drift with sine oscillation
          p.x += p.vx + Math.sin(time + p.phase) * 0.15;
          p.y += p.vy + Math.cos(time * 0.7 + p.phase) * 0.1;
          // Wrap
          if (p.x < 0) p.x = w;
          if (p.x > w) p.x = 0;
          if (p.y < 0) p.y = h;
          if (p.y > h) p.y = 0;
        }

        const drawX = p.x + parallaxX;
        const drawY = p.y + parallaxY;
        const finalOpacity = Math.min(1, p.opacity + ampBoost);

        ctx.beginPath();
        ctx.arc(drawX, drawY, p.size * dpr, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 60%, 65%, ${finalOpacity})`;
        ctx.shadowBlur = 6 * dpr;
        ctx.shadowColor = `hsla(${p.hue}, 60%, 65%, ${finalOpacity * 0.5})`;
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
}
