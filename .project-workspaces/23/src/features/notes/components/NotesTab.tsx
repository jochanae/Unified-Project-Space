import { useState } from 'react';
import { useFunnelHub } from '@/features/projects';
import { NoteCard, NoteType } from '@/types/funnelhub';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Check, Pencil, Trash2, X } from 'lucide-react';

const NOTE_TYPES: NoteType[] = ['Note', 'Plan', 'Idea', 'Hypothesis', 'Result', 'Backlog'];
const typeColors: Record<NoteType, string> = {
  Note: 'bg-secondary text-secondary-foreground',
  Plan: 'bg-primary/15 text-primary',
  Idea: 'bg-amber-500/15 text-amber-400',
  Hypothesis: 'bg-cyan-500/15 text-cyan-300',
  Result: 'bg-emerald-500/15 text-emerald-300',
  Backlog: 'bg-violet-500/15 text-violet-300',
};

export function NotesTab() {
  const { activeProject, addNote, updateNote, deleteNote } = useFunnelHub();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ type: 'Note' as NoteType, title: '', body: '', links: '' });

  if (!activeProject) return null;

  const resetForm = () => setForm({ type: 'Note', title: '', body: '', links: '' });

  const handleSave = () => {
    if (!form.title.trim()) return;
    const links = form.links.split('\n').map(l => l.trim()).filter(Boolean);
    if (editId) {
      updateNote(activeProject.id, editId, { type: form.type, title: form.title, body: form.body, links });
      setEditId(null);
    } else {
      addNote(activeProject.id, { type: form.type, title: form.title, body: form.body, links });
    }
    setShowAdd(false);
    resetForm();
  };

  const startEdit = (note: NoteCard) => {
    setForm({ type: note.type, title: note.title, body: note.body, links: note.links.join('\n') });
    setEditId(note.id);
    setShowAdd(true);
  };

  const notes = activeProject.notes;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl">Notes</h2>
        <Button onClick={() => { resetForm(); setEditId(null); setShowAdd(true); }} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add Note
        </Button>
      </div>

      {notes.length === 0 && (
        <p className="text-muted-foreground text-center py-12">No notes yet. Add one to get started.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {notes.map(note => (
          <Card key={note.id} className={`transition-all ${note.done ? 'opacity-60' : ''}`}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className={typeColors[note.type]}>{note.type}</Badge>
                  <CardTitle className="text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
                    {note.done && <span className="line-through">{note.title}</span>}
                    {!note.done && note.title}
                  </CardTitle>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateNote(activeProject.id, note.id, { done: !note.done })}>
                    <Check className={`h-3.5 w-3.5 ${note.done ? 'text-primary' : 'text-muted-foreground'}`} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(note)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteNote(activeProject.id, note.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{note.body}</p>
              {note.links.length > 0 && (
                <div className="mt-3 space-y-1">
                  {note.links.map((l, i) => (
                    <a key={i} href={l} target="_blank" rel="noopener noreferrer" className="block text-xs text-primary hover:underline truncate">{l}</a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showAdd} onOpenChange={v => { if (!v) { setShowAdd(false); setEditId(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? 'Edit Note' : 'New Note'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as NoteType }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {NOTE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <Textarea placeholder="Content" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={5} />
            <Textarea placeholder="Links (one per line)" value={form.links} onChange={e => setForm(f => ({ ...f, links: e.target.value }))} rows={2} />
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
