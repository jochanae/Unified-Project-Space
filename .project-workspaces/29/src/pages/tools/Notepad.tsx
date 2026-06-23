import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { StickyNote, Plus, Trash2, Save, Clock, ArrowLeft, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useIsMobile } from '@/hooks/use-mobile';

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export default function Notepad() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'editor'>('list');
  const editorRef = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  // Auto-save with debounce
  useEffect(() => {
    if (!selectedNoteId || !user) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveCurrentNoteQuiet();
    }, 1500);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [title, content]);

  const fetchNotes = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      toast.error('Failed to load notes');
      setLoading(false);
      return;
    }

    const fetched = (data || []) as Note[];
    setNotes(fetched);
    if (fetched.length > 0 && !selectedNoteId) {
      setSelectedNoteId(fetched[0].id);
      setTitle(fetched[0].title);
      setContent(fetched[0].content || '');
    }
    setLoading(false);
  }, [user, selectedNoteId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const createNote = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('notes')
      .insert({ user_id: user.id, title: 'Untitled Note', content: '' })
      .select()
      .single();

    if (error || !data) {
      toast.error('Failed to create note');
      return;
    }
    const newNote = data as Note;
    setNotes((prev) => [newNote, ...prev]);
    setSelectedNoteId(newNote.id);
    setTitle(newNote.title);
    setContent(newNote.content || '');
    if (isMobile) setMobileView('editor');
  };

  const selectNote = (note: Note) => {
    if (selectedNoteId && selectedNoteId !== note.id) {
      saveCurrentNote();
    }
    setSelectedNoteId(note.id);
    setTitle(note.title);
    setContent(note.content || '');
    if (isMobile) setMobileView('editor');
  };

  const saveCurrentNoteQuiet = async () => {
    if (!selectedNoteId || !user) return;
    setSaving(true);
    const { error } = await supabase
      .from('notes')
      .update({ title, content, updated_at: new Date().toISOString() })
      .eq('id', selectedNoteId)
      .eq('user_id', user.id);
    setSaving(false);
    if (error) return;
    setNotes((prev) =>
      prev.map((n) =>
        n.id === selectedNoteId
          ? { ...n, title, content, updated_at: new Date().toISOString() }
          : n
      )
    );
  };

  const saveCurrentNote = async () => {
    if (!selectedNoteId || !user) return;
    setSaving(true);
    const { error } = await supabase
      .from('notes')
      .update({ title, content, updated_at: new Date().toISOString() })
      .eq('id', selectedNoteId)
      .eq('user_id', user.id);
    setSaving(false);
    if (error) {
      toast.error('Failed to save note');
      return;
    }
    setNotes((prev) =>
      prev.map((n) =>
        n.id === selectedNoteId
          ? { ...n, title, content, updated_at: new Date().toISOString() }
          : n
      )
    );
    toast.success('Note saved');
  };

  const deleteNote = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('notes').delete().eq('id', id).eq('user_id', user.id);
    if (error) {
      toast.error('Failed to delete note');
      return;
    }

    const updated = notes.filter((n) => n.id !== id);
    setNotes(updated);

    if (selectedNoteId === id) {
      if (updated.length > 0) {
        setSelectedNoteId(updated[0].id);
        setTitle(updated[0].title);
        setContent(updated[0].content || '');
      } else {
        setSelectedNoteId(null);
        setTitle('');
        setContent('');
        if (isMobile) setMobileView('list');
      }
    }
    toast.success('Note deleted');
  };

  const handleBackToList = () => {
    saveCurrentNote();
    setMobileView('list');
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const selectedNote = notes.find((n) => n.id === selectedNoteId);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  // Mobile: show either list or editor
  if (isMobile) {
    return (
      <DashboardLayout>
        <div className="p-4 pb-20 h-[calc(100vh-8rem)] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            {mobileView === 'editor' ? (
              <Button variant="ghost" size="sm" onClick={handleBackToList} className="gap-1">
                <ArrowLeft className="h-4 w-4" />
                Notes
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-gold to-chart-4">
                  <StickyNote className="h-4 w-4 text-primary-foreground" />
                </div>
                <h1 className="text-lg font-bold">Notepad</h1>
              </div>
            )}
            {mobileView === 'list' ? (
              <div className="flex items-center gap-2">
                <Button onClick={createNote} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  New
                </Button>
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">{saving ? 'Saving...' : 'Auto-saved'}</span>
              </div>
            )}
          </div>

          {mobileView === 'list' ? (
            /* Notes List */
            <div className="flex-1 overflow-y-auto space-y-2">
              {notes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <StickyNote className="h-12 w-12 mb-3 opacity-50" />
                  <p>No notes yet. Create one!</p>
                </div>
              ) : (
                notes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => selectNote(note)}
                    className={cn(
                      'p-3 rounded-lg cursor-pointer transition-colors border',
                      selectedNoteId === note.id
                        ? 'bg-primary/10 border-primary/20'
                        : 'border-border/50 hover:bg-muted/50'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate text-sm">{note.title || 'Untitled'}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {note.content?.substring(0, 60) || 'Empty note...'}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(note.updated_at)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNote(note.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Editor */
            <div ref={editorRef} className="flex-1 flex flex-col gap-3 min-h-0">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Note title..."
                className="text-lg font-semibold"
              />
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Start typing your notes..."
                className="flex-1 min-h-[200px] resize-none"
              />
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  // Desktop layout (original)
  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 pb-20 h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-chart-4 shadow-lg">
              <StickyNote className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Notepad</h1>
              <p className="text-sm text-muted-foreground">
                {saving ? 'Saving...' : 'Auto-saves as you type'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={createNote} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              New Note
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} title="Close Notepad">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6 h-[calc(100%-5rem)]">
          {/* Notes List */}
          <Card className="lg:col-span-1 overflow-hidden">
            <CardHeader className="py-3">
              <CardTitle className="text-sm text-muted-foreground">
                {notes.length} Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto max-h-[calc(100vh-16rem)]">
              {notes.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No notes yet. Create one!
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      onClick={() => selectNote(note)}
                      className={cn(
                        'p-3 rounded-lg cursor-pointer transition-colors group',
                        selectedNoteId === note.id
                          ? 'bg-primary/10 border border-primary/20'
                          : 'hover:bg-muted/50'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate text-sm">
                            {note.title || 'Untitled'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {note.content?.substring(0, 50) || 'Empty note...'}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(note.updated_at)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNote(note.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Editor */}
          <Card className="lg:col-span-3 flex flex-col">
            {selectedNote ? (
              <>
                <CardHeader className="py-3 border-b shrink-0">
                  <div className="flex items-center justify-between">
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Note title..."
                      className="text-lg font-semibold border-0 p-0 h-auto focus-visible:ring-0 bg-transparent"
                    />
                    <Button onClick={saveCurrentNote} size="sm" variant="outline" disabled={saving}>
                      <Save className="h-4 w-4 mr-1" />
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-0">
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Start typing your notes...

Ideas:
• Trade setups or market observations
• Personal goals and reminders
• Meeting notes or to-dos
• Anything on your mind"
                    className="h-full min-h-[400px] resize-none border-0 rounded-none focus-visible:ring-0 p-4"
                  />
                </CardContent>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <StickyNote className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Select a note or create a new one</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}