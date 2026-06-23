import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, MessageCircle, Trophy } from 'lucide-react';
import type { CommunityPost, CompanionReaction } from '@/lib/communityPersonas';

interface EventFeedCardProps {
  post: CommunityPost;
  index: number;
  isFavorited?: boolean;
  companionName?: string;
  onTap: () => void;
  onToggleFavorite?: () => void;
  onCompanionTap?: (memberId: string) => void;
}

function ReactionAvatar({ reaction }: { reaction: CompanionReaction }) {
  if (reaction.avatarUrl) {
    return (
      <img
        src={reaction.avatarUrl}
        alt={reaction.name}
        className="h-5 w-5 rounded-full object-cover ring-1 ring-border/30"
      />
    );
  }
  return (
    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[9px] font-bold text-muted-foreground ring-1 ring-border/30">
      {reaction.name[0]?.toUpperCase()}
    </div>
  );
}

export default function EventFeedCard({
  post,
  index,
  isFavorited,
  companionName,
  onTap,
  onToggleFavorite,
  onCompanionTap,
}: EventFeedCardProps) {
  const isMilestone = post.cardType === 'milestone';
  const isReflection = post.cardType === 'reflection';
  const isLifeEvent = post.cardType === 'life-event';

  const reactions = post.companionReactions || [];
  const emojiReactions = reactions.filter((r) => r.emoji && !r.comment);
  const commentReactions = reactions.filter((r) => r.comment);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      layout
      className={`relative rounded-2xl border-[0.5px] p-4 backdrop-blur-xl transition-all ${
        isMilestone
          ? 'border-primary/30 bg-primary/5 shadow-[0_0_12px_rgba(212,175,80,0.1)]'
          : 'border-white/10 bg-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
      }`}
    >
      {/* Event label (life events & milestones) */}
      {(isLifeEvent || isMilestone) && post.eventLabel && (
        <div className="flex items-center gap-2 mb-2.5">
          {isMilestone && <Trophy className="h-4 w-4 text-primary" />}
          <p className="text-sm font-semibold text-foreground">
            {post.eventLabel}
          </p>
        </div>
      )}

      {/* Reflection card: companion identity badge + content */}
      {isReflection && (
        <button
          onClick={() => onCompanionTap?.(post.memberId)}
          className="flex items-center gap-2 mb-2 text-left transition-colors hover:opacity-80"
        >
          {reactions[0]?.avatarUrl ? (
            <img
              src={reactions[0].avatarUrl}
              alt={reactions[0].name}
              className="h-6 w-6 rounded-full object-cover ring-1 ring-border/30"
            />
          ) : null}
          <span className="text-xs font-semibold text-foreground/80">
            {post.companionRole
              ? `${reactions[0]?.name || 'Companion'}`
              : reactions[0]?.name || 'Companion'}
          </span>
          {post.companionRole && (
            <span className="text-[10px] text-muted-foreground">• {post.companionRole}</span>
          )}
        </button>
      )}

      {/* Content */}
      <button onClick={onTap} className="w-full text-left">
        <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
          isReflection ? 'text-foreground/80 italic' : 'text-foreground/90'
        }`}>
          {post.content}
        </p>
        {/* Companion attribution for non-reflection posts */}
        {!isReflection && companionName && (
          <p className="text-[10px] text-muted-foreground/40 mt-1.5 flex items-center gap-1">
            <span className="h-1 w-1 rounded-full bg-primary/30" />
            shared by {companionName}
          </p>
        )}
        {post.imageUrl && (
          <img
            src={post.imageUrl}
            alt=""
            className="mt-3 w-full rounded-xl object-cover max-h-64"
            loading="lazy"
          />
        )}
      </button>

      {/* Companion reaction row */}
      {reactions.length > 0 && (isLifeEvent || isMilestone) && (
        <div className="mt-3 flex flex-wrap items-center gap-2.5 border-t border-white/5 pt-3">
          {/* Emoji-only reactions */}
          {emojiReactions.map((r, i) => (
            <button
              key={`${r.memberId}-${i}`}
              onClick={() => onCompanionTap?.(r.memberId)}
              className="flex items-center gap-1 transition-opacity hover:opacity-80"
              title={r.name}
            >
              <span className="text-sm">{r.emoji}</span>
              <ReactionAvatar reaction={r} />
            </button>
          ))}

          {/* Comment reactions */}
          {commentReactions.map((r, i) => (
            <button
              key={`comment-${r.memberId}-${i}`}
              onClick={() => onCompanionTap?.(r.memberId)}
              className="flex items-center gap-1.5 rounded-xl bg-white/5 px-2.5 py-1.5 transition-all hover:bg-white/10"
            >
              <ReactionAvatar reaction={r} />
              <span className="text-xs text-foreground/80">
                {r.emoji && <span className="mr-1">{r.emoji}</span>}
                {r.comment}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Footer: time + favorite */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{post.timeAgo}</span>
        <div className="flex items-center gap-3">
          {onToggleFavorite && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
              className="transition-transform active:scale-90"
            >
              <Star className={`h-3.5 w-3.5 ${isFavorited ? 'fill-primary text-primary' : 'text-muted-foreground hover:text-primary'}`} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
