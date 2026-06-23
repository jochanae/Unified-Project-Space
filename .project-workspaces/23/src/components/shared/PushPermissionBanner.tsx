import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { toast } from 'sonner';

export function PushPermissionBanner() {
  const { status, busy, subscribe } = usePushNotifications();

  if (status === 'unsupported' || status === 'granted') return null;

  const handleEnable = async () => {
    const ok = await subscribe();
    if (ok) {
      toast.success('Lead alerts on', {
        description: 'You will get an instant ping the moment a lead opts in.',
      });
    } else if (status === 'denied') {
      toast.error('Notifications blocked', {
        description: 'Enable them in your browser settings to get lead pings.',
      });
    }
  };

  if (status === 'unconfigured') return null;

  return (
    <div className="glass flex flex-col gap-3 rounded-2xl border border-primary/20 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-2">
          {status === 'denied' ? (
            <BellOff className="h-4 w-4 text-primary" />
          ) : (
            <Bell className="h-4 w-4 text-primary" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            {status === 'denied' ? 'Lead pings are blocked' : 'Get pinged the moment a lead opts in'}
          </p>
          <p className="text-xs text-muted-foreground">
            {status === 'denied'
              ? 'Re-enable notifications in your browser to receive instant alerts.'
              : 'Real-time browser alert + email to your inbox. Zero polling.'}
          </p>
        </div>
      </div>
      {status !== 'denied' && (
        <Button size="sm" onClick={handleEnable} disabled={busy} className="gap-1.5">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
          Enable alerts
        </Button>
      )}
    </div>
  );
}
