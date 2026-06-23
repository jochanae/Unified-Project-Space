import { useCallback, useEffect, useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import MessagesList from '@/components/MessagesList';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function MessagesPage() {
  const { connections, companionMemberId, user, markTabSeen } = useAppContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [clearingNotifications, setClearingNotifications] = useState(false);

  // Mark messages + feed (notifications) as seen when visiting this page
  useEffect(() => {
    if (user?.id) {
      markTabSeen('messages');
      markTabSeen('feed');
    }
  }, [user?.id, markTabSeen]);

  const handleClearNotifications = useCallback(async () => {
    if (!user?.id || clearingNotifications) return;

    try {
      setClearingNotifications(true);
      const timestamp = new Date().toISOString();

      connections.forEach((connection) => {
        localStorage.setItem(`compani-lastseen-chat-${connection.memberId}-${user.id}`, timestamp);
      });
      localStorage.setItem(`compani-lastseen-messages-${user.id}`, timestamp);
      localStorage.setItem(`compani-lastseen-feed-${user.id}`, timestamp);

      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      markTabSeen('messages');
      markTabSeen('feed');

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['notification-badges'] }),
        queryClient.invalidateQueries({ queryKey: ['notification-badges', user.id] }),
        queryClient.invalidateQueries({ queryKey: ['notifications-feed'] }),
        queryClient.invalidateQueries({ queryKey: ['notifications-feed', user.id] }),
      ]);

      toast.success('Footer badges cleared');
    } catch {
      toast.error('Could not clear badges');
    } finally {
      setClearingNotifications(false);
    }
  }, [clearingNotifications, connections, markTabSeen, queryClient, user?.id]);

  if (!user) return null;

  return (
    <MessagesList
      connections={connections}
      companionMemberId={companionMemberId}
      userId={user.id}
      onOpenChat={(memberId) => navigate(`/chat/${memberId}`)}
      onOpenCami={() => navigate('/browse')}
      onOpenCircles={() => navigate('/circles')}
      onClearNotifications={handleClearNotifications}
      clearingNotifications={clearingNotifications}
    />
  );
}
