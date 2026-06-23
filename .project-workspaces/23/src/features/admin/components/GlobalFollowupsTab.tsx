import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Mail, Send, Search, RefreshCw, Zap, Hand } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { EngagementBadge } from './EngagementBadge';

interface Followup {
  id: string;
  created_at: string;
  recipient_email: string;
  subject: string;
  body: string;
  lead_notification_id: string | null;
  sent_by: string | null;
  engagement_status: string | null;
  open_count: number | null;
  click_count: number | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  source: string | null;
}

type RangeKey = '24h' | '7d' | '30d' | 'all';
type StatusKey = 'all' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained';

export default function GlobalFollowupsTab() {
  const [rows, setRows] = useState<Followup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [range, setRange] = useState<RangeKey>('30d');
  const [statusFilter, setStatusFilter] = useState<StatusKey>('all');
  const [resending, setResending] = useState<string | null>(null);
  const [editing, setEditing] = useState<Followup | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from('lead_followups')
      .select('id, created_at, recipient_email, subject, body, lead_notification_id, sent_by, engagement_status, open_count, click_count, delivered_at, opened_at, clicked_at, bounced_at, source')
      .order('created_at', { ascending: false })
      .limit(500);

    if (range !== 'all') {
      const hours = range === '24h' ? 24 : range === '7d' ? 24 * 7 : 24 * 30;
      const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
      q = q.gte('created_at', since);
    }

    const { data, error } = await q;
    if (error) {
      toast.error('Failed to load follow-ups');
    } else {
      setRows(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== 'all' && (r.engagement_status || 'sent') !== statusFilter) return false;
      if (!s) return true;
      return (
        r.recipient_email.toLowerCase().includes(s) ||
        r.subject.toLowerCase().includes(s) ||
        r.body.toLowerCase().includes(s)
      );
    });
  }, [rows, search, statusFilter]);

  const stats = useMemo(() => {
    const counts: Record<string, number> = {
      total: rows.length, opened: 0, clicked: 0, bounced: 0, complained: 0, delivered: 0,
    };
    for (const r of rows) {
      const s = r.engagement_status || 'sent';
      if (s in counts) counts[s] = (counts[s] || 0) + 1;
    }
    return counts;
  }, [rows]);

  const openResend = (row: Followup) => {
    setEditing(row);
    setEditSubject(row.subject);
    setEditBody(row.body);
  };

  const submitResend = async () => {
    if (!editing) return;
    if (!editSubject.trim() || !editBody.trim()) {
      toast.error('Subject and body required');
      return;
    }
    setResending(editing.id);
    const { error } = await supabase.functions.invoke('send-lead-followup', {
      body: {
        to: editing.recipient_email,
        subject: editSubject,
        message: editBody,
        lead_notification_id: editing.lead_notification_id,
      },
    });
    setResending(null);
    if (error) {
      toast.error('Re-send failed', { description: error.message });
    } else {
      toast.success('Follow-up re-sent');
      setEditing(null);
      load();
    }
  };

  return (
    <div className="space-y-3">
      <Card className="p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Follow-ups Audit</h2>
          <Badge variant="outline" className="ml-auto text-xs">
            {filtered.length}
          </Badge>
          <Button size="icon" variant="ghost" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground -mt-1">
          Read-only audit trail of every MarQ email sent (org-scoped). Use the Blueprint engine in your Project to drive automation; manual re-send below is a safety net.
        </p>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search recipient, subject, body…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusKey)}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All engagement</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="opened">Opened</SelectItem>
              <SelectItem value="clicked">Clicked</SelectItem>
              <SelectItem value="bounced">Bounced</SelectItem>
              <SelectItem value="complained">Complaint</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
          <Stat label="Sent" value={stats.total} tone="text-muted-foreground" />
          <Stat label="Delivered" value={stats.delivered} tone="text-sky-500" />
          <Stat label="Opened" value={stats.opened} tone="text-amber-400" />
          <Stat label="Clicked" value={stats.clicked} tone="text-emerald-400" />
          <Stat label="Bounced" value={stats.bounced + stats.complained} tone="text-destructive" />
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No follow-ups match this filter.
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((row) => (
            <Card key={row.id} className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <EngagementBadge
                      status={row.engagement_status}
                      openCount={row.open_count ?? undefined}
                      clickCount={row.click_count ?? undefined}
                    />
                    {row.source === 'auto_blueprint' ? (
                      <Badge variant="outline" className="text-[10px] gap-1 border-emerald-500/30 text-emerald-500 bg-emerald-500/5">
                        <Zap className="h-2.5 w-2.5" /> Auto
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] gap-1 border-border/50 text-muted-foreground">
                        <Hand className="h-2.5 w-2.5" /> Manual
                      </Badge>
                    )}
                    <span className="truncate">{row.recipient_email}</span>
                    <span>•</span>
                    <span className="shrink-0">
                      {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground truncate mt-0.5">{row.subject}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{row.body}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => openResend(row)} className="shrink-0">
                  <Send className="h-3 w-3 mr-1" /> Re-send
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Re-send follow-up</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">To</label>
              <Input value={editing?.recipient_email ?? ''} disabled />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Subject</label>
              <Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Body</label>
              <Textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={10}
                className="font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={submitResend} disabled={!!resending}>
              {resending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
              Re-send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-md border border-border/40 bg-muted/10 px-2 py-1.5">
      <div className={`text-sm font-semibold ${tone}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
