import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '@/contexts/AppContext';
import SettingsPage from '@/components/SettingsPage';

export default function SettingsPageRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    profile, user, companionMemberId, connections,
    updateProfile, updateConnection, clearProfile, signOut,
    handleDisconnectCompanion,
  } = useAppContext();

  if (!profile || !user) return null;

  const identities = user.identities || [];
  const provider = identities.length > 0 ? identities[0].provider : (user.app_metadata?.provider || 'email');
  const scrollTo = (location.state as any)?.scrollTo;

  return (
    <SettingsPage
      profile={profile}
      userEmail={user.email}
      authProvider={provider}
      userId={user.id}
      companionMemberId={companionMemberId}
      connections={connections}
      onUpdateProfile={updateProfile}
      onUpdateConnection={updateConnection}
      onResetProfile={async () => {
        await clearProfile();
        await signOut();
      }}
      onDisconnectCompanion={(memberId) => handleDisconnectCompanion(memberId)}
      onNavigateToMatchmaking={() => navigate('/browse')}
      scrollToSection={scrollTo}
    />
  );
}