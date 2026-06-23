import { useCallback, useEffect, useState } from 'react';
import { Globe, Loader2, Sparkles, AlertTriangle, CheckCircle2, Lightbulb, Check, ArrowRight, History, Trash2, ExternalLink, GitCompare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import AuditCompareDialog, { type AuditSnapshot } from './AuditCompareDialog';

type ApplyKind = 'hook' | 'cta';

async function applySuggestionToProject(projectId: string, kind: ApplyKind, value: string) {
  if (kind === 'hook') {
    // Update the most recently created page for this project
    const { data: page } = await supabase
      .from('pages')
      .select('id')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (page?.id) {
      const { error } = await supabase
        .from('pages')
        .update({ active_hook: value })
        .eq('id', page.id);
      if (error) throw error;
      return 'page';
    }

    // Fallback: write into the landing page stream block headline
    const { data: block } = await supabase
      .from('stream_blocks')
      .select('id, content')
      .eq('project_id', projectId)
      .eq('block_type', 'page_content')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!block) throw new Error('No landing page found yet — generate the build first.');
    const next = { ...((block.content as Record<string, unknown>) || {}), headline: value };
    const { error } = await supabase
      .from('stream_blocks')
      .update({ content: next as never })
      .eq('id', block.id);
    if (error) throw error;
    return 'stream';
  }

  // CTA → landing page block (cta_text)
  const { data: block } = await supabase
    .from('stream_blocks')
    .select('id, content')
    .eq('project_id', projectId)
    .eq('block_type', 'page_content')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!block) throw new Error('No landing page found yet — generate the build first.');
  const next = { ...((block.content as Record<string, unknown>) || {}), cta_text: value };
  const { error } = await supabase
    .from('stream_blocks')
    .update({ content: next as never })
    .eq('id', block.id);
  if (error) throw error;
  return 'stream';
}

type Rating = 'weak' | 'ok' | 'sharp';
type Section = { rating: Rating; note: string };

