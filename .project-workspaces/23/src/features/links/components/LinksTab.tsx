import { useState } from 'react';
import { useFunnelHub } from '@/features/projects';
import { LinkCategory, LinkItem } from '@/types/funnelhub';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, ExternalLink, Pencil, Trash2 } from 'lucide-react';

const CATEGORIES: LinkCategory[] = ['Social', 'Email', 'Ads', 'Analytics', 'Other'];

export function LinksTab() {
  const { activeProject, addLink, updateLink, deleteLink } = useFunnelHub();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', url: '', category: 'Other' as LinkCategory });

  if (!activeProject) return null;

  const resetForm = () => setForm({ title: '', url: '', category: 'Other' });

  const handleSave = () => {
    if (!form.title.trim() || !form.url.trim()) return;
    if (editId) {
      updateLink(activeProject.id, editId, form);
      setEditId(null);
    } else {
      addLink(activeProject.id, form);
    }
    setShowAdd(false);
    resetForm();
  };

  const startEdit = (l: LinkItem) => {
    setForm({ title: l.title, url: l.url, category: l.category });
    setEditId(l.id);
    setShowAdd(true);
  };

  const grouped = CATEGORIES.map(cat => ({
    category: cat,
    items: activeProject.links.filter(l => l.category === cat),
  })).filter(g => g.items.length > 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl">Links</h2>
        <Button onClick={() => { resetForm(); setEditId(null); setShowAdd(true); }} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add Link
        </Button>
      </div>

      {activeProject.links.length === 0 && (
        <p className="text-muted-foreground text-center py-12">No links yet. Add your platform URLs and tools.</p>
      )}

      {grouped.map(g => (
        <div key={g.category} className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{g.category}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {g.items.map(link => (
              <Card key={link.id} className="group">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 min-w-0 flex-1 hover:text-primary transition-colors">
                    <ExternalLink className="h-4 w-4 shrink-0 text-primary" />
                    <span className="font-medium truncate">{link.title}</span>
                  </a>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(link)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteLink(activeProject.id, link.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      <Dialog open={showAdd} onOpenChange={v => { if (!v) { setShowAdd(false); setEditId(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? 'Edit Link' : 'New Link'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Title (e.g. Instagram)" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <Input placeholder="URL" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v as LinkCategory }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
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
