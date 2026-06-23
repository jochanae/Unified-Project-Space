import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail, ChevronDown, ChevronUp, Sparkles, Loader2, Pencil, Trash2,
  Plus, Clock, Play, Pause, Save, ArrowRight, Users, Zap, Eye, X,
  RefreshCw, Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { BuildStreamResult } from '@/features/quinn';
import { PIPELINE_STAGES } from '@/features/contacts';
import { useEmailSequences } from '@/features/email-sequences';
import { SequenceTimeline } from './SequenceTimeline';
import { useCurrentUser } from '@/hooks/use-current-user';
import { toast } from 'sonner';
import { NextStepPrompt } from '@/components/shared/NextStepPrompt';

type BehaviorTrigger = 'viewed_no_convert' | 'no_email_engagement' | 'abandoned_checkout';

interface EmailStep {
  id: string;
  subject: string;
  body: string;
  delay: string;
  delay_minutes: number;
  purpose: string;
  trigger?: string;
  channel?: 'email' | 'sms';
  behaviorTrigger?: BehaviorTrigger | null;
  behaviorThresholdHours?: number | null;
  active: boolean;
}

const BEHAVIOR_OPTIONS: Array<{ value: BehaviorTrigger; label: string }> = [
  { value: 'viewed_no_convert', label: 'Viewed page, no submit' },
  { value: 'no_email_engagement', label: 'No email opens/clicks' },
  { value: 'abandoned_checkout', label: 'Abandoned checkout' },
];

interface EmailSequenceBlockProps {
  projectId: string;
  projectGoal: string;
  buildResult?: BuildStreamResult | null;
}

const SEQUENCE_TYPES = [
  { value: 'welcome', label: 'Welcome & Nurture', desc: '5-email trust-building sequence' },
  { value: 'recovery', label: 'Recovery', desc: '3-email re-engagement for lost leads' },
  { value: 'onboarding', label: 'Onboarding', desc: '4-email new customer guide' },
  { value: 'reengagement', label: 'Re-Engagement', desc: '3-email cold subscriber revival' },
] as const;

const DELAY_OPTIONS = [
  { label: 'Immediate', minutes: 0, days: 0 },
  { label: '1 hour', minutes: 60, days: 0 },
  { label: '4 hours', minutes: 240, days: 0 },
  { label: '1 day', minutes: 1440, days: 1 },
  { label: '2 days', minutes: 2880, days: 2 },
  { label: '3 days', minutes: 4320, days: 3 },
  { label: '5 days', minutes: 7200, days: 5 },
  { label: '7 days', minutes: 10080, days: 7 },
];

const uid = () => crypto.randomUUID().slice(0, 8);

function minutesToDays(m: number) {
  return Math.round(m / 1440);
}

function daysToMinutes(d: number) {
  return d * 1440;
}

