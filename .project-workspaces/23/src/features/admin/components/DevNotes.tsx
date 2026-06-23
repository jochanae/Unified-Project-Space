import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';
import { useAuth } from '@/features/auth';

const CATEGORIES = ['general', 'feature-idea', 'bug', 'ux', 'architecture'] as const;

const categoryColors: Record<string, string> = {
  general: 'bg-muted text-muted-foreground',
  'feature-idea': 'bg-primary/10 text-primary',
  bug: 'bg-destructive/10 text-destructive',
  ux: 'bg-accent text-accent-foreground',
  architecture: 'border-amber-500/30 text-amber-500',
};

export default function DevNotes() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<string>('general');
  const [filter, setFilter] = useState<string | null>(null);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['admin-dev-notes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_dev_notes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addNote = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('admin_dev_notes').insert({
        title,
        content,
        category,
        created_by: session?.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-dev-notes'] });
      setTitle('');
      setContent('');
      setCategory('general');
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('admin_dev_notes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-dev-notes'] }),
  });

  const filtered = filter ? notes.filter((n: any) => n.category === filter) : notes;

  return (
    <>
      {/* Add note form */}
      <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Add Note</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="h-8 text-sm" />
          <Textarea placeholder="Content…" value={content} onChange={e => setContent(e.target.value)} className="min-h-[60px] text-sm" />
          <div className="flex items-center gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-8 gap-1" disabled={!title.trim() || addNote.isPending} onClick={() => addNote.mutate()}>
              <Plus className="h-3.5 w-3.5" /> Save
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setFilter(null)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${!filter ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
        >
          All
        </button>
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setFilter(filter === c ? null : c)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${filter === c ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Notes list */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notes yet.</p>
      ) : (
        filtered.map((note: any) => (
          <Card key={note.id} className="border-border/30 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <p className="font-medium text-sm text-foreground">{note.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{note.content}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => deleteNote.mutate(note.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Badge variant="outline" className={`text-[10px] ${categoryColors[note.category] || ''}`}>{note.category}</Badge>
                <span className="text-[10px] text-muted-foreground">{new Date(note.created_at).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </>
  );
}
