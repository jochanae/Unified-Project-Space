import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface AdminRouteGuardProps {
  children: React.ReactNode;
}

export function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  const [status, setStatus] = useState<'loading' | 'admin' | 'denied'>('loading');

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStatus('denied');
        return;
      }
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      setStatus(data ? 'admin' : 'denied');
    }
    check();
  }, []);

  if (status === 'loading') return null;
  if (status === 'denied') return <Navigate to="/" replace />;
  return <>{children}</>;
}
