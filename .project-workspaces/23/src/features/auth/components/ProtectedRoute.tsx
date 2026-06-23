import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useSessionGuard } from '../hooks/useSessionGuard'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { OnboardingWizard } from '@/components/shared/OnboardingWizard'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface ProtectedRouteProps {
  children?: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, loading } = useAuth()
  const queryClient = useQueryClient()

  // Session hardening: blocked-user detection, token refresh, re-auth
  useSessionGuard(session)

  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['user-onboarding', session?.user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('users')
        .select('has_completed_onboarding, email, blocked_at, blocked_reason')
        .eq('id', session!.user.id)
        .single()
      return data
    },
    enabled: !!session?.user?.id,
    staleTime: 30_000,
  })

  if (loading || (session && profileLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingSpinner size="lg" text="Loading your world…" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  // Show onboarding wizard for new users
  if (userProfile && !userProfile.has_completed_onboarding) {
    return (
      <OnboardingWizard
        userId={session.user.id}
        userEmail={userProfile.email || session.user.email || ''}
        onComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['user-onboarding'] })
        }}
      />
    )
  }

  return <>{children || <Outlet />}</>
}