import { useState } from 'react';
import { useFunnelHub } from '@/features/projects';
import { FunnelStep } from '@/types/funnelhub';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, GripVertical, Pencil, Trash2, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';

export function FunnelStepsTab() {
  const { activeProject, addStep, updateStep, deleteStep, reorderSteps } = useFunnelHub();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', link: '' });

  if (!activeProject) return null;

  const steps = [...activeProject.funnelSteps].sort((a, b) => a.order - b.order);

  const resetForm = () => setForm({ title: '', description: '', link: '' });

  const handleSave = () => {
    if (!form.title.trim()) return;
    if (editId) {
      updateStep(activeProject.id, editId, form);
      setEditId(null);
    } else {
      addStep(activeProject.id, form);
    }
    setShowAdd(false);
    resetForm();
  };

  const startEdit = (s: FunnelStep) => {
    setForm({ title: s.title, description: s.description, link: s.link });
    setEditId(s.id);
    setShowAdd(true);
  };

  const move = (index: number, dir: -1 | 1) => {
    const ids = steps.map(s => s.id);
    const ni = index + dir;
    if (ni < 0 || ni >= ids.length) return;
    [ids[index], ids[ni]] = [ids[ni], ids[index]];
    reorderSteps(activeProject.id, ids);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl">Funnel Steps</h2>
        <Button onClick={() => { resetForm(); setEditId(null); setShowAdd(true); }} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add Step
        </Button>
      </div>

      {steps.length === 0 && (
        <p className="text-muted-foreground text-center py-12">No funnel steps yet. Map out your funnel journey.</p>
      )}

      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={step.id} className={`flex items-start gap-3 p-4 rounded-lg border bg-card transition-all ${step.completed ? 'opacity-60' : ''}`}>
            <div className="flex flex-col gap-1 pt-1">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => move(i, -1)} disabled={i === 0}>
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => move(i, 1)} disabled={i === steps.length - 1}>
                <ArrowDown className="h-3 w-3" />
              </Button>
            </div>

            <div className="flex items-center pt-1">
              <Checkbox
                checked={step.completed}
                onCheckedChange={v => updateStep(activeProject.id, step.id, { completed: !!v })}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{step.order}</span>
                <h3 className={`font-semibold ${step.completed ? 'line-through text-muted-foreground' : ''}`} style={{ fontFamily: 'var(--font-heading)' }}>
                  {step.title}
                </h3>
              </div>
              {step.description && <p className="text-sm text-muted-foreground mt-1">{step.description}</p>}
              {step.link && (
                <a href={step.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                  <ExternalLink className="h-3 w-3" /> {step.link}
                </a>
              )}
            </div>

            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(step)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteStep(activeProject.id, step.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {steps.length > 1 && (
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground px-4">
          {steps.map((s, i) => (
            <span key={s.id} className="flex items-center gap-2">
              <span className={`font-medium ${s.completed ? 'text-primary' : ''}`}>{s.title}</span>
              {i < steps.length - 1 && <span>→</span>}
            </span>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={v => { if (!v) { setShowAdd(false); setEditId(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? 'Edit Step' : 'New Step'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Step title (e.g. Landing Page)" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <Textarea placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
            <Input placeholder="Link (optional)" value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAdd(false); setEditId(null); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSave}>{editId ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
