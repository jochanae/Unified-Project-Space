import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Clock, X, Search, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Scheduled {
  id: string;
  created_at: string;
  send_at: string;
  sent_at: string | null;
  status: string;
  attempts: number;
  last_error: string | null;
  recipient_email: string;
  subject: string;
  body: string;
}

type StatusFilter = 'pending' | 'sent' | 'failed' | 'canceled' | 'all';

export default function ScheduledFollowupsTab() {
  const [rows, setRows] = useState<Scheduled[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [canceling, setCanceling] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from('scheduled_followups')
      .select('id, created_at, send_at, sent_at, status, attempts, last_error, recipient_email, subject, body')
      .order('send_at', { ascending: true })
      .limit(500);
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    const { data, error } = await q;
    if (error) toast.error('Failed to load scheduled follow-ups');
    else setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.recipient_email.toLowerCase().includes(s) ||
        r.subject.toLowerCase().includes(s) ||
        r.body.toLowerCase().includes(s),
    );
  }, [rows, search]);

  const cancel = async (id: string) => {
    setCanceling(id);
    const { error } = await supabase
      .from('scheduled_followups')
      .update({ status: 'canceled' })
      .eq('id', id);
    setCanceling(null);
    if (error) toast.error('Cancel failed', { description: error.message });
    else {
      toast.success('Canceled');
      load();
    }
  };

  const statusBadge = (s: string) => {
    if (s === 'sent') return <Badge variant="outline" className="gap-1 text-emerald-500 border-emerald-500/30"><CheckCircle2 className="h-3 w-3" />Sent</Badge>;
    if (s === 'failed') return <Badge variant="outline" className="gap-1 text-destructive border-destructive/30"><AlertCircle className="h-3 w-3" />Failed</Badge>;
    if (s === 'canceled') return <Badge variant="outline" className="text-muted-foreground">Canceled</Badge>;
    return <Badge variant="outline" className="gap-1 text-primary border-primary/30"><Clock className="h-3 w-3" />Pending</Badge>;
  };

  return (
    <div className="space-y-3">
      <Card className="p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Scheduled Follow-ups</h2>
          <Badge variant="outline" className="ml-auto text-xs">{filtered.length}</Badge>
          <Button size="icon" variant="ghost" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
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
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-full sm:w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="canceled">Canceled</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No scheduled follow-ups in this view.
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((row) => {
            const futureMs = new Date(row.send_at).getTime() - Date.now();
            const sendsLabel =
              row.status === 'sent' && row.sent_at
                ? `sent ${formatDistanceToNow(new Date(row.sent_at), { addSuffix: true })}`
                : futureMs > 0
                ? `sends ${formatDistanceToNow(new Date(row.send_at), { addSuffix: true })}`
                : `due ${formatDistanceToNow(new Date(row.send_at), { addSuffix: true })}`;
            return (
              <Card key={row.id} className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      {statusBadge(row.status)}
                      <span className="truncate">{row.recipient_email}</span>
                      <span>•</span>
                      <span className="shrink-0">{sendsLabel}</span>
                      {row.attempts > 0 && (
                        <span className="shrink-0">• {row.attempts} attempt{row.attempts > 1 ? 's' : ''}</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-foreground truncate mt-1">{row.subject}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{row.body}</p>
                    {row.last_error && (
                      <p className="text-xs text-destructive mt-1 line-clamp-2">{row.last_error}</p>
                    )}
                  </div>
                  {row.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => cancel(row.id)}
                      disabled={canceling === row.id}
                      className="shrink-0"
                    >
                      {canceling === row.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <><X className="h-3 w-3 mr-1" />Cancel</>
                      )}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
