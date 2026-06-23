import { useEffect, useState, useCallback } from 'react';
import { Bell, BellOff, Loader2, ShieldAlert, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { toast } from 'sonner';

export function PushNotificationsCard() {
  const { user } = useCurrentUser();
  const { status, busy, subscribe } = usePushNotifications();
  const [hasActiveSub, setHasActiveSub] = useState(false);
  const [checking, setChecking] = useState(true);
  const [unsubBusy, setUnsubBusy] = useState(false);

  const refreshSubState = useCallback(async () => {
    if (!user?.id) {
      setChecking(false);
      return;
    }
    setChecking(true);
    try {
      if (!('serviceWorker' in navigator)) {
        setHasActiveSub(false);
        return;
      }
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      const { count } = await supabase
        .from('push_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setHasActiveSub(!!sub && (count ?? 0) > 0);
    } finally {
      setChecking(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refreshSubState();
  }, [refreshSubState, status]);

  const handleEnable = async () => {
    const ok = await subscribe();
    if (ok) {
      toast.success('Lead pings enabled', {
        description: "You'll get instant alerts when leads come in.",
      });
      refreshSubState();
    } else if (status === 'denied') {
      toast.error('Notifications blocked', {
        description: 'Re-enable in browser settings: tap the lock icon → Permissions → Notifications → Allow.',
      });
    } else if (status === 'unconfigured') {
      toast.error('Push not configured', {
        description: 'Server VAPID key missing. Contact support.',
      });
    }
  };

  const handleDisable = async () => {
    if (!user?.id) return;
    setUnsubBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        await sub.unsubscribe();
      } else {
        await supabase.from('push_subscriptions').delete().eq('user_id', user.id);
      }
      toast.success('Push notifications disabled');
      refreshSubState();
    } catch (err: any) {
      toast.error(err.message || 'Failed to disable');
    } finally {
      setUnsubBusy(false);
    }
  };

  const isUnsupported = status === 'unsupported';
  const isDenied = status === 'denied';
  const isOn = hasActiveSub && status === 'granted';

  return (
    <section className="glass rounded-2xl p-6 mb-6">
      <h2 className="text-lg font-medium mb-1 flex items-center gap-2">
        <Bell className="h-5 w-5 text-primary" /> Lead Pings
      </h2>
      <p className="text-xs text-muted-foreground mb-5">
        Real-time browser push when a new lead lands — even when IntoIQ isn't open.
      </p>

      {isUnsupported ? (
        <div className="flex items-start gap-3 rounded-xl border border-border/40 bg-muted/30 p-4">
          <ShieldAlert className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            Your browser doesn't support push notifications. Try Chrome, Edge, or installing IntoIQ as a PWA.
          </p>
        </div>
      ) : isDenied ? (
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <BellOff className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Notifications are blocked</p>
              <p className="text-muted-foreground mt-1">
                Tap the <span className="font-medium">🔒 lock icon</span> next to the URL → Permissions → Notifications → <span className="font-medium">Allow</span>, then refresh.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 flex-wrap">
          {checking ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : isOn ? (
            <>
              <Badge className="gap-1.5 bg-primary/15 text-primary border-primary/30">
                <Check className="h-3 w-3" /> Enabled
              </Badge>
              <Button variant="outline" size="sm" onClick={handleDisable} disabled={unsubBusy}>
                {unsubBusy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <BellOff className="h-4 w-4 mr-1" />}
                Disable
              </Button>
            </>
          ) : (
            <>
              <Badge variant="outline" className="text-muted-foreground">Off</Badge>
              <Button size="sm" onClick={handleEnable} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Bell className="h-4 w-4 mr-1" />}
                Enable lead pings
              </Button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
