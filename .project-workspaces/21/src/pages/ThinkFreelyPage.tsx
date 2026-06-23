import { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import ThinkFreelyHome from '@/components/ThinkFreelyHome';
import FindFriendSheet from '@/components/FindFriendSheet';

export default function ThinkFreelyPage() {
  const { user, profile, connections, subscription } = useAppContext();
  const [showFindFriend, setShowFindFriend] = useState(false);

  if (!profile || !user) return null;

  const companionBasics = connections.map(c => ({
    memberId: c.memberId,
    name: c.name,
    avatarUrl: c.avatarUrl,
  }));

  return (
    <>
      <ThinkFreelyHome
        userId={user.id}
        userName={profile.userName}
        connections={companionBasics}
        isPremium={subscription?.subscribed === true}
        onFindFriend={() => setShowFindFriend(true)}
      />
      <FindFriendSheet open={showFindFriend} onClose={() => setShowFindFriend(false)} />
    </>
  );
}
