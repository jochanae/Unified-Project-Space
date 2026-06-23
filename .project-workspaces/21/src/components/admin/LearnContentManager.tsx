import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Save, Trash2, FileText, GripVertical, Bell } from 'lucide-react';
import { toast } from 'sonner';

interface LearnContent {
  id: string;
  title: string;
  description: string;
  category: string;
  video_url: string | null;
  thumbnail_url: string | null;
  emoji: string;
  age_tag: string;
  sort_order: number;
  published: boolean;
  created_at: string;
  author_id: string;
}

const CATEGORIES = ['connection', 'studio', 'safety', 'updates', 'mentor', 'creative', 'general'];
const AGE_TAGS = [
  { value: 'all', label: 'All Ages' },
  { value: 'adult', label: 'Adults Only (18+)' },
  { value: 'youth', label: 'Youth (Under 18)' },
];

interface LearnContentManagerProps {
  userId: string;
}

export default function LearnContentManager({ userId }: LearnContentManagerProps) {
  const [items, setItems] = useState<LearnContent[]>([]);
  const [editing, setEditing] = useState<Partial<LearnContent> | null>(null);
  const [saving, setSaving] = useState(false);
  const [notifying, setNotifying] = useState(false);

  useEffect(() => {
    supabase
      .from('learn_content')
      .select('*')
      .order('sort_order', { ascending: true })
      .then(({ data }) => setItems((data as LearnContent[]) || []));
  }, []);

  const saveItem = async () => {
    if (!editing?.title?.trim()) return;
    setSaving(true);

    const payload = {
      title: editing.title.trim(),
      description: editing.description || '',
      category: editing.category || 'general',
      video_url: editing.video_url || null,
      thumbnail_url: editing.thumbnail_url || null,
      emoji: editing.emoji || '📚',
      age_tag: editing.age_tag || 'all',
      sort_order: editing.sort_order ?? items.length,
      published: editing.published || false,
      author_id: userId,
    };

    let result;
    if (editing.id) {
      result = await supabase.from('learn_content').update(payload).eq('id', editing.id).select().single();
    } else {
      result = await supabase.from('learn_content').insert(payload).select().single();
    }

    if (result.error) {
      toast.error('Failed to save');
    } else {
      toast.success(editing.id ? 'Updated' : 'Created');
      const item = result.data as LearnContent;
      setItems(prev => {
        const filtered = prev.filter(p => p.id !== item.id);
        return [...filtered, item].sort((a, b) => a.sort_order - b.sort_order);
      });
      setEditing(null);
    }
    setSaving(false);
  };

  const deleteItem = async (id: string) => {
    await supabase.from('learn_content').delete().eq('id', id);
    setItems(prev => prev.filter(p => p.id !== id));
    toast.success('Deleted');
  };

  if (editing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{editing.id ? 'Edit Content' : 'New Content'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Title"
            value={editing.title || ''}
            onChange={e => setEditing(prev => ({ ...prev, title: e.target.value }))}
          />
          <Textarea
            placeholder="Description"
            value={editing.description || ''}
            onChange={e => setEditing(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Category</label>
              <select
                value={editing.category || 'general'}
                onChange={e => setEditing(prev => ({ ...prev, category: e.target.value }))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Age Tag</label>
              <select
                value={editing.age_tag || 'all'}
                onChange={e => setEditing(prev => ({ ...prev, age_tag: e.target.value }))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {AGE_TAGS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <Input
            placeholder="Emoji (e.g. 📚)"
            value={editing.emoji || ''}
            onChange={e => setEditing(prev => ({ ...prev, emoji: e.target.value }))}
          />
          <Input
            placeholder="Video URL (optional)"
            value={editing.video_url || ''}
            onChange={e => setEditing(prev => ({ ...prev, video_url: e.target.value }))}
          />
          <Input
            placeholder="Thumbnail URL (optional)"
            value={editing.thumbnail_url || ''}
            onChange={e => setEditing(prev => ({ ...prev, thumbnail_url: e.target.value }))}
          />
          {editing.thumbnail_url && (
            <div className="rounded-lg overflow-hidden border border-border aspect-video max-w-xs">
              <img
                src={editing.thumbnail_url}
                alt="Thumbnail preview"
                className="h-full w-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}
          <Input
            type="number"
            placeholder="Sort order"
            value={editing.sort_order ?? 0}
            onChange={e => setEditing(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
          />
          <div className="flex items-center gap-2">
            <Switch
              checked={editing.published || false}
              onCheckedChange={v => setEditing(prev => ({ ...prev, published: v }))}
            />
            <span className="text-sm text-muted-foreground">Published</span>
          </div>
          <div className="flex gap-2">
            <Button onClick={saveItem} disabled={saving} className="gap-1.5">
              <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const notifyUsers = async (item: LearnContent) => {
    setNotifying(true);
    try {
      // Get all user_ids from profiles
      const { data: profiles } = await supabase.from('profiles').select('user_id');
      if (!profiles || profiles.length === 0) {
        toast.error('No users found');
        setNotifying(false);
        return;
      }

      const notifications = profiles.map(p => ({
        user_id: p.user_id,
        type: 'new_content',
        message: `🎬 New in Learn & Create: "${item.title}"`,
        metadata: { content_id: item.id, emoji: item.emoji },
      }));

      // Insert in batches of 100
      for (let i = 0; i < notifications.length; i += 100) {
        await supabase.from('notifications').insert(notifications.slice(i, i + 100));
      }

      toast.success(`Notified ${profiles.length} user${profiles.length !== 1 ? 's' : ''}!`);
    } catch (e) {
      console.error('Notify failed:', e);
      toast.error('Failed to send notifications');
    }
    setNotifying(false);
  };

  return (
    <div className="space-y-4">
      <Button onClick={() => setEditing({ title: '', category: 'general', age_tag: 'all', published: false })} className="gap-1.5">
        <Plus className="h-4 w-4" /> New Content
      </Button>

      <div className="space-y-2">
        {items.map(item => (
          <Card key={item.id} className="border-border/50">
            <CardContent className="flex items-center justify-between py-3 px-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-lg">{item.emoji}</span>
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{item.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-[10px]">{item.category}</Badge>
                    <Badge variant={item.age_tag === 'youth' ? 'default' : 'outline'} className="text-[10px]">
                      {item.age_tag === 'youth' ? '🌟 Youth' : item.age_tag === 'adult' ? '🔒 Adult' : '🌐 All'}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {item.published ? '🟢 Live' : '⚪ Draft'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => setEditing(item)}>
                  <FileText className="h-4 w-4" />
                </Button>
                {item.published && (
                  <Button size="icon" variant="ghost" onClick={() => notifyUsers(item)} disabled={notifying} title="Notify all users">
                    <Bell className="h-4 w-4" />
                  </Button>
                )}
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteItem(item.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No content yet. Create your first lesson!</p>
        )}
      </div>
    </div>
  );
}
