import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, Play } from 'lucide-react';

interface CheckResult {
  name: string;
  status: 'idle' | 'running' | 'pass' | 'fail';
  latency?: number;
  error?: string;
}

const initialChecks: CheckResult[] = [
  { name: 'Database Connection', status: 'idle' },
  { name: 'Auth Service', status: 'idle' },
  { name: 'Edge Function: ai-build-stream', status: 'idle' },
  { name: 'Edge Function: ai-ghost-text', status: 'idle' },
  { name: 'Edge Function: check-subscription', status: 'idle' },
  { name: 'Storage Access', status: 'idle' },
];

export default function HealthCheckRunner({ onResults }: { onResults?: (results: CheckResult[]) => void }) {
  const [checks, setChecks] = useState<CheckResult[]>(initialChecks);
  const [running, setRunning] = useState(false);

  const update = (index: number, patch: Partial<CheckResult>, all: CheckResult[]) => {
    const next = [...all];
    next[index] = { ...next[index], ...patch };
    setChecks(next);
    return next;
  };

  const runChecks = async () => {
    setRunning(true);
    let results: CheckResult[] = initialChecks.map(c => ({ ...c }));
    setChecks(results);

    // 1 - DB
    results = update(0, { status: 'running' }, results);
    let t = performance.now();
    try {
      const { error } = await supabase.from('users').select('id').limit(1);
      const latency = Math.round(performance.now() - t);
      results = update(0, { status: error ? 'fail' : 'pass', latency, error: error?.message }, results);
    } catch (e: any) {
      results = update(0, { status: 'fail', latency: Math.round(performance.now() - t), error: e.message }, results);
    }

    // 2 - Auth
    results = update(1, { status: 'running' }, results);
    t = performance.now();
    try {
      const { error } = await supabase.auth.getSession();
      const latency = Math.round(performance.now() - t);
      results = update(1, { status: error ? 'fail' : 'pass', latency, error: error?.message }, results);
    } catch (e: any) {
      results = update(1, { status: 'fail', latency: Math.round(performance.now() - t), error: e.message }, results);
    }

    // 3-5 Edge functions
    const fns = ['ai-build-stream', 'ai-ghost-text', 'check-subscription'];
    for (let i = 0; i < fns.length; i++) {
      const idx = i + 2;
      results = update(idx, { status: 'running' }, results);
      t = performance.now();
      try {
        const { error } = await supabase.functions.invoke(fns[i], { body: {} });
        const latency = Math.round(performance.now() - t);
        // A 4xx/5xx with a response still means reachable
        results = update(idx, { status: 'pass', latency }, results);
      } catch (e: any) {
        const latency = Math.round(performance.now() - t);
        // Network-level failure = fail, but HTTP error responses from invoke don't throw
        results = update(idx, { status: 'fail', latency, error: e.message }, results);
      }
    }

    // 6 - Storage
    results = update(5, { status: 'running' }, results);
    t = performance.now();
    try {
      const { error } = await supabase.storage.listBuckets();
      const latency = Math.round(performance.now() - t);
      results = update(5, { status: error ? 'fail' : 'pass', latency, error: error?.message }, results);
    } catch (e: any) {
      results = update(5, { status: 'fail', latency: Math.round(performance.now() - t), error: e.message }, results);
    }

    setRunning(false);
    onResults?.(results);
  };

  return (
    <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">System Health Check</CardTitle>
        <Button size="sm" onClick={runChecks} disabled={running} className="gap-1.5">
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          Run All Checks
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {checks.map((c) => (
          <div key={c.name} className="flex items-center justify-between rounded-md border border-border/20 bg-background/40 px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              {c.status === 'running' && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}
              {c.status === 'pass' && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
              {c.status === 'fail' && <XCircle className="h-4 w-4 text-destructive shrink-0" />}
              {c.status === 'idle' && <div className="h-4 w-4 rounded-full border border-border/40 shrink-0" />}
              <span className="text-sm text-foreground truncate">{c.name}</span>
            </div>
            {c.latency !== undefined && (
              <span className={`text-xs font-mono shrink-0 ml-2 ${c.status === 'pass' ? 'text-emerald-500' : 'text-destructive'}`}>
                {c.latency}ms
              </span>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
