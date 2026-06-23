import { useMemo, useState } from 'react';
import { Map, ChevronRight, Sparkles, GripVertical } from 'lucide-react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
  useSortable,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { NARRATIVE_ROLE_META, PLATFORM_META, type SocialCampaign, type NarrativeRole } from '../types';

interface StrategyMapProps {
  campaigns: SocialCampaign[];
  /** Persist new day order. dayMap is postId → newDay. */
  onReorder?: (dayMap: Record<string, number>) => void;
  isReordering?: boolean;
}

interface DayCell {
  day: number;
  role: NarrativeRole | null;
  hook: string;
  platforms: SocialCampaign['platform'][];
  campaignTheme: string | null;
  postIds: string[];
}

/**
 * Horizontal storyboard of the 7-day Deep Dive arc.
 * Layer 2 — Structural Strategy. Drag to reorder; persists narrative_day optimistically.
 */
export function StrategyMap({ campaigns, onReorder, isReordering }: StrategyMapProps) {
  const { theme, days: initialDays } = useMemo(() => groupByDay(campaigns), [campaigns]);
  const [localDays, setLocalDays] = useState<DayCell[] | null>(null);

  // Reset local order whenever upstream data changes
  const days = localDays ?? initialDays;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!initialDays.length) return null;

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const oldIndex = days.findIndex((d) => keyForCell(d) === active.id);
    const newIndex = days.findIndex((d) => keyForCell(d) === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(days, oldIndex, newIndex);
    // Reassign day numbers 1..N based on new position
    const renumbered = reordered.map((cell, i) => ({ ...cell, day: i + 1 }));
    setLocalDays(renumbered);

    // Build dayMap: every post in a cell gets its cell's new day
    const dayMap: Record<string, number> = {};
    renumbered.forEach((cell) => {
      cell.postIds.forEach((pid) => {
        dayMap[pid] = cell.day;
      });
    });
    onReorder?.(dayMap);
  };

  return (
    <section className="glass rounded-2xl border border-border/40 p-5 md:p-6 mb-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-primary mb-1.5">
              <Map className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase tracking-[0.22em] font-medium">
                Strategy Map · Layer 2
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-serif leading-tight mb-1">
              {theme ? (
                <>
                  Your 7-day arc:{' '}
                  <span className="gradient-text italic">{theme}</span>
                </>
              ) : (
                <>The 7-day narrative arc</>
              )}
            </h2>
            <p className="text-xs text-muted-foreground">
              Hook → Depth → Proof → Friction → Bridge. Drag any day to recalibrate the arc.
            </p>
          </div>

          <span
            className={cn(
              'inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] rounded-full px-2.5 py-1 shrink-0 border transition-colors',
              isReordering
                ? 'text-primary border-primary/40 bg-primary/5'
                : 'text-muted-foreground/70 border-border/40',
            )}
          >
            <GripVertical className="h-2.5 w-2.5" />
            {isReordering ? 'Saving arc…' : 'Drag to reorder'}
          </span>
        </div>

        {/* Storyboard rail */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={days.map(keyForCell)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="relative -mx-2 px-2 pb-1">
              <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-thin pb-3">
                {days.map((cell, i) => (
                  <SortableDayCard
                    key={keyForCell(cell)}
                    id={keyForCell(cell)}
                    cell={cell}
                    isLast={i === days.length - 1}
                  />
                ))}
              </div>
            </div>
          </SortableContext>
        </DndContext>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-muted-foreground/80">
          <span className="uppercase tracking-[0.18em] text-muted-foreground/60">Roles</span>
          {(Object.keys(NARRATIVE_ROLE_META) as NarrativeRole[]).map((role) => {
            const meta = NARRATIVE_ROLE_META[role];
            return (
              <span key={role} className="inline-flex items-center gap-1.5">
                <span className={cn('h-1.5 w-1.5 rounded-full', dotForRole(role))} />
                <span className={cn('font-medium', meta.tone)}>{meta.label}</span>
                <span className="text-muted-foreground/50 hidden sm:inline">— {meta.description}</span>
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function keyForCell(cell: DayCell): string {
  // Use first post id when available so identity follows the content, not the day number
  return cell.postIds[0] ?? `empty-${cell.day}`;
}

function SortableDayCard({ id, cell, isLast }: { id: string; cell: DayCell; isLast: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : 'auto' as const,
  };

  const roleMeta = cell.role ? NARRATIVE_ROLE_META[cell.role] : null;

  return (
    <div ref={setNodeRef} style={style} className="relative flex items-stretch shrink-0 snap-start">
      <div
        className={cn(
          'w-[220px] sm:w-[240px] glass rounded-xl border p-3.5 flex flex-col gap-2.5 transition-colors',
          isDragging
            ? 'border-primary/60 shadow-lg shadow-primary/10'
            : 'border-border/40 hover:border-primary/40',
        )}
      >
        {/* Day pill + grip */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              className="text-muted-foreground/40 hover:text-primary cursor-grab active:cursor-grabbing touch-none p-0.5 -ml-0.5 rounded transition-colors"
              aria-label={`Reorder day ${cell.day}`}
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
            <span className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground/60 font-mono">
              Day {String(cell.day).padStart(2, '0')}
            </span>
          </div>
          {cell.role ? (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] border rounded-full px-2 py-0.5 font-medium',
                roleClasses(cell.role),
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', dotForRole(cell.role))} />
              {roleMeta?.label}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50 border border-border/40 rounded-full px-2 py-0.5">
              <Sparkles className="h-2.5 w-2.5" />
              Free
            </span>
          )}
        </div>

        {/* Hook */}
        <p className="text-sm leading-snug text-foreground/95 line-clamp-3 min-h-[3rem] [text-wrap:balance]">
          {cell.hook || <span className="text-muted-foreground italic">No hook yet</span>}
        </p>

        {/* Platforms */}
        <div className="flex items-center gap-1 mt-auto pt-1.5 border-t border-border/30">
          {cell.platforms.length > 0 ? (
            cell.platforms.slice(0, 4).map((p) => (
              <span
                key={p}
                title={PLATFORM_META[p].label}
                className="text-[11px] leading-none"
              >
                {PLATFORM_META[p].icon}
              </span>
            ))
          ) : (
            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-widest">
              No posts
            </span>
          )}
          {cell.platforms.length > 4 && (
            <span className="text-[9px] text-muted-foreground/60 ml-0.5">
              +{cell.platforms.length - 4}
            </span>
          )}
        </div>
      </div>

      {!isLast && (
        <div className="flex items-center justify-center w-3 sm:w-4 shrink-0">
          <ChevronRight className="h-3 w-3 text-primary/40" />
        </div>
      )}
    </div>
  );
}

function groupByDay(campaigns: SocialCampaign[]): { theme: string | null; days: DayCell[] } {
  const deepDive = campaigns.filter(
    (c) => c.generation_mode === 'deep_dive' && c.narrative_day != null,
  );
  if (!deepDive.length) return { theme: null, days: [] };

  const latestByCampaign: Record<string, SocialCampaign> = {};
  for (const c of deepDive) {
    const key = c.campaign_id ?? 'orphan';
    const existing = latestByCampaign[key];
    if (!existing || c.created_at > existing.created_at) latestByCampaign[key] = c;
  }
  const latest = Object.values(latestByCampaign).sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  )[0];
  const targetCampaignId = latest?.campaign_id ?? null;

  const arc = deepDive.filter((c) =>
    targetCampaignId ? c.campaign_id === targetCampaignId : c.campaign_id == null,
  );

  const byDay: Record<number, SocialCampaign[]> = {};
  for (const c of arc) {
    const day = c.narrative_day as number;
    (byDay[day] = byDay[day] ?? []).push(c);
  }

  const sortedDays = Object.keys(byDay).map(Number).sort((a, b) => a - b);
  const lastDay = sortedDays[sortedDays.length - 1] ?? 7;
  const maxDay = Math.max(7, lastDay);

  const days: DayCell[] = [];
  for (let d = 1; d <= maxDay; d++) {
    const posts = byDay[d] ?? [];
    const primary = posts[0] ?? null;
    days.push({
      day: d,
      role: primary?.narrative_role ?? null,
      hook: primary?.hook ?? '',
      platforms: Array.from(new Set(posts.map((p) => p.platform))),
      campaignTheme: primary?.campaign_theme ?? null,
      postIds: posts.map((p) => p.id),
    });
  }

  return { theme: latest?.campaign_theme ?? null, days };
}

function dotForRole(role: NarrativeRole): string {
  switch (role) {
    case 'Hook': return 'bg-primary';
    case 'Depth': return 'bg-cyan-400';
    case 'Proof': return 'bg-emerald-400';
    case 'Friction': return 'bg-amber-400';
    case 'Bridge': return 'bg-rose-400';
  }
}

function roleClasses(role: NarrativeRole): string {
  switch (role) {
    case 'Hook': return 'text-primary border-primary/30 bg-primary/5';
    case 'Depth': return 'text-cyan-400 border-cyan-400/30 bg-cyan-400/5';
    case 'Proof': return 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5';
    case 'Friction': return 'text-amber-400 border-amber-400/30 bg-amber-400/5';
    case 'Bridge': return 'text-rose-400 border-rose-400/30 bg-rose-400/5';
  }
}
