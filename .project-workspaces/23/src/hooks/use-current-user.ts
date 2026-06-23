import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth';

interface CurrentUser {
  id: string;
  email: string;
  orgId: string;
  role: string;
}

export function useCurrentUser() {
  const { session } = useAuth();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) {
      setUser(null);
      setLoading(false);
      return;
    }

    supabase
      .from('users')
      .select('id, email, org_id, role')
      .eq('id', session.user.id)
      .single()
      .then(({ data, error }) => {
        if (data && !error) {
          setUser({ id: data.id, email: data.email, orgId: data.org_id, role: data.role });
        } else {
          setUser(null);
        }
        setLoading(false);
      });
  }, [session?.user?.id, session?.user]);

  return { user, loading };
}
