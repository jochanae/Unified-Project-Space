import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { StickyNote, Plus, ChevronDown, ChevronUp, Trash2, X, Search, ArrowUpDown, Pin, PinOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

interface Note {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  pinned: boolean;
}

type SortMode = 'newest' | 'oldest' | 'edited';

interface QuickNoteWidgetProps {
  userId: string;
}

export default function QuickNoteWidget({ userId }: QuickNoteWidgetProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [showSearch, setShowSearch] = useState(false);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('quick_notes')
      .select('id, content, created_at, updated_at, pinned')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setNotes((data as Note[]) || []);
        setLoaded(true);
      });
  }, [userId]);

  const persist = useCallback(
    (noteId: string, text: string) => {
      setSavingIds((s) => new Set(s).add(noteId));
      const nowIso = new Date().toISOString();
      supabase
        .from('quick_notes')
        .update({ content: text })
        .eq('id', noteId)
        .then(() => {
          setNotes((prev) =>
            prev.map((n) => (n.id === noteId ? { ...n, updated_at: nowIso } : n)),
          );
          setSavingIds((s) => {
            const next = new Set(s);
            next.delete(noteId);
            return next;
          });
        });
    },
    [],
  );

  const handleChange = (noteId: string, text: string) => {
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, content: text } : n)));
    if (saveTimers.current[noteId]) clearTimeout(saveTimers.current[noteId]);
    saveTimers.current[noteId] = setTimeout(() => persist(noteId, text), 800);
  };

  const handleAdd = async () => {
    const { data } = await supabase
      .from('quick_notes')
      .insert({ user_id: userId, content: '' })
      .select('id, content, created_at, updated_at, pinned')
      .single();
    if (data) {
      setNotes((prev) => [data as Note, ...prev]);
      setExpanded(true);
    }
  };

  const handleDelete = async (noteId: string) => {
    setDeletingId(noteId);
    await supabase.from('quick_notes').delete().eq('id', noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    setDeletingId(null);
  };

  const togglePin = async (noteId: string, currentPinned: boolean) => {
    const next = !currentPinned;
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, pinned: next } : n)));
    await supabase.from('quick_notes').update({ pinned: next }).eq('id', noteId);
  };

  // Sort + filter pipeline (pinned always float to top)
  const visibleNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? notes.filter((n) => n.content.toLowerCase().includes(q))
      : notes;
    const sorted = [...filtered].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (sortMode === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortMode === 'edited') {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return sorted;
  }, [notes, query, sortMode]);

  if (!loaded) return null;

  const previewNote = visibleNotes[0];
  const restNotes = visibleNotes.slice(1);
  const hasMultiple = visibleNotes.length > 1;
  const showControls = true;

  const cycleSortMode = () => {
    setSortMode((m) => (m === 'newest' ? 'edited' : m === 'edited' ? 'oldest' : 'newest'));
  };

  const sortLabel =
    sortMode === 'newest' ? 'Newest' : sortMode === 'edited' ? 'Recently edited' : 'Oldest';

  return (
    <div
      className="w-full rounded-3xl px-4 py-3 mb-2 bg-white/5 backdrop-blur-sm border-[0.5px] border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_0_1px_rgba(212,175,80,0.25),0_0_12px_rgba(212,175,80,0.08)] animate-fade-in"
      style={{ animationDelay: '0.09s', animationFillMode: 'both' }}
    >
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-1">
        <StickyNote className="w-3.5 h-3.5 text-amber-400/70" />
        <span
          className="text-[11px] font-medium tracking-wide uppercase text-white/60"
          style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6)' }}
        >
          Quick Notes
        </span>

        {notes.length > 0 && (
          <span className="text-[10px] text-white/30 tabular-nums">
            {query ? `${visibleNotes.length}/${notes.length}` : notes.length}
          </span>
        )}

        <div className="ml-auto flex items-center gap-1">
          {savingIds.size > 0 && (
            <span className="text-[9px] tracking-wider uppercase text-amber-400/50 animate-pulse">
              saving…
            </span>
          )}

          {showControls && (
            <>
              <button
                onClick={cycleSortMode}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-full hover:bg-white/10 transition-colors"
                aria-label={`Sort: ${sortLabel}`}
                title={`Sort: ${sortLabel}`}
              >
                <ArrowUpDown className="w-3 h-3 text-white/40" />
                <span className="text-[9px] tracking-wide uppercase text-white/40">
                  {sortMode === 'edited' ? 'Edited' : sortMode === 'oldest' ? 'Old' : 'New'}
                </span>
              </button>

              <button
                onClick={() => {
                  setShowSearch((s) => !s);
                  if (showSearch) setQuery('');
                }}
                className="p-1 rounded-full hover:bg-white/10 transition-colors"
                aria-label={showSearch ? 'Close search' : 'Search notes'}
              >
                <Search className="w-3.5 h-3.5 text-white/50" />
              </button>
            </>
          )}

          <button
            onClick={handleAdd}
            className="p-1 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Add note"
          >
            <Plus className="w-3.5 h-3.5 text-white/50" />
          </button>

          {hasMultiple && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="p-1 rounded-full hover:bg-white/10 transition-colors"
              aria-label={expanded ? 'Collapse notes' : 'Expand notes'}
            >
              {expanded ? (
                <ChevronUp className="w-3.5 h-3.5 text-white/50" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-white/50" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Search input */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="mb-1.5 flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/[0.04] border border-white/10">
              <Search className="w-3 h-3 text-white/30 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (e.target.value) setExpanded(true);
                }}
                placeholder="Search notes…"
                className="w-full bg-transparent text-xs text-white/80 placeholder:text-white/25 outline-none"
                autoFocus
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="p-0.5 rounded-full hover:bg-white/10 transition-colors shrink-0"
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3 text-white/40" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state — no notes at all */}
      {notes.length === 0 && (
        <button
          onClick={handleAdd}
          className="w-full py-4 text-sm text-white/30 hover:text-white/50 transition-colors text-center"
        >
          Tap + to jot something down…
        </button>
      )}

      {/* No-match state — search filtered everything out */}
      {notes.length > 0 && visibleNotes.length === 0 && (
        <div className="w-full py-3 text-xs text-white/30 text-center italic">
          No notes match "{query}"
        </div>
      )}

      {/* Preview note (always visible) */}
      {previewNote && (
        <NoteRow
          note={previewNote}
          onChange={handleChange}
          onDelete={handleDelete}
          onTogglePin={togglePin}
          deleting={deletingId === previewNote.id}
          showDelete={notes.length > 0}
        />
      )}

      {/* Collapsed count hint */}
      {hasMultiple && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full text-center text-[10px] text-white/30 hover:text-white/50 transition-colors pt-1"
        >
          +{restNotes.length} more note{restNotes.length > 1 ? 's' : ''}
        </button>
      )}

      {/* Expanded notes */}
      <AnimatePresence>
        {expanded &&
          restNotes.map((note) => (
            <motion.div
              key={note.id}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-1.5 pt-1.5 border-t border-white/[0.06]">
                <NoteRow
                  note={note}
                  onChange={handleChange}
                  onDelete={handleDelete}
                  onTogglePin={togglePin}
                  deleting={deletingId === note.id}
                  showDelete
                />
              </div>
            </motion.div>
          ))}
      </AnimatePresence>
    </div>
  );
}

