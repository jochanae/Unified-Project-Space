import { useState, useEffect } from 'react';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
const supabase = supabaseClient as any;
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, Copy, Zap, RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/use-current-user';

const ALL_EVENTS = [
  { value: 'lead.created',          label: 'Lead Created',         desc: 'New opt-in on any funnel page' },
  { value: 'form.submitted',        label: 'Form Submitted',       desc: 'Any form submission (including repeat)' },
  { value: 'contact.stage_changed', label: 'Contact Stage Changed',desc: 'CRM pipeline stage updated' },
];

interface Endpoint {
  id: string;
  url: string;
  secret: string;
  events: string[];
  is_active: boolean;
  last_triggered_at: string | null;
  last_status_code: number | null;
}

function generateSecret(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function StatusBadge({ code }: { code: number | null }) {
  if (code === null) return <span className="text-[10px] text-muted-foreground">Never triggered</span>;
  if (code >= 200 && code < 300)
    return <span className="flex items-center gap-1 text-[10px] text-emerald-400"><CheckCircle2 className="h-3 w-3" />{code}</span>;
  if (code === 0)
    return <span className="flex items-center gap-1 text-[10px] text-destructive"><XCircle className="h-3 w-3" />Timeout</span>;
  return <span className="flex items-center gap-1 text-[10px] text-amber-400"><Clock className="h-3 w-3" />{code}</span>;
}

export function WebhookSettings() {
  const { user } = useCurrentUser();
  const orgId = user?.orgId;

  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading]     = useState(true);
  const [adding, setAdding]       = useState(false);
  const [saving, setSaving]       = useState(false);
  const [testing, setTesting]     = useState<string | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);

  const [newUrl, setNewUrl]       = useState('');
  const [newSecret]               = useState(generateSecret);
  const [newEvents, setNewEvents] = useState<string[]>(['lead.created']);

  useEffect(() => { if (orgId) load(); }, [orgId]);

  async function load() {
    if (!orgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('webhook_endpoints')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });
    if (!error) setEndpoints((data as Endpoint[]) || []);
    setLoading(false);
  }

  function toggleEvent(event: string) {
    setNewEvents(prev =>
      prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]
    );
  }

  async function save() {
    if (!orgId) return;
    if (!newUrl.trim()) { toast.error('Enter a URL'); return; }
    if (!newUrl.startsWith('https://')) { toast.error('URL must start with https://'); return; }
    if (newEvents.length === 0) { toast.error('Select at least one event'); return; }
    setSaving(true);
    const { error } = await supabase.from('webhook_endpoints').insert({
      org_id: orgId, url: newUrl.trim(), secret: newSecret, events: newEvents,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Webhook endpoint added');
    setAdding(false);
    setNewUrl('');
    load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from('webhook_endpoints').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setEndpoints(prev => prev.filter(e => e.id !== id));
    toast.success('Endpoint removed');
  }

  async function toggle(ep: Endpoint) {
    const { error } = await supabase
      .from('webhook_endpoints').update({ is_active: !ep.is_active }).eq('id', ep.id);
    if (error) { toast.error(error.message); return; }
    setEndpoints(prev => prev.map(e => e.id === ep.id ? { ...e, is_active: !e.is_active } : e));
  }

  async function sendTest(ep: Endpoint) {
    if (!orgId) return;
    setTesting(ep.id);
    try {
      const { error } = await supabase.functions.invoke('dispatch-webhook', {
        body: {
          event: 'webhook.test',
          org_id: orgId,
          project_id: null,
          payload: { message: 'This is a test event from IntoIQ.', endpoint_id: ep.id },
        },
      });
      if (error) throw error;
      toast.success('Test event sent — check your endpoint');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Test failed');
    } finally {
      setTesting(null);
    }
  }

  function copySecret(secret: string) {
    navigator.clipboard.writeText(secret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  }

  if (!orgId) return null;

  return (
    <section className="glass rounded-2xl border border-border/50 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <div>
            <h3 className="text-sm font-semibold">Webhooks</h3>
            <p className="text-[11px] text-muted-foreground">Send lead events to Zapier, Make, or any URL</p>
          </div>
        </div>
        {!adding && (
          <Button size="sm" onClick={() => setAdding(true)} className="gap-1.5 h-8 text-xs">
            <Plus className="h-3.5 w-3.5" /> Add Endpoint
          </Button>
        )}
      </div>

      {adding && (
        <div className="rounded-xl border border-border/40 bg-card/30 p-4 space-y-3">
          <p className="text-xs font-medium">New endpoint</p>
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">URL</label>
            <Input placeholder="https://hooks.zapier.com/..." value={newUrl}
              onChange={e => setNewUrl(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Signing Secret — copy this now, it won't be shown again
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md bg-muted/40 border border-border/30 px-3 py-1.5 text-xs font-mono truncate">
                {newSecret}
              </code>
              <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs shrink-0"
                onClick={() => copySecret(newSecret)}>
                <Copy className="h-3 w-3" />{secretCopied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Verify with: <code className="bg-muted/30 px-1 rounded">HMAC-SHA256(secret, body)</code> →
              compare to <code className="bg-muted/30 px-1 rounded">X-IntoIQ-Signature</code>
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Events</label>
            <div className="flex flex-wrap gap-2">
              {ALL_EVENTS.map(ev => (
                <button key={ev.value} type="button" onClick={() => toggleEvent(ev.value)}
                  title={ev.desc}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                    newEvents.includes(ev.value)
                      ? 'border-primary/50 bg-primary/10 text-primary'
                      : 'border-border/40 text-muted-foreground hover:border-border',
                  )}
                >
                  {ev.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={save} disabled={saving} className="h-8 text-xs">
              {saving ? 'Saving…' : 'Save endpoint'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)} className="h-8 text-xs">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : endpoints.length === 0 && !adding ? (
        <p className="text-xs text-muted-foreground">
          No endpoints yet. Add one to start piping leads into Zapier or Make.
        </p>
      ) : (
        <div className="space-y-2">
          {endpoints.map(ep => (
            <div key={ep.id}
              className={cn(
                'rounded-xl border p-3 space-y-2 transition-colors',
                ep.is_active ? 'border-border/40 bg-card/20' : 'border-border/20 bg-muted/10 opacity-60',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{ep.url}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {ep.events.map(ev => (
                      <Badge key={ev} variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">
                        {ev}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7"
                    title={ep.is_active ? 'Pause' : 'Resume'} onClick={() => toggle(ep)}>
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7"
                    title="Send test event" disabled={testing === ep.id} onClick={() => sendTest(ep)}>
                    <Zap className={cn('h-3.5 w-3.5', testing === ep.id && 'animate-pulse')} />
                  </Button>
                  <Button size="icon" variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    title="Delete" onClick={() => remove(ep.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <StatusBadge code={ep.last_status_code} />
                {ep.last_triggered_at && (
                  <span>Last fired {new Date(ep.last_triggered_at).toLocaleString()}</span>
                )}
                {!ep.is_active && <Badge variant="outline" className="text-[10px] py-0">Paused</Badge>}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
