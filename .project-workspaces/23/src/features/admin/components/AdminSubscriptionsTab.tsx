import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

export default function AdminSubscriptionsTab() {
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('subscriptions')
        .select('id, user_id, status, product_id, stripe_subscription_id, current_period_end, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      setSubs(data || []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />;

  return (
    <>
      <p className="text-xs text-muted-foreground">{subs.length} subscriptions</p>
      <div className="space-y-2">
        {subs.map(s => (
          <Card key={s.id} className="border-border/30">
            <CardContent className="flex items-center justify-between py-3 px-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{s.product_id}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant={s.status === 'active' ? 'default' : 'outline'} className="text-[10px]">{s.status}</Badge>
                  {s.current_period_end && (
                    <span className="text-xs text-muted-foreground">
                      Ends {new Date(s.current_period_end).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}
              </span>
            </CardContent>
          </Card>
        ))}
        {subs.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No subscriptions yet</p>
        )}
      </div>
    </>
  );
}
