import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, ShieldOff, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface BlockedEmail {
  id: string;
  pattern: string;
  reason: string | null;
  created_at: string;
}

export default function EmailBlocklistTool() {
  const [rows, setRows] = useState<BlockedEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [pattern, setPattern] = useState('');
  const [reason, setReason] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('blocked_emails' as any)
      .select('id, pattern, reason, created_at')
      .order('created_at', { ascending: false });
    if (error) toast.error('Failed to load blocklist');
    setRows(((data as any) || []) as BlockedEmail[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    const v = pattern.trim();
    if (!v) return;
    setAdding(true);
    const { error } = await supabase.rpc('admin_block_email' as any, {
      p_pattern: v,
      p_reason: reason.trim() || null,
    });
    setAdding(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Added to blocklist');
    setPattern('');
    setReason('');
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('blocked_emails' as any).delete().eq('id', id);
    if (error) {
      toast.error('Failed to remove');
      return;
    }
    setRows(prev => prev.filter(r => r.id !== id));
    toast.success('Removed');
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Add an exact email (<code className="text-foreground">copycat@gmail.com</code>) or
          a domain wildcard starting with <code className="text-foreground">@</code> (e.g.
          <code className="text-foreground"> @badcompany.com</code>). Matches are rejected at
          signup with a generic error — no hint that they were blocked.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={pattern}
            onChange={e => setPattern(e.target.value)}
            placeholder="email@example.com or @domain.com"
            className="h-9 flex-1"
          />
          <Input
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Reason (private)"
            className="h-9 flex-1"
          />
          <Button onClick={add} disabled={adding || !pattern.trim()} size="sm" className="gap-1.5">
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldOff className="h-3.5 w-3.5" />}
            Block
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{rows.length} blocked</p>
          <Button size="sm" variant="ghost" onClick={load} disabled={loading} className="h-7 text-xs">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Refresh'}
          </Button>
        </div>

        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-4 text-center">
            Nothing blocked yet.
          </p>
        ) : (
          <div className="max-h-72 overflow-auto rounded border divide-y">
            {rows.map(r => (
              <div key={r.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-medium text-foreground truncate">
                    <Mail className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="truncate">{r.pattern}</span>
                  </div>
                  {r.reason && (
                    <p className="text-[11px] text-muted-foreground truncate">{r.reason}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                  onClick={() => remove(r.id)}
                  title="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
