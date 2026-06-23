import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldBan, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface User { id: string; email: string; blocked_at: string | null; blocked_reason: string | null; }

export default function UserBlockTool() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetch_ = async () => {
    setLoading(true);
    const { data } = await supabase.from('users').select('id, email, blocked_at, blocked_reason' as any).order('email');
    setUsers((data || []) as unknown as User[]);
    setLoading(false);
  };

  useEffect(() => { fetch_(); }, []);

  const toggleBlock = async (u: User) => {
    if (u.blocked_at) {
      await supabase.from('users').update({ blocked_at: null, blocked_reason: null } as any).eq('id', u.id);
      toast.success(`${u.email} unblocked`);
    } else {
      await supabase.from('users').update({ blocked_at: new Date().toISOString(), blocked_reason: 'Blocked by admin' } as any).eq('id', u.id);
      toast.success(`${u.email} blocked`);
    }
    fetch_();
  };

  const filtered = users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />;

  return (
    <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
      <CardContent className="p-4 space-y-2">
        <p className="text-sm font-semibold text-foreground mb-2">User Block / Unblock</p>
        <Input placeholder="Search by email…" value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-sm mb-2" />
        {filtered.map(u => (
          <div key={u.id} className="flex items-center justify-between rounded-md border border-border/20 bg-background/40 px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-sm text-foreground truncate">{u.email}</p>
              {u.blocked_at && <Badge variant="destructive" className="text-[10px]">Blocked</Badge>}
            </div>
            <Button size="sm" variant={u.blocked_at ? 'outline' : 'destructive'} className="gap-1.5 text-xs h-7" onClick={() => toggleBlock(u)}>
              {u.blocked_at ? <><ShieldCheck className="h-3 w-3" /> Unblock</> : <><ShieldBan className="h-3 w-3" /> Block</>}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
