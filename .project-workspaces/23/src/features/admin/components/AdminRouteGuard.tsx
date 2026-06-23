import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth';
import { useEffect, useState } from 'react';

interface AdminRouteGuardProps {
  children: React.ReactNode;
}

export function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  const { session, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<'loading' | 'admin' | 'denied'>('loading');

  useEffect(() => {
    async function check() {
      if (authLoading) return;

      if (!session?.user?.id) {
        setStatus('denied');
        return;
      }

      const { data, error } = await supabase.rpc('is_admin');

      setStatus(!error && data ? 'admin' : 'denied');
    }

    check();
  }, [session?.user?.id, authLoading]);

  if (authLoading || status === 'loading') {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
      </div>
    );
  }

  if (status === 'denied') return <Navigate to="/projects" replace />;
  return <>{children}</>;
}
