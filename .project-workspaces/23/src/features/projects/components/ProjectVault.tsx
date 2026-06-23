import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FolderOpen, Image as ImageIcon, ListTree, Send, Plus, Sparkles, Loader2, Mail, Eye, MousePointerClick } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useMarketingAssets } from '@/features/marketing-studio/hooks/use-marketing-assets';
import { useCampaignSequence } from '@/features/campaigns/hooks/use-campaign-sequence';
import { CampaignLibraryPanel } from '@/features/marketing-studio/components/CampaignLibraryPanel';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  projectId?: string | null;
  projectName?: string | null;
  /** Optional custom trigger. Defaults to a compact "View Vault" pill. */
  trigger?: React.ReactNode;
}

/**
 * Project Vault — right-side slide-out with all historical assets for the active project.
 * 3 tabs: Graphics Library · Campaign History · Sent Log.
 * Mobile-first: 85vh equivalent on phones via inset, sticky tab strip while scrolling.
 */
export function ProjectVault({ projectId, projectName, trigger }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/5 px-3 py-1 text-[11px] text-gold/90 hover:bg-gold/15 transition-colors"
          >
            <FolderOpen className="h-3 w-3" />
            View Vault
          </button>
        )}
      </SheetTrigger>
      <SheetContent
        side="right"
        // Bump above the mobile AppShell header (z-[60]) so the Vault truly covers it.
        className="z-[100] w-full sm:max-w-2xl p-0 flex flex-col border-l border-gold/20 bg-background/95 backdrop-blur-xl"
        overlayClassName="z-[99]"
      >
        <SheetHeader className="px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4 border-b border-border/30 shrink-0">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-gold shrink-0" />
            <span className="text-[10px] uppercase tracking-[0.22em] text-gold/80">Project Vault</span>
          </div>
          <SheetTitle className="mt-1 text-left text-xl sm:text-2xl font-serif tracking-tight">
            {projectName ? `${projectName} Vault` : 'Project Vault'}
          </SheetTitle>
          <p className="text-[11px] text-muted-foreground text-left">
            Every asset, campaign, and send for this project — in one place.
          </p>
        </SheetHeader>


        <Tabs defaultValue="graphics" className="flex-1 flex flex-col min-h-0">
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/30 px-5 py-3 shrink-0">
            <TabsList className="grid w-full grid-cols-3 h-9">
              <TabsTrigger value="graphics" className="text-xs gap-1.5">
                <ImageIcon className="h-3 w-3" /> Graphics
              </TabsTrigger>
              <TabsTrigger value="campaigns" className="text-xs gap-1.5">
                <ListTree className="h-3 w-3" /> Campaigns
              </TabsTrigger>
              <TabsTrigger value="sent" className="text-xs gap-1.5">
                <Send className="h-3 w-3" /> Sent Log
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 pb-12">
            <TabsContent value="graphics" className="mt-0">
              <GraphicsLibraryTab projectId={projectId} onClose={() => setOpen(false)} />
            </TabsContent>
            <TabsContent value="campaigns" className="mt-0 -mx-2">
              <CampaignLibraryPanel projectId={projectId ?? null} />
            </TabsContent>
            <TabsContent value="sent" className="mt-0">
              <SentLogTab projectId={projectId} />
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

/* ----------------------------- Graphics Library ----------------------------- */

