import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Plus, Trash2, NotebookPen } from "lucide-react";
import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";

interface KidsNotesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kidId: string;
  variant: "playful" | "modern";
}

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export function KidsNotesModal({ open, onOpenChange, kidId, variant }: KidsNotesModalProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isPlayful = variant === "playful";

  useEffect(() => {
    if (open && kidId) {
      fetchNotes();
    }
  }, [open, kidId]);

  const fetchNotes = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("kid_notes")
      .select("*")
      .eq("kid_id", kidId)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });
    
    if (data && !error) {
      setNotes(data.map(n => ({
        id: n.id,
        title: n.title || "",
        content: n.content,
        created_at: n.created_at
      })));
    }
    setIsLoading(false);
  };

  const saveNote = async () => {
    if (!title.trim()) {
      toast.error("Please add a title");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setIsLoading(true);

    if (selectedNote) {
      // Update existing note
      const { error } = await supabase
        .from("kid_notes")
        .update({ title: title.trim(), content: content.trim() })
        .eq("id", selectedNote.id);
      
      if (!error) {
        toast.success("Note updated!");
        fetchNotes();
        clearForm();
      }
    } else {
      // Create new note
      const { error } = await supabase
        .from("kid_notes")
        .insert({
          kid_id: kidId,
          parent_user_id: user.id,
          title: title.trim(),
          content: content.trim()
        });
      
      if (!error) {
        toast.success("Note saved!");
        fetchNotes();
        clearForm();
      }
    }
    setIsLoading(false);
  };

  const deleteNote = async (noteId: string) => {
    const { error } = await supabase
      .from("kid_notes")
      .delete()
      .eq("id", noteId);
    
    if (!error) {
      if (selectedNote?.id === noteId) {
        clearForm();
      }
      toast.success("Note deleted");
      fetchNotes();
    }
  };

  const selectNote = (note: Note) => {
    setSelectedNote(note);
    setTitle(note.title);
    setContent(note.content);
  };

  const clearForm = () => {
    setSelectedNote(null);
    setTitle("");
    setContent("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-md max-h-[85vh] ${isPlayful 
        ? "bg-gradient-to-b from-yellow-50 to-orange-50 border-yellow-200" 
        : "bg-gradient-to-b from-slate-900 to-indigo-950 border-white/10"
      }`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isPlayful ? "text-orange-600" : "text-white"}`}>
            <NotebookPen className="h-5 w-5" />
            {isPlayful ? "My Journal 📓" : "My Notes"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Note Editor */}
          <div className="space-y-3">
            <Input
              placeholder={isPlayful ? "What's this about?" : "Title"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={isPlayful 
                ? "bg-white/80 border-orange-200 focus:border-orange-400" 
                : "bg-white/10 border-white/20 text-white"
              }
            />
            <Textarea
              placeholder={isPlayful ? "Write your thoughts here..." : "Write something..."}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className={isPlayful 
                ? "bg-white/80 border-orange-200 focus:border-orange-400 resize-none" 
                : "bg-white/10 border-white/20 text-white resize-none"
              }
            />
            <div className="flex gap-2">
              <Button 
                onClick={saveNote}
                className={isPlayful 
                  ? "flex-1 bg-orange-500 hover:bg-orange-600 text-white" 
                  : "flex-1 bg-violet-600 hover:bg-violet-700"
                }
              >
                <Save className="h-4 w-4 mr-2" />
                {selectedNote ? "Update" : "Save"}
              </Button>
              {selectedNote && (
                <Button variant="outline" onClick={clearForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  New
                </Button>
              )}
            </div>
          </div>

          {/* Saved Notes List */}
          {notes.length > 0 && (
            <div className="space-y-2">
              <h3 className={`text-sm font-medium ${isPlayful ? "text-orange-700" : "text-white/70"}`}>
                {isPlayful ? "My Notes 📝" : "Saved Notes"}
              </h3>
              <ScrollArea className="h-32">
                <div className="space-y-2 pr-2">
                  {notes.map((note, index) => (
                    <motion.div
                      key={note.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => selectNote(note)}
                      className={`p-3 rounded-lg cursor-pointer flex items-center justify-between ${
                        selectedNote?.id === note.id
                          ? isPlayful ? "bg-orange-200/80" : "bg-violet-600/30"
                          : isPlayful ? "bg-white/60 hover:bg-white/80" : "bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${isPlayful ? "text-orange-800" : "text-white"}`}>
                          {note.title}
                        </p>
                        <p className={`text-xs truncate ${isPlayful ? "text-orange-600" : "text-white/60"}`}>
                          {new Date(note.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNote(note.id);
                        }}
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
