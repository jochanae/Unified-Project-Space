import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, MessageSquare, Trash2, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Conversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  messages: unknown;
}

interface QuinnHistoryProps {
  onSelectConversation: (id: string) => void;
  currentConversationId: string | null;
}

export function QuinnHistory({ onSelectConversation, currentConversationId }: QuinnHistoryProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const { session } = useAuth();

  const fetchConversations = async () => {
    if (!session?.user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, title, created_at, updated_at, messages')
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      toast.error('Failed to load chat history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
    }
  }, [isOpen, session?.user]);

  const handleSelect = (id: string) => {
    onSelectConversation(id);
    setIsOpen(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);

    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setConversations((prev) => prev.filter((c) => c.id !== id));
      toast.success('Conversation deleted');
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      toast.error('Failed to delete conversation');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!session?.user) return;
    setIsDeletingAll(true);

    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('user_id', session.user.id);

      if (error) throw error;

      setConversations([]);
      toast.success('All conversations deleted');
    } catch (error) {
      console.error('Failed to delete all conversations:', error);
      toast.error('Failed to delete conversations');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const getPreview = (conv: Conversation) => {
    const messages = conv.messages as Array<{ role: string; content: string }> | null;
    if (!messages || messages.length === 0) return 'Empty conversation';
    const firstUserMessage = messages.find((m) => m.role === 'user');
    if (firstUserMessage) {
      return firstUserMessage.content.slice(0, 80) + (firstUserMessage.content.length > 80 ? '...' : '');
    }
    return 'No messages';
  };

  if (!session?.user) {
    return (
      <Button variant="ghost" size="icon" disabled title="Sign in to view history">
        <History className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" title="Chat history">
          <History className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 sm:w-96 p-0">
        <SheetHeader className="px-4 py-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Chat History
            </SheetTitle>
            {conversations.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs text-muted-foreground hover:text-destructive"
                    disabled={isDeletingAll}
                  >
                    {isDeletingAll ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Trash2 className="h-3 w-3 mr-1" />
                    )}
                    Delete All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete all conversations?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all {conversations.length} conversation{conversations.length !== 1 ? 's' : ''} with Quinn. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteAll}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No conversations yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Start chatting with Quinn to see your history here
              </p>
            </div>
          ) : (
            <div className="py-2">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelect(conv.id)}
                  className={cn(
                    'w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors group relative',
                    currentConversationId === conv.id && 'bg-primary/10 border-l-2 border-primary'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {conv.title || 'Untitled conversation'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {getPreview(conv)}
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                      </p>
                    </div>
                    {/* Always visible on mobile, hover on desktop */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={(e) => handleDelete(e, conv.id)}
                      disabled={deletingId === conv.id}
                    >
                      {deletingId === conv.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      )}
                    </Button>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
