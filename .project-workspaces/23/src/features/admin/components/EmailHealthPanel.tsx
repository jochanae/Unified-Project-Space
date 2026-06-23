import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, RefreshCw, CheckCircle2, AlertCircle, Loader2, Globe } from 'lucide-react';

interface Stats {
  sent: number;
  failed: number;
  suppressed: number;
  total: number;
}

/**
 * Admin-only Email Health panel.
 * - Shows verified sender domain (notify.intoiq.app) status as a static badge
 *   (the domain is managed in Cloud → Emails; we surface it here for at-a-glance health).
 * - Pulls last-7-day deduplicated stats from email_send_log.
 */
export default function EmailHealthPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('email_send_log')
      .select('message_id, status, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(2000);
    if (error || !data) {
      setStats({ sent: 0, failed: 0, suppressed: 0, total: 0 });
      setLoading(false);
      return;
    }
    // Dedupe by message_id, keep latest status
    const latest = new Map<string, string>();
    for (const row of data) {
      if (!row.message_id) continue;
      if (!latest.has(row.message_id)) latest.set(row.message_id, row.status);
    }
    let sent = 0, failed = 0, suppressed = 0;
    for (const status of latest.values()) {
      if (status === 'sent') sent++;
      else if (status === 'dlq' || status === 'failed' || status === 'bounced') failed++;
      else if (status === 'suppressed' || status === 'complained') suppressed++;
    }
    setStats({ sent, failed, suppressed, total: latest.size });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Email Health</h2>
          <Button size="icon" variant="ghost" onClick={load} disabled={loading} className="ml-auto h-7 w-7">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* Sender domain */}
        <div className="flex items-center justify-between rounded-lg border border-border/30 bg-background/40 p-3">
          <div className="flex items-center gap-2 min-w-0">
            <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Sender domain</p>
              <p className="text-sm font-medium text-foreground truncate">notify.intoiq.app</p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1 text-emerald-500 border-emerald-500/30">
            <CheckCircle2 className="h-3 w-3" /> Verified
          </Badge>
        </div>

        {/* 7-day stats */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Last 7 days (deduplicated)</p>
          {loading || !stats ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
            </div>
          ) : stats.total === 0 ? (
            <p className="text-xs text-muted-foreground">No emails sent in this window.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              <Stat label="Total" value={stats.total} />
              <Stat label="Sent" value={stats.sent} tone="success" />
              <Stat label="Failed" value={stats.failed} tone="danger" />
              <Stat label="Suppressed" value={stats.suppressed} tone="warn" />
            </div>
          )}
        </div>

        {stats && stats.total > 0 && stats.failed / stats.total > 0.1 && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2.5">
            <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">
              Failure rate above 10%. Check Cloud → Emails for delivery issues.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'success' | 'danger' | 'warn' }) {
  const color =
    tone === 'success' ? 'text-emerald-500'
    : tone === 'danger' ? 'text-destructive'
    : tone === 'warn' ? 'text-amber-500'
    : 'text-foreground';
  return (
    <div className="rounded-lg border border-border/30 bg-background/40 p-2.5 text-center">
      <p className={`text-lg font-semibold ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  );
}
