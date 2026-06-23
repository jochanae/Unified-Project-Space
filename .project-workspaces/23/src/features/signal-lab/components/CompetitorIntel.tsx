import { useCallback, useEffect, useMemo, useState } from 'react';
import { Swords, Loader2, Plus, X, ExternalLink, Lock, Sparkles, Trophy, Target, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface IndividualAudit {
  url: string;
  title: string;
  audit: {
    positioning?: string;
    primary_hook?: string;
    primary_cta?: string;
    strengths?: string[];
    weaknesses?: string[];
    audience_signal?: string;
    error?: string;
  };
}

interface AggregateBriefing {
  verdict?: string;
  shared_patterns?: string[];
  positioning_gaps?: string[];
  hook_angles_to_steal?: string[];
  where_you_can_win?: string[];
  suggested_hook?: string;
  suggested_cta?: string;
}

interface Props {
  projectId?: string | null;
}

const MAX = 5;

export default function CompetitorIntel({ projectId }: Props) {
  const [urls, setUrls] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [individuals, setIndividuals] = useState<IndividualAudit[]>([]);
  const [briefing, setBriefing] = useState<AggregateBriefing | null>(null);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [tierLocked, setTierLocked] = useState(false);

  const loadExisting = useCallback(async () => {
    if (!projectId) {
      setIndividuals([]);
      setBriefing(null);
      setUrls(['']);
      setLastRunAt(null);
      return;
    }
    const { data } = await supabase
      .from('competitor_audits')
      .select('competitor_urls, individual_audits, aggregate_briefing, last_run_at')
      .eq('project_id', projectId)
      .maybeSingle();
    if (data) {
      const cu = (data.competitor_urls as unknown as string[]) ?? [];
      setUrls(cu.length ? cu : ['']);
      setIndividuals((data.individual_audits as unknown as IndividualAudit[]) ?? []);
      setBriefing((data.aggregate_briefing as unknown as AggregateBriefing) ?? null);
      setLastRunAt(data.last_run_at ?? null);
    } else {
      setIndividuals([]);
      setBriefing(null);
      setUrls(['']);
      setLastRunAt(null);
    }
  }, [projectId]);

  useEffect(() => { loadExisting(); }, [loadExisting]);

  const addRow = () => {
    if (urls.length < MAX) setUrls([...urls, '']);
  };
  const removeRow = (i: number) => {
    setUrls(urls.filter((_, idx) => idx !== i));
  };
  const updateRow = (i: number, value: string) => {
    setUrls(urls.map((u, idx) => idx === i ? value : u));
  };

  const validUrls = useMemo(
    () => urls.map((u) => u.trim()).filter((u) => u.length > 0),
    [urls],
  );

  const runAudit = async () => {
    if (!projectId) {
      toast.error('Pick a project first.');
      return;
    }
    if (validUrls.length === 0) {
      toast.error('Add at least one competitor URL.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('audit-competitor-feeds', {
        body: { project_id: projectId, urls: validUrls },
      });
      if (error) throw new Error(error.message);
      if (data?.upgrade_required) {
        setTierLocked(true);
        toast.error('Competitor Intel is an Identity-tier feature.');
        return;
      }
      if (data?.error) throw new Error(data.error);
      setIndividuals(data.individual_audits ?? []);
      setBriefing(data.aggregate_briefing ?? null);
      setLastRunAt(data.audited_at);
      toast.success('Competitor briefing ready.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Audit failed';
      if (/tier|innovation|identity/i.test(msg)) setTierLocked(true);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (tierLocked) {
    return (
      <div className="rounded-xl border border-border bg-card/40 backdrop-blur-sm p-5">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Competitor Intel — Identity tier</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Track up to 5 competitors per project and get a weekly "where you can win" briefing from MarQ.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card/40 backdrop-blur-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Competitor Intel</h3>
          {lastRunAt && (
            <span className="text-[10px] text-muted-foreground ml-2">
              Last run: {new Date(lastRunAt).toLocaleString()}
            </span>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground">{validUrls.length}/{MAX}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Drop in 1–5 competitor sites, social profiles, or RSS feeds. MarQ will surface gaps you can exploit.
      </p>

      <div className="space-y-2">
        {urls.map((u, i) => (
          <div key={i} className="flex gap-2">
            <Input
              placeholder="https://competitor.com or https://twitter.com/handle"
              value={u}
              onChange={(e) => updateRow(i, e.target.value)}
              className="text-sm"
            />
            {urls.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeRow(i)}
                aria-label="Remove competitor"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
        <div className="flex gap-2">
          {urls.length < MAX && (
            <Button variant="outline" size="sm" onClick={addRow}>
              <Plus className="w-3 h-3 mr-1" /> Add competitor
            </Button>
          )}
          <Button
            size="sm"
            onClick={runAudit}
            disabled={loading || validUrls.length === 0 || !projectId}
            className="ml-auto"
          >
            {loading
              ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Auditing…</>
              : <><Sparkles className="w-3 h-3 mr-1" /> Run competitive audit</>}
          </Button>
        </div>
      </div>

      {briefing && (
        <div className="space-y-4 pt-2 border-t border-border/50">
          {briefing.verdict && (
            <div className="rounded-lg bg-primary/10 border border-primary/30 p-3">
              <div className="text-[10px] uppercase tracking-wider text-primary mb-1">MarQ's verdict</div>
              <p className="text-sm font-medium">{briefing.verdict}</p>
            </div>
          )}

          {(briefing.where_you_can_win?.length ?? 0) > 0 && (
            <div>
              <div className="flex items-center gap-1 text-xs font-semibold mb-2">
                <Trophy className="w-3 h-3 text-primary" /> Where you can win
              </div>
              <ul className="space-y-1">
                {briefing.where_you_can_win!.map((w, i) => (
                  <li key={i} className="text-xs text-foreground/90 pl-4 relative before:content-['→'] before:absolute before:left-0 before:text-primary">
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            {(briefing.positioning_gaps?.length ?? 0) > 0 && (
              <div>
                <div className="flex items-center gap-1 text-xs font-semibold mb-1">
                  <Target className="w-3 h-3" /> Positioning gaps
                </div>
                <ul className="space-y-1">
                  {briefing.positioning_gaps!.map((g, i) => (
                    <li key={i} className="text-xs text-muted-foreground">• {g}</li>
                  ))}
                </ul>
              </div>
            )}
            {(briefing.hook_angles_to_steal?.length ?? 0) > 0 && (
              <div>
                <div className="flex items-center gap-1 text-xs font-semibold mb-1">
                  <Lightbulb className="w-3 h-3" /> Angles to test
                </div>
                <ul className="space-y-1">
                  {briefing.hook_angles_to_steal!.map((g, i) => (
                    <li key={i} className="text-xs text-muted-foreground">• {g}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {(briefing.suggested_hook || briefing.suggested_cta) && (
            <div className="rounded-lg bg-card border border-border p-3 space-y-2">
              {briefing.suggested_hook && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Suggested hook</div>
                  <div className="text-sm font-medium">{briefing.suggested_hook}</div>
                </div>
              )}
              {briefing.suggested_cta && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Suggested CTA</div>
                  <div className="text-sm font-medium">{briefing.suggested_cta}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {individuals.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border/50">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Per-competitor breakdown</div>
          {individuals.map((c, i) => (
            <details key={i} className="rounded-lg border border-border bg-background/50">
              <summary className="cursor-pointer px-3 py-2 text-xs flex items-center justify-between">
                <span className="truncate font-medium">{c.title}</span>
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-muted-foreground hover:text-primary ml-2"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </summary>
              <div className="px-3 pb-3 space-y-2 text-xs">
                {c.audit?.error ? (
                  <p className="text-destructive">{c.audit.error}</p>
                ) : (
                  <>
                    {c.audit?.positioning && <p><span className="text-muted-foreground">Positioning:</span> {c.audit.positioning}</p>}
                    {c.audit?.primary_hook && <p><span className="text-muted-foreground">Hook:</span> "{c.audit.primary_hook}"</p>}
                    {c.audit?.primary_cta && <p><span className="text-muted-foreground">CTA:</span> {c.audit.primary_cta}</p>}
                    {c.audit?.audience_signal && <p><span className="text-muted-foreground">Audience:</span> {c.audit.audience_signal}</p>}
                    <div className="grid sm:grid-cols-2 gap-2 pt-1">
                      {(c.audit?.strengths?.length ?? 0) > 0 && (
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-primary">Strengths</div>
                          {c.audit!.strengths!.map((s, j) => <div key={j} className="text-muted-foreground">• {s}</div>)}
                        </div>
                      )}
                      {(c.audit?.weaknesses?.length ?? 0) > 0 && (
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-destructive">Weaknesses</div>
                          {c.audit!.weaknesses!.map((s, j) => <div key={j} className="text-muted-foreground">• {s}</div>)}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
