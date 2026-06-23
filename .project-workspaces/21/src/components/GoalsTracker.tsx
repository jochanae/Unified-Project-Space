import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Plus, Check, Pause, Play, Trash2, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useGoals, WellnessGoal } from '@/hooks/useGoals';
import { format } from 'date-fns';

interface GoalsTrackerProps {
  userId: string;
  onBack: () => void;
}

export default function GoalsTracker({ userId, onBack, onGoalCompleted }: GoalsTrackerProps & { onGoalCompleted?: () => void }) {
  const { goals, activeGoals, canAddGoal, addGoal, addProgressNote, updateGoalStatus, deleteGoal, MAX_ACTIVE_GOALS } = useGoals(userId);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const completedGoals = goals.filter(g => g.status === 'completed');
  const pausedGoals = goals.filter(g => g.status === 'paused');

  const handleAdd = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await addGoal(title.trim(), description.trim() || undefined);
    setTitle('');
    setDescription('');
    setShowForm(false);
    setSaving(false);
  };

  return (
    <>
      <button onClick={onBack} className="mb-3 flex items-center gap-1 text-sm text-white/70 hover:text-foreground transition-colors">
        ← Your Space
      </button>
      <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
        <Target className="h-5 w-5 text-primary" /> My Goals
      </h2>
      <p className="text-sm text-muted-foreground mt-1">
        Track up to {MAX_ACTIVE_GOALS} personal goals. Your companions will cheer you on.
      </p>

      {/* Active Goals */}
      <div className="mt-4 flex flex-col gap-3">
        {activeGoals.length === 0 && !showForm && (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 backdrop-blur-md p-6 text-center">
            <Target className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No active goals yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Set a goal to start tracking your progress</p>
          </div>
        )}

        <AnimatePresence>
          {activeGoals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onAddNote={addProgressNote}
              onComplete={() => { updateGoalStatus(goal.id, 'completed'); onGoalCompleted?.(); }}
              onPause={() => updateGoalStatus(goal.id, 'paused')}
              onDelete={() => deleteGoal(goal.id)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Add Goal */}
      {canAddGoal && (
        <div className="mt-3">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/30 bg-primary/5 py-3 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <Plus className="h-4 w-4" /> Add Goal ({activeGoals.length}/{MAX_ACTIVE_GOALS})
            </button>
          ) : (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border-[0.5px] border-white/10 bg-white/5 backdrop-blur-md p-4">
              <input
                type="text"
                placeholder="What's your goal? (e.g., Walk 30 min daily)"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                autoFocus
              />
              <Textarea
                placeholder="Why does this matter to you? (optional)"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="mt-2 min-h-[60px] resize-none rounded-xl"
              />
              <div className="mt-2 flex gap-2">
                <Button onClick={handleAdd} disabled={!title.trim() || saving} className="flex-1 gap-1">
                  <Target className="h-4 w-4" /> {saving ? 'Saving…' : 'Set Goal'}
                </Button>
                <Button variant="ghost" onClick={() => { setShowForm(false); setTitle(''); setDescription(''); }}>Cancel</Button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Paused */}
      {pausedGoals.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <Pause className="h-3.5 w-3.5" /> Paused
          </h3>
          <div className="flex flex-col gap-2">
            {pausedGoals.map(g => (
              <div key={g.id} className="flex items-center gap-3 rounded-xl border-[0.5px] border-white/10 bg-white/5 backdrop-blur-md p-3">
                <span className="text-sm text-foreground/70 flex-1 truncate">{g.title}</span>
                <button onClick={() => updateGoalStatus(g.id, 'active')} className="text-xs text-primary hover:underline flex items-center gap-1">
                  <Play className="h-3 w-3" /> Resume
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {completedGoals.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5" /> Completed
          </h3>
          <div className="flex flex-col gap-2">
            {completedGoals.map(g => (
              <div key={g.id} className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
                <Check className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm text-foreground/80 flex-1 truncate line-through">{g.title}</span>
                <span className="text-[10px] text-muted-foreground">{format(new Date(g.updatedAt), 'MMM d')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Single Goal Card ─── */
function GoalCard({ goal, onAddNote, onComplete, onPause, onDelete }: {
  goal: WellnessGoal;
  onAddNote: (goalId: string, text: string) => Promise<void>;
  onComplete: () => void;
  onPause: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setSaving(true);
    await onAddNote(goal.id, noteText.trim());
    setNoteText('');
    setSaving(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="rounded-2xl border-[0.5px] border-white/10 bg-white/5 backdrop-blur-md p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Target className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground">{goal.title}</h4>
          {goal.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{goal.description}</p>
          )}
          <p className="text-[10px] text-muted-foreground mt-1">
            Started {format(new Date(goal.createdAt), 'MMM d')} · {goal.progressNotes.length} update{goal.progressNotes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            {/* Progress notes */}
            {goal.progressNotes.length > 0 && (
              <div className="mt-3 border-t border-border/40 pt-3 flex flex-col gap-2 max-h-40 overflow-y-auto">
                {goal.progressNotes.map((note, i) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className="text-muted-foreground shrink-0">{format(new Date(note.date), 'M/d')}</span>
                    <span className="text-foreground/80">{note.text}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Add note */}
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                placeholder="Add a progress update…"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                className="flex-1 rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <button
                onClick={handleAddNote}
                disabled={!noteText.trim() || saving}
                className="rounded-lg bg-primary/10 px-2 text-primary hover:bg-primary/20 disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Actions */}
            <div className="mt-3 flex gap-2 border-t border-border/40 pt-3">
              <button onClick={onComplete} className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20">
                <Check className="h-3 w-3" /> Complete
              </button>
              <button onClick={onPause} className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary/80">
                <Pause className="h-3 w-3" /> Pause
              </button>
              <button onClick={onDelete} className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
