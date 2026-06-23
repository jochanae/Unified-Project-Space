/**
 * MomentumCard — Dashboard entry to The Workbench.
 *
 * v1: Last-active artifact + 7-day creation sparkline + counts.
 * Empty state: pulsing origin dot + "Awaiting the Spark." invitation.
 *
 * Tap → opens primary companion's chat with ?workbench=1 to surface the drawer.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bookmark, FileText, Code2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface MomentumCardProps {
  userId: string;
  primaryMemberId?: string | null;
}

interface RecentArtifact {
  id: string;
  title: string;
  kind: string;
  updated_at: string;
}

const DAYS = 7;

export default function MomentumCard({ userId, primaryMemberId }: MomentumCardProps) {
  const navigate = useNavigate();
  const [recent, setRecent] = useState<RecentArtifact | null>(null);
  const [artifactCount, setArtifactCount] = useState(0);
  const [planCount, setPlanCount] = useState(0);
  const [daily, setDaily] = useState<number[]>(Array(DAYS).fill(0));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!userId) return;
      const since = new Date(Date.now() - DAYS * 86400_000).toISOString();

      const baseArtifacts = supabase
        .from('chat_artifacts')
        .select('id, title, kind, updated_at, created_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      const artifactsQuery = primaryMemberId
        ? baseArtifacts.eq('member_id', primaryMemberId)
        : baseArtifacts;

      const [{ data: artifacts }, { count: planTotal }] = await Promise.all([
        artifactsQuery.limit(50),
        (supabase.from('companion_plans' as any) as any)
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .neq('status', 'completed'),
      ]);

      if (cancelled) return;

      const list = (artifacts ?? []) as (RecentArtifact & { created_at: string })[];
      setRecent(list[0] ?? null);
      setArtifactCount(list.length);
      setPlanCount(planTotal ?? 0);

      // Build 7-day activity histogram (oldest → newest).
      // Counts BOTH creation and updates as effort, so refinement work registers as momentum.
      const buckets = Array(DAYS).fill(0);
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const tally = (iso: string, weight: number) => {
        const ts = new Date(iso).getTime();
        const diffDays = Math.floor((startOfToday - ts) / 86400_000);
        if (diffDays >= 0 && diffDays < DAYS) {
          buckets[DAYS - 1 - diffDays] += weight;
        }
      };
      list.forEach((a: any) => {
        tally(a.created_at, 1);
        // Only count update as separate effort if it's meaningfully after creation
        if (a.updated_at && a.updated_at !== a.created_at) {
          const updated = new Date(a.updated_at).getTime();
          const created = new Date(a.created_at).getTime();
          if (updated - created > 60_000) tally(a.updated_at, 0.6);
        }
      });
      setDaily(buckets);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [userId, primaryMemberId]);

  const isEmpty = !loading && artifactCount === 0 && planCount === 0;

  const handleOpen = () => {
    if (primaryMemberId) {
      navigate(`/chat/${primaryMemberId}?workbench=1`);
    } else {
      navigate('/browse');
    }
  };

  const { linePath, areaPath } = useMemo(() => {
    const max = Math.max(...daily, 1);
    const w = 100;
    const h = 28;
    const step = w / (DAYS - 1);
    const pts = daily.map((v, i) => ({ x: i * step, y: h - (v / max) * h }));

    // Catmull-Rom → cubic Bézier for an organic, breathing curve.
    const line: string[] = [];
    pts.forEach((p, i) => {
      if (i === 0) { line.push(`M ${p.x.toFixed(2)} ${p.y.toFixed(2)}`); return; }
      const p0 = pts[i - 2] ?? pts[i - 1];
      const p1 = pts[i - 1];
      const p2 = p;
      const p3 = pts[i + 1] ?? p;
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      line.push(`C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`);
    });
    const linePath = line.join(' ');
    const areaPath = `${linePath} L ${w} ${h} L 0 ${h} Z`;
    return { linePath, areaPath };
  }, [daily]);

  return (
    <div className="px-4 mt-2 mb-1">
      <motion.button
        type="button"
        onClick={handleOpen}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative w-full text-left rounded-3xl overflow-hidden border-[0.5px] border-primary/20 bg-[rgba(10,10,18,0.55)] backdrop-blur-md px-5 py-4 active:scale-[0.99] transition-transform"
        style={{
          boxShadow:
            'inset 0 1px 1px hsl(var(--primary) / 0.05), 0 0 0 1px hsl(var(--primary) / 0.14), 0 0 24px hsl(var(--primary) / 0.07)',
        }}
        aria-label="Open The Workbench"
      >
        {/* Header — Icon → Title pattern, mirrors StrategistTile scan */}
        <div className="flex items-center gap-2 mb-2.5">
          <Bookmark className="h-3.5 w-3.5 text-[rgba(212,175,80,0.7)]" />
          <span className="text-[10px] font-semibold tracking-[0.22em] text-[rgba(212,175,80,0.85)]">
            MOMENTUM
          </span>
        </div>

        {isEmpty ? (
          <EmptyState />
        ) : (
          <>
            {/* Last active artifact pill */}
            {recent && (
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
                  {recent.kind === 'code' ? (
                    <Code2 className="h-3 w-3 text-white/50" />
                  ) : (
                    <FileText className="h-3 w-3 text-white/50" />
                  )}
                  <span className="text-[12px] text-white/85 truncate max-w-[180px]">
                    {recent.title}
                  </span>
                </div>
                <span className="text-[10px] text-white/40">
                  {formatDistanceToNow(new Date(recent.updated_at), { addSuffix: true })}
                </span>
              </div>
            )}

            {/* Sparkline */}
            <div className="relative h-7 w-full mb-2.5">
              <svg
                viewBox="0 0 100 28"
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full overflow-visible"
                style={{ filter: 'drop-shadow(0 0 6px rgba(212,175,80,0.45)) drop-shadow(0 0 14px rgba(212,175,80,0.18))' }}
              >
                <defs>
                  <linearGradient id="momentum-stroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="rgba(212,175,80,0)" />
                    <stop offset="18%" stopColor="rgba(212,175,80,0.55)" />
                    <stop offset="60%" stopColor="rgba(240,215,140,0.95)" />
                    <stop offset="100%" stopColor="rgba(255,235,180,1)" />
                  </linearGradient>
                  <linearGradient id="momentum-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(212,175,80,0.28)" />
                    <stop offset="100%" stopColor="rgba(212,175,80,0)" />
                  </linearGradient>
                </defs>
                <path d={areaPath} fill="url(#momentum-fill)" stroke="none" />
                <path
                  d={linePath}
                  fill="none"
                  stroke="url(#momentum-stroke)"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>

            {/* Footer metrics */}
            <div className="flex items-center gap-3 text-[10.5px] tracking-wide text-white/45">
              <span>{artifactCount} {artifactCount === 1 ? 'Artifact' : 'Artifacts'}</span>
              <span className="text-white/15">·</span>
              <span>{planCount} {planCount === 1 ? 'Plan' : 'Plans'}</span>
              <span className="ml-auto text-[10px] text-[rgba(212,175,80,0.6)]">
                Open Workbench →
              </span>
            </div>
          </>
        )}
      </motion.button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-1">
      <div className="flex items-center gap-3 mb-2.5">
        <motion.span
          className="h-2 w-2 rounded-full bg-[rgba(212,175,80,0.9)]"
          animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.25, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ boxShadow: '0 0 10px rgba(212,175,80,0.6)' }}
        />
        <div className="flex-1 h-px bg-gradient-to-r from-[rgba(212,175,80,0.15)] to-transparent" />
      </div>
      <p className="text-[13px] text-white/85 font-medium mb-0.5">Awaiting the Spark.</p>
      <p className="text-[11.5px] text-white/45 leading-relaxed">
        Your first plan or snippet will ignite this card.
      </p>
      <span className="mt-2 inline-block text-[10px] text-[rgba(212,175,80,0.7)] tracking-wide">
        Start with your companion →
      </span>
    </div>
  );
}
