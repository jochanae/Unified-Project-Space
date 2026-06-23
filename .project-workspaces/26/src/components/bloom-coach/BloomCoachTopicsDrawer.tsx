import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, Trash2, CreditCard, PiggyBank, Target, TrendingUp, Shield, BookOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface SavedNote {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
}

interface BloomCoachTopicsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTopic: (prompt: string) => void;
}

const presetTopics = [
  { icon: <CreditCard className="h-4 w-4" />, label: "Debt Strategy", prompt: "Help me create a debt payoff strategy for all my debts" },
  { icon: <PiggyBank className="h-4 w-4" />, label: "Savings Plan", prompt: "Help me build a savings plan based on my current finances" },
  { icon: <Target className="h-4 w-4" />, label: "Budget Review", prompt: "Review my current budgets and suggest improvements" },
  { icon: <TrendingUp className="h-4 w-4" />, label: "Credit Score", prompt: "Give me tips to improve my credit score" },
  { icon: <Shield className="h-4 w-4" />, label: "Emergency Fund", prompt: "Help me set up an emergency fund" },
  { icon: <BookOpen className="h-4 w-4" />, label: "Tax Tips", prompt: "What tax deductions should I be tracking?" },
];

export function BloomCoachTopicsDrawer({
  open,
  onOpenChange,
  onSelectTopic,
}: BloomCoachTopicsDrawerProps) {
  const { user } = useAuth();
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      loadSavedNotes();
    }
  }, [open, user]);

  const loadSavedNotes = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("bloom_coach_saved_notes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      setSavedNotes(data || []);
    } catch (error) {
      console.error("Failed to load saved notes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from("bloom_coach_saved_notes")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setSavedNotes((prev) => prev.filter((n) => n.id !== id));
      toast.success("Note deleted");
    } catch {
      toast.error("Failed to delete note");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[340px] p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Topics & Notes
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-70px)]">
          <div className="p-4 space-y-6">
            {/* Preset Topics */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">
                🎯 Quick Topics
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {presetTopics.map((topic) => (
                  <button
                    key={topic.label}
                    onClick={() => {
                      onSelectTopic(topic.prompt);
                      onOpenChange(false);
                    }}
                    className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted text-left transition-colors"
                  >
                    <span className="text-primary">{topic.icon}</span>
                    <span className="text-xs font-medium">{topic.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Saved Notes */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">
                📝 Saved Notes
              </h3>
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : savedNotes.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm">No saved notes yet</p>
                  <p className="text-xs mt-1">
                    Save helpful advice from your conversations
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 rounded-lg bg-muted/30 group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{note.title}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {note.content}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(note.created_at), "MMM d, yyyy")}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0"
                          onClick={(e) => handleDeleteNote(note.id, e)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
