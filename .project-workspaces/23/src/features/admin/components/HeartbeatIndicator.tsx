import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';

type Status = 'checking' | 'nominal' | 'degraded';

export default function HeartbeatIndicator() {
  const [status, setStatus] = useState<Status>('checking');
  const [latency, setLatency] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const check = async () => {
    const t = performance.now();
    try {
      const { error } = await supabase.from('users').select('id').limit(1);
      setLatency(Math.round(performance.now() - t));
      setStatus(error ? 'degraded' : 'nominal');
    } catch {
      setLatency(Math.round(performance.now() - t));
      setStatus('degraded');
    }
  };

  useEffect(() => {
    check();
    intervalRef.current = setInterval(check, 60_000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const dotColor = status === 'nominal' ? 'bg-emerald-500' : status === 'degraded' ? 'bg-amber-500' : 'bg-muted-foreground';
  const pingColor = status === 'nominal' ? 'bg-emerald-500' : status === 'degraded' ? 'bg-amber-500' : 'bg-muted-foreground';
  const label = status === 'nominal' ? 'All systems nominal' : status === 'degraded' ? 'System degraded' : 'Checking…';

  return (
    <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
      <CardContent className="flex items-center gap-3 py-3 px-4">
        <span className="relative flex h-3 w-3">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${pingColor} opacity-75`} />
          <span className={`relative inline-flex rounded-full h-3 w-3 ${dotColor}`} />
        </span>
        <span className="text-sm font-medium text-foreground">{label}</span>
        {latency !== null && (
          <span className="text-xs text-muted-foreground font-mono ml-auto">{latency}ms</span>
        )}
      </CardContent>
    </Card>
  );
}
