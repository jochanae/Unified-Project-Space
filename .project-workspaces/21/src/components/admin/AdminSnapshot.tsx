/**
 * AdminSnapshot — "Sanctuary Snapshot" generator.
 * Renders a gold-on-navy (#0A0B1E) canvas manifesto of "First 100" stats,
 * including a simplified pulse map, key metrics, founder signature,
 * and Zero-Trace privacy badge. Downloads as a high-res PNG.
 */
import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Shield, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SnapshotMetrics {
  architects: number;
  vaultEntries: number;
  journeys: number;
  trustScore: number;
  clusters: { x: number; y: number; size: number }[];
}

// Simplified region coords for the snapshot canvas
const REGION_COORDS: Record<string, { x: number; y: number }> = {
  'Atlanta': { x: 175, y: 115 }, 'Covington': { x: 177, y: 114 },
  'New York': { x: 195, y: 100 }, 'Los Angeles': { x: 110, y: 112 },
  'Chicago': { x: 168, y: 98 }, 'Miami': { x: 180, y: 130 },
  'Houston': { x: 150, y: 125 }, 'Dallas': { x: 148, y: 118 },
  'Denver': { x: 135, y: 105 }, 'Seattle': { x: 110, y: 82 },
  'Kingston': { x: 185, y: 140 }, 'London': { x: 290, y: 78 },
  'Paris': { x: 298, y: 84 }, 'Dubai': { x: 355, y: 120 },
  'Tokyo': { x: 445, y: 100 }, 'Singapore': { x: 415, y: 165 },
  'Lagos': { x: 295, y: 155 }, 'Johannesburg': { x: 325, y: 210 },
};

async function fetchMetrics(): Promise<SnapshotMetrics> {
  const [profileRes, vaultRes, travelRes] = await Promise.all([
    supabase.from('profiles').select('user_id', { count: 'exact', head: true }),
    supabase.from('knowledge_documents' as any).select('id', { count: 'exact', head: true }),
    supabase.from('travel_log').select('city_name, user_id').limit(500),
  ]);

  const architects = profileRes.count ?? 0;
  const vaultEntries = vaultRes.count ?? 0;
  const journeys = (travelRes.data as any[])?.length ?? 0;

  // Build clusters from travel data
  const cityMap = new Map<string, number>();
  for (const log of (travelRes.data as any[]) || []) {
    cityMap.set(log.city_name, (cityMap.get(log.city_name) || 0) + 1);
  }

  const clusters: { x: number; y: number; size: number }[] = [];
  cityMap.forEach((count, city) => {
    const coords = REGION_COORDS[city];
    const fx = coords?.x ?? (100 + ((city.charCodeAt(0) * 7) % 350));
    const fy = coords?.y ?? (70 + ((city.charCodeAt(1) * 11) % 170));
    clusters.push({ x: fx, y: fy, size: Math.min(count, 6) });
  });

  // Trust score: engagement heuristic
  const uniqueUsers = new Set((travelRes.data as any[])?.map((l: any) => l.user_id) || []);
  const trustScore = architects > 0
    ? Math.min(99.9, 85 + (uniqueUsers.size / Math.max(architects, 1)) * 14)
    : 0;

  return { architects, vaultEntries, journeys, trustScore: parseFloat(trustScore.toFixed(1)), clusters };
}

