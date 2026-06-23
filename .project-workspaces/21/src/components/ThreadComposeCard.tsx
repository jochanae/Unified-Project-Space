import { useState } from 'react';
import { Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ThreadFriend {
  userId: string;
  displayName: string;
}

interface ThreadComposeCardProps {
  currentUserId: string;
  currentUserName: string;
  currentUsername?: string;
  currentAvatarUrl?: string;
  friend: ThreadFriend;
}

export default function ThreadComposeCard({
  currentUserId,
  currentUserName,
  currentUsername,
  currentAvatarUrl,
  friend,
}: ThreadComposeCardProps) {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const text = content.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const { error } = await supabase.from('user_posts').insert({
        user_id: currentUserId,
        user_name: currentUserName,
        username: currentUsername || null,
        avatar_url: currentAvatarUrl || null,
        content: text,
        thread_friend_id: friend.userId,
        visibility: 'thread',
      } as any);
      if (error) throw error;
      setContent('');
      toast.success(`Shared with ${friend.displayName} 💛`);
    } catch (e: any) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-secondary/30 backdrop-blur-sm p-2.5">
      <input
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
        placeholder={`Send ${friend.displayName} a moment...`}
        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
      />
      <button
        onClick={handleSend}
        disabled={!content.trim() || sending}
        className="shrink-0 rounded-full bg-primary/20 p-2 text-primary hover:bg-primary/30 transition-colors disabled:opacity-30"
      >
        <Send className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
