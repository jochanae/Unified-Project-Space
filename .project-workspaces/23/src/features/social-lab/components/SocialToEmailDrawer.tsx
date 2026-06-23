import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Mail, Sparkles, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useEmailSequences } from '@/features/email-sequences';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { SocialCampaign } from '../types';

interface SocialToEmailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  projectName?: string;
  /** Latest social campaign set used to seed the email arc. */
  campaigns: SocialCampaign[];
}

interface GeneratedEmail {
  subject: string;
  body: string;
  purpose: string;
  delay_days: number;
  trigger_stage: string;
}

export function SocialToEmailDrawer({
  open,
  onOpenChange,
  projectId,
  projectName,
  campaigns,
}: SocialToEmailDrawerProps) {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { saveAll, activate } = useEmailSequences(projectId, user?.orgId);

  const [generating, setGenerating] = useState(false);
  const [emails, setEmails] = useState<GeneratedEmail[]>([]);
  const [sequenceName, setSequenceName] = useState<string>('');
  const triggeredRef = useRef<string | null>(null);

  // Seed strategy from the most recent campaign batch
  const seed = useMemo(() => {
    if (!campaigns.length) return null;
    const newest = campaigns[0];
    const groupId = newest.campaign_id;
    const set = groupId ? campaigns.filter((c) => c.campaign_id === groupId) : [newest];
    const hookPost = set.find((c) => c.narrative_role === 'Hook') ?? set[0];
    return {
      theme: newest.campaign_theme ?? hookPost.hook,
      hook: hookPost.hook,
      cta: hookPost.cta ?? '',
    };
  }, [campaigns]);

  const generate = async () => {
    if (!projectId) return;
    setGenerating(true);
    setEmails([]);
    try {
      const { data, error } = await supabase.functions.invoke('quinn-sequence-writer', {
        body: {
          projectId,
          sequenceType: 'welcome',
          existingStrategy: seed
            ? {
                audience: '',
                offer: seed.cta || seed.theme,
                positioning: seed.theme,
                hook: seed.hook,
              }
            : undefined,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const result = data as { sequence_name: string; emails: GeneratedEmail[] };
      setSequenceName(result.sequence_name);
      setEmails(result.emails ?? []);
    } catch (e: any) {
      toast.error(e?.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  // Auto-generate once per project per drawer-open
  useEffect(() => {
    if (!open || !projectId) return;
    if (triggeredRef.current === projectId) return;
    triggeredRef.current = projectId;
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId]);

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        triggeredRef.current = null;
        setEmails([]);
        setSequenceName('');
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  const handleSaveAndActivate = async () => {
    if (!emails.length) return;
    try {
      await saveAll.mutateAsync(
        emails.map((e, i) => ({
          subject: e.subject,
          body: e.body,
          purpose: e.purpose,
          delayDays: e.delay_days,
          triggerStage: e.trigger_stage || 'new',
          orderIndex: i,
          behaviorTrigger: null,
          behaviorThresholdHours: null,
          behaviorTargetPageId: null,
        })),
      );
      await activate.mutateAsync();
      toast.success('Nurture sequence is live. New leads will receive it automatically.');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || 'Save failed');
    }
  };

  const isSaving = saveAll.isPending || activate.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg glass border-l border-primary/20 overflow-y-auto p-0"
      >
        <div className="sticky top-0 z-10 backdrop-blur bg-background/80 border-b border-border/40 p-6">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/15 p-1.5">
                <Mail className="h-4 w-4 text-primary" />
              </div>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-primary/30">
                Social → Email Handoff
              </Badge>
            </div>
            <SheetTitle className="text-2xl tracking-tight mt-2">
              Convert this campaign into a nurture sequence.
            </SheetTitle>
            <SheetDescription>
              {seed
                ? `MarQ is translating "${seed.theme}" into a 5-email arc that picks up where the scroll stops.`
                : projectName
                  ? `A welcome arc tailored to "${projectName}".`
                  : 'A welcome arc tailored to your project.'}
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="p-6 space-y-4">
          {generating ? (
            <LoadingState />
          ) : emails.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center space-y-3">
              <p>No sequence generated yet.</p>
              <Button onClick={generate} variant="outline" className="gap-2">
                <Sparkles className="h-4 w-4" /> Try again
              </Button>
            </div>
          ) : (
            <>
              {sequenceName && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span className="uppercase tracking-wider">Sequence:</span>
                  <span className="text-foreground">{sequenceName}</span>
                </div>
              )}
              {emails.map((e, i) => (
                <EmailCard key={i} index={i} email={e} />
              ))}
            </>
          )}
        </div>

        <div className="sticky bottom-0 backdrop-blur bg-background/90 border-t border-border/40 p-6 space-y-2">
          <Button
            onClick={handleSaveAndActivate}
            disabled={!emails.length || isSaving || generating}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-500/90 hover:to-amber-600/90 text-black font-medium gap-2"
            size="lg"
          >
            {isSaving ? (
              'Activating…'
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Save & Activate Sequence
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            className="w-full gap-2 text-xs"
            onClick={() => {
              onOpenChange(false);
              navigate('/');
            }}
          >
            Open Email Studio
            <ArrowUpRight className="h-3 w-3" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground flex items-center gap-2">
        <Sparkles className="h-3 w-3 animate-pulse text-primary" />
        MarQ is writing your 5-email welcome arc…
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-xl border border-border/40 p-4 space-y-2 bg-card/40">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      ))}
    </div>
  );
}

function EmailCard({ index, email }: { index: number; email: GeneratedEmail }) {
  const delayLabel =
    email.delay_days === 0 ? 'Immediate' : `Day ${email.delay_days}`;
  return (
    <div className="rounded-xl border border-border/50 bg-card/60 p-4 space-y-2 hover:border-primary/30 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
            Email {index + 1}
          </Badge>
          <span className="text-[10px] text-muted-foreground">{delayLabel}</span>
        </div>
        {email.purpose && (
          <span className="text-[10px] text-primary/80 truncate max-w-[180px]" title={email.purpose}>
            {email.purpose}
          </span>
        )}
      </div>
      <p className="text-sm font-medium leading-snug">{email.subject}</p>
      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line line-clamp-5">
        {email.body}
      </p>
    </div>
  );
}
