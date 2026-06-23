import { useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  shape: 'rect' | 'circle';
}

const COLORS = [
  'hsl(340, 82%, 62%)',  // pink
  'hsl(45, 100%, 60%)',  // gold
  'hsl(200, 80%, 60%)',  // blue
  'hsl(150, 60%, 55%)',  // green
  'hsl(280, 70%, 65%)',  // purple
  'hsl(20, 90%, 60%)',   // orange
];

export function useConfetti() {
  const burst = useCallback((originX?: number, originY?: number) => {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none;';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d')!;

    const cx = originX ?? canvas.width / 2;
    const cy = originY ?? canvas.height * 0.35;

    const particles: Particle[] = Array.from({ length: 80 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 8;
      return {
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 4 + Math.random() * 6,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        opacity: 1,
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
      };
    });

    let frame = 0;
    const maxFrames = 90;

    function animate() {
      frame++;
      if (frame > maxFrames) {
        canvas.remove();
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.18; // gravity
        p.vx *= 0.99;
        p.rotation += p.rotationSpeed;
        p.opacity = Math.max(0, 1 - frame / maxFrames);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  }, []);

  return { burst };
}
