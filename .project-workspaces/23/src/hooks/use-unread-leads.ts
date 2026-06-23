import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';

/**
 * Subscribes to unread lead_notifications count for the current org.
 * Used by the MarQ HUD orb badge and the LeadCommandFeed header.
 */
export function useUnreadLeads() {
  const { user } = useCurrentUser();
  const orgId = user?.orgId;
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!orgId) return;
    let mounted = true;

    const refresh = async () => {
      const { count: c } = await supabase
        .from('lead_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('is_read', false);
      if (mounted) setCount(c || 0);
    };

    refresh();

    const channel = supabase
      .channel(`unread-leads-${orgId}-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lead_notifications',
          filter: `org_id=eq.${orgId}`,
        },
        () => refresh()
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [orgId]);

  const markAllRead = async () => {
    if (!orgId) return;
    setCount(0);
    await supabase
      .from('lead_notifications')
      .update({ is_read: true })
      .eq('org_id', orgId)
      .eq('is_read', false);
  };

  return { count, markAllRead };
}
