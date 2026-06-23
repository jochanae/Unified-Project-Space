import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Globe } from 'lucide-react';

interface LoginEvent {
  id: string;
  user_id: string | null;
  email: string | null;
  ip_address: string | null;
  user_agent: string | null;
  country: string | null;
  event_type: string;
  created_at: string;
}

function shortAgent(ua: string | null): string {
  if (!ua) return '—';
  if (/iPhone/.test(ua)) return 'iPhone Safari';
  if (/iPad/.test(ua)) return 'iPad Safari';
  if (/Android/.test(ua)) return 'Android';
  if (/Edg\//.test(ua)) return 'Edge';
  if (/Chrome/.test(ua)) return 'Chrome';
  if (/Firefox/.test(ua)) return 'Firefox';
  if (/Safari/.test(ua)) return 'Safari';
  return ua.slice(0, 30);
}

export default function LoginEventsViewer() {
  const [rows, setRows] = useState<LoginEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('login_events' as any)
      .select('id, user_id, email, ip_address, user_agent, country, event_type, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    setRows(((data as any) || []) as LoginEvent[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter(r => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (r.email || '').toLowerCase().includes(q) ||
      (r.ip_address || '').toLowerCase().includes(q) ||
      (r.country || '').toLowerCase().includes(q) ||
      (r.user_agent || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter by email, IP, country…"
            className="pl-9 h-9"
          />
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Last {filtered.length} sign-ins. Repeated IPs across different accounts = red flag.
      </p>

      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-4 text-center">
          {loading ? 'Loading…' : 'No login events yet.'}
        </p>
      ) : (
        <div className="max-h-[28rem] overflow-auto rounded border divide-y">
          {filtered.map(r => (
            <div key={r.id} className="px-3 py-2 text-xs space-y-0.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-foreground truncate">{r.email || '—'}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {new Date(r.created_at).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <span className="font-mono">{r.ip_address || '—'}</span>
                {r.country && (
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3" /> {r.country}
                  </span>
                )}
                <span className="truncate">{shortAgent(r.user_agent)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
