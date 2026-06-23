import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Phone } from 'lucide-react';
import { toast } from 'sonner';

interface Conn {
  member_id: string;
  companion_name: string;
}

/**
 * Admin test trigger: rings the current user from their selected companion.
 * Useful for verifying the in-app incoming-call flow.
 */
export default function IncomingCallTester() {
  const [conns, setConns] = useState<Conn[]>([]);
  const [memberId, setMemberId] = useState<string>('');
  const [opener, setOpener] = useState<string>('Hey — got a minute?');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) return;
      const { data } = await supabase
        .from('connections')
        .select('member_id, name')
        .eq('user_id', u.user.id)
        .neq('is_archived', true)
        .order('connected_at', { ascending: false });
      const list = ((data || []) as Array<{ member_id: string; name: string }>).map((r) => ({
        member_id: r.member_id,
        companion_name: r.name,
      }));
      setConns(list);
      if (list[0]) setMemberId(list[0].member_id);
    })();
  }, []);

  const ring = async () => {
    if (!memberId) {
      toast.error('Pick a companion first');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('request-call', {
        body: { memberId, openerLine: opener || null, reason: 'admin-test' },
      });
      if (error) throw error;
      toast.success('Ringing… expect the call any second');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to ring');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Phone className="h-4 w-4 text-primary" /> Incoming Call Tester
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Rings your phone in-app from one of your companions. Tap Accept to drop straight into a live voice call.
        </p>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Companion</label>
          <select
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm"
          >
            {conns.length === 0 && <option value="">No companions yet</option>}
            {conns.map((c) => (
              <option key={c.member_id} value={c.member_id}>
                {c.companion_name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Opener line (optional)</label>
          <Input value={opener} onChange={(e) => setOpener(e.target.value)} placeholder="Hey — got a minute?" />
        </div>
        <Button onClick={ring} disabled={loading || !memberId} className="gap-2">
          <Phone className="h-4 w-4" /> {loading ? 'Ringing…' : 'Ring me now'}
        </Button>
      </CardContent>
    </Card>
  );
}
