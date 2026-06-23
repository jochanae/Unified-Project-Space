import { useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { safeGoBack } from '@/lib/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { useCompanionMedia } from '@/hooks/useCompanionMedia';
import ChatInterface from '@/components/ChatInterface';
import { getAmbientStyles } from '@/lib/ambientBackgrounds';
import { treatAsMinor } from '@/lib/ageUtils';
import { markChatSeen } from '@/hooks/useNotificationBadges';

import { PracticeModeProvider, usePracticeMode } from '@/components/practice/PracticeModeContext';

function PracticeModeAutoActivator() {
  const [searchParams, setSearchParams] = useSearchParams();
  const practiceMode = usePracticeMode();

  useEffect(() => {
    if (searchParams.get('practice') === '1' && !practiceMode.active) {
      practiceMode.activate();
      searchParams.delete('practice');
      setSearchParams(searchParams, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

export default function ChatPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    profile, user, connections,
    clearProfile, saveChatMoment, saveAutoMoment,
    updateProfile, updateConnection,
    subscription,
  } = useAppContext();

  // Use a chat-scoped companion media instance so saves target the correct memberId
  const chatMedia = useCompanionMedia(user?.id ?? null, memberId);

  // Mark this specific chat as seen when entering

  // Also mark on unmount to capture messages seen during the session
  useEffect(() => {
    return () => {
      if (user?.id && memberId) {
        markChatSeen(memberId, user.id);
      }
    };
  }, [user?.id, memberId]);

  // Invalidate profile query on unmount so dashboard/MessagesPage get fresh last_message
  useEffect(() => {
    return () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      }
    };
  }, [user?.id, queryClient]);

  if (!profile || !user || !memberId) return null;

  const ambient = getAmbientStyles(treatAsMinor(profile.dateOfBirth));

  return (
    <PracticeModeProvider>
    <PracticeModeAutoActivator />
    <div className="dark flex flex-col relative w-full" style={{ height: '100dvh', minHeight: '100dvh', touchAction: 'pan-y' }}>
      {/* Cinematic radial gradient background */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ background: ambient.base }}
      />
      <div
        className="fixed inset-0 z-0 opacity-20 pointer-events-none"
        style={{ backgroundImage: ambient.leaks }}
      />
      <div className="relative z-10 flex-1 overflow-hidden w-full" style={{ touchAction: 'pan-y' }}>
        <ChatInterface
          profile={profile}
          memberId={memberId}
          userId={user.id}
          subscribed={subscription.subscribed}
          connection={connections.find(c => c.memberId === memberId)}
          onReset={clearProfile}
          onBack={() => navigate('/my-world')}
          onSaveMoment={saveChatMoment}
          onSaveMilestone={(opts) => saveAutoMoment({ ...opts, source: 'milestone' })}
          onSaveMedia={chatMedia.saveMedia}
          onUpdateProfile={updateProfile}
          onUpdateConnection={updateConnection}
        />
      </div>
    </div>
    </PracticeModeProvider>
  );
}
