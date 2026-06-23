import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { Clock, Trash2, MessageCircle, Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Conversation {
  id: string;
  title: string;
  category: string;
  created_at: string;
  updated_at: string;
}

interface BloomCoachHistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectConversation: (conversationId: string) => void;
  currentConversationId: string | null;
}

export function BloomCoachHistoryDrawer({
  open,
  onOpenChange,
  onSelectConversation,
  currentConversationId,
}: BloomCoachHistoryDrawerProps) {
  const { user } = useAuth();
  const { isPremiumUser } = useFeatureGating();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      loadConversations();
    }
  }, [open, user]);

  const loadConversations = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      let query = supabase
        .from("bloom_coach_conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      // Free users: only last 7 days
      if (!isPremiumUser) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        query = query.gte("created_at", sevenDaysAgo.toISOString());
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error("Failed to load conversations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from("bloom_coach_conversations")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setConversations((prev) => prev.filter((c) => c.id !== id));
      toast.success("Conversation deleted");
    } catch {
      toast.error("Failed to delete conversation");
    }
  };

  const handleDeleteAll = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("bloom_coach_conversations")
        .delete()
        .eq("user_id", user.id);
      if (error) throw error;
      setConversations([]);
      toast.success("All conversations deleted");
    } catch {
      toast.error("Failed to delete conversations");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[320px] p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Chat History
          </SheetTitle>
        </SheetHeader>

        <div className="p-3">
          {!isPremiumUser && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2 mb-3 flex items-center gap-1.5">
              <Crown className="h-3.5 w-3.5 text-amber-500" />
              Free plan: last 7 days only. Upgrade for unlimited history.
            </div>
          )}

          {conversations.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-destructive hover:text-destructive mb-2"
              onClick={handleDeleteAll}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete all
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1 h-[calc(100vh-160px)]">
          <div className="px-3 pb-4 space-y-1">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs">Start chatting with Bloom!</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => {
                    onSelectConversation(conv.id);
                    onOpenChange(false);
                  }}
                  className={`w-full text-left p-3 rounded-lg transition-colors group ${
                    currentConversationId === conv.id
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{conv.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(conv.updated_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0"
                      onClick={(e) => handleDelete(conv.id, e)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