function renderSnapshot(canvas: HTMLCanvasElement, metrics: SnapshotMetrics) {
  const W = 1200, H = 800;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#0A0B1E';
  ctx.fillRect(0, 0, W, H);

  // Subtle grid
  ctx.strokeStyle = 'rgba(212,175,80,0.04)';
  ctx.lineWidth = 0.5;
  for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }

  // Border frame
  ctx.strokeStyle = 'rgba(212,175,80,0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(24, 24, W - 48, H - 48);

  // Inner decorative frame
  ctx.strokeStyle = 'rgba(212,175,80,0.08)';
  ctx.strokeRect(32, 32, W - 64, H - 64);

  // ─── Header ───
  ctx.fillStyle = 'rgba(212,175,80,0.85)';
  ctx.font = '600 11px monospace';
  ctx.letterSpacing = '0.4em';
  ctx.textAlign = 'center';
  ctx.fillText('T H E   F I R S T   1 0 0', W / 2, 72);

  ctx.fillStyle = 'rgba(212,175,80,0.5)';
  ctx.font = '400 9px monospace';
  ctx.fillText('A N   I N S C R I B E D   S A N C T U A R Y', W / 2, 90);

  // Thin gold separator
  const grad = ctx.createLinearGradient(200, 0, W - 200, 0);
  grad.addColorStop(0, 'rgba(212,175,80,0)');
  grad.addColorStop(0.5, 'rgba(212,175,80,0.3)');
  grad.addColorStop(1, 'rgba(212,175,80,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(200, 100, W - 400, 1);

  // ─── Founder Signature (top right) ───
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(212,175,80,0.6)';
  ctx.font = 'italic 18px Georgia, serif';
  ctx.fillText('Jo 👑', W - 60, 72);
  ctx.font = '400 7px monospace';
  ctx.fillStyle = 'rgba(212,175,80,0.3)';
  ctx.fillText('FOUNDER · VERIFIED', W - 60, 86);

  // ─── Pulse Map (center area) ───
  const mapOffX = 100, mapOffY = 120, mapScale = 2.0;

  // Continent outlines (simplified)
  ctx.strokeStyle = 'rgba(212,175,80,0.07)';
  ctx.lineWidth = 1;
  // North America
  ctx.beginPath();
  ctx.moveTo(mapOffX + 90 * mapScale, mapOffY + 60 * 1.2);
  ctx.quadraticCurveTo(mapOffX + 160 * mapScale, mapOffY + 55 * 1.2, mapOffX + 210 * mapScale, mapOffY + 100 * 1.2);
  ctx.quadraticCurveTo(mapOffX + 200 * mapScale, mapOffY + 130 * 1.2, mapOffX + 150 * mapScale, mapOffY + 130 * 1.2);
  ctx.quadraticCurveTo(mapOffX + 100 * mapScale, mapOffY + 110 * 1.2, mapOffX + 90 * mapScale, mapOffY + 60 * 1.2);
  ctx.stroke();

  // Gold pulsing dots (static snapshot — concentric rings)
  for (const c of metrics.clusters) {
    const cx = mapOffX + c.x * mapScale;
    const cy = mapOffY + (c.y - 40) * 1.2;
    // Outer glow
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 12 + c.size * 3);
    glow.addColorStop(0, 'rgba(212,175,80,0.3)');
    glow.addColorStop(1, 'rgba(212,175,80,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 12 + c.size * 3, 0, Math.PI * 2);
    ctx.fill();
    // Core
    ctx.fillStyle = 'rgba(212,175,80,0.8)';
    ctx.beginPath();
    ctx.arc(cx, cy, 3 + c.size, 0, Math.PI * 2);
    ctx.fill();
  }

  // ─── Metrics Row ───
  const metricsY = H - 200;
  const metricItems = [
    { label: 'FOUNDING ARCHITECTS', value: `${metrics.architects}`, sub: 'Total Inscriptions' },
    { label: 'YOUR VAULTS', value: metrics.vaultEntries >= 1000 ? `${(metrics.vaultEntries / 1000).toFixed(1)}K` : `${metrics.vaultEntries}`, sub: 'Work Rules Indexed' },
    { label: 'INSCRIBED JOURNEYS', value: metrics.journeys >= 1000 ? `${(metrics.journeys / 1000).toFixed(1)}K` : `${metrics.journeys}`, sub: 'Safe Layover Check-ins' },
    { label: 'SANCTUARY TRUST', value: `${metrics.trustScore}%`, sub: 'Engagement Pulse' },
  ];

  const colW = (W - 120) / 4;
  ctx.textAlign = 'center';
  metricItems.forEach((m, i) => {
    const cx = 60 + colW * i + colW / 2;

    // Metric value
    ctx.fillStyle = 'rgba(212,175,80,0.9)';
    ctx.font = '700 28px monospace';
    ctx.fillText(m.value, cx, metricsY);

    // Label
    ctx.fillStyle = 'rgba(212,175,80,0.5)';
    ctx.font = '500 8px monospace';
    ctx.fillText(m.label, cx, metricsY + 20);

    // Sub
    ctx.fillStyle = 'rgba(212,175,80,0.25)';
    ctx.font = '400 7px monospace';
    ctx.fillText(m.sub, cx, metricsY + 34);

    // Vertical separator
    if (i < 3) {
      ctx.strokeStyle = 'rgba(212,175,80,0.08)';
      ctx.beginPath();
      ctx.moveTo(60 + colW * (i + 1), metricsY - 30);
      ctx.lineTo(60 + colW * (i + 1), metricsY + 40);
      ctx.stroke();
    }
  });

  // ─── Bottom separator ───
  const botGrad = ctx.createLinearGradient(200, 0, W - 200, 0);
  botGrad.addColorStop(0, 'rgba(212,175,80,0)');
  botGrad.addColorStop(0.5, 'rgba(212,175,80,0.2)');
  botGrad.addColorStop(1, 'rgba(212,175,80,0)');
  ctx.fillStyle = botGrad;
  ctx.fillRect(200, H - 140, W - 400, 1);

  // ─── Privacy Shield Footer ───
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(212,175,80,0.35)';
  ctx.font = '400 8px monospace';
  ctx.fillText('🛡️  PRIVACY SECURED: ZERO-TRACE PROTOCOL  🛡️', W / 2, H - 110);

  ctx.fillStyle = 'rgba(212,175,80,0.2)';
  ctx.font = '400 7px monospace';
  ctx.fillText('No personal data was used in this summary. All metrics are aggregate.', W / 2, H - 92);

  // ─── Brand Footer ───
  ctx.fillStyle = 'rgba(212,175,80,0.15)';
  ctx.font = '400 7px monospace';
  ctx.fillText('INTO INNOVATIONS · COMPANI SANCTUARY · ' + new Date().getFullYear(), W / 2, H - 52);
}

