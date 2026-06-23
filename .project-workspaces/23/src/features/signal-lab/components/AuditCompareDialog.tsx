import { ArrowRight, Minus, Plus, TrendingDown, TrendingUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type Rating = 'weak' | 'ok' | 'sharp';
type Section = { rating: Rating; note: string };

export interface AuditSnapshot {
  id: string;
  url: string;
  title: string;
  audited_at: string;
  audit: {
    score?: number;
    verdict?: string;
    clarity?: Section;
    hook?: Section;
    cta?: Section;
    trust_signals?: Section;
    frictions?: string[];
    opportunities?: string[];
    suggested_hook?: string;
    suggested_cta?: string;
  };
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  older: AuditSnapshot | null;
  newer: AuditSnapshot | null;
}

const ratingTone: Record<Rating, string> = {
  weak: 'text-destructive',
  ok: 'text-muted-foreground',
  sharp: 'text-primary',
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function diffLists(oldList: string[] = [], newList: string[] = []) {
  const oldSet = new Set(oldList.map((s) => s.trim().toLowerCase()));
  const newSet = new Set(newList.map((s) => s.trim().toLowerCase()));
  const resolved = oldList.filter((s) => !newSet.has(s.trim().toLowerCase()));
  const added = newList.filter((s) => !oldSet.has(s.trim().toLowerCase()));
  const unchanged = newList.filter((s) => oldSet.has(s.trim().toLowerCase()));
  return { resolved, added, unchanged };
}

export default function AuditCompareDialog({ open, onOpenChange, older, newer }: Props) {
  if (!older || !newer) return null;

  const oldScore = older.audit.score;
  const newScore = newer.audit.score;
  const delta = typeof oldScore === 'number' && typeof newScore === 'number' ? newScore - oldScore : null;

  const frictionsDiff = diffLists(older.audit.frictions, newer.audit.frictions);
  const opportunitiesDiff = diffLists(older.audit.opportunities, newer.audit.opportunities);

  const sections = ['clarity', 'hook', 'cta', 'trust_signals'] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Audit comparison</DialogTitle>
          <p className="text-xs text-muted-foreground/80 truncate">{newer.title || newer.url}</p>
        </DialogHeader>

        {/* Score header */}
        <div className="flex items-center justify-between gap-4 rounded-lg border border-primary/15 bg-background/40 p-4">
          <div className="text-center flex-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Previous</p>
            <p className="text-2xl font-bold tabular-nums">{oldScore ?? '—'}</p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">{fmtDate(older.audited_at)}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
          <div className="text-center flex-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Latest</p>
            <p className="text-2xl font-bold tabular-nums">{newScore ?? '—'}</p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">{fmtDate(newer.audited_at)}</p>
          </div>
          {delta !== null && (
            <div className={cn(
              'shrink-0 flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-semibold tabular-nums',
              delta > 0 ? 'bg-primary/10 text-primary' : delta < 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground',
            )}>
              {delta > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : delta < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : null}
              {delta > 0 ? '+' : ''}{delta}
            </div>
          )}
        </div>

        {/* Section ratings diff */}
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold">Section ratings</p>
          <div className="grid grid-cols-2 gap-2">
            {sections.map((key) => {
              const o = older.audit[key];
              const n = newer.audit[key];
              if (!o && !n) return null;
              const label = key === 'trust_signals' ? 'Trust' : key.charAt(0).toUpperCase() + key.slice(1);
              const changed = o?.rating !== n?.rating;
              return (
                <div key={key} className="rounded-lg border border-primary/10 bg-background/40 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">{label}</p>
                  <div className="flex items-center gap-1.5 mt-1 text-[11px]">
                    <span className={cn('font-semibold uppercase', o ? ratingTone[o.rating] : 'text-muted-foreground/50')}>
                      {o?.rating ?? '—'}
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
                    <span className={cn('font-semibold uppercase', n ? ratingTone[n.rating] : 'text-muted-foreground/50')}>
                      {n?.rating ?? '—'}
                    </span>
                    {changed && <span className="ml-auto text-[9px] uppercase tracking-wider text-primary">changed</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Frictions diff */}
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold">Frictions</p>
          <div className="space-y-1">
            {frictionsDiff.resolved.map((f, i) => (
              <div key={`r-${i}`} className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1.5">
                <Minus className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                <span className="text-xs text-foreground/80 leading-snug line-through decoration-primary/60">{f}</span>
                <span className="ml-auto text-[9px] uppercase tracking-wider text-primary shrink-0">resolved</span>
              </div>
            ))}
            {frictionsDiff.added.map((f, i) => (
              <div key={`a-${i}`} className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/5 px-2.5 py-1.5">
                <Plus className="h-3 w-3 text-destructive mt-0.5 shrink-0" />
                <span className="text-xs text-foreground/80 leading-snug">{f}</span>
                <span className="ml-auto text-[9px] uppercase tracking-wider text-destructive shrink-0">new</span>
              </div>
            ))}
            {frictionsDiff.unchanged.map((f, i) => (
              <div key={`u-${i}`} className="flex items-start gap-2 rounded-md border border-border/40 bg-background/30 px-2.5 py-1.5">
                <span className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/60">·</span>
                <span className="text-xs text-muted-foreground/80 leading-snug">{f}</span>
                <span className="ml-auto text-[9px] uppercase tracking-wider text-muted-foreground/60 shrink-0">still</span>
              </div>
            ))}
            {!frictionsDiff.resolved.length && !frictionsDiff.added.length && !frictionsDiff.unchanged.length && (
              <p className="text-xs text-muted-foreground/60 italic">No frictions in either audit.</p>
            )}
          </div>
        </div>

        {/* Opportunities diff */}
        {(opportunitiesDiff.resolved.length || opportunitiesDiff.added.length || opportunitiesDiff.unchanged.length) ? (
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold">Opportunities</p>
            <div className="space-y-1">
              {opportunitiesDiff.added.map((o, i) => (
                <div key={`oa-${i}`} className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1.5">
                  <Plus className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                  <span className="text-xs text-foreground/80 leading-snug">{o}</span>
                  <span className="ml-auto text-[9px] uppercase tracking-wider text-primary shrink-0">new</span>
                </div>
              ))}
              {opportunitiesDiff.resolved.map((o, i) => (
                <div key={`or-${i}`} className="flex items-start gap-2 rounded-md border border-border/40 bg-background/30 px-2.5 py-1.5">
                  <Minus className="h-3 w-3 text-muted-foreground/60 mt-0.5 shrink-0" />
                  <span className="text-xs text-muted-foreground/70 leading-snug line-through">{o}</span>
                  <span className="ml-auto text-[9px] uppercase tracking-wider text-muted-foreground/60 shrink-0">dropped</span>
                </div>
              ))}
              {opportunitiesDiff.unchanged.map((o, i) => (
                <div key={`ou-${i}`} className="flex items-start gap-2 rounded-md border border-border/40 bg-background/30 px-2.5 py-1.5">
                  <span className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/60">·</span>
                  <span className="text-xs text-muted-foreground/80 leading-snug">{o}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
