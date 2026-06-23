import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { FileText, Plus, Trash2, Save, X, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface QuickNotesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STORAGE_KEY = "coinsbloom_quick_notes";

export function QuickNotesModal({ open, onOpenChange }: QuickNotesModalProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Load notes from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setNotes(JSON.parse(saved));
      } catch {
        setNotes([]);
      }
    }
  }, []);

  // Save notes to localStorage
  const saveNotes = (updatedNotes: Note[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNotes));
    setNotes(updatedNotes);
  };

  const createNewNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: "Untitled Note",
      content: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newNote, ...notes];
    saveNotes(updated);
    setSelectedNote(newNote);
    setEditTitle(newNote.title);
    setEditContent(newNote.content);
    setIsEditing(true);
  };

  const selectNote = (note: Note) => {
    if (isEditing && selectedNote) {
      // Auto-save current note before switching
      handleSave();
    }
    setSelectedNote(note);
    setEditTitle(note.title);
    setEditContent(note.content);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!selectedNote) return;

    const updated = notes.map(n => 
      n.id === selectedNote.id 
        ? { ...n, title: editTitle || "Untitled Note", content: editContent, updatedAt: new Date().toISOString() }
        : n
    );
    saveNotes(updated);
    toast.success("Note saved");
  };

  const handleDelete = (noteId: string) => {
    const updated = notes.filter(n => n.id !== noteId);
    saveNotes(updated);
    if (selectedNote?.id === noteId) {
      setSelectedNote(null);
      setIsEditing(false);
    }
    toast.success("Note deleted");
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const handleClose = () => {
    if (isEditing && selectedNote) {
      handleSave();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0 gap-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Quick Notes
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-[60vh]">
          {/* Notes List Sidebar */}
          <div className="w-48 border-r bg-muted/30 flex flex-col">
            <div className="p-2">
              <Button 
                onClick={createNewNote} 
                size="sm" 
                className="w-full gap-1.5 bg-gradient-to-r from-primary to-purple-600"
              >
                <Plus className="h-4 w-4" />
                New Note
              </Button>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {notes.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No notes yet
                  </p>
                ) : (
                  notes.map(note => (
                    <div 
                      key={note.id}
                      onClick={() => selectNote(note)}
                      className={`p-2 rounded-lg cursor-pointer transition-colors group ${
                        selectedNote?.id === note.id 
                          ? "bg-primary/10 border border-primary/20" 
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-sm font-medium truncate flex-1">
                          {note.title}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(note.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {note.content || "Empty note"}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">
                          {formatDate(note.updatedAt)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Note Editor */}
          <div className="flex-1 flex flex-col">
            {selectedNote ? (
              <>
                <div className="p-3 border-b">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Note title..."
                    className="border-0 text-lg font-semibold p-0 h-auto focus-visible:ring-0"
                  />
                </div>
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Start typing your note..."
                  className="flex-1 border-0 rounded-none resize-none focus-visible:ring-0 p-4"
                />
                <div className="p-3 border-t flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Last updated: {formatDate(selectedNote.updatedAt)}
                  </span>
                  <Button onClick={handleSave} size="sm" className="gap-1.5">
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Select a note or create a new one</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
