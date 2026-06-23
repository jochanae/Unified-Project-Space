import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Zap, Play, Clock, CheckCircle2, XCircle } from 'lucide-react';

const ENDPOINTS = [
  { value: 'chat', label: 'Chat', sample: '{"messages":[{"role":"user","content":"Hello!"}],"companionName":"Test","companionPersonality":"friendly"}' },
  { value: 'moderate-content', label: 'Moderate Content', sample: '{"content":"This is a test message","contentType":"post"}' },
  { value: 'generate-avatar', label: 'Generate Avatar', sample: '{"prompt":"A friendly anime character with blue hair","style":"anime"}' },
  { value: 'extract-memories', label: 'Extract Memories', sample: '{"messages":[{"role":"user","content":"I love hiking and my dog is named Max"}]}' },
  { value: 'journal-prompts', label: 'Journal Prompts', sample: '{"mood":"happy","recentTopics":["gratitude","growth"]}' },
  { value: 'generate-companion-post', label: 'Companion Post', sample: '{"companionName":"Aria","personality":"playful and creative","bio":"An artistic soul"}' },
  { value: 'web-search', label: 'Web Search', sample: '{"query":"mindfulness techniques for stress"}' },
  { value: 'generate-backstory', label: 'Generate Backstory', sample: '{"name":"Luna","personality":"gentle and wise","gender":"female"}' },
];

export default function AITester() {
  const [endpoint, setEndpoint] = useState(ENDPOINTS[0].value);
  const [payload, setPayload] = useState(ENDPOINTS[0].sample);
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [latency, setLatency] = useState<number | null>(null);

  const handleEndpointChange = (val: string) => {
    setEndpoint(val);
    const ep = ENDPOINTS.find(e => e.value === val);
    if (ep) setPayload(ep.sample);
    setResult(null);
    setStatus('idle');
  };

  const send = async () => {
    setStatus('loading');
    setResult(null);
    const start = performance.now();

    try {
      let body: any;
      try {
        body = JSON.parse(payload);
      } catch {
        setResult('Invalid JSON payload');
        setStatus('error');
        return;
      }

      const { data, error } = await supabase.functions.invoke(endpoint, { body });
      const elapsed = Math.round(performance.now() - start);
      setLatency(elapsed);

      if (error) {
        setResult(`Error: ${error.message}`);
        setStatus('error');
      } else {
        setResult(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
        setStatus('success');
      }
    } catch (e: any) {
      setLatency(Math.round(performance.now() - start));
      setResult(`Exception: ${e.message}`);
      setStatus('error');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" /> AI / API Tester
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={endpoint} onValueChange={handleEndpointChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENDPOINTS.map(ep => (
              <SelectItem key={ep.value} value={ep.value}>{ep.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Textarea
          value={payload}
          onChange={e => setPayload(e.target.value)}
          rows={6}
          className="font-mono text-xs"
          placeholder="JSON payload…"
        />

        <div className="flex items-center gap-3">
          <Button onClick={send} disabled={status === 'loading'} className="gap-1.5">
            <Play className="h-4 w-4" />
            {status === 'loading' ? 'Sending…' : 'Send'}
          </Button>
          {latency !== null && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Clock className="h-3 w-3" /> {latency}ms
            </Badge>
          )}
          {status === 'success' && <CheckCircle2 className="h-4 w-4 text-primary" />}
          {status === 'error' && <XCircle className="h-4 w-4 text-destructive" />}
        </div>

        {result && (
          <pre className="mt-2 max-h-80 overflow-auto rounded-lg border border-border bg-muted/30 p-3 text-xs font-mono whitespace-pre-wrap break-all">
            {result}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
