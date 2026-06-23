import { useState } from 'react';
import { Clock, Check, X, Calendar, BookOpen, TrendingUp, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useReminders, Reminder } from '@/hooks/useReminders';
import { cn } from '@/lib/utils';
import { format, isToday, isTomorrow, formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const typeConfig: Record<Reminder['type'], { icon: typeof Clock; color: string; label: string }> = {
  trade: { icon: TrendingUp, color: 'text-chart-4 bg-chart-4/10', label: 'Trade' },
  learning: { icon: BookOpen, color: 'text-chart-3 bg-chart-3/10', label: 'Learning' },
  journal: { icon: Calendar, color: 'text-primary bg-primary/10', label: 'Journal' },
};

function formatTriggerTime(dateStr: string) {
  const date = new Date(dateStr);
  if (isToday(date)) {
    return `Today at ${format(date, 'h:mm a')}`;
  }
  if (isTomorrow(date)) {
    return `Tomorrow at ${format(date, 'h:mm a')}`;
  }
  return format(date, 'MMM d, h:mm a');
}

interface ReminderItemProps {
  reminder: Reminder;
  onComplete: (id: string) => void;
  onDismiss: (id: string) => void;
}

function ReminderItem({ reminder, onComplete, onDismiss }: ReminderItemProps) {
  const config = typeConfig[reminder.type];
  const Icon = config.icon;
  const isPast = new Date(reminder.trigger_at) < new Date();

  return (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card/50',
      isPast && 'border-warning/30 bg-warning/5',
      reminder.is_completed && 'opacity-60'
    )}>
      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', config.color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {config.label}
          </Badge>
          {reminder.repeat_interval !== 'none' && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {reminder.repeat_interval}
            </Badge>
          )}
        </div>
        <p className={cn(
          'text-sm font-medium',
          reminder.is_completed && 'line-through'
        )}>
          {reminder.title}
        </p>
        {reminder.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {reminder.description}
          </p>
        )}
        <p className={cn(
          'text-xs mt-1',
          isPast ? 'text-warning' : 'text-muted-foreground'
        )}>
          {isPast ? `${formatDistanceToNow(new Date(reminder.trigger_at))} ago` : formatTriggerTime(reminder.trigger_at)}
        </p>
      </div>
      {!reminder.is_completed && (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gain hover:text-gain hover:bg-gain/10"
            onClick={() => onComplete(reminder.id)}
            title="Complete"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDismiss(reminder.id)}
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

interface ReminderWidgetProps {
  compact?: boolean;
  maxItems?: number;
}

export function ReminderWidget({ compact = false, maxItems = 5 }: ReminderWidgetProps) {
  const navigate = useNavigate();
  const { activeReminders, isLoading, completeReminder, dismissReminder } = useReminders();

  const displayReminders = activeReminders.slice(0, maxItems);

  if (isLoading) {
    return (
      <CollapsibleCard
        title="Reminders"
        description="Tasks and alerts you've set"
        icon={<Clock className="h-5 w-5 text-muted-foreground" />}
        defaultOpen={true}
        storageKey="reminder-widget"
      >
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
        </div>
      </CollapsibleCard>
    );
  }

  if (displayReminders.length === 0) {
    return (
      <CollapsibleCard
        title="Reminders"
        description="Tasks and alerts you've set"
        icon={<Clock className="h-5 w-5 text-muted-foreground" />}
        defaultOpen={true}
        storageKey="reminder-widget"
      >
        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
          <Clock className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">No active reminders</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => navigate('/copilot')}
          >
            <Plus className="h-4 w-4 mr-1" />
            Ask Quinn to set one
          </Button>
        </div>
      </CollapsibleCard>
    );
  }

  if (compact) {
    return (
      <Card className="border-0 shadow-none bg-transparent">
        <CardContent className="p-0 space-y-2">
          {displayReminders.map((reminder) => (
            <ReminderItem
              key={reminder.id}
              reminder={reminder}
              onComplete={completeReminder}
              onDismiss={dismissReminder}
            />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <CollapsibleCard
      title={
        <div className="flex items-center justify-between w-full">
          <span>Reminders</span>
          {activeReminders.length > maxItems && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                navigate('/reminders');
              }}
              className="text-xs"
            >
              View all ({activeReminders.length})
            </Button>
          )}
        </div>
      }
      description="Tasks and alerts you've set"
      icon={<Clock className="h-5 w-5 text-muted-foreground" />}
      defaultOpen={true}
      storageKey="reminder-widget"
    >
      <div className="space-y-2">
        {displayReminders.map((reminder) => (
          <ReminderItem
            key={reminder.id}
            reminder={reminder}
            onComplete={completeReminder}
            onDismiss={dismissReminder}
          />
        ))}
      </div>
    </CollapsibleCard>
  );
}
