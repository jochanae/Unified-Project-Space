import { useEffect, useState } from 'react';
import { Inbox, Mail, Sparkles, Wand2, Loader2, Copy, Check, CheckCheck, Send, History, Clock } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useUnreadLeads } from '@/hooks/use-unread-leads';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { EngagementBadge } from '@/features/admin/components/EngagementBadge';

type LeadNotification = {
  id: string;
  email: string;
  source: string;
  is_read: boolean;
  created_at: string;
  project_id: string | null;
  page_id: string | null;
};

type Followup = {
  id: string;
  recipient_email: string;
  subject: string;
  body: string;
  created_at: string;
  engagement_status?: string | null;
  open_count?: number | null;
  click_count?: number | null;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function LeadCommandFeed() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const { count: unreadCount, markAllRead } = useUnreadLeads();
  const [leads, setLeads] = useState<LeadNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const orgId = user?.orgId;

  useEffect(() => {
    if (!orgId) return;
    let mounted = true;

    supabase
      .from('lead_notifications')
      .select('id, email, source, is_read, created_at, project_id, page_id')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(8)
      .then(({ data }) => {
        if (mounted) {
          setLeads((data as LeadNotification[]) || []);
          setLoading(false);
        }
      });

    const channel = supabase
      .channel(`lead-feed-${orgId}-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lead_notifications',
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          const lead = payload.new as LeadNotification;
          setLeads((prev) => [lead, ...prev].slice(0, 8));
          toast.success('New lead captured', {
            description: lead.email,
            icon: <Sparkles className="h-4 w-4" />,
          });
          try {
            const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
            if (AudioCtx) {
              const ctx = new AudioCtx();
              const now = ctx.currentTime;
              const tones = [880, 1320];
              tones.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0, now + i * 0.12);
                gain.gain.linearRampToValueAtTime(0.08, now + i * 0.12 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.35);
                osc.connect(gain).connect(ctx.destination);
                osc.start(now + i * 0.12);
                osc.stop(now + i * 0.12 + 0.4);
              });
              setTimeout(() => ctx.close().catch(() => {}), 800);
            }
          } catch {}
          try {
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
              const n = new Notification('New lead captured', {
                body: lead.email,
                icon: '/favicon.png',
                tag: `lead-${lead.id}`,
              });
              n.onclick = () => { window.focus(); n.close(); };
            }
          } catch {}
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [orgId]);

  const markRead = async (id: string) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, is_read: true } : l)));
    await supabase.from('lead_notifications').update({ is_read: true }).eq('id', id);
  };

  // MarQ script dialog
  const [scriptOpen, setScriptOpen] = useState(false);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [activeLead, setActiveLead] = useState<LeadNotification | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [toneNote, setToneNote] = useState('');
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  // History dialog
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<Followup[]>([]);
  const [historyLead, setHistoryLead] = useState<LeadNotification | null>(null);

  const generateScript = async (lead: LeadNotification) => {
    setActiveLead(lead);
    setSubject('');
    setBody('');
    setToneNote('');
    setScriptOpen(true);
    setScriptLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('quinn-lead-script', {
        body: { lead_notification_id: lead.id },
      });
      if (error) throw error;
      if (data?.script) {
        setSubject(data.script.subject || '');
        setBody(data.script.body || '');
        setToneNote(data.script.tone_note || '');
      } else throw new Error('No script returned');
    } catch (e) {
      toast.error('MarQ could not draft a script', {
        description: e instanceof Error ? e.message : 'Try again in a moment.',
      });
      setScriptOpen(false);
    } finally {
      setScriptLoading(false);
    }
  };

  const copyScript = async () => {
    await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const sendFollowup = async () => {
    if (!activeLead || !subject.trim() || !body.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-lead-followup', {
        body: {
          to: activeLead.email,
          subject: subject.trim(),
          message: body.trim(),
          lead_notification_id: activeLead.id,
        },
      });
      if (error) throw error;
      toast.success('Follow-up queued', {
        description: `Sending to ${activeLead.email} from notify.intoiq.app`,
      });
      setScriptOpen(false);
    } catch (e) {
      toast.error('Send failed', {
        description: e instanceof Error ? e.message : 'Try again shortly.',
      });
    } finally {
      setSending(false);
    }
  };

  const scheduleFollowup = async (delayMinutes: number, label: string) => {
    if (!activeLead || !subject.trim() || !body.trim() || !user?.orgId) return;
    setSending(true);
    try {
      const sendAt = new Date(Date.now() + delayMinutes * 60_000).toISOString();
      const { error } = await supabase.from('scheduled_followups').insert({
        org_id: user.orgId,
        scheduled_by: user.id,
        lead_notification_id: activeLead.id,
        recipient_email: activeLead.email,
        subject: subject.trim(),
        body: body.trim(),
        send_at: sendAt,
      });
      if (error) throw error;
      toast.success('Follow-up scheduled', {
        description: `Will send to ${activeLead.email} ${label}`,
      });
      setScriptOpen(false);
    } catch (e) {
      toast.error('Schedule failed', {
        description: e instanceof Error ? e.message : 'Try again shortly.',
      });
    } finally {
      setSending(false);
    }
  };

  const openHistory = async (lead: LeadNotification) => {
    setHistoryLead(lead);
    setHistory([]);
    setHistoryOpen(true);
    setHistoryLoading(true);
    const { data } = await supabase
      .from('lead_followups')
      .select('id, recipient_email, subject, body, created_at, engagement_status, open_count, click_count')
      .eq('lead_notification_id', lead.id)
      .order('created_at', { ascending: false });
    setHistory((data as Followup[]) || []);
    setHistoryLoading(false);
  };

  if (!user) return null;

  return (
    <>
    <section className="glass rounded-3xl border border-border/30 p-5 sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4 text-primary" />
          <h2 className="text-xl font-serif tracking-tight">Live Lead Feed</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{unreadCount} unread</span>
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1.5 px-2 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={async () => {
                await markAllRead();
                setLeads((prev) => prev.map((l) => ({ ...l, is_read: true })));
                toast.success('All leads marked as read');
              }}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="mt-5 h-16 animate-pulse rounded-xl bg-muted/20" />
      ) : leads.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-border/40 p-6 text-center">
          <Mail className="mx-auto h-6 w-6 text-muted-foreground/60" />
          <p className="mt-2 text-sm text-muted-foreground">
            No leads yet. Launch a funnel to start capturing.
          </p>
          <Button size="sm" className="mt-4 gap-1.5" onClick={() => navigate('/launch')}>
            <Sparkles className="h-3.5 w-3.5" />
            Quick Launch
          </Button>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-2">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors ${
                lead.is_read
                  ? 'border-border/20 bg-muted/10'
                  : 'border-primary/30 bg-primary/[0.04] shadow-[0_0_18px_hsl(var(--primary)/0.06)]'
              }`}
            >
              <button
                onClick={() => markRead(lead.id)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                {!lead.is_read && (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-primary animate-pulse" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{lead.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {lead.source.replace('_', ' ')} · {timeAgo(lead.created_at)}
                  </p>
                </div>
              </button>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => openHistory(lead)}
                  title="View follow-up history"
                >
                  <History className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1.5 px-2.5 text-xs"
                  onClick={() => generateScript(lead)}
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  MarQ Script
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>

    {/* MarQ script — editable */}
    <Dialog open={scriptOpen} onOpenChange={setScriptOpen}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" />
            Follow-up Script
          </DialogTitle>
          <DialogDescription>
            For <span className="text-foreground">{activeLead?.email}</span> · sends from <span className="text-foreground">notify.intoiq.app</span>
          </DialogDescription>
        </DialogHeader>

        {scriptLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            MarQ is drafting…
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="followup-subject" className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Subject
              </Label>
              <Input
                id="followup-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject line"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="followup-body" className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Body
              </Label>
              <Textarea
                id="followup-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                className="resize-none font-sans text-sm leading-relaxed"
                placeholder="Message body"
              />
            </div>
            {toneNote && (
              <p className="text-xs italic text-muted-foreground border-t border-border/30 pt-3">
                {toneNote}
              </p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={sendFollowup}
                disabled={sending || !subject.trim() || !body.trim()}
                className="flex-1 gap-2"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? 'Sending…' : 'Send now'}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={sending || !subject.trim() || !body.trim()}
                    className="gap-2 sm:w-auto"
                  >
                    <Clock className="h-4 w-4" />
                    Schedule
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => scheduleFollowup(60, 'in 1 hour')}>
                    In 1 hour
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => scheduleFollowup(60 * 24, 'tomorrow')}>
                    Tomorrow (24h)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => scheduleFollowup(60 * 24 * 2, 'in 2 days')}>
                    In 2 days
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => scheduleFollowup(60 * 24 * 7, 'in 7 days')}>
                    In 7 days
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={copyScript} variant="outline" className="gap-2 sm:w-auto">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* History per lead */}
    <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Follow-up History
          </DialogTitle>
          <DialogDescription>
            For <span className="text-foreground">{historyLead?.email}</span>
          </DialogDescription>
        </DialogHeader>
        {historyLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading history…
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/40 p-6 text-center">
            <Mail className="mx-auto h-6 w-6 text-muted-foreground/60" />
            <p className="mt-2 text-sm text-muted-foreground">
              No follow-ups sent yet for this lead.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((f) => (
              <div key={f.id} className="rounded-xl border border-border/30 bg-muted/10 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{f.subject}</p>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(f.created_at)}</span>
                </div>
                <div className="mt-1.5">
                  <EngagementBadge
                    status={f.engagement_status}
                    openCount={f.open_count ?? undefined}
                    clickCount={f.click_count ?? undefined}
                  />
                </div>
                <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground line-clamp-6">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
