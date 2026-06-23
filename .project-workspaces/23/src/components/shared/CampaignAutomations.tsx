import { useState } from 'react';
import {
  Plus, Clock, CalendarDays, ChevronDown, ChevronUp, ChevronDown as ChevDown,
  X, Image as ImageIcon, Sparkles, Loader2, Link2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { useCampaignSequence, type CampaignStepRow, type Weekday } from '@/features/campaigns/hooks/use-campaign-sequence';
import { useMarketingAssets } from '@/features/marketing-studio/hooks/use-marketing-assets';
import { ProjectVault } from '@/features/projects/components/ProjectVault';
import { useFunnelHub } from '@/features/projects';
import { toast } from 'sonner';

const WEEKDAYS: Weekday[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function describeSchedule(step: CampaignStepRow, index: number): string {
  if (step.schedule_kind === 'delay') {
    const d = step.delay_days ?? 0;
    if (index === 0 && d === 0) return 'Send immediately';
    return `Wait ${d} day${d === 1 ? '' : 's'} after previous`;
  }
  return `Every ${step.calendar_day ?? 'Mon'} at ${step.calendar_time ?? '09:00'}`;
}

function ScheduleEditor({
  step,
  index,
  onPatch,
}: {
  step: CampaignStepRow;
  index: number;
  onPatch: (patch: Partial<CampaignStepRow>) => void;
}) {
  const tab = step.schedule_kind;

  return (
    <div className="space-y-3 w-[260px]">
      <div className="flex gap-1 p-1 rounded-lg bg-muted/40">
        <button
          type="button"
          onClick={() =>
            onPatch({
              schedule_kind: 'delay',
              delay_days: step.delay_days ?? (index === 0 ? 0 : 3),
              calendar_day: null,
              calendar_time: null,
            })
          }
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] transition-colors',
            tab === 'delay' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Clock className="h-3 w-3" /> Delay
        </button>
        <button
          type="button"
          onClick={() =>
            onPatch({
              schedule_kind: 'calendar',
              calendar_day: step.calendar_day ?? 'Mon',
              calendar_time: step.calendar_time ?? '09:00',
              delay_days: null,
            })
          }
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] transition-colors',
            tab === 'calendar' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <CalendarDays className="h-3 w-3" /> Calendar
        </button>
      </div>

      {tab === 'delay' && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
            Wait after previous asset
          </p>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={365}
              inputMode="numeric"
              value={step.delay_days ?? 0}
              onChange={(e) => onPatch({ delay_days: Math.max(0, Math.min(365, Number(e.target.value) || 0)) })}
              className="h-9 w-20 text-sm"
            />
            <span className="text-xs text-muted-foreground">days</span>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground/70">
            {index === 0 ? '0 = send immediately when campaign starts.' : 'Counted from when the previous asset sends.'}
          </p>
        </div>
      )}

      {tab === 'calendar' && (
        <div className="space-y-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Repeat every</p>
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onPatch({ calendar_day: d })}
                  className={cn(
                    'h-8 rounded-md text-[10px] font-medium transition-colors',
                    step.calendar_day === d
                      ? 'bg-gold/20 text-gold border border-gold/50'
                      : 'bg-muted/40 text-muted-foreground hover:text-foreground',
                  )}
                >
                  {d[0]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">At</p>
            <Input
              type="time"
              value={step.calendar_time ?? '09:00'}
              onChange={(e) => onPatch({ calendar_time: e.target.value || '09:00' })}
              className="h-9 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function AssetPicker({
  projectId,
  onPick,
}: {
  projectId?: string | null;
  onPick: (assetId: string, assetUrl: string, title: string, format: string) => void;
}) {
  const { assets, isLoading } = useMarketingAssets(projectId ?? null);
  return (
    <div className="w-[280px]">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-1">
        Your Studio Assets
      </p>
      {isLoading ? (
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : assets.length === 0 ? (
        <p className="px-1 py-3 text-[11px] text-muted-foreground/80">
          No assets yet — generate one in Create above, then link it here.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2 max-h-[260px] overflow-y-auto">
          {assets.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onPick(a.id, a.image_url, a.title || 'Untitled', a.asset_type || 'flyer')}
              className="group relative aspect-square rounded-lg overflow-hidden border border-border/40 hover:border-gold/60 transition-colors"
              title={a.title || ''}
            >
              <img src={a.image_url} alt={a.title || ''} className="h-full w-full object-cover" loading="lazy" />
              <span className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CampaignAutomations({ projectId }: { projectId?: string | null }) {
  const { sequence, steps, isLoading, addStep, updateStep, removeStep, moveStep } =
    useCampaignSequence(projectId);
  const { activeProject } = useFunnelHub();

  const [busyId, setBusyId] = useState<string | null>(null);

  const patch = (id: string, p: Partial<CampaignStepRow>) => {
    updateStep.mutate({ id, patch: p });
  };

  return (
    <section aria-label="Campaign Automations" className="space-y-3">
      <div className="flex items-center justify-between px-1 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold/90 truncate">
            Campaign Automations
          </p>
        </div>
        <ProjectVault
          projectId={projectId ?? activeProject?.id ?? null}
          projectName={activeProject?.name ?? null}
        />
      </div>

      <div className="glass rounded-3xl border border-gold/20 bg-background/50 p-4 sm:p-5 shadow-[0_0_32px_-12px_hsl(var(--gold)/0.25)]">
        {isLoading || !sequence ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading sequence…
          </div>
        ) : (
          <ol className="relative space-y-3">
            <span
              aria-hidden
              className="absolute left-[18px] top-2 bottom-2 w-px bg-gradient-to-b from-gold/40 via-gold/20 to-transparent"
            />

            {steps.length === 0 && (
              <li className="pl-10 text-[11px] text-muted-foreground/80 py-2">
                Empty timeline. Add your first asset below.
              </li>
            )}

            {steps.map((step, i) => (
              <li key={step.id} className="relative pl-10">
                <span className="absolute left-[10px] top-4 flex h-4 w-4 items-center justify-center rounded-full bg-gold/20 border border-gold/60 text-[9px] font-semibold text-gold">
                  {i + 1}
                </span>

                <div className="rounded-2xl border border-border/40 bg-muted/10 p-3 sm:p-3.5 hover:border-gold/30 transition-colors">
                  <div className="flex items-start gap-2.5">
                    {/* Asset thumb / picker */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border/40 bg-background/60 hover:border-gold/60 transition-colors overflow-hidden"
                          title="Link a Studio asset"
                        >
                          {step.asset_url
                            ? <img src={step.asset_url} alt="" className="h-full w-full object-cover" />
                            : <ImageIcon className="h-4 w-4 text-muted-foreground/60" />}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        sideOffset={6}
                        className="z-[100] w-auto p-3 rounded-2xl border border-gold/20 bg-background/95 backdrop-blur-md shadow-xl"
                      >
                        <AssetPicker
                          projectId={projectId}
                          onPick={(asset_id, asset_url, title, format) => {
                            patch(step.id, {
                              asset_id,
                              asset_url,
                              title: step.title === `Step ${i + 1}` ? title : step.title,
                              format,
                            });
                            toast.success('Asset linked');
                          }}
                        />
                      </PopoverContent>
                    </Popover>

                    {/* Title + meta */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <input
                          value={step.title}
                          onChange={(e) => patch(step.id, { title: e.target.value })}
                          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground truncate outline-none focus:ring-1 focus:ring-gold/40 rounded px-1"
                        />
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground bg-muted/40 rounded px-1.5 py-0.5">
                          {step.format}
                        </span>
                      </div>

                      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="flex items-center gap-1.5 rounded-md border border-gold/30 bg-gold/5 px-2 py-1 text-[11px] text-gold/90 hover:bg-gold/15 transition-colors"
                            >
                              {step.schedule_kind === 'delay'
                                ? <Clock className="h-3 w-3" />
                                : <CalendarDays className="h-3 w-3" />}
                              <span className="truncate max-w-[180px]">{describeSchedule(step, i)}</span>
                              <ChevDown className="h-3 w-3 opacity-70" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="start"
                            sideOffset={6}
                            className="z-[100] w-auto p-3 rounded-2xl border border-gold/20 bg-background/95 backdrop-blur-md shadow-xl"
                          >
                            <ScheduleEditor
                              step={step}
                              index={i}
                              onPatch={(p) => patch(step.id, p)}
                            />
                          </PopoverContent>
                        </Popover>

                        {step.asset_id && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/80">
                            <Link2 className="h-2.5 w-2.5" /> linked
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Reorder + remove */}
                    <div className="flex flex-col items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        disabled={i === 0 || busyId === step.id}
                        onClick={async () => {
                          setBusyId(step.id);
                          await moveStep.mutateAsync({ id: step.id, direction: 'up' });
                          setBusyId(null);
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-muted/40 disabled:opacity-30 transition-colors"
                        aria-label="Move up"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={i === steps.length - 1 || busyId === step.id}
                        onClick={async () => {
                          setBusyId(step.id);
                          await moveStep.mutateAsync({ id: step.id, direction: 'down' });
                          setBusyId(null);
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-muted/40 disabled:opacity-30 transition-colors"
                        aria-label="Move down"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeStep.mutate(step.id)}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        aria-label="Remove step"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}

            <li className="relative pl-10">
              <span className="absolute left-[10px] top-3 h-4 w-4 rounded-full border border-dashed border-gold/40" />
              <button
                type="button"
                onClick={() => addStep.mutate(undefined)}
                disabled={addStep.isPending}
                className="w-full rounded-2xl border border-dashed border-gold/30 bg-transparent hover:bg-gold/5 px-3 py-3 text-xs text-gold/90 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {addStep.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Add asset to sequence
              </button>
            </li>
          </ol>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-gold/70" />
            MarQ queues these in order — calendar steps anchor to the weekday, delays count from the previous send.
          </p>
        </div>
      </div>
    </section>
  );
}
