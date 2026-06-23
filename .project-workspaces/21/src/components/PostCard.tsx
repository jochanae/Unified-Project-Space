import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, CheckCircle2, Heart, Star, Trash2, Pencil, X, Check, MoreHorizontal } from 'lucide-react';
import { CommunityMember, CommunityPost } from '@/lib/communityPersonas';
import { avatarImages, avatarStyles } from '@/lib/avatarImages';
import { postImages } from '@/lib/postImages';
import AbstractAvatar from './AbstractAvatar';
import EmojiReactions from './EmojiReactions';
import { ReactionSummary } from '@/hooks/useReactions';

interface PostCardProps {
  post: CommunityPost;
  member: CommunityMember;
  index: number;
  isConnected?: boolean;
  isFavorited?: boolean;
  avatarUrl?: string;
  isOwnPost?: boolean;
  commentCount?: number;
  reactions?: ReactionSummary[];
  onToggleReaction?: (postId: string, emoji: string) => void;
  onTap: () => void;
  onAvatarTap?: () => void;
  onToggleFavorite?: () => void;
  onDelete?: () => void;
  onEdit?: (newContent: string) => void;
  onReport?: () => void;
  onBlock?: () => void;
  threadFriendName?: string;
}

function MemberAvatar({ member }: { member: CommunityMember }) {
  const [imgError, setImgError] = useState(false);
  const src = avatarImages[member.id];
  const style = avatarStyles[member.id];

  if (member.avatarUrl && !imgError) {
    return (
      <img
        src={member.avatarUrl}
        alt={member.name}
        onError={() => setImgError(true)}
        className="h-11 w-11 shrink-0 rounded-full object-cover shadow-sm ring-2 ring-border/40"
      />
    );
  }

  if (member.isDynamic && !member.avatarUrl) {
    return (
      <div className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-muted to-secondary animate-pulse ring-2 ring-border/40" />
    );
  }

  if (member.id.startsWith('abstract-')) {
    return <AbstractAvatar memberId={member.id} size="md" />;
  }

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={member.name}
        onError={() => setImgError(true)}
        className={`h-11 w-11 shrink-0 rounded-full object-cover shadow-sm ring-2 ring-border/40 ${style || ''}`}
      />
    );
  }

  return (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-primary-foreground shadow-sm"
      style={{ backgroundColor: `hsl(var(${member.colorVar}))` }}
    >
      {member.initial}
    </div>
  );
}

export default function PostCard({
  post,
  member,
  index,
  isConnected,
  isFavorited,
  avatarUrl,
  isOwnPost,
  commentCount = 0,
  reactions = [],
  onToggleReaction,
  onTap,
  onAvatarTap,
  onToggleFavorite,
  onDelete,
  onEdit,
  onReport,
  onBlock,
  threadFriendName,
}: PostCardProps) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [showMenu, setShowMenu] = useState(false);

  const image = post.imageUrl || (post.imageKey ? postImages[post.imageKey] : undefined);

  const handleSaveEdit = () => {
    if (editContent.trim() && onEdit) {
      onEdit(editContent.trim());
      setEditing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      layout
      className="group relative rounded-2xl border-[0.5px] border-white/10 bg-white/5 backdrop-blur-xl p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all hover:shadow-md"
    >
      {/* Header */}
      <div className="mb-2.5 flex items-start gap-3">
        <button
          onClick={onAvatarTap}
          className="transition-transform hover:scale-105 active:scale-95"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={member.name} className="h-11 w-11 shrink-0 rounded-full object-cover shadow-sm ring-2 ring-border/40" referrerPolicy="no-referrer" />
          ) : (
            <MemberAvatar member={member} />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-bold text-foreground">{member.name}</span>
            {isConnected && (
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            )}
            {isOwnPost && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">You</span>
            )}
          </div>
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{member.handle}</span>
            {member.handle && <span className="text-xs text-muted-foreground">·</span>}
            <span className="text-xs text-muted-foreground">{post.timeAgo}</span>
            {threadFriendName && (
              <><span className="text-xs text-muted-foreground">·</span><span className="text-xs text-primary/70 italic">with {threadFriendName}</span></>
            )}
          </div>
        </div>

        {/* Actions menu */}
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary transition-colors"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute right-0 top-8 z-20 min-w-[140px] rounded-xl border border-border bg-card p-1 shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                {onDelete && (
                  <button
                    onClick={() => { onDelete(); setShowMenu(false); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                )}
                {onEdit && (
                  <button
                    onClick={() => { setEditing(true); setEditContent(post.content); setShowMenu(false); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-foreground hover:bg-secondary transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                 )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content */}
      <button onClick={onTap} className="w-full text-left">
        {editing ? (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <input
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
              autoFocus
            />
            <button onClick={handleSaveEdit} className="rounded-full p-1.5 text-primary hover:bg-primary/10">
              <Check className="h-4 w-4" />
            </button>
            <button onClick={() => setEditing(false)} className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{post.content}</p>
        )}
        {image && (
          <img
            src={image}
            alt=""
            className="mt-3 w-full rounded-xl object-cover max-h-64"
            loading="lazy"
          />
        )}
      </button>

      {/* Footer */}
      <div className="mt-3 flex items-center gap-4">
        <button
          onClick={onTap}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          {commentCount > 0 && <span className="text-xs font-medium">{commentCount}</span>}
        </button>
        <EmojiReactions
          postId={post.id}
          reactions={reactions}
          onToggle={onToggleReaction ? (emoji) => onToggleReaction(post.id, emoji) : undefined}
        />
        <div className="flex-1" />
        {onToggleFavorite && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            className="transition-transform active:scale-90"
          >
            <Star className={`h-4 w-4 ${isFavorited ? 'fill-primary text-primary' : 'text-muted-foreground hover:text-primary'}`} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