function GraphicsLibraryTab({ projectId, onClose }: { projectId?: string | null; onClose: () => void }) {
  const { assets, isLoading } = useMarketingAssets(projectId ?? null);
  const { sequence, addStep } = useCampaignSequence(projectId ?? null);
  const [pickedId, setPickedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }
  if (assets.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/40 p-8 text-center">
        <Sparkles className="h-5 w-5 text-gold mx-auto" />
        <p className="mt-2 text-sm font-medium">No graphics yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Anything you generate in the Studio shows up here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {assets.map((a) => (
        <div key={a.id} className="group relative rounded-xl overflow-hidden border border-border/40 bg-muted/10">
          <button
            type="button"
            onClick={() => setPickedId(pickedId === a.id ? null : a.id)}
            className="block w-full aspect-square"
            aria-label={a.title || 'Asset'}
          >
            {a.image_url ? (
              <img
                src={a.image_url}
                alt={a.title || ''}
                className="h-full w-full object-cover bg-gradient-to-br from-muted/40 to-muted/10"
                loading="lazy"
                onError={(e) => {
                  const el = e.currentTarget;
                  el.style.display = 'none';
                  el.parentElement?.querySelector('[data-fallback]')?.removeAttribute('hidden');
                }}
              />
            ) : null}
            <div
              data-fallback
              hidden={!!a.image_url}
              className="absolute inset-0 grid place-items-center bg-gradient-to-br from-gold/10 via-background to-muted/20 text-muted-foreground/50"
            >
              <ImageIcon className="h-6 w-6" />
            </div>

            <span className={cn(
              'absolute inset-0 bg-black/0 transition-colors',
              pickedId === a.id ? 'bg-black/60' : 'group-hover:bg-black/30',
            )} />
          </button>

          <div className="px-2 py-1.5">
            <p className="text-[11px] truncate text-foreground">{a.title || 'Untitled'}</p>
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{a.asset_type}</p>
          </div>

          {pickedId === a.id && (
            <div className="absolute inset-x-0 bottom-0 p-2 flex flex-col gap-1.5 bg-background/95 backdrop-blur-md border-t border-gold/30 animate-in slide-in-from-bottom-2 duration-150">
              <button
                type="button"
                disabled={!sequence || addStep.isPending}
                onClick={async () => {
                  if (!sequence) return;
                  await addStep.mutateAsync({
                    asset_id: a.id,
                    asset_url: a.image_url ?? null,
                    title: a.title || 'Untitled',
                    format: a.asset_type || 'flyer',
                  });
                  toast.success('Added to current sequence');
                  setPickedId(null);
                  onClose();
                }}
                className="flex items-center justify-center gap-1 rounded-md bg-gold/15 hover:bg-gold/25 border border-gold/40 text-gold text-[10px] py-1.5 transition-colors disabled:opacity-50"
              >
                <Plus className="h-3 w-3" /> Add to sequence
              </button>
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('intoiq:reuse-asset', {
                    detail: {
                      title: a.title,
                      format: a.asset_type,
                      config: a.config,
                      image_url: a.image_url,
                    },
                  }));
                  toast.success('Loaded as template — tweak it in the Studio');
                  setPickedId(null);
                  onClose();
                }}
                className="flex items-center justify-center gap-1 rounded-md border border-border/40 hover:bg-muted/30 text-foreground text-[10px] py-1.5 transition-colors"
              >
                <Sparkles className="h-3 w-3" /> Reuse as template
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* --------------------------------- Sent Log -------------------------------- */

interface FollowupRow {
  id: string;
  recipient_email: string;
  subject: string;
  source: string;
  created_at: string;
  engagement_status: string;
  opened_at: string | null;
  clicked_at: string | null;
  lead_notifications?: { project_id: string | null } | null;
}

function SentLogTab({ projectId }: { projectId?: string | null }) {
  const { user } = useCurrentUser();
  const orgId = user?.orgId;

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['vault-sent-log', orgId, projectId ?? 'all'],
    enabled: !!orgId,
    queryFn: async () => {
      let q = supabase
        .from('lead_followups')
        .select('id, recipient_email, subject, source, created_at, engagement_status, opened_at, clicked_at, lead_notifications(project_id)')
        .eq('org_id', orgId!)
        .order('created_at', { ascending: false })
        .limit(100);
      const { data, error } = await q;
      if (error) throw error;
      const list = (data ?? []) as unknown as FollowupRow[];
      if (!projectId) return list;
      return list.filter(r => r.lead_notifications?.project_id === projectId);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/40 p-8 text-center">
        <Mail className="h-5 w-5 text-muted-foreground mx-auto" />
        <p className="mt-2 text-sm font-medium">No sends yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Follow-ups and blasts from this project will appear as a timeline here.
        </p>
      </div>
    );
  }

  return (
    <ol className="relative space-y-2">
      <span aria-hidden className="absolute left-[7px] top-2 bottom-2 w-px bg-border/40" />
      {rows.map((r) => (
        <li key={r.id} className="relative pl-6">
          <span className="absolute left-[4px] top-3 h-2 w-2 rounded-full bg-gold/70 ring-2 ring-background" />
          <div className="rounded-xl border border-border/30 bg-muted/10 px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{r.subject}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  → {r.recipient_email}
                </p>
              </div>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground shrink-0">
                {r.source}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
              <span>{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
              {r.opened_at && <span className="inline-flex items-center gap-0.5 text-emerald-400/80"><Eye className="h-2.5 w-2.5" /> opened</span>}
              {r.clicked_at && <span className="inline-flex items-center gap-0.5 text-gold/90"><MousePointerClick className="h-2.5 w-2.5" /> clicked</span>}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
