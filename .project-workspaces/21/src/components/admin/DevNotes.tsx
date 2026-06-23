import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, StickyNote } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

interface DevNote {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
}

const CATEGORIES = ['general', 'feature-idea', 'essence-layer', 'bug', 'ux', 'ai-logic'] as const;

export default function DevNotes() {
  const [notes, setNotes] = useState<DevNote[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<string>('general');
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    const { data } = await supabase
      .from('admin_dev_notes' as any)
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setNotes(data as any);
    setLoading(false);
  }, []);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const addNote = async () => {
    if (!title.trim() && !content.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('admin_dev_notes' as any).insert({
      user_id: user.id,
      title: title.trim() || 'Untitled',
      content: content.trim(),
      category,
    } as any);
    if (error) { toast.error('Failed to save note'); return; }
    toast.success('Note saved');
    setTitle(''); setContent(''); setCategory('general');
    fetchNotes();
  };

  const deleteNote = async (id: string) => {
    await supabase.from('admin_dev_notes' as any).delete().eq('id', id);
    setNotes(prev => prev.filter(n => n.id !== id));
    toast.success('Note deleted');
  };

  return (
    <div className="space-y-6">
      {/* Add note form */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 space-y-3">
        <h3 className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/40 font-medium flex items-center gap-2">
          <StickyNote className="h-3.5 w-3.5" /> New Note
        </h3>
        <Input
          placeholder="Title…"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="bg-white/[0.03] border-white/[0.08] text-sm"
        />
        <Textarea
          placeholder="Notes, ideas, future features…"
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={4}
          className="bg-white/[0.03] border-white/[0.08] text-sm resize-none"
        />
        <div className="flex items-center gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider border transition-all ${
                category === cat
                  ? 'border-primary/40 text-primary bg-primary/10'
                  : 'border-white/[0.06] text-muted-foreground/50 hover:border-white/[0.12]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <button
          onClick={addNote}
          disabled={!title.trim() && !content.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-all disabled:opacity-30"
        >
          <Plus className="h-3.5 w-3.5" /> Save Note
        </button>
      </div>

      {/* Notes list */}
      {loading ? (
        <p className="text-sm text-muted-foreground/40 text-center py-8">Loading…</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-muted-foreground/40 italic text-center py-8">No notes yet — start capturing ideas</p>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {notes.map(note => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="group rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 hover:border-white/[0.1] transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-foreground/80 truncate">{note.title}</span>
                      <span className="text-[9px] uppercase tracking-wider text-primary/50 px-1.5 py-0.5 rounded bg-primary/5 shrink-0">
                        {note.category}
                      </span>
                    </div>
                    {note.content && (
                      <p className="text-xs text-muted-foreground/60 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                    )}
                    <span className="text-[9px] text-muted-foreground/30 mt-2 block">
                      {new Date(note.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-white/[0.05] transition-all shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive/60" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
