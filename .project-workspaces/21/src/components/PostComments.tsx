import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, CornerDownRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { moderateContent } from '@/lib/moderation';
import { getMember } from '@/lib/communityPersonas';
import { toast } from 'sonner';
import EmojiReactions from './EmojiReactions';
import CrisisResourceBanner from './CrisisResourceBanner';
import { useReactions } from '@/hooks/useReactions';

interface Comment {
  id: string;
  userId: string;
  userName: string;
  username?: string;
  avatarUrl?: string;
  content: string;
  createdAt: string;
  parentId?: string;
}

interface PostCommentsProps {
  postId: string;
  userId?: string;
  userName?: string;
  username?: string;
  avatarUrl?: string;
  postMemberId?: string;
  postContent?: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function CommentRow({
  c,
  onReply,
  reactionSummary,
  onToggleReaction,
}: {
  c: Comment;
  onReply?: (c: Comment) => void;
  reactionSummary: any[];
  onToggleReaction?: (id: string, emoji: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-2.5"
    >
      {c.avatarUrl ? (
        <img src={c.avatarUrl} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
          {c.userName.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs font-semibold text-foreground">{c.userName}</span>
          {c.username && <span className="text-[10px] text-muted-foreground">@{c.username}</span>}
          <span className="text-[10px] text-muted-foreground">· {timeAgo(c.createdAt)}</span>
        </div>
        <p className="text-[13px] leading-relaxed text-foreground/85">{c.content}</p>

        {/* Emoji reactions on comment */}
        <div className="mt-1">
          <EmojiReactions
            postId={c.id}
            reactions={reactionSummary}
            onToggle={onToggleReaction || (() => {})}
            disabled={!onToggleReaction}
          />
        </div>

        {onReply && (
          <button
            onClick={() => onReply(c)}
            className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <CornerDownRight className="h-2.5 w-2.5" /> Reply
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function PostComments({ postId, userId, userName, username, avatarUrl, postMemberId, postContent }: PostCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [showCrisis, setShowCrisis] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Trigger AI auto-reply from a created companion
  const triggerCompanionReply = async (
    member: ReturnType<typeof getMember>,
    postText: string,
    userReply: string,
    parentCommentId: string,
  ) => {
    if (!member) return;
    try {
      const { data, error } = await supabase.functions.invoke('community-reply', {
        body: {
          memberName: member.name,
          memberAge: member.age,
          memberPersonality: member.personality,
          postContent: postText,
          userReply,
          isCompanion: false,
        },
      });
      if (error) throw error;
      const replyText = data?.reply;
      if (!replyText) return;

      // Insert the AI reply as a comment from the companion
      await supabase.from('post_comments').insert({
        post_id: postId,
        user_id: userId!, // uses the current user's ID for RLS
        user_name: member.name,
        username: member.handle?.replace('@', '') || member.name.toLowerCase(),
        avatar_url: member.avatarUrl || null,
        content: replyText,
        parent_id: parentCommentId,
      });
    } catch (e) {
      console.error('Companion auto-reply failed:', e);
    }
  };

  // Comment IDs for reactions
  const commentIds = comments.map((c) => c.id);
  const { reactions: commentReactions, toggleReaction } = useReactions(commentIds, userId);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
        .limit(100);
      if (data) {
        setComments(data.map((c: any) => ({
          id: c.id,
          userId: c.user_id,
          userName: c.user_name,
          username: c.username || undefined,
          avatarUrl: c.avatar_url || undefined,
          content: c.content,
          createdAt: c.created_at,
          parentId: c.parent_id || undefined,
        })));
      }
    };
    load();

    const channel = supabase
      .channel(`comments-${postId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'post_comments',
        filter: `post_id=eq.${postId}`,
      }, (payload: any) => {
        const c = payload.new;
        setComments((prev) => {
          if (prev.some((p) => p.id === c.id)) return prev;
          return [...prev, {
            id: c.id,
            userId: c.user_id,
            userName: c.user_name,
            username: c.username || undefined,
            avatarUrl: c.avatar_url || undefined,
            content: c.content,
            createdAt: c.created_at,
            parentId: c.parent_id || undefined,
          }];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [postId]);

  const handlePost = async () => {
    if (!newComment.trim() || !userId || !userName) return;
    setPosting(true);
    try {
      // Moderation check
      const modResult = await moderateContent(newComment.trim(), 'comment');
      if (!modResult.approved) {
        toast.error(modResult.message || "This comment didn't quite fit. Want to try again?");
        setPosting(false);
        return;
      }

      // Show crisis resources if flagged
      if (modResult.crisis) {
        setShowCrisis(true);
      }

      const insertData: any = {
        post_id: postId,
        user_id: userId,
        user_name: userName,
        username: username || null,
        avatar_url: avatarUrl || null,
        content: newComment.trim(),
      };
      if (replyTo) {
        insertData.parent_id = replyTo.id;
      }
      const { data: insertedComment, error } = await supabase.from('post_comments').insert(insertData).select().single();
      if (error) throw error;
      const commentText = newComment.trim();
      setNewComment('');
      setReplyTo(null);

      // Trigger AI auto-reply for AI member posts (core personas + created companions)
      if (postMemberId && insertedComment && !postMemberId.startsWith('user-')) {
        const member = getMember(postMemberId);
        if (member && member.personality) {
          triggerCompanionReply(member, postContent || '', commentText, insertedComment.id);
        }
      }
    } catch {
      // silent fail
    } finally {
      setPosting(false);
    }
  };

  const handleReply = (c: Comment) => {
    setReplyTo(c);
    setNewComment(`@${c.userName} `);
    inputRef.current?.focus();
  };

  // Separate top-level and replies
  const topLevel = comments.filter((c) => !c.parentId);
  const replies = comments.filter((c) => c.parentId);
  const repliesByParent: Record<string, Comment[]> = {};
  replies.forEach((r) => {
    if (r.parentId) {
      if (!repliesByParent[r.parentId]) repliesByParent[r.parentId] = [];
      repliesByParent[r.parentId].push(r);
    }
  });

  return (
    <div className="space-y-3">
      {/* Crisis resources */}
      <AnimatePresence>
        {showCrisis && (
          <CrisisResourceBanner onDismiss={() => setShowCrisis(false)} />
        )}
      </AnimatePresence>

      {topLevel.length > 0 && (
        <div className="space-y-2.5">
          {topLevel.map((c) => (
            <div key={c.id}>
              <CommentRow
                c={c}
                onReply={userId ? handleReply : undefined}
                reactionSummary={commentReactions[c.id] || []}
                onToggleReaction={userId ? toggleReaction : undefined}
              />
              {/* Threaded replies */}
              {repliesByParent[c.id] && repliesByParent[c.id].length > 0 && (
                <div className="ml-9 mt-1.5 space-y-2 border-l-2 border-border/30 pl-3">
                  {repliesByParent[c.id].map((r) => (
                    <CommentRow
                      key={r.id}
                      c={r}
                      onReply={userId ? handleReply : undefined}
                      reactionSummary={commentReactions[r.id] || []}
                      onToggleReaction={userId ? toggleReaction : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Comment input */}
      {userId && (
        <div className="space-y-1 pt-1">
          {replyTo && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <CornerDownRight className="h-2.5 w-2.5" />
              <span>Replying to <strong>{replyTo.userName}</strong></span>
              <button onClick={() => { setReplyTo(null); setNewComment(''); }} className="ml-1 text-primary hover:underline">Cancel</button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePost(); } }}
              placeholder={replyTo ? `Reply to ${replyTo.userName}...` : 'Add a comment...'}
              maxLength={300}
              className="flex-1 rounded-full border border-border bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              onClick={handlePost}
              disabled={!newComment.trim() || posting}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40 transition-all hover:scale-105 active:scale-95"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Utility hook to get comment counts for multiple posts
export function useCommentCounts(postIds: string[]) {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (postIds.length === 0) return;

    const load = async () => {
      const { data } = await supabase
        .from('post_comments')
        .select('post_id')
        .in('post_id', postIds);
      
      if (data) {
        const countMap: Record<string, number> = {};
        data.forEach((row: any) => {
          countMap[row.post_id] = (countMap[row.post_id] || 0) + 1;
        });
        setCounts(countMap);
      }
    };
    load();
  }, [postIds.join(',')]);

  return counts;
}
