import { useAppContext } from '@/contexts/AppContext';
import FavoritesTab from '@/components/FavoritesTab';

export default function FavoritesPage() {
  const { favorites, favLoading, toggleFavorite, companionMedia, profile, connections, companionMemberId, activeConnection } = useAppContext();
  const companionAvatar = activeConnection?.avatarUrl;

  return (
    <div className="relative min-h-screen">
      {/* Background handled by GlobalBackdrop */}
      <div className="relative z-10">
        <FavoritesTab
          favorites={favorites}
          loading={favLoading}
          onUnfavorite={toggleFavorite}
          companionMedia={companionMedia.media}
          companionMediaLoading={companionMedia.loading}
          companionName={profile?.companionName || 'Your Friend'}
          onDeleteMedia={companionMedia.deleteMedia}
          connections={connections}
          companionMemberId={companionMemberId}
        />
      </div>
    </div>
  );
}
