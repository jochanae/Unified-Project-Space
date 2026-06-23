import { motion } from 'framer-motion';
import { X, Flag, ShieldOff } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { CommunityMember, CommunityPost } from '@/lib/communityPersonas';
import { avatarImages } from '@/lib/avatarImages';
import { postImages } from '@/lib/postImages';
import { useState } from 'react';
import AvatarLightbox from './AvatarLightbox';

interface MemberProfileProps {
  member: CommunityMember;
  posts: CommunityPost[];
  onClose: () => void;
  onReport?: () => void;
  onBlock?: () => void;
  isBlocked?: boolean;
}

function ProfileAvatar({ member }: { member: CommunityMember }) {
  const [imgError, setImgError] = useState(false);
  const src = member.avatarUrl || avatarImages[member.id];

  if (!src || imgError) {
    return (
      <div
        className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-primary-foreground shadow-md"
        style={{ backgroundColor: `hsl(var(${member.colorVar}))` }}
      >
        {member.initial}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={member.name}
      onError={() => setImgError(true)}
      className="h-20 w-20 rounded-full object-cover shadow-md"
    />
  );
}

export default function MemberProfile({ member, posts, onClose, onReport, onBlock, isBlocked }: MemberProfileProps) {
  const memberPosts = posts.filter((p) => p.memberId === member.id);
  const [showLightbox, setShowLightbox] = useState(false);
  const avatarSrc = member.avatarUrl || avatarImages[member.id];
  const isMobile = useIsMobile();

  return (
    <>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-50 flex ${isMobile ? 'items-stretch' : 'items-end justify-center sm:items-center'} bg-foreground/30 backdrop-blur-sm`}
      onClick={onClose}
    >
      <motion.div
        initial={isMobile ? { y: '100%' } : { y: 60, opacity: 0 }}
        animate={isMobile ? { y: 0 } : { y: 0, opacity: 1 }}
        exit={isMobile ? { y: '100%' } : { y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className={`relative ${isMobile ? 'w-full h-full bg-background overflow-y-auto' : 'mx-4 mb-4 w-full max-w-md rounded-2xl border border-border/40 bg-card shadow-lg sm:mb-0 max-h-[85vh] overflow-y-auto'}`}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center px-6 pt-8 pb-4">
          <button type="button" onClick={() => setShowLightbox(true)} className="focus:outline-none">
            <ProfileAvatar member={member} />
          </button>
          <h2 className="mt-4 font-display text-xl font-bold text-foreground">{member.name}</h2>
          <p className="text-sm text-muted-foreground">{member.handle}</p>
          <p className="mt-3 max-w-xs text-center text-[14px] leading-relaxed text-foreground/75 italic break-words">
            "{member.bio}"
          </p>
        </div>

        {/* Recent posts */}
        {memberPosts.length > 0 && (
          <div className="border-t border-border/40 px-5 py-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recent posts
            </p>
            <div className="flex max-h-60 flex-col gap-3 overflow-y-auto overscroll-contain">
              {memberPosts.slice(0, 3).map((post) => (
                <div key={post.id} className="rounded-xl border border-border/30 bg-background/60 px-3.5 py-3">
                  <p className="text-[13px] leading-relaxed text-foreground/80">{post.content}</p>
                  {post.imageKey && postImages[post.imageKey] && (
                    <img
                      src={postImages[post.imageKey]}
                      alt=""
                      className="mt-2 w-full rounded-lg object-cover max-h-28"
                      loading="lazy"
                    />
                  )}
                  <span className="mt-1.5 block text-[11px] text-muted-foreground">{post.timeAgo}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Report/Block actions */}
        {(onReport || onBlock) && (
          <div className="border-t border-border/40 px-5 py-3 flex gap-2">
            {onReport && (
              <button
                onClick={() => { onReport(); onClose(); }}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors"
              >
                <Flag className="h-3.5 w-3.5" /> Report
              </button>
            )}
            {onBlock && (
              <button
                onClick={() => { onBlock(); onClose(); }}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-destructive/30 py-2.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <ShieldOff className="h-3.5 w-3.5" /> {isBlocked ? 'Unblock' : 'Block'}
              </button>
            )}
          </div>
        )}

        <div className="h-4 pb-safe" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1rem)' }} />
      </motion.div>
    </motion.div>

    {avatarSrc && (
      <AvatarLightbox
        open={showLightbox}
        onClose={() => setShowLightbox(false)}
        imageUrl={avatarSrc}
        name={member.name}
        bio={member.bio}
      />
    )}
    </>
  );
}