function NoteRow({
  note,
  onChange,
  onDelete,
  onTogglePin,
  deleting,
  showDelete,
}: {
  note: Note;
  onChange: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string, currentPinned: boolean) => void;
  deleting: boolean;
  showDelete: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="group relative">
      {/* Gold pin dot — signature of a held thought (hidden when pinned, since pin icon takes its place) */}
      {!note.pinned && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-300/90 group-focus-within:opacity-0 group-hover:opacity-0 transition-opacity duration-200"
          style={{
            boxShadow:
              '0 0 4px rgba(251,191,36,0.7), 0 0 10px rgba(212,175,80,0.45), 0 0 18px rgba(212,175,80,0.2)',
          }}
        />
      )}

      <textarea
        value={note.content}
        onChange={(e) => onChange(note.id, e.target.value)}
        placeholder="Jot something down…"
        rows={2}
        className={`w-full bg-transparent text-sm text-white/90 placeholder:text-white/25 resize-none outline-none leading-relaxed pr-14 ${
          note.pinned ? 'border-l-2 border-amber-300/40 pl-2' : ''
        }`}
        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
      />

      <div className="absolute top-0.5 right-0 flex items-center gap-0.5">
        {/* Pin toggle — always visible if pinned, on hover otherwise */}
        <button
          onClick={() => onTogglePin(note.id, note.pinned)}
          className={`p-1 rounded-full hover:bg-white/10 transition-all ${
            note.pinned
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
          }`}
          aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
          title={note.pinned ? 'Unpin' : 'Pin to top'}
        >
          {note.pinned ? (
            <Pin
              className="w-3 h-3 text-amber-300 fill-amber-300/40"
              style={{ filter: 'drop-shadow(0 0 4px rgba(251,191,36,0.5))' }}
            />
          ) : (
            <PinOff className="w-3 h-3 text-white/30" />
          )}
        </button>

        {showDelete && (
          confirmDelete ? (
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => onDelete(note.id)}
                disabled={deleting}
                className="p-1 rounded-full bg-red-500/20 hover:bg-red-500/30 transition-colors"
                aria-label="Confirm delete"
              >
                <Trash2 className="w-3 h-3 text-red-400" />
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="p-1 rounded-full hover:bg-white/10 transition-colors"
                aria-label="Cancel"
              >
                <X className="w-3 h-3 text-white/40" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1 rounded-full opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-white/10 transition-all"
              aria-label="Delete note"
            >
              <Trash2 className="w-3 h-3 text-white/30" />
            </button>
          )
        )}
      </div>
    </div>
  );
}
