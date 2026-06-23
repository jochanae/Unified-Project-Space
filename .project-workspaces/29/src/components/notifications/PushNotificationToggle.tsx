import { Bell, BellOff, BellRing, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';

interface PushNotificationToggleProps {
  variant?: 'button' | 'switch';
  className?: string;
}

export function PushNotificationToggle({ variant = 'switch', className }: PushNotificationToggleProps) {
  const { isSupported, isSubscribed, permission, isLoading, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupported) {
    return (
      <div className={cn('flex items-center gap-2 text-muted-foreground text-sm', className)}>
        <BellOff className="h-4 w-4" />
        <span>Push notifications not supported</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Checking...</span>
      </div>
    );
  }

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  if (variant === 'button') {
    return (
      <Button
        variant={isSubscribed ? 'secondary' : 'default'}
        size="sm"
        onClick={handleToggle}
        className={className}
      >
        {isSubscribed ? (
          <>
            <BellRing className="h-4 w-4 mr-2" />
            Notifications On
          </>
        ) : (
          <>
            <Bell className="h-4 w-4 mr-2" />
            Enable Notifications
          </>
        )}
      </Button>
    );
  }

  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <div className="flex items-center gap-3">
        {isSubscribed ? (
          <BellRing className="h-5 w-5 text-primary" />
        ) : (
          <Bell className="h-5 w-5 text-muted-foreground" />
        )}
        <div>
          <Label htmlFor="push-toggle" className="text-sm font-medium cursor-pointer">
            Push Notifications
          </Label>
          <p className="text-xs text-muted-foreground">
            {permission === 'denied' 
              ? 'Blocked in browser settings'
              : isSubscribed 
                ? 'Receive alerts even when app is closed' 
                : 'Get notified about reminders and updates'}
          </p>
        </div>
      </div>
      <Switch
        id="push-toggle"
        checked={isSubscribed}
        onCheckedChange={handleToggle}
        disabled={permission === 'denied'}
      />
    </div>
  );
}