export default function AdminSnapshot() {
  const [generating, setGenerating] = useState(false);
  const [showRipple, setShowRipple] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generate = useCallback(async () => {
    setGenerating(true);
    setShowRipple(true);
    setTimeout(() => setShowRipple(false), 1200);

    try {
      const metrics = await fetchMetrics();
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Canvas unavailable');

      renderSnapshot(canvas, metrics);

      // Download
      const link = document.createElement('a');
      link.download = `sanctuary-snapshot-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast.success('Sanctuary Snapshot generated', {
        description: 'The Founder\'s Scroll has been downloaded.',
      });
    } catch (err) {
      console.error('Snapshot error:', err);
      toast.error('Failed to generate snapshot');
    } finally {
      setGenerating(false);
    }
  }, []);

  return (
    <div className="relative">
      {/* Hidden canvas for rendering */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Generate button */}
      <button
        onClick={generate}
        disabled={generating}
        className="relative overflow-hidden flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary/20 text-[11px] uppercase tracking-[0.2em] font-semibold text-primary/70 hover:text-primary/90 transition-all duration-300"
        style={{
          background: 'rgba(212,175,80,0.06)',
          boxShadow: '0 0 20px rgba(212,175,80,0.05)',
        }}
      >
        {/* Gold ripple on click */}
        <AnimatePresence>
          {showRipple && (
            <motion.div
              initial={{ scale: 0, opacity: 0.6 }}
              animate={{ scale: 4, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="absolute inset-0 m-auto w-8 h-8 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(212,175,80,0.4), transparent)' }}
            />
          )}
        </AnimatePresence>

        {generating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Camera className="h-3.5 w-3.5" />
        )}
        <span>{generating ? 'Rendering...' : 'Generate Snapshot'}</span>
        <Download className="h-3 w-3 opacity-50" />
      </button>
    </div>
  );
}
