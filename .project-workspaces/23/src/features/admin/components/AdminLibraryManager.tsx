import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pencil, Plus, Star, Trash2, Eye, EyeOff, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { useKnowledgeItems } from '@/features/knowledge/hooks/use-knowledge-items';
import { KnowledgeItem, KnowledgeCategory, KnowledgeSkillLevel } from '@/features/knowledge/types';
import { ArticleDrawer } from '@/features/knowledge/components/ArticleDrawer';

type FormState = Omit<KnowledgeItem, 'id' | 'created_at' | 'updated_at'>;

const EMPTY: FormState = {
  title: '',
  subtitle: '',
  body: '',
  category: 'topic',
  topic: 'General',
  skill_level: 'beginner',
  tags: [],
  search_keywords: '',
  feature_link: null,
  feature_link_label: null,
  read_minutes: 3,
  is_featured: false,
  is_published: true,
  order_index: 0,
};

export default function AdminLibraryManager() {
  const { items, loading, reload } = useKnowledgeItems({ publishedOnly: false });
  const [editing, setEditing] = useState<KnowledgeItem | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState<KnowledgeItem | null>(null);

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY, order_index: items.length });
    setOpen(true);
  }

  function openEdit(item: KnowledgeItem) {
    setEditing(item);
    const { id, created_at, updated_at, ...rest } = item;
    setForm(rest);
    setOpen(true);
  }

  async function save() {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      tags: form.tags.filter(Boolean),
      feature_link: form.feature_link || null,
      feature_link_label: form.feature_link_label || null,
    };
    const { error } = editing
      ? await supabase.from('knowledge_items').update(payload).eq('id', editing.id)
      : await supabase.from('knowledge_items').insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editing ? 'Updated' : 'Created');
    setOpen(false);
    reload();
  }

  async function remove(item: KnowledgeItem) {
    if (!confirm(`Delete "${item.title}"?`)) return;
    const { error } = await supabase.from('knowledge_items').delete().eq('id', item.id);
    if (error) return toast.error(error.message);
    toast.success('Deleted');
    reload();
  }

  async function toggleFeatured(item: KnowledgeItem) {
    const { error } = await supabase
      .from('knowledge_items')
      .update({ is_featured: !item.is_featured })
      .eq('id', item.id);
    if (error) return toast.error(error.message);
    reload();
  }

  async function togglePublished(item: KnowledgeItem) {
    const { error } = await supabase
      .from('knowledge_items')
      .update({ is_published: !item.is_published })
      .eq('id', item.id);
    if (error) return toast.error(error.message);
    reload();
  }

  // Note: items come sorted by is_featured DESC, then order_index ASC.
  // Reorder works on adjacent items in the current visual order by swapping order_index.
  async function moveItem(index: number, direction: -1 | 1) {
    const target = items[index];
    const swap = items[index + direction];
    if (!target || !swap) return;
    // Swap order_index values
    const a = target.order_index;
    const b = swap.order_index;
    // If equal, give them distinct values
    const newA = a === b ? (direction === -1 ? a - 1 : a + 1) : b;
    const newB = a === b ? a : a;
    const [r1, r2] = await Promise.all([
      supabase.from('knowledge_items').update({ order_index: newA }).eq('id', target.id),
      supabase.from('knowledge_items').update({ order_index: newB }).eq('id', swap.id),
    ]);
    if (r1.error || r2.error) {
      toast.error(r1.error?.message || r2.error?.message || 'Reorder failed');
      return;
    }
    reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Knowledge Vault</h2>
          <p className="text-xs text-muted-foreground">
            {items.length} item{items.length === 1 ? '' : 's'} · Featured items appear in global search
          </p>
        </div>
        <Button size="sm" onClick={openNew} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Item
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/40 p-8 text-center">
          <p className="text-sm text-muted-foreground">No knowledge items yet.</p>
          <Button size="sm" variant="outline" onClick={openNew} className="mt-3 gap-1.5">
            <Plus className="h-4 w-4" /> Create your first
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-xl border border-border/30 bg-card/40 p-3 transition-colors hover:border-gold/30 hover:bg-gold/5 active:bg-gold/10"
            >
              <div className="flex flex-col gap-0.5 shrink-0 pt-0.5">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5"
                  onClick={(e) => { e.stopPropagation(); moveItem(idx, -1); }}
                  disabled={idx === 0}
                  title="Move up"
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5"
                  onClick={(e) => { e.stopPropagation(); moveItem(idx, 1); }}
                  disabled={idx === items.length - 1}
                  title="Move down"
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
              </div>
              <button
                type="button"
                onClick={() => setPreviewing(item)}
                className="flex-1 min-w-0 text-left cursor-pointer"
                title="Tap to preview"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                  {item.is_featured && (
                    <Badge variant="outline" className="border-gold/40 text-gold text-[10px] gap-1">
                      <Star className="h-2.5 w-2.5 fill-current" /> Featured
                    </Badge>
                  )}
                  {!item.is_published && (
                    <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground text-[10px]">
                      Draft
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-[10px]">
                    {item.topic}
                  </Badge>
                </div>
                {item.subtitle && (
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{item.subtitle}</p>
                )}
              </button>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); toggleFeatured(item); }} title="Toggle featured">
                  <Star className={`h-3.5 w-3.5 ${item.is_featured ? 'fill-gold text-gold' : ''}`} />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); togglePublished(item); }} title="Toggle published">
                  {item.is_published ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(item); }} title="Edit">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); remove(item); }} title="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ArticleDrawer article={previewing} onClose={() => setPreviewing(null)} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit' : 'New'} Knowledge Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Subtitle (one-line hook)</Label>
              <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v as KnowledgeCategory })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="topic">Topic</SelectItem>
                    <SelectItem value="goal">Goal</SelectItem>
                    <SelectItem value="feature">Feature</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Topic</Label>
                <Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Skill Level</Label>
                <Select
                  value={form.skill_level}
                  onValueChange={(v) => setForm({ ...form, skill_level: v as KnowledgeSkillLevel })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Body editor with live Markdown preview */}
            <div>
              <Label className="text-xs">Body (Markdown)</Label>
              <Tabs defaultValue="write" className="mt-1">
                <TabsList className="h-8">
                  <TabsTrigger value="write" className="text-xs h-7">Write</TabsTrigger>
                  <TabsTrigger value="preview" className="text-xs h-7">Preview</TabsTrigger>
                  <TabsTrigger value="split" className="text-xs h-7 hidden sm:inline-flex">Split</TabsTrigger>
                </TabsList>
                <TabsContent value="write" className="mt-2">
                  <Textarea
                    rows={14}
                    value={form.body}
                    onChange={(e) => setForm({ ...form, body: e.target.value })}
                    className="font-mono text-xs"
                  />
                </TabsContent>
                <TabsContent value="preview" className="mt-2">
                  <div className="rounded-md border border-border/30 bg-card/40 p-4 min-h-[280px] prose prose-sm dark:prose-invert max-w-none">
                    {form.body ? <ReactMarkdown>{form.body}</ReactMarkdown> : (
                      <p className="text-xs text-muted-foreground">Nothing to preview yet.</p>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="split" className="mt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Textarea
                      rows={14}
                      value={form.body}
                      onChange={(e) => setForm({ ...form, body: e.target.value })}
                      className="font-mono text-xs"
                    />
                    <div className="rounded-md border border-border/30 bg-card/40 p-3 overflow-y-auto max-h-[360px] prose prose-sm dark:prose-invert max-w-none">
                      {form.body ? <ReactMarkdown>{form.body}</ReactMarkdown> : (
                        <p className="text-xs text-muted-foreground">Nothing to preview yet.</p>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div>
              <Label className="text-xs">Search Keywords (comma-separated)</Label>
              <Input
                placeholder="google, ranking, why am i not showing up"
                value={form.search_keywords}
                onChange={(e) => setForm({ ...form, search_keywords: e.target.value })}
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                Think like a frustrated user. These power live search in the Command Bar.
              </p>
            </div>
            <div>
              <Label className="text-xs">Tags (comma-separated)</Label>
              <Input
                value={form.tags.join(', ')}
                onChange={(e) =>
                  setForm({
                    ...form,
                    tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                  })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Feature Link (optional)</Label>
                <Input
                  placeholder="/workspace"
                  value={form.feature_link || ''}
                  onChange={(e) => setForm({ ...form, feature_link: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Link Label</Label>
                <Input
                  placeholder="Open feature"
                  value={form.feature_link_label || ''}
                  onChange={(e) => setForm({ ...form, feature_link_label: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Read Minutes</Label>
                <Input
                  type="number"
                  value={form.read_minutes}
                  onChange={(e) => setForm({ ...form, read_minutes: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label className="text-xs">Order Index</Label>
                <Input
                  type="number"
                  value={form.order_index}
                  onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/30 bg-card/40 p-3">
              <div>
                <p className="text-sm font-medium">Featured</p>
                <p className="text-xs text-muted-foreground">Pin to global search shortcuts + larger bento card</p>
              </div>
              <Switch
                checked={form.is_featured}
                onCheckedChange={(v) => setForm({ ...form, is_featured: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/30 bg-card/40 p-3">
              <div>
                <p className="text-sm font-medium">Published</p>
                <p className="text-xs text-muted-foreground">Visible in contextual hints and global search</p>
              </div>
              <Switch
                checked={form.is_published}
                onCheckedChange={(v) => setForm({ ...form, is_published: v })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
              <Button onClick={save} disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create item'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
