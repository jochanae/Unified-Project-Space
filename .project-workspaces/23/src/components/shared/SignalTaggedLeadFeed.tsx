import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, User, Sparkles, X, Inbox, Lock, Activity, MousePointerClick, Clock, Brain, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useSubscription } from '@/features/billing/hooks/use-subscription';
import { Button } from '@/components/ui/button';

/**
 * SignalTaggedLeadFeed
 * --------------------
 * The "Intelligence Feed" version of the lead list. Each lead row carries:
 *   - Intent score (from contacts.score, falls back to a derived estimate)
 *   - Signal Origin tag (derived from the project's locked Identity hook)
 *   - Nurture status (active follow-ups vs idle)
 *
 * Clicking a row opens a "Why They Clicked" panel that ties the lead back to
 * the specific Identity Lock hook that captured them.
 */

interface SignalTaggedLeadFeedProps {
  projectId: string;
}

type LeadRow = {
  id: string;
  email: string;
  source: string;
  created_at: string;
  page_id: string | null;
  contact_id: string | null;
  metadata: any;
};

type ContactSummary = {
  id: string;
  score: number;
  pipeline_stage: string;
  tags: string[] | null;
};

type SignalBlueprint = {
  oneLiner?: string;
  persona?: { role?: string; frustrations?: string[] | string };
  hooks?: { instagram?: string[]; linkedin?: string[]; emailSubjects?: string[] };
};

function intentLabel(score: number): { label: string; tone: string } {
  if (score >= 85) return { label: 'High intent', tone: 'text-emerald-400' };
  if (score >= 60) return { label: 'Warm', tone: 'text-primary' };
  if (score >= 30) return { label: 'Mid', tone: 'text-foreground/70' };
  return { label: 'Cold', tone: 'text-muted-foreground' };
}

function pickHook(blueprint: SignalBlueprint | null, seed: string): string {
  if (!blueprint?.hooks) return 'Direct entry';
  const all = [
    ...(blueprint.hooks.instagram || []),
    ...(blueprint.hooks.linkedin || []),
    ...(blueprint.hooks.emailSubjects || []),
  ].filter(Boolean);
  if (!all.length) return blueprint.oneLiner ? 'Identity Hook' : 'Direct entry';
  // Stable pseudo-random pick by lead id so the same lead always shows the same hook
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return all[h % all.length];
}

/**
 * Resolve the Signal Origin tag for a lead.
 * Prefers the real hook captured at form submission (metadata.active_hook),
 * falls back to a stable derived hook for legacy leads with no captured hook.
 */
function resolveLeadHook(lead: LeadRow, blueprint: SignalBlueprint | null): string {
  const captured = (lead.metadata && typeof lead.metadata === 'object')
    ? (lead.metadata.active_hook as string | undefined)
    : undefined;
  if (captured && captured.trim()) return captured.trim();
  return pickHook(blueprint, lead.id);
}

function shortHook(hook: string, max = 28): string {
  if (hook.length <= max) return hook;
  return hook.slice(0, max - 1).trimEnd() + '…';
}

