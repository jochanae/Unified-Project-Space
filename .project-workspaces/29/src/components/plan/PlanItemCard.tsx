import { useState, useMemo } from 'react';
import { PlanItem } from '@/hooks/usePlan';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  MoreHorizontal,
  Sparkles,
  Calendar,
  Archive,
  Trash2,
  FileText,
  Youtube,
  ExternalLink,
  Circle,
  Clock,
  CheckCircle2,
  ArrowUpCircle,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import { extractYouTubeVideoId, getYouTubeThumbnail } from '@/lib/youtubeUtils';

interface PlanItemCardProps {
  item: PlanItem;
  onUpdate: (id: string, updates: Partial<PlanItem>) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onAskQuinn?: (item: PlanItem) => void;
}

const priorityConfig = {
  low: { icon: Circle, label: 'Low', className: 'text-muted-foreground' },
  medium: { icon: AlertCircle, label: 'Medium', className: 'text-blue-500' },
  high: { icon: ArrowUpCircle, label: 'High', className: 'text-destructive' },
};

const statusConfig = {
  not_started: {
    icon: Circle,
    label: 'Not Started',
    bgClass: 'bg-muted/50',
    textClass: 'text-muted-foreground',
    badgeClass: 'bg-muted text-muted-foreground',
    next: 'in_progress' as const,
    nextLabel: 'Start',
  },
  in_progress: {
    icon: Clock,
    label: 'In Progress',
    bgClass: 'bg-blue-500/5 border-blue-500/20',
    textClass: 'text-blue-500',
    badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    next: 'completed' as const,
    nextLabel: 'Complete',
  },
  completed: {
    icon: CheckCircle2,
    label: 'Done',
    bgClass: 'bg-gain/5 border-gain/20',
    textClass: 'text-gain',
    badgeClass: 'bg-gain/10 text-gain',
    next: 'not_started' as const,
    nextLabel: 'Reopen',
  },
};

function extractResourceUrl(notes?: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/📎 Resource: (.+)/);
  return match ? match[1].trim() : null;
}

function getDateStatus(targetDate?: string | null) {
  if (!targetDate) return null;
  const date = new Date(targetDate);
  const daysAway = differenceInDays(date, new Date());
  if (isToday(date)) return { label: 'Due today', className: 'text-amber-500 bg-amber-500/10' };
  if (isPast(date)) return { label: `${Math.abs(daysAway)}d overdue`, className: 'text-destructive bg-destructive/10' };
  if (daysAway <= 7) return { label: `${daysAway}d left`, className: 'text-amber-500 bg-amber-500/10' };
  return { label: format(date, 'MMM d, yyyy'), className: 'text-muted-foreground bg-muted' };
}

export function PlanItemCard({
  item,
  onUpdate,
  onDelete,
  onArchive,
  onAskQuinn,
}: PlanItemCardProps) {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(item.notes || '');

  const resourceUrl = useMemo(() => extractResourceUrl(item.notes), [item.notes]);
  const youtubeVideoId = useMemo(() =>
    resourceUrl ? extractYouTubeVideoId(resourceUrl) : null,
    [resourceUrl]
  );

  const status = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.not_started;
  const StatusIcon = status.icon;
  const priority = priorityConfig[item.priority as keyof typeof priorityConfig] || priorityConfig.medium;
  const PriorityIcon = priority.icon;
  const dateStatus = getDateStatus(item.target_date);
  const isCompleted = item.status === 'completed';

  const handleCycleStatus = () => {
    onUpdate(item.id, { status: status.next });
  };

  const handleSaveNotes = () => {
    onUpdate(item.id, { notes });
    setShowNotes(false);
  };

  const hasAdditionalNotes = useMemo(() => {
    if (!item.notes) return false;
    const withoutResource = item.notes.replace(/📎 Resource: .+/, '').trim();
    return withoutResource.length > 0;
  }, [item.notes]);

  return (
    <>
      <div
        className={cn(
          'group rounded-lg border p-3 sm:p-4 transition-all',
          status.bgClass,
          isCompleted && 'opacity-70'
        )}
      >
        {/* Top row: status button + title + menu */}
        <div className="flex items-start gap-3">
          {/* Status cycle button */}
          <button
            onClick={handleCycleStatus}
            className={cn(
              'mt-0.5 shrink-0 rounded-full p-0.5 transition-colors hover:bg-accent',
              status.textClass
            )}
            title={`Click to mark as "${status.nextLabel}"`}
          >
            <StatusIcon className="h-5 w-5" />
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'font-medium text-sm leading-snug',
                    isCompleted && 'line-through text-muted-foreground'
                  )}
                >
                  {item.title}
                </p>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onAskQuinn?.(item)}>
                    <Sparkles className="h-4 w-4 mr-2 text-chart-3" />
                    Ask Quinn about this
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowNotes(true)}>
                    <FileText className="h-4 w-4 mr-2" />
                    {item.notes ? 'Edit notes' : 'Add notes'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onArchive(item.id)}>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(item.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* YouTube Preview */}
            {youtubeVideoId && (
              <a
                href={resourceUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 mt-2 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors group/yt"
              >
                <img
                  src={getYouTubeThumbnail(youtubeVideoId, 'default')}
                  alt="Video thumbnail"
                  className="w-16 h-12 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs text-red-500">
                    <Youtube className="h-3 w-3" />
                    <span>YouTube</span>
                  </div>
                  <span className="text-xs text-muted-foreground group-hover/yt:text-foreground flex items-center gap-1">
                    Watch video <ExternalLink className="h-3 w-3" />
                  </span>
                </div>
              </a>
            )}

            {/* Meta badges row */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {/* Status label */}
              <Badge variant="secondary" className={cn('h-5 text-[10px] gap-1', status.badgeClass)}>
                <StatusIcon className="h-2.5 w-2.5" />
                {status.label}
              </Badge>

              {/* Priority */}
              <Badge variant="secondary" className={cn('h-5 text-[10px] gap-1', priority.className === 'text-muted-foreground' ? 'bg-muted text-muted-foreground' : priority.className === 'text-blue-500' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-destructive/10 text-destructive')}>
                <PriorityIcon className="h-2.5 w-2.5" />
                {priority.label}
              </Badge>

              {/* Target date with urgency */}
              {dateStatus && (
                <Badge variant="secondary" className={cn('h-5 text-[10px] gap-1', dateStatus.className)}>
                  <Calendar className="h-2.5 w-2.5" />
                  {dateStatus.label}
                </Badge>
              )}

              {item.source_type === 'quinn_suggestion' && (
                <Badge
                  variant="secondary"
                  className="h-5 text-[10px] bg-chart-3/10 text-chart-3 gap-1"
                >
                  <Sparkles className="h-2.5 w-2.5" />
                  Quinn
                </Badge>
              )}

              {hasAdditionalNotes && (
                <Badge
                  variant="outline"
                  className="h-5 text-[10px] gap-1 cursor-pointer hover:bg-accent"
                  onClick={() => setShowNotes(true)}
                >
                  <FileText className="h-2.5 w-2.5" />
                  Notes
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notes Dialog */}
      <Dialog open={showNotes} onOpenChange={setShowNotes}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Notes for "{item.title}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Your notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any thoughts, progress updates, or reminders..."
                rows={5}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNotes(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveNotes}>Save Notes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
