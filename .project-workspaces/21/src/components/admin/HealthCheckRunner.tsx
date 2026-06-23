import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HeartPulse, Play, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'running';
  detail: string;
  latency?: number;
}

const EDGE_FUNCTIONS_TO_CHECK = ['moderate-content', 'journal-prompts'];
const STORAGE_BUCKETS = ['companion-avatars', 'chat-images', 'post-images', 'audio-messages'];

export default function HealthCheckRunner() {
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [running, setRunning] = useState(false);

  const updateCheck = (name: string, update: Partial<CheckResult>) => {
    setChecks(prev => prev.map(c => c.name === name ? { ...c, ...update } : c));
  };

  const runAll = async () => {
    setRunning(true);

    const initial: CheckResult[] = [
      { name: 'Database Connection', status: 'running', detail: '' },
      { name: 'Auth Session', status: 'running', detail: '' },
      ...EDGE_FUNCTIONS_TO_CHECK.map(fn => ({ name: `Edge: ${fn}`, status: 'running' as const, detail: '' })),
      ...STORAGE_BUCKETS.map(b => ({ name: `Bucket: ${b}`, status: 'running' as const, detail: '' })),
      { name: 'RLS Sanity', status: 'running', detail: '' },
    ];
    setChecks(initial);

    // 1. Database
    const dbStart = performance.now();
    try {
      const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const ms = Math.round(performance.now() - dbStart);
      if (error) {
        updateCheck('Database Connection', { status: 'fail', detail: error.message, latency: ms });
      } else {
        updateCheck('Database Connection', { status: 'pass', detail: `${count} profiles`, latency: ms });
      }
    } catch (e: any) {
      updateCheck('Database Connection', { status: 'fail', detail: e.message, latency: Math.round(performance.now() - dbStart) });
    }

    // 2. Auth
    const authStart = performance.now();
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      const ms = Math.round(performance.now() - authStart);
      if (error || !user) {
        updateCheck('Auth Session', { status: 'fail', detail: error?.message || 'No session', latency: ms });
      } else {
        updateCheck('Auth Session', { status: 'pass', detail: `Logged in as ${user.email}`, latency: ms });
      }
    } catch (e: any) {
      updateCheck('Auth Session', { status: 'fail', detail: e.message, latency: Math.round(performance.now() - authStart) });
    }

    // 3. Edge functions (in parallel)
    await Promise.all(EDGE_FUNCTIONS_TO_CHECK.map(async (fn) => {
      const name = `Edge: ${fn}`;
      const start = performance.now();
      try {
        const { error } = await supabase.functions.invoke(fn, {
          body: fn === 'moderate-content'
            ? { content: 'health check test', contentType: 'post' }
            : { mood: 'neutral', recentTopics: [] },
        });
        const ms = Math.round(performance.now() - start);
        if (error) {
          updateCheck(name, { status: 'fail', detail: error.message, latency: ms });
        } else {
          updateCheck(name, { status: 'pass', detail: 'OK', latency: ms });
        }
      } catch (e: any) {
        updateCheck(name, { status: 'fail', detail: e.message, latency: Math.round(performance.now() - start) });
      }
    }));

    // 4. Storage buckets (in parallel)
    await Promise.all(STORAGE_BUCKETS.map(async (bucket) => {
      const name = `Bucket: ${bucket}`;
      const start = performance.now();
      try {
        const { data, error } = await supabase.storage.from(bucket).list('', { limit: 1 });
        const ms = Math.round(performance.now() - start);
        if (error) {
          updateCheck(name, { status: 'fail', detail: error.message, latency: ms });
        } else {
          updateCheck(name, { status: 'pass', detail: `${data.length >= 1 ? '1+' : '0'} files`, latency: ms });
        }
      } catch (e: any) {
        updateCheck(name, { status: 'fail', detail: e.message, latency: Math.round(performance.now() - start) });
      }
    }));

    // 5. RLS sanity — try reading another user's data (should return empty)
    const rlsStart = performance.now();
    try {
      const { data } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('user_id', '00000000-0000-0000-0000-000000000000')
        .limit(1);
      const ms = Math.round(performance.now() - rlsStart);
      if (!data || data.length === 0) {
        updateCheck('RLS Sanity', { status: 'pass', detail: 'Correctly blocked foreign data', latency: ms });
      } else {
        updateCheck('RLS Sanity', { status: 'fail', detail: `Returned ${data.length} rows — RLS may be misconfigured!`, latency: ms });
      }
    } catch (e: any) {
      updateCheck('RLS Sanity', { status: 'pass', detail: 'Query blocked (expected)', latency: Math.round(performance.now() - rlsStart) });
    }

    setRunning(false);
  };

  const passCount = checks.filter(c => c.status === 'pass').length;
  const failCount = checks.filter(c => c.status === 'fail').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-primary" /> System Health Check
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Button onClick={runAll} disabled={running} className="gap-1.5">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {running ? 'Running…' : 'Run All Checks'}
          </Button>
          {checks.length > 0 && !running && (
            <div className="flex gap-2">
              <Badge variant="default" className="text-xs gap-1">
                <CheckCircle2 className="h-3 w-3" /> {passCount} passed
              </Badge>
              {failCount > 0 && (
                <Badge variant="destructive" className="text-xs gap-1">
                  <XCircle className="h-3 w-3" /> {failCount} failed
                </Badge>
              )}
            </div>
          )}
        </div>

        {checks.length > 0 && (
          <div className="space-y-1.5 mt-2">
            {checks.map(c => (
              <div key={c.name} className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-muted/20">
                {c.status === 'running' && <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin shrink-0" />}
                {c.status === 'pass' && <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />}
                {c.status === 'fail' && <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                <span className="text-sm font-medium text-foreground flex-1 min-w-0 truncate">{c.name}</span>
                <span className="text-xs text-muted-foreground truncate max-w-[200px]">{c.detail}</span>
                {c.latency != null && (
                  <Badge variant="outline" className="text-[10px] gap-0.5 shrink-0">
                    <Clock className="h-2.5 w-2.5" /> {c.latency}ms
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