export function SignalTaggedLeadFeed({ projectId }: SignalTaggedLeadFeedProps) {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const orgId = user?.orgId;

  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLead, setActiveLead] = useState<LeadRow | null>(null);

  // Identity Lock for this project — drives the Signal Origin tags
  const { data: blueprint } = useQuery({
    queryKey: ['signal-lock-for-feed', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from('project_context')
        .select('directive')
        .eq('project_id', projectId)
        .eq('context_type', 'signal_lab')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data?.directive) return null;
      try {
        return JSON.parse(data.directive) as SignalBlueprint;
      } catch {
        return null;
      }
    },
  });

  useEffect(() => {
    if (!orgId || !projectId) return;
    let mounted = true;

    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('lead_notifications')
        .select('id, email, source, created_at, page_id, contact_id, metadata')
        .eq('org_id', orgId)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(12);
      if (mounted) {
        setLeads((data as LeadRow[]) || []);
        setLoading(false);
      }
    })();

    const channel = supabase
      .channel(`signal-feed-${projectId}-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lead_notifications',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          setLeads((prev) => [payload.new as LeadRow, ...prev].slice(0, 12));
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [orgId, projectId]);

  // Pull contact scores in one shot for the visible leads
  const contactIds = useMemo(
    () => leads.map((l) => l.contact_id).filter((id): id is string => !!id),
    [leads],
  );

  const { data: contactMap = {} } = useQuery({
    queryKey: ['lead-feed-contacts', contactIds.sort().join(',')],
    enabled: contactIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('contacts')
        .select('id, score, pipeline_stage, tags')
        .in('id', contactIds);
      const map: Record<string, ContactSummary> = {};
      (data || []).forEach((c: any) => {
        map[c.id] = c as ContactSummary;
      });
      return map;
    },
  });

  // Aggregate metrics
  const metrics = useMemo(() => {
    const total = leads.length;
    const highIntent = leads.filter((l) => {
      const c = l.contact_id ? contactMap[l.contact_id] : null;
      return (c?.score ?? 50) >= 85;
    }).length;
    const nurturing = leads.filter((l) => {
      const c = l.contact_id ? contactMap[l.contact_id] : null;
      return c && ['contacted', 'qualified', 'proposal'].includes(c.pipeline_stage);
    }).length;
    return { total, highIntent, nurturing };
  }, [leads, contactMap]);

  return (
    <section className="rounded-3xl border border-border/30 bg-card/30 backdrop-blur-md overflow-hidden">
      {/* Header + metric strip */}
      <div className="p-6 border-b border-border/20">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-primary" />
            <h3 className="text-lg font-serif tracking-tight">Active Revenue Signals</h3>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-[10px] font-black tracking-widest uppercase text-muted-foreground hover:text-primary transition-colors"
          >
            View all leads
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <MetricBox label="Captured" value={metrics.total} tone="text-foreground" />
          <MetricBox label="High intent" value={metrics.highIntent} tone="text-primary" />
          <MetricBox label="Nurturing" value={metrics.nurturing} tone="text-emerald-400" />
        </div>
      </div>

      {/* Lead rows */}
      {loading ? (
        <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">
          Loading signals…
        </div>
      ) : leads.length === 0 ? (
        <div className="p-10 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            No leads captured yet. Deploy a page from this project to start the feed.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/10 max-h-[420px] overflow-y-auto">
          {leads.map((lead) => {
            const contact = lead.contact_id ? contactMap[lead.contact_id] : null;
            const score = contact?.score ?? 50;
            const intent = intentLabel(score);
            const hook = resolveLeadHook(lead, blueprint || null);
            const stage = contact?.pipeline_stage || 'new';
            return (
              <button
                key={lead.id}
                onClick={() => setActiveLead(lead)}
                className="w-full text-left p-4 hover:bg-muted/20 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-muted/40 border border-border/30 flex items-center justify-center group-hover:border-primary/40 transition-colors shrink-0">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm text-foreground truncate">
                        {lead.email}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-black text-primary uppercase tracking-tight">
                        {shortHook(hook)}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                      stage_{stage} · {lead.source.replace('_', ' ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className={`text-lg font-black font-mono leading-none ${intent.tone}`}>
                      {score}%
                    </div>
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground/60 font-bold mt-0.5">
                      {intent.label}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-background/60 border border-border/30 group-hover:border-primary/40 transition-colors">
                    <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* "Why They Clicked" slide-over */}
      {activeLead && (
        <WhyTheyClickedPanel
          lead={activeLead}
          blueprint={blueprint || null}
          contact={activeLead.contact_id ? contactMap[activeLead.contact_id] : null}
          onClose={() => setActiveLead(null)}
        />
      )}
    </section>
  );
}

function MetricBox({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl bg-background/40 border border-border/20 p-3">
      <p className={`text-2xl font-black font-mono leading-none ${tone}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1.5">
        {label}
      </p>
    </div>
  );
}

type AttributionData = {
  primary_block_id?: string | null;
  dwell_time_ms?: number;
  scroll_depth?: number;
  session_duration_ms?: number;
  exit_intent_triggered?: boolean;
  timestamp_at_conversion?: string;
  block_dwells?: Record<string, number>;
};

