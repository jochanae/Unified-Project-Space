import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AwakeningScreen from '@/components/AwakeningScreen';
import CompanionRevealCard from '@/components/CompanionRevealCard';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { treatAsMinor } from '@/lib/ageUtils';

interface RevealData {
  name: string;
  avatarUrl?: string | null;
  bio?: string | null;
  memberId: string;
  visualMode?: string;
  companionGender?: string;
  role?: string;
}

export default function AwakeningPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, updateProfile, updateConnection, user } = useAppContext();

  const revealData = (location.state as RevealData) || null;
  const [awakeningDone, setAwakeningDone] = useState(false);
  const [chosenName, setChosenName] = useState(revealData?.name || '');

  // If someone navigates here without reveal data, bounce to home
  useEffect(() => {
    if (!revealData) navigate('/', { replace: true });
  }, [revealData, navigate]);

  if (!revealData) return null;

  if (!awakeningDone) {
    return (
      <AwakeningScreen
        onComplete={() => setAwakeningDone(true)}
        avatarReady={true}
      />
    );
  }

  return (
    <CompanionRevealCard
      name={chosenName}
      avatarUrl={revealData.avatarUrl}
      bio={revealData.bio}
      visualMode={revealData.visualMode || (revealData.avatarUrl ? 'personal' : 'abstract')}
      memberId={revealData.memberId}
      companionGender={revealData.companionGender}
      isMinor={treatAsMinor(profile?.dateOfBirth)}
      currentRole={revealData.role || 'friend'}
      currentPath="studio"
      onContinue={() => {
        const memberId = revealData.memberId;
        localStorage.setItem('compani-just-awakened', memberId);
        localStorage.setItem('compani-naming-ceremony-done', 'true');
        localStorage.setItem(`welcome_sheet_seen_${memberId}`, 'true');
        navigate(`/chat/${memberId}`, { replace: true });
      }}
      onRename={async (newName) => {
        setChosenName(newName);
        if (revealData.memberId && user) {
          await supabase
            .from('connections')
            .update({ name: newName })
            .eq('user_id', user.id)
            .eq('member_id', revealData.memberId);
          updateConnection(revealData.memberId, { name: newName });
          updateProfile({ companionName: newName });
        }
      }}
      onRedo={() => {
        navigate('/studio', { replace: true });
      }}
      onSwitchPath={(path) => {
        navigate(path === 'browse' ? '/browse' : '/studio', { replace: true });
      }}
      onSaveBackstory={(mid, backstory) => {
        updateConnection(mid, { backstory } as any);
      }}
      onRoleChange={(role) => {
        if (revealData.memberId) {
          updateConnection(revealData.memberId, { connectionMode: role });
        }
      }}
      onVoiceChange={(voiceId) => {
        if (revealData.memberId) {
          updateConnection(revealData.memberId, { voiceId });
        }
      }}
    />
  );
}