interface AuditResult {
  url: string;
  title: string;
  summary?: string;
  audit: {
    verdict?: string;
    score?: number;
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

const ratingTone: Record<Rating, string> = {
  weak: 'text-destructive',
  ok: 'text-muted-foreground',
  sharp: 'text-primary',
};

interface Props {
  projectId?: string | null;
}

interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  score?: number;
  audited_at: string;
  snapshot: AuditSnapshot;
}

function ratingForScore(score?: number): { tone: string; label: string } {
  if (typeof score !== 'number') return { tone: 'text-muted-foreground', label: '—' };
  if (score >= 75) return { tone: 'text-primary', label: 'sharp' };
  if (score >= 50) return { tone: 'text-foreground', label: 'ok' };
  return { tone: 'text-destructive', label: 'weak' };
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function LiveUrlAudit({ projectId }: Props) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [applying, setApplying] = useState<ApplyKind | null>(null);
  const [applied, setApplied] = useState<{ hook?: boolean; cta?: boolean }>({});
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [comparePair, setComparePair] = useState<{ older: AuditSnapshot; newer: AuditSnapshot } | null>(null);

  const loadHistory = useCallback(async () => {
    if (!projectId) {
      setHistory([]);
      return;
    }
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_context')
        .select('id, directive, created_at')
        .eq('project_id', projectId)
        .eq('context_type', 'url_audit')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      const entries: HistoryEntry[] = (data ?? [])
        .map((row) => {
          try {
            const parsed = JSON.parse(row.directive) as {
              url?: string;
              title?: string;
              audited_at?: string;
              audit?: AuditSnapshot['audit'];
            };
            if (!parsed.url) return null;
            const snapshot: AuditSnapshot = {
              id: row.id,
              url: parsed.url,
              title: parsed.title ?? parsed.url,
              audited_at: parsed.audited_at ?? row.created_at,
              audit: parsed.audit ?? {},
            };
            return {
              id: row.id,
              url: snapshot.url,
              title: snapshot.title,
              score: snapshot.audit.score,
              audited_at: snapshot.audited_at,
              snapshot,
            } as HistoryEntry;
          } catch {
            return null;
          }
        })
        .filter((e): e is HistoryEntry => !!e && !!e.url);
      setHistory(entries);
    } catch {
      // Non-blocking
    } finally {
      setHistoryLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleApply = async (kind: ApplyKind, value?: string) => {
    if (!value) return;
    if (!projectId) {
      toast.error('Pick a project first to apply this.');
      return;
    }
    setApplying(kind);
    try {
      await applySuggestionToProject(projectId, kind, value);
      setApplied(prev => ({ ...prev, [kind]: true }));
      toast.success(kind === 'hook' ? 'Hook applied to your page' : 'CTA applied to your page');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not apply';
      toast.error(msg);
    } finally {
      setApplying(null);
    }
  };

  const deleteHistoryEntry = async (id: string) => {
    const prev = history;
    setHistory((h) => h.filter((e) => e.id !== id));
    const { error } = await supabase.from('project_context').delete().eq('id', id);
    if (error) {
      setHistory(prev);
      toast.error('Could not remove entry');
    }
  };

  const runAudit = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    setResult(null);
    setApplied({});
    try {
      const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      const { data, error } = await supabase.functions.invoke('audit-live-url', {
        body: { url: normalized, project_id: projectId ?? null },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Audit failed');
      setResult(data as AuditResult);
      toast.success('Audit complete');
      loadHistory();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Audit failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const score = result?.audit?.score;

  return (
    <div className="rounded-2xl border border-primary/15 bg-background/40 backdrop-blur-xl p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold tracking-wide uppercase text-primary">
          Live URL Audit
        </h3>
        <span className="text-[10px] text-muted-foreground/70 ml-auto">5 / hour</span>
      </div>
      <p className="text-xs text-muted-foreground/80 -mt-1">
        Drop any landing page or competitor URL. MarQ scans clarity, hook, CTA, and trust signals.
      </p>

      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !loading) runAudit();
          }}
          disabled={loading}
          className="bg-background/60"
        />
        <Button onClick={runAudit} disabled={loading || !url.trim()} className="gap-1.5">
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Auditing…
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" /> Audit URL
            </>
          )}
        </Button>
      </div>

      {result && (
        <div className="mt-2 space-y-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-t border-primary/10 pt-4">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
                Verdict
              </p>
              <p className="text-base font-semibold text-foreground mt-0.5 leading-snug">
                {result.audit.verdict || 'Audit complete.'}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1 truncate">{result.title}</p>
            </div>
            {typeof score === 'number' && (
              <div className="shrink-0 text-right">
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
                  Signal
                </p>
                <p
                  className={cn(
                    'text-2xl font-bold tabular-nums',
                    score >= 75 ? 'text-primary' : score >= 50 ? 'text-foreground' : 'text-destructive',
                  )}
                >
                  {score}
                </p>
              </div>
            )}
          </div>

          {/* Section ratings */}
          <div className="grid grid-cols-2 gap-2">
            {(['clarity', 'hook', 'cta', 'trust_signals'] as const).map((key) => {
              const s = result.audit[key];
              if (!s) return null;
              const label =
                key === 'trust_signals' ? 'Trust' : key.charAt(0).toUpperCase() + key.slice(1);
              return (
                <div
                  key={key}
                  className="rounded-lg border border-primary/10 bg-background/50 px-3 py-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                      {label}
                    </span>
                    <span className={cn('text-[10px] font-semibold uppercase', ratingTone[s.rating])}>
                      {s.rating}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-foreground/80 leading-snug">{s.note}</p>
                </div>
              );
            })}
          </div>

          {/* Frictions + Opportunities */}
          <div className="grid sm:grid-cols-2 gap-3">
            {!!result.audit.frictions?.length && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  <span className="text-[10px] uppercase tracking-wider text-destructive font-semibold">
                    Frictions
                  </span>
                </div>
                <ul className="space-y-1 text-xs text-foreground/80">
                  {result.audit.frictions.map((f, i) => (
                    <li key={i} className="leading-snug">• {f}</li>
                  ))}
                </ul>
              </div>
            )}
            {!!result.audit.opportunities?.length && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Lightbulb className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">
                    Opportunities
                  </span>
                </div>
                <ul className="space-y-1 text-xs text-foreground/80">
                  {result.audit.opportunities.map((o, i) => (
                    <li key={i} className="leading-snug">• {o}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Rewrites */}
          {(result.audit.suggested_hook || result.audit.suggested_cta) && (
            <div className="rounded-lg border border-primary/15 bg-background/60 p-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">
                  MarQ's rewrite
                </span>
              </div>
              {result.audit.suggested_hook && (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                      Hook
                    </p>
                    <p className="text-sm font-medium text-foreground mt-0.5">
                      {result.audit.suggested_hook}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={applied.hook ? 'secondary' : 'outline'}
                    disabled={applying === 'hook' || applied.hook || !projectId}
                    onClick={() => handleApply('hook', result.audit.suggested_hook)}
                    className="shrink-0 h-7 px-2.5 text-[11px] gap-1"
                    title={!projectId ? 'Pick a project first' : 'Apply this hook to your active page'}
                  >
                    {applying === 'hook' ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : applied.hook ? (
                      <><Check className="h-3 w-3" /> Applied</>
                    ) : (
                      <><ArrowRight className="h-3 w-3" /> Apply hook</>
                    )}
                  </Button>
                </div>
              )}
              {result.audit.suggested_cta && (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                      CTA
                    </p>
                    <p className="text-sm font-medium text-foreground mt-0.5">
                      {result.audit.suggested_cta}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={applied.cta ? 'secondary' : 'outline'}
                    disabled={applying === 'cta' || applied.cta || !projectId}
                    onClick={() => handleApply('cta', result.audit.suggested_cta)}
                    className="shrink-0 h-7 px-2.5 text-[11px] gap-1"
                    title={!projectId ? 'Pick a project first' : 'Apply this CTA to your landing page'}
                  >
                    {applying === 'cta' ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : applied.cta ? (
                      <><Check className="h-3 w-3" /> Applied</>
                    ) : (
                      <><ArrowRight className="h-3 w-3" /> Apply CTA</>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {projectId && history.length > 0 && (
        <div className="border-t border-primary/10 pt-4 space-y-2">
          <div className="flex items-center gap-1.5">
            <History className="h-3.5 w-3.5 text-muted-foreground/80" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold">
              Audit history
            </span>
            <span className="text-[10px] text-muted-foreground/50 ml-auto">
              {history.length} of last 10
            </span>
          </div>
          <ul className="space-y-1.5">
            {history.map((entry, idx) => {
              const r = ratingForScore(entry.score);
              const host = (() => {
                try { return new URL(entry.url).hostname.replace(/^www\./, ''); } catch { return entry.url; }
              })();
              const normalize = (u: string) => u.replace(/\/$/, '').toLowerCase();
              const previous = history.slice(idx + 1).find((h) => normalize(h.url) === normalize(entry.url));
              return (
                <li
                  key={entry.id}
                  className="group flex items-center gap-3 rounded-lg border border-primary/10 bg-background/40 px-3 py-2 hover:bg-background/60 transition-colors"
                >
                  <div className={cn('text-base font-bold tabular-nums w-9 text-right shrink-0', r.tone)}>
                    {typeof entry.score === 'number' ? entry.score : '—'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground/90 truncate">{entry.title}</p>
                    <p className="text-[10px] text-muted-foreground/70 truncate">
                      {host} · {timeAgo(entry.audited_at)}
                    </p>
                  </div>
                  {previous && (
                    <button
                      type="button"
                      onClick={() => setComparePair({ older: previous.snapshot, newer: entry.snapshot })}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-muted-foreground/70 hover:text-primary"
                      title={`Compare to previous audit (${timeAgo(previous.audited_at)})`}
                    >
                      <GitCompare className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/70 hover:text-primary"
                    title="Open URL"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => deleteHistoryEntry(entry.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/70 hover:text-destructive"
                    title="Remove from history"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {projectId && historyLoading && history.length === 0 && (
        <div className="border-t border-primary/10 pt-3 flex items-center gap-2 text-[10px] text-muted-foreground/70">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading history…
        </div>
      )}

      <AuditCompareDialog
        open={!!comparePair}
        onOpenChange={(v) => { if (!v) setComparePair(null); }}
        older={comparePair?.older ?? null}
        newer={comparePair?.newer ?? null}
      />
    </div>
  );
}
