import { motion, AnimatePresence } from 'framer-motion';
import { Star, Heart, MessageCircle, Trophy, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FavoritePost, MomentSource } from '@/hooks/useFavorites';
import { CompanionMediaItem } from '@/hooks/useCompanionMedia';
import { Connection } from '@/hooks/useProfile';
import { getMember } from '@/lib/communityPersonas';
import { avatarImages } from '@/lib/avatarImages';
import { postImages } from '@/lib/postImages';
import { useState, useMemo } from 'react';
import CompanionGallery from './CompanionGallery';

interface FavoritesTabProps {
  favorites: FavoritePost[];
  loading: boolean;
  onUnfavorite: (post: { id: string; memberId: string; content: string; imageKey?: string; timeAgo?: string }) => void;
  onOpenPost?: (postId: string, memberId: string) => void;
  companionMedia?: CompanionMediaItem[];
  companionMediaLoading?: boolean;
  companionName?: string;
  onDeleteMedia?: (id: string) => void;
  connections?: Connection[];
  companionMemberId?: string;
}

const SOURCE_STYLE: Record<MomentSource, { icon: typeof Star; badge: string; accent: string }> = {
  feed: { icon: Star, badge: 'Saved', accent: 'text-primary' },
  chat: { icon: MessageCircle, badge: 'Chat moment', accent: 'text-primary' },
  milestone: { icon: Trophy, badge: 'Milestone', accent: 'text-accent' },
  match: { icon: Heart, badge: 'First meeting', accent: 'text-accent' },
};

export default function FavoritesTab({ favorites, loading, onUnfavorite, companionMedia, companionMediaLoading, companionName, onDeleteMedia, connections, companionMemberId }: FavoritesTabProps) {
  const connectionMap = useMemo(() => {
    const map: Record<string, Connection> = {};
    (connections || []).forEach(c => { map[c.memberId] = c; });
    return map;
  }, [connections]);
  const [activeSection, setActiveSection] = useState<'moments' | 'gallery'>('moments');
  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const hasGallery = companionMedia && companionMedia.length > 0;

  if (favorites.length === 0 && !hasGallery) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5 backdrop-blur-md">
          <Star className="h-7 w-7 text-muted-foreground" />
        </div>
        <h2 className="font-display text-lg font-bold text-foreground">No favorites yet</h2>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          Tap ⭐ on posts in the feed or long-press companion messages to save them here.
        </p>
      </div>
    );
  }

  const navigate = useNavigate();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-white/10 bg-black/10 px-5 py-4 backdrop-blur-xl"
      >
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-3">
            <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')} className="flex items-center gap-1.5 text-sm text-white/70 hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground mt-2">Favorites</h1>
          {/* Tab toggle */}
          {hasGallery && (
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => setActiveSection('moments')}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  activeSection === 'moments' ? 'bg-primary text-primary-foreground' : 'bg-white/5 border-[0.5px] border-white/10 text-muted-foreground'
                }`}
              >
                Moments ({favorites.length})
              </button>
              <button
                onClick={() => setActiveSection('gallery')}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  activeSection === 'gallery' ? 'bg-primary text-primary-foreground' : 'bg-white/5 border-[0.5px] border-white/10 text-muted-foreground'
                }`}
              >
                Gallery ({companionMedia?.length || 0})
              </button>
            </div>
          )}
          {!hasGallery && (
            <p className="mt-0.5 text-[13px] text-muted-foreground">{favorites.length} saved moment{favorites.length !== 1 ? 's' : ''}</p>
          )}
        </div>
      </motion.header>

      <div className="flex-1 overflow-y-auto px-4 py-5 pb-24">
        <div className="mx-auto max-w-lg">
          {activeSection === 'moments' ? (
            <div className="flex flex-col gap-3">
              <AnimatePresence mode="popLayout">
                {favorites.map((fav, i) => (
                  <FavoriteCard key={fav.id} fav={fav} index={i} onUnfavorite={onUnfavorite} connectionMap={connectionMap} companionMemberId={companionMemberId} />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <CompanionGallery
              media={companionMedia || []}
              loading={companionMediaLoading || false}
              companionName={companionName || 'Your Friend'}
              onDelete={onDeleteMedia || (() => {})}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function FavoriteCard({ fav, index, onUnfavorite, connectionMap, companionMemberId }: { fav: FavoritePost; index: number; onUnfavorite: FavoritesTabProps['onUnfavorite']; connectionMap: Record<string, Connection>; companionMemberId?: string }) {
  const member = getMember(fav.memberId);
  const connection = connectionMap[fav.memberId];
  const [imgError, setImgError] = useState(false);
  
  // For companion moments, use connection avatar; for community, use static avatar
  const avatarSrc = connection?.avatarUrl || (member ? avatarImages[member.id] : undefined);
  const displayName = connection?.name || member?.name || 'Unknown';
  const postImage = fav.imageUrl || (fav.postImageKey ? postImages[fav.postImageKey] : undefined);
  const isCompanionMoment = fav.source === 'chat' || fav.source === 'milestone' || fav.source === 'match';
  const style = SOURCE_STYLE[fav.source] || SOURCE_STYLE.feed;
  const BadgeIcon = style.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
      className="flex w-full gap-3.5 rounded-2xl p-4 bg-white/5 backdrop-blur-xl border border-border/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
    >
      {/* Avatar */}
      <div className="shrink-0">
        {avatarSrc && !imgError ? (
          <img
            src={avatarSrc}
            alt={member?.name || ''}
            onError={() => setImgError(true)}
            className="h-11 w-11 rounded-full object-cover shadow-sm"
          />
        ) : (
          <div
            className="flex h-11 w-11 items-center justify-center rounded-full text-primary-foreground shadow-sm"
            style={member?.colorVar ? { backgroundColor: `hsl(var(${member.colorVar}))` } : undefined}
          >
            <span className="text-sm font-bold">{member?.initial || '?'}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="mb-1 flex items-center gap-2">
          <span className="font-display text-[15px] font-bold text-foreground">{displayName}</span>
          {/* Source badge for companion moments */}
          {isCompanionMoment && (
            <span className={`inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold ${style.accent}`}>
              <BadgeIcon className="h-2.5 w-2.5" />
              {style.badge}
            </span>
          )}
          {fav.postTimeAgo && !isCompanionMoment && (
            <>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{fav.postTimeAgo}</span>
            </>
          )}
        </div>
        <p className="text-[15px] leading-relaxed text-foreground/85">{fav.postContent}</p>
        {postImage && (
          <img src={postImage} alt="" className="mt-3 w-full rounded-xl object-cover max-h-44" loading="lazy" />
        )}
      </div>

      {/* Unfavorite button */}
      <div className="flex flex-col items-center justify-start pt-1">
        <button
          onClick={() => onUnfavorite({ id: fav.postId, memberId: fav.memberId, content: fav.postContent, imageKey: fav.postImageKey, timeAgo: fav.postTimeAgo })}
          className="rounded-full p-1.5 transition-colors hover:bg-primary/10"
          aria-label="Remove from favorites"
        >
          <Star className="h-4 w-4 fill-primary text-primary" />
        </button>
      </div>
    </motion.div>
  );
}
