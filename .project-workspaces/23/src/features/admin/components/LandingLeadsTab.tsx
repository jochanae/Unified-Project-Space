import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, MailCheck, Send, Loader2, Trash2, RefreshCw, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface LandingLead {
  id: string;
  email: string;
  snippet: string;
  signals: Record<string, string>;
  loops_synced: boolean;
  email_sent: boolean;
  status: string;
  created_at: string;
}

export default function LandingLeadsTab() {
  const [leads, setLeads] = useState<LandingLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('landing_signal_leads' as never)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) {
      toast.error('Failed to load leads');
      console.error(error);
    } else {
      setLeads((data as unknown as LandingLead[]) || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function deleteLead(id: string) {
    if (!confirm('Delete this lead permanently?')) return;
    const { error } = await supabase.from('landing_signal_leads' as never).delete().eq('id', id);
    if (error) {
      toast.error('Delete failed');
      return;
    }
    setLeads((prev) => prev.filter((l) => l.id !== id));
    toast.success('Lead deleted');
  }

  const stats = {
    total: leads.length,
    last24h: leads.filter((l) => Date.now() - new Date(l.created_at).getTime() < 86400000).length,
    emailsSent: leads.filter((l) => l.email_sent).length,
    loopsSynced: leads.filter((l) => l.loops_synced).length,
  };

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Leads" value={stats.total} icon={<Inbox className="h-3.5 w-3.5" />} />
        <StatCard label="Last 24h" value={stats.last24h} icon={<Mail className="h-3.5 w-3.5" />} />
        <StatCard label="Reports Sent" value={stats.emailsSent} icon={<Send className="h-3.5 w-3.5" />} />
        <StatCard
          label="Loops Synced"
          value={stats.loopsSynced}
          icon={<MailCheck className="h-3.5 w-3.5" />}
          hint={stats.loopsSynced === 0 ? 'Add LOOPS_API_KEY to enable' : undefined}
        />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Landing Page Leads</h3>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Loading leads…
        </div>
      ) : leads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/40 p-8 text-center">
          <Inbox className="h-8 w-8 mx-auto mb-3 text-muted-foreground/60" />
          <p className="text-sm font-medium text-foreground mb-1">No landing leads yet</p>
          <p className="text-xs text-muted-foreground">
            When a visitor unlocks their Signal Audit on the landing page, they&apos;ll appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {leads.map((lead) => {
            const isExpanded = expandedId === lead.id;
            return (
              <div
                key={lead.id}
                className="rounded-xl border border-border/40 bg-card hover:border-primary/30 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : lead.id)}
                  className="w-full flex items-start gap-3 p-3 sm:p-4 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-foreground truncate">{lead.email}</p>
                      {lead.email_sent && (
                        <Badge variant="outline" className="text-[10px] h-4 border-primary/30 text-primary">
                          sent
                        </Badge>
                      )}
                      {lead.loops_synced && (
                        <Badge variant="outline" className="text-[10px] h-4 border-primary/30 text-primary">
                          loops
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {lead.signals?.signal || lead.snippet || 'No signal captured'}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border/40 p-3 sm:p-4 space-y-3 animate-in fade-in duration-200">
                    {lead.snippet && (
                      <Section label="Submission">{lead.snippet}</Section>
                    )}
                    {lead.signals?.signal && <Section label="Signal">{lead.signals.signal}</Section>}
                    {lead.signals?.positioning && (
                      <Section label="Positioning">{lead.signals.positioning}</Section>
                    )}
                    {lead.signals?.void && <Section label="Missing Link">{lead.signals.void}</Section>}
                    {lead.signals?.hook && <Section label="Day 1 Hook">{lead.signals.hook}</Section>}
                    {lead.signals?.funnel && <Section label="Funnel">{lead.signals.funnel}</Section>}
                    <div className="flex justify-end pt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteLead(lead.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-card p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] uppercase tracking-wider font-medium mb-1">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-semibold text-foreground tabular-nums">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground/60 mt-1">{hint}</div>}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 font-medium mb-1">
        {label}
      </p>
      <p className="text-sm text-foreground/90 whitespace-pre-wrap">{children}</p>
    </div>
  );
}