function renderEmailHtml(email: EmailStep, projectGoal: string): string {
  const bodyHtml = email.body.split('\n').map(line =>
    line.trim() ? `<p style="margin:0 0 12px;line-height:1.6;color:#333333;font-size:15px;">${line}</p>` : ''
  ).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <div style="border-bottom:1px solid #eee;padding-bottom:16px;margin-bottom:24px;">
      <h1 style="margin:0;font-size:20px;color:#111827;">${email.subject}</h1>
      <p style="margin:6px 0 0;font-size:12px;color:#9ca3af;">${email.purpose} • ${email.delay}${email.trigger ? ` • Triggered on "${email.trigger}"` : ''}</p>
    </div>
    ${bodyHtml}
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #eee;">
      <a href="#" style="display:inline-block;background:#4f46e5;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Take Action →</a>
    </div>
  </div>
  <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:16px;">This is a preview. Unsubscribe links will appear in live emails.</p>
</div>
</body></html>`;
}

export function EmailSequenceBlock({ projectId, projectGoal, buildResult }: EmailSequenceBlockProps) {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { sequences, isLoading: dbLoading, saveAll, activate } = useEmailSequences(projectId, user?.orgId);
  const [expanded, setExpanded] = useState(false);
  const [emails, setEmails] = useState<EmailStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sequenceActive, setSequenceActive] = useState(true);
  const [previewEmail, setPreviewEmail] = useState<EmailStep | null>(null);
  const [dirty, setDirty] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [sequenceType, setSequenceType] = useState<string>('welcome');

  // Hydrate from DB on load
  useEffect(() => {
    if (hydrated || dbLoading || !sequences) return;
    if (sequences.length > 0) {
      setEmails(sequences.map(s => ({
        id: s.id,
        subject: s.subject,
        body: s.body,
        delay: DELAY_OPTIONS.find(o => o.days === s.delayDays)?.label || `${s.delayDays} days`,
        delay_minutes: daysToMinutes(s.delayDays),
        purpose: s.purpose,
        trigger: s.triggerStage === 'none' ? undefined : s.triggerStage,
        channel: s.channel ?? 'email',
        behaviorTrigger: s.behaviorTrigger ?? null,
        behaviorThresholdHours: s.behaviorThresholdHours ?? null,
        active: true,
      })));
      setGenerated(true);
      setExpanded(true);
    }
    setHydrated(true);
  }, [sequences, dbLoading, hydrated]);

  const handleSave = async () => {
    if (!user?.orgId) return;
    try {
      await saveAll.mutateAsync(emails.map((e, i) => ({
        subject: e.subject,
        body: e.body,
        purpose: e.purpose,
        delayDays: minutesToDays(e.delay_minutes),
        triggerStage: e.trigger || 'none',
        orderIndex: i,
        channel: e.channel ?? 'email',
        behaviorTrigger: e.behaviorTrigger ?? null,
        behaviorThresholdHours: e.behaviorThresholdHours ?? null,
      })));
      setDirty(false);
      toast.success('Email sequence saved');
    } catch {
      toast.error('Failed to save sequence');
    }
  };

  const sequenceIsActive = sequences.some(s => s.isActive);

  const activateSequence = async () => {
    if (!projectId) return;
    if (dirty) {
      toast.error('Save the sequence before activating');
      return;
    }
    try {
      await activate.mutateAsync();
      toast.success('Sequence activated · new leads will be routed here');
      navigate(`/projects?projectId=${projectId}&tab=leads`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Activation failed');
    }
  };

  const updateEmail = (id: string, updates: Partial<EmailStep>) => {
    setEmails(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    setDirty(true);
  };

  const deleteEmail = (id: string) => {
    setEmails(prev => prev.filter(e => e.id !== id));
    if (editingId === id) setEditingId(null);
    setDirty(true);
  };

  const addEmail = () => {
    const newEmail: EmailStep = {
      id: uid(),
      subject: 'New Email',
      body: 'Write your email content here...',
      delay: `Day ${emails.length + 1}`,
      delay_minutes: (emails.length + 1) * 1440,
      purpose: 'Follow-up',
      active: true,
    };
    setEmails(prev => [...prev, newEmail]);
    setEditingId(newEmail.id);
    setDirty(true);
  };

  const generateSequence = async (type?: string) => {
    if (loading) return;
    setLoading(true);
    const selectedType = type || sequenceType;
    try {
      const { data, error } = await supabase.functions.invoke('quinn-sequence-writer', {
        body: {
          projectId,
          goal: projectGoal,
          sequenceType: selectedType,
          existingStrategy: buildResult?.strategy || null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const seqEmails = (data?.emails || []).map((e: any, i: number) => ({
        id: uid(),
        subject: e.subject || `Email ${i + 1}`,
        body: e.body || '',
        delay: DELAY_OPTIONS.find(o => o.days === (e.delay_days || i))?.label || `Day ${e.delay_days || i}`,
        delay_minutes: daysToMinutes(e.delay_days || i),
        purpose: e.purpose || 'Nurture',
        trigger: e.trigger_stage === 'none' ? undefined : e.trigger_stage,
        active: true,
      }));

      setEmails(seqEmails.length > 0 ? seqEmails : getDefaultEmails());
      setGenerated(true);
      setExpanded(true);
      setDirty(true);
    } catch (err) {
      console.error('Sequence generation failed:', err);
      setEmails(getDefaultEmails());
      setGenerated(true);
      setExpanded(true);
      setDirty(true);
    } finally {
      setLoading(false);
    }
  };

  const activeEmails = emails.filter(e => e.active);
  const pipelineTriggered = emails.filter(e => e.trigger);

  return (
    <>
      <div className="glass rounded-2xl border border-border/50 overflow-hidden">
        {/* Header */}
        <button
          onClick={() => generated ? setExpanded(!expanded) : generateSequence()}
          className="w-full flex items-center justify-between p-4 hover:bg-accent/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">Email Sequences</p>
              <p className="text-xs text-muted-foreground">
                {generated
                  ? `${activeEmails.length} active emails • ${pipelineTriggered.length} pipeline-triggered`
                  : 'MarQ-powered drip campaigns with Identity Lock'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dirty && (
              <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">unsaved</Badge>
            )}
            {!generated && (
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5 text-xs text-primary"
                onClick={(e) => { e.stopPropagation(); generateSequence(); }}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Generate
              </Button>
            )}
            {generated && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn('h-7 px-2', sequenceActive ? 'text-emerald-400' : 'text-muted-foreground')}
                  onClick={e => { e.stopPropagation(); setSequenceActive(!sequenceActive); }}
                >
                  {sequenceActive ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                </Button>
                {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </>
            )}
          </div>
        </button>

        {expanded && (
          <div className="border-t border-border/30 animate-fade-in">
            {/* Sequence Type Selector + Regenerate */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 px-4 pt-3 pb-1">
              <div className="flex flex-wrap gap-1.5 flex-1">
                {SEQUENCE_TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setSequenceType(t.value)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-colors',
                      sequenceType === t.value
                        ? 'bg-primary/15 border-primary/40 text-primary'
                        : 'border-border/30 text-muted-foreground hover:border-primary/20'
                    )}
                    title={t.desc}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5 shrink-0"
                onClick={() => generateSequence(sequenceType)}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                {generated ? 'Regenerate' : 'Generate'}
              </Button>
            </div>

            {emails.length > 0 && (
              <div className="px-4 pt-3">
                <SequenceTimeline
                  sequences={emails.map((e, i) => ({
                    id: e.id,
                    subject: e.subject,
                    body: e.body,
                    purpose: e.purpose,
                    delayDays: minutesToDays(e.delay_minutes),
                    triggerStage: e.trigger || 'none',
                    orderIndex: i,
                    isActive: true,
                  }))}
                  activeId={editingId}
                  onSelect={(id) => setEditingId(id)}
                />
              </div>
            )}

            {emails.length > 0 && (
            <div className="p-4 pt-2 space-y-1">
              {emails.map((email, i) => (
                <div key={email.id}>
                  {i > 0 && (
                    <div className="flex items-center gap-3 py-1 pl-[14px]">
                      <div className="w-px h-4 bg-border/30" />
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                        <Clock className="h-2.5 w-2.5" />
                        <span>{email.delay}</span>
                        {email.trigger && (
                          <>
                            <ArrowRight className="h-2.5 w-2.5" />
                            <span className="text-primary/60">on {email.trigger}</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  <div
                    className={cn(
                      'glass rounded-xl border transition-all',
                      !email.active && 'opacity-40',
                      editingId === email.id
                        ? 'border-primary/40 shadow-[0_0_20px_hsl(var(--primary)/0.1)] p-4'
                        : 'border-border/30 hover:border-primary/20 p-3 cursor-pointer'
                    )}
                    onClick={() => editingId !== email.id && setEditingId(email.id)}
                  >
                    {editingId === email.id ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                            </div>
                            <Badge variant="secondary" className="text-[10px]">{email.purpose}</Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setPreviewEmail(email)} title="Preview">
                              <Eye className="h-3 w-3 text-primary" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => updateEmail(email.id, { active: !email.active })}>
                              {email.active ? <Play className="h-3 w-3 text-emerald-400" /> : <Pause className="h-3 w-3" />}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteEmail(email.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Select
                            value={email.channel ?? 'email'}
                            onValueChange={v => updateEmail(email.id, { channel: v as 'email' | 'sms' })}
                          >
                            <SelectTrigger className="bg-card/30 border-border/20 h-8 text-xs w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="email" className="text-xs">Email</SelectItem>
                              <SelectItem value="sms" className="text-xs">SMS</SelectItem>
                            </SelectContent>
                          </Select>
                          {(email.channel ?? 'email') === 'email' && (
                            <Input
                              value={email.subject}
                              onChange={e => updateEmail(email.id, { subject: e.target.value })}
                              placeholder="Subject line…"
                              className="bg-card/30 border-border/20 text-sm font-medium flex-1"
                            />
                          )}
                        </div>

                        <Textarea
                          value={email.body}
                          onChange={e => updateEmail(email.id, { body: e.target.value })}
                          placeholder={(email.channel ?? 'email') === 'sms' ? 'SMS message (≤320 chars recommended)…' : 'Email body…'}
                          className="bg-card/30 border-border/20 text-sm min-h-[120px]"
                          maxLength={(email.channel ?? 'email') === 'sms' ? 1400 : undefined}
                        />
                        {(email.channel ?? 'email') === 'sms' && (
                          <p className="text-[10px] text-muted-foreground">
                            SMS only sends to contacts who checked the SMS opt-in box on your form. A "Reply STOP to opt out" footer is appended automatically.
                          </p>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <Select
                            value={String(email.delay_minutes)}
                            onValueChange={v => {
                              const opt = DELAY_OPTIONS.find(o => String(o.minutes) === v);
                              updateEmail(email.id, {
                                delay_minutes: parseInt(v),
                                delay: opt?.label || `${Math.round(parseInt(v) / 1440)} days`,
                              });
                            }}
                          >
                            <SelectTrigger className="bg-card/30 border-border/20 h-8 text-xs">
                              <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DELAY_OPTIONS.map(opt => (
                                <SelectItem key={opt.minutes} value={String(opt.minutes)} className="text-xs">{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select
                            value={email.trigger || 'none'}
                            onValueChange={v => updateEmail(email.id, { trigger: v === 'none' ? undefined : v })}
                          >
                            <SelectTrigger className="bg-card/30 border-border/20 h-8 text-xs">
                              <Users className="h-3 w-3 mr-1 text-muted-foreground" />
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none" className="text-xs">Time-based</SelectItem>
                              {PIPELINE_STAGES.map(s => (
                                <SelectItem key={s} value={s} className="text-xs capitalize">On {s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Input
                            value={email.purpose}
                            onChange={e => updateEmail(email.id, { purpose: e.target.value })}
                            className="bg-card/30 border-border/20 h-8 text-xs"
                            placeholder="Purpose…"
                          />
                        </div>

                        {/* Behavior trigger row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Select
                            value={email.behaviorTrigger || 'none'}
                            onValueChange={v => updateEmail(email.id, {
                              behaviorTrigger: v === 'none' ? null : (v as BehaviorTrigger),
                              behaviorThresholdHours: v === 'none' ? null : (email.behaviorThresholdHours ?? 48),
                            })}
                          >
                            <SelectTrigger className="bg-card/30 border-border/20 h-8 text-xs">
                              <Zap className="h-3 w-3 mr-1 text-cyan-400" />
                              <SelectValue placeholder="No behavior trigger" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none" className="text-xs">No behavior trigger</SelectItem>
                              {BEHAVIOR_OPTIONS.map(b => (
                                <SelectItem key={b.value} value={b.value} className="text-xs">{b.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            min={1}
                            max={720}
                            value={email.behaviorThresholdHours ?? ''}
                            onChange={e => updateEmail(email.id, {
                              behaviorThresholdHours: e.target.value ? parseInt(e.target.value) : null,
                            })}
                            disabled={!email.behaviorTrigger}
                            className="bg-card/30 border-border/20 h-8 text-xs"
                            placeholder="Wait hours (e.g. 48)"
                          />
                        </div>

                        <Button size="sm" variant="ghost" className="text-xs" onClick={() => setEditingId(null)}>
                          <Save className="h-3 w-3 mr-1" /> Done
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-sm font-medium truncate">{email.subject}</p>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                className="text-muted-foreground/40 hover:text-primary transition-colors"
                                onClick={e => { e.stopPropagation(); setPreviewEmail(email); }}
                                title="Preview email"
                              >
                                <Eye className="h-3 w-3" />
                              </button>
                              <span className="text-[10px] text-primary/60 bg-primary/5 px-2 py-0.5 rounded-full">{email.purpose}</span>
                              <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">{email.delay}</span>
                              {email.trigger && (
                                <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                  <Zap className="h-2.5 w-2.5" />{email.trigger}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{email.body}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            )}

            {/* Inline next-step prompt — activate this sequence */}
            {generated && emails.length > 0 && (
              <div className="px-4 pb-2">
                {sequenceIsActive ? (
                  <NextStepPrompt
                    mode="receipt"
                    text="Sequence active · leads routed here"
                    pulse
                    onClick={() => navigate(`/projects?projectId=${projectId}&tab=leads`)}
                  />
                ) : (
                  <NextStepPrompt
                    mode="action"
                    text="Activate this sequence for new leads"
                    loading={activate.isPending}
                    disabled={dirty}
                    onClick={activateSequence}
                  />
                )}
              </div>
            )}

            {/* Actions */}
            <div className="px-4 pb-4 flex gap-2">
              <Button variant="ghost" size="sm" className="flex-1 gap-1.5 text-xs" onClick={addEmail}>
                <Plus className="h-3 w-3" /> Add Email
              </Button>
              {dirty && (
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 gap-1.5 text-xs"
                  onClick={handleSave}
                  disabled={saveAll.isPending}
                >
                  {saveAll.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  Save Sequence
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Email HTML Preview Modal */}
      {previewEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setPreviewEmail(null)}>
          <div className="relative w-full max-w-2xl max-h-[85vh] bg-background rounded-2xl border border-border shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Email Preview</span>
                <Badge variant="secondary" className="text-[10px]">{previewEmail.purpose}</Badge>
              </div>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setPreviewEmail(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <iframe
              srcDoc={renderEmailHtml(previewEmail, projectGoal)}
              className="w-full h-[70vh] border-0"
              title="Email Preview"
              sandbox=""
            />
          </div>
        </div>
      )}
    </>
  );
}

function getDefaultEmails(): EmailStep[] {
  return [
    { id: uid(), subject: 'Welcome & Quick Win', body: 'Your first step to success starts here.\n\nHere\'s something you can implement in 5 minutes that will immediately show you the power of what we\'ve built.\n\nTake this one small action today and you\'ll already be ahead of 90% of people.', delay: 'Immediate', delay_minutes: 0, purpose: 'Welcome', trigger: 'new', active: true },
    { id: uid(), subject: 'The #1 Mistake Everyone Makes', body: 'Most people get this wrong and it costs them months.\n\nI see this pattern over and over — people try to do everything at once instead of focusing on the one thing that actually moves the needle.\n\nHere\'s the shortcut that saves you weeks of trial and error.', delay: 'Day 1', delay_minutes: 1440, purpose: 'Educate', active: true },
    { id: uid(), subject: 'How They Achieved It', body: 'See how others in your exact situation achieved remarkable results with this approach.\n\nSarah was skeptical at first too. But within two weeks, she had completely transformed her workflow.\n\nHere\'s what she did differently — and how you can do the same.', delay: 'Day 3', delay_minutes: 4320, purpose: 'Social Proof', trigger: 'contacted', active: true },
    { id: uid(), subject: 'Limited Availability — Action Required', body: 'This opportunity won\'t be available forever.\n\nWe\'re closing enrollment at the end of this week because we want to give everyone personal attention.\n\nHere\'s why acting now matters — and what you\'ll miss if you wait.', delay: 'Day 5', delay_minutes: 7200, purpose: 'Urgency', trigger: 'qualified', active: true },
    { id: uid(), subject: 'Your Final Invitation', body: 'Last chance to take action on this.\n\nI\'ve shown you the framework, the results others have gotten, and the path forward.\n\nNow it\'s your turn. Click below to get started — after today, the door closes.', delay: 'Day 7', delay_minutes: 10080, purpose: 'Final CTA', trigger: 'proposal', active: true },
  ];
}
