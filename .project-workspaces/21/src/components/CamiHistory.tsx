import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import { History, MessageSquare, Trash2, Loader2, Copy, Check, Crown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CamiSession {
  id: string;
  title: string | null;
  first_message: string;
  message_count: number;
  session_date: string;
  messages: unknown;
  phase: string;
  match_result: unknown;
}

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  imageUrl?: string;
}

interface CamiHistoryProps {
  isPremium: boolean;
  userId: string;
  onLoadSession: (messages: ChatMessage[], phase: string, matchResult: any) => void;
  onClearSession: () => void;
}

function normalizeSessionMessages(raw: unknown): ChatMessage[] {
  const normalizeArray = (arr: unknown[]): ChatMessage[] =>
    arr
      .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      .map((item, index) => {
        const hasText = typeof item.content === 'string';
        const hasImage = typeof item.imageUrl === 'string' && item.imageUrl.length > 0;
        if (!hasText && !hasImage) return null;

        return {
          id: typeof item.id === 'string' ? item.id : `restored-${index}`,
          content: hasText ? (item.content as string) : '',
          isUser: Boolean(item.isUser),
          imageUrl: hasImage ? (item.imageUrl as string) : undefined,
        };
      })
      .filter((msg) => msg !== null) as ChatMessage[];

  if (Array.isArray(raw)) return normalizeArray(raw);

  if (typeof raw === 'string') {
    try {
      return normalizeSessionMessages(JSON.parse(raw));
    } catch {
      return [];
    }
  }

  if (raw && typeof raw === 'object' && 'messages' in (raw as Record<string, unknown>)) {
    return normalizeSessionMessages((raw as Record<string, unknown>).messages);
  }

  return [];
}

export function CamiHistory({ isPremium, userId, onLoadSession, onClearSession }: CamiHistoryProps) {
  const [sessions, setSessions] = useState<CamiSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('cami_session_history' as any)
        .select('id, title, first_message, message_count, session_date, messages, phase, match_result')
        .eq('user_id', userId)
        .order('session_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      setSessions((data as any[]) || []);
    } catch (error) {
      console.error('Failed to fetch Cami sessions:', error);
      toast.error('Failed to load chat history');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen) fetchSessions();
  }, [isOpen, fetchSessions]);

  const handleSelect = (session: CamiSession) => {
    const msgs = normalizeSessionMessages(session.messages);
    if (msgs.length === 0) {
      toast.error('This session is from an older format and cannot be restored');
      return;
    }
    onLoadSession(msgs, session.phase, session.match_result);
    setIsOpen(false);
    toast.success('Session restored');
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('cami_session_history' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
      setSessions(prev => prev.filter(s => s.id !== id));
      toast.success('Session deleted');
    } catch {
      toast.error('Failed to delete session');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!userId) return;
    setIsDeletingAll(true);
    try {
      const { error } = await supabase
        .from('cami_session_history' as any)
        .delete()
        .eq('user_id', userId);
      if (error) throw error;
      setSessions([]);
      toast.success('All history cleared');
    } catch {
      toast.error('Failed to clear history');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleCopy = async (e: React.MouseEvent, session: CamiSession) => {
    e.stopPropagation();
    const msgs = normalizeSessionMessages(session.messages);
    if (msgs.length === 0) {
      toast.error('No messages to copy');
      return;
    }
    const text = msgs
      .map(m => `${m.isUser ? 'You' : 'Cami'}: ${m.content.replace(/\*\*/g, '')}`)
      .join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(session.id);
      toast.success('Conversation copied');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Could not copy');
    }
  };

  const getPreview = (session: CamiSession) => {
    const msgs = normalizeSessionMessages(session.messages);
    if (msgs.length > 0) {
      const firstUser = msgs.find(m => m.isUser);
      if (firstUser) {
        return firstUser.content.slice(0, 80) + (firstUser.content.length > 80 ? '...' : '');
      }
    }
    return session.first_message?.slice(0, 80) || 'Session with Cami';
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  };

  // History is now available to all users

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" title="Chat history">
          <History className="h-4.5 w-4.5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 sm:w-96 p-0">
        <SheetHeader className="px-4 py-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Chat History
            </SheetTitle>
            {sessions.length > 0 && (
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
                    Clear All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear all Cami history?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all {sessions.length} conversation{sessions.length !== 1 ? 's' : ''} with Cami. This action cannot be undone.
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

        <ScrollArea className="h-[calc(100dvh-80px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No previous conversations yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Start chatting with Cami to see your history here
              </p>
            </div>
          ) : (
            <div className="py-2">
              {sessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => handleSelect(session)}
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors group relative"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">
                        {formatDate(session.session_date)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {getPreview(session)}
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        {session.message_count} messages · {formatDistanceToNow(new Date(session.session_date), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Copy button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                        onClick={(e) => handleCopy(e, session)}
                      >
                        {copiedId === session.id ? (
                          <Check className="h-4 w-4 text-primary" />
                        ) : (
                          <Copy className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                      {/* Delete button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                        onClick={(e) => handleDelete(e, session.id)}
                        disabled={deletingId === session.id}
                      >
                        {deletingId === session.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        )}
                      </Button>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Start Fresh button at the bottom */}
        {sessions.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 border-t border-border bg-card px-4 py-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                onClearSession();
                setIsOpen(false);
              }}
            >
              Start fresh conversation
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