function getAttribution(lead: LeadRow): AttributionData | null {
  const meta = lead.metadata;
  if (!meta || typeof meta !== 'object') return null;
  const a = (meta as any).attribution;
  if (!a || typeof a !== 'object') return null;
  return a as AttributionData;
}

function formatBlockId(id?: string | null): string {
  if (!id) return 'Unknown';
  // hero_0 → "Hero", feature_2 → "Feature 2"
  const parts = id.split('_');
  if (parts.length >= 2 && /^\d+$/.test(parts[parts.length - 1])) {
    const idx = parts.pop();
    const name = parts.join(' ').replace(/^\w/, (c) => c.toUpperCase());
    return Number(idx) > 0 ? `${name} ${idx}` : name;
  }
  return id.replace(/[_-]/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

function behavioralLabel(attr: AttributionData | null, score: number): { label: string; tone: string } {
  if (!attr) {
    if (score >= 85) return { label: 'Qualified Architect', tone: 'text-emerald-400' };
    return { label: 'Standard Signal', tone: 'text-foreground/70' };
  }
  const dwell = attr.dwell_time_ms ?? 0;
  const depth = attr.scroll_depth ?? 0;
  if (dwell > 30000 && depth > 0.6) return { label: 'Qualified Architect', tone: 'text-emerald-400' };
  if (dwell > 15000 && depth > 0.4) return { label: 'High-Resonance Signal', tone: 'text-primary' };
  if (depth < 0.25) return { label: 'Impulse Signal', tone: 'text-amber-400' };
  return { label: 'Browsing Signal', tone: 'text-foreground/70' };
}

function WhyTheyClickedPanel({
  lead,
  blueprint,
  contact,
  onClose,
}: {
  lead: LeadRow;
  blueprint: SignalBlueprint | null;
  contact: ContactSummary | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { isGrowth, loading: subLoading } = useSubscription();
  const hook = resolveLeadHook(lead, blueprint);
  const persona = blueprint?.persona?.role || 'your target persona';
  const offer = blueprint?.oneLiner || 'your locked offer';
  const score = contact?.score ?? 50;
  const isCaptured = !!(lead.metadata && typeof lead.metadata === 'object' && (lead.metadata as any).active_hook);
  const attribution = getAttribution(lead);
  const behavioral = behavioralLabel(attribution, score);
  const dwellSec = attribution?.dwell_time_ms ? Math.round(attribution.dwell_time_ms / 1000) : 0;
  const sessionSec = attribution?.session_duration_ms ? Math.round(attribution.session_duration_ms / 1000) : 0;
  const depthPct = attribution?.scroll_depth ? Math.round(attribution.scroll_depth * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md h-full bg-background border-l border-border/40 p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-primary font-bold">
              Conversion Snapshot
            </p>
            <h2 className="mt-1 text-xl font-serif tracking-tight truncate max-w-[280px]">{lead.email}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-5">
          {/* Signal Origin — always visible */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-primary" />
                <p className="text-[10px] uppercase tracking-widest text-primary font-bold">
                  Signal Origin
                </p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight border ${
                isCaptured
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-muted/30 text-muted-foreground border-border/40'
              }`}>
                {isCaptured ? 'Captured' : 'Inferred'}
              </span>
            </div>
            <p className="text-base font-medium text-foreground">"{hook}"</p>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              {isCaptured
                ? <>This is the exact hook this prospect saw on your live page when they raised their hand.</>
                : <>MarQ positioned <span className="text-foreground/80">{offer}</span> in front of <span className="text-foreground/80">{persona}</span>. (Older lead — hook inferred from your Identity Lock.)</>
              }
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/30 bg-card/30 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Intent score
              </p>
              <p className="text-2xl font-black font-mono text-primary">{score}%</p>
            </div>
            <div className="rounded-xl border border-border/30 bg-card/30 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Pipeline
              </p>
              <p className="text-sm font-bold capitalize">
                {contact?.pipeline_stage || 'new'}
              </p>
            </div>
          </div>

          {/* ===== Innovation-tier: Conversion Snapshot ===== */}
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Brain className="h-3.5 w-3.5 text-primary" />
                <p className="text-[10px] uppercase tracking-[0.22em] text-primary font-bold">
                  Deep Intelligence
                </p>
              </div>
              {!subLoading && !isGrowth && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[9px] font-black text-amber-400 uppercase tracking-tight flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  Innovation
                </span>
              )}
            </div>

            <div className={!isGrowth ? 'pointer-events-none select-none blur-[3px] opacity-60 space-y-4' : 'space-y-4'}>
              {/* Behavioral score */}
              <div className="rounded-2xl border border-border/30 bg-card/30 p-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2">
                  Behavioral score
                </p>
                <p className={`text-base font-bold ${behavioral.tone}`}>{behavioral.label}</p>
                <p className="mt-2 text-xs text-foreground/70 leading-relaxed">
                  {attribution
                    ? `${dwellSec}s focused on the primary trigger across a ${sessionSec}s session, ${depthPct}% scroll depth.`
                    : 'No behavioral data captured for this lead — deploy your latest page to start tracking conversions.'}
                </p>
              </div>

              {/* Journey map */}
              <div className="rounded-2xl border border-border/30 bg-card/30 p-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-3">
                  Journey map
                </p>
                <div className="relative h-2.5 rounded-full bg-background/60 overflow-hidden border border-border/30">
                  <div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary/30 to-primary"
                    style={{ width: `${Math.max(4, depthPct)}%` }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
                    style={{ left: `calc(${Math.max(2, Math.min(96, depthPct))}% - 6px)` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-[9px] uppercase tracking-wider text-muted-foreground/70 font-bold">
                  <span>Top of page</span>
                  <span>{depthPct}%</span>
                  <span>Bottom</span>
                </div>
              </div>

              {/* Trigger preview */}
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MousePointerClick className="h-3.5 w-3.5 text-primary" />
                  <p className="text-[10px] uppercase tracking-widest text-primary font-bold">
                    Primary trigger
                  </p>
                </div>
                <p className="text-sm font-bold text-foreground">
                  {formatBlockId(attribution?.primary_block_id)}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <Clock className="w-3 h-3 mx-auto text-muted-foreground mb-1" />
                    <p className="text-sm font-mono font-bold text-foreground">{dwellSec}s</p>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground/70">Dwell</p>
                  </div>
                  <div>
                    <Activity className="w-3 h-3 mx-auto text-muted-foreground mb-1" />
                    <p className="text-sm font-mono font-bold text-foreground">{sessionSec}s</p>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground/70">Session</p>
                  </div>
                  <div>
                    <ArrowUpRight className="w-3 h-3 mx-auto text-muted-foreground mb-1" />
                    <p className="text-sm font-mono font-bold text-foreground">{depthPct}%</p>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground/70">Depth</p>
                  </div>
                </div>
              </div>

              {/* MarQ analysis */}
              <div className="rounded-2xl border border-border/30 bg-card/30 p-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2">
                  MarQ's recommendation
                </p>
                <p className="text-sm text-foreground/85 leading-relaxed">
                  {attribution?.primary_block_id
                    ? <>This lead converted while focused on <span className="text-primary font-medium">{formatBlockId(attribution.primary_block_id)}</span>. {behavioral.label === 'Qualified Architect' ? 'High-intent — call within 24h.' : behavioral.label === 'Impulse Signal' ? 'Quick decision — confirm fit before nurturing further.' : 'Lean into the same value prop in your follow-up sequence.'}</>
                    : <>Lead came in via <span className="text-primary font-medium">{lead.source.replace('_', ' ')}</span>. {score >= 85 ? 'High-intent signal — reach out within 24h.' : 'Drop into the nurture sequence and watch engagement.'}</>}
                </p>
              </div>
            </div>

            {!subLoading && !isGrowth && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
                <div className="p-2 rounded-xl bg-primary/15 border border-primary/30">
                  <Brain className="w-4 h-4 text-primary" />
                </div>
                <p className="text-xs font-semibold text-foreground">
                  Conversion Snapshot is Innovation-only
                </p>
                <p className="text-[11px] text-muted-foreground max-w-xs">
                  See which block triggered the conversion, dwell time, scroll depth, and MarQ's behavioral analysis.
                </p>
                <Button size="sm" className="gap-1.5 mt-1" onClick={() => navigate('/pricing')}>
                  Unlock Innovation
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
