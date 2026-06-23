import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Bell, Check, Clock, Pencil, Trash2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Reminder {
  id: string;
  reminder_text: string;
  companion_name: string;
  member_id: string;
  remind_at: string;
  days_of_week: string[];
  active: boolean;
  snooze_until: string | null;
  completed_at: string | null;
  last_fired_at: string | null;
  created_at: string;
}

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function RemindersPage() {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Reminder | null>(null);

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['reminders-page', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Reminder[];
    },
    enabled: !!user?.id,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['reminders-page', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['reminders', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['reminders'] });
  };

  const markDone = async (id: string) => {
    const { error } = await supabase
      .from('reminders')
      .update({ active: false, completed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) toast.error('Could not mark done');
    else {
      toast.success('Marked done');
      refresh();
    }
  };

  const snooze24h = async (id: string) => {
    const { error } = await supabase
      .from('reminders')
      .update({ snooze_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() })
      .eq('id', id);
    if (error) toast.error('Could not snooze');
    else {
      toast.success('Snoozed 24 hours');
      refresh();
    }
  };

  const deleteReminder = async (id: string) => {
    const { error } = await supabase.from('reminders').delete().eq('id', id);
    if (error) toast.error('Could not delete');
    else {
      toast.success('Deleted');
      refresh();
    }
  };

  const reactivate = async (id: string) => {
    const { error } = await supabase
      .from('reminders')
      .update({ active: true, completed_at: null, snooze_until: null })
      .eq('id', id);
    if (error) toast.error('Could not reactivate');
    else { toast.success('Reactivated'); refresh(); }
  };

  const active = reminders.filter((r) => r.active);
  const inactive = reminders.filter((r) => !r.active);

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-border/30 bg-background/80 px-3 py-3 backdrop-blur">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <Bell className="h-5 w-5" /> Reminders
        </h1>
      </header>

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Active ({active.length})
          </h2>
          {active.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active reminders.</p>
          ) : (
            <ul className="space-y-3">
              {active.map((r) => (
                <li
                  key={r.id}
                  className="rounded-2xl border border-border/40 bg-card p-4"
                >
                  <p className="text-sm font-medium text-foreground">{r.reminder_text}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.companion_name} • {r.remind_at} • {(r.days_of_week || []).join(', ')}
                  </p>
                  {r.snooze_until && new Date(r.snooze_until).getTime() > Date.now() && (
                    <p className="mt-1 text-xs text-primary">
                      Snoozed until {formatDistanceToNow(new Date(r.snooze_until), { addSuffix: true })}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="default" onClick={() => markDone(r.id)}>
                      <Check className="h-4 w-4" /> Done
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => snooze24h(r.id)}>
                      <Clock className="h-4 w-4" /> Snooze 24h
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(r)}>
                      <Pencil className="h-4 w-4" /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteReminder(r.id)}>
                      <Trash2 className="h-4 w-4" /> Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {inactive.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Done / Inactive ({inactive.length})
            </h2>
            <ul className="space-y-2">
              {inactive.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-xl border border-border/30 bg-muted/40 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-muted-foreground line-through">
                      {r.reminder_text}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => reactivate(r.id)}>
                      Reactivate
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteReminder(r.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {editing && (
        <EditReminderDialog
          reminder={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function EditReminderDialog({
  reminder,
  onClose,
  onSaved,
}: {
  reminder: Reminder;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [text, setText] = useState(reminder.reminder_text);
  const [time, setTime] = useState(reminder.remind_at?.slice(0, 5) || '09:00');
  const [days, setDays] = useState<string[]>(reminder.days_of_week || ALL_DAYS);
  const [saving, setSaving] = useState(false);

  const toggleDay = (d: string) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('reminders')
      .update({
        reminder_text: text.trim(),
        remind_at: time,
        days_of_week: days,
      })
      .eq('id', reminder.id);
    setSaving(false);
    if (error) toast.error('Could not save');
    else {
      toast.success('Saved');
      onSaved();
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit reminder</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Reminder</Label>
            <Input value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Time</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Days</Label>
            <div className="flex flex-wrap gap-2">
              {ALL_DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    days.includes(d)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground'
                  }`}
                >
                  {d.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || !text.trim() || days.length === 0}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
