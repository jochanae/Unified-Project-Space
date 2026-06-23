// ShatterBurst — Expanding ring + canvas particle debris for the orb "shatter" moment
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const PARTICLE_COUNT = 48;
const DURATION_MS = 800;

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number; opacity: number;
  hue: number;
}

function spawnParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 7;
    return {
      x: 0, y: 0,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2 + Math.random() * 4,
      opacity: 1,
      hue: 38 + Math.random() * 12, // gold range
    };
  });
}

export default function ShatterBurst() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 300;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const particles = spawnParticles();
    let frame = 0;
    const maxFrames = Math.round((DURATION_MS / 1000) * 60);

    let raf: number;
    function animate() {
      frame++;
      if (frame > maxFrames) return;

      ctx!.clearRect(0, 0, size, size);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12; // light gravity
        p.vx *= 0.98;
        p.opacity = Math.max(0, 1 - frame / maxFrames);

        ctx!.save();
        ctx!.globalAlpha = p.opacity;
        ctx!.fillStyle = `hsl(${p.hue}, 80%, 55%)`;
        ctx!.beginPath();
        ctx!.arc(cx + p.x, cy + p.y, p.size, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.restore();
      }

      raf = requestAnimationFrame(animate);
    }

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {/* Expanding shatter ring */}
      <motion.div
        initial={{ scale: 1, opacity: 1, borderWidth: 8 }}
        animate={{ scale: 5, opacity: 0, borderWidth: 1 }}
        transition={{ duration: 0.8, ease: [0.165, 0.84, 0.44, 1] }}
        className="absolute rounded-full border-primary"
        style={{ width: 120, height: 120, borderStyle: 'solid' }}
      />

      {/* Second ring — slightly delayed for depth */}
      <motion.div
        initial={{ scale: 1, opacity: 0.6, borderWidth: 4 }}
        animate={{ scale: 3.5, opacity: 0, borderWidth: 1 }}
        transition={{ duration: 0.7, delay: 0.05, ease: [0.165, 0.84, 0.44, 1] }}
        className="absolute rounded-full border-primary/60"
        style={{ width: 120, height: 120, borderStyle: 'solid' }}
      />

      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        className="absolute"
        style={{ width: 300, height: 300 }}
      />
    </div>
  );
}
