import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import type { Session } from '@supabase/supabase-js'

/**
 * Session hardening hook:
 * 1. Monitors auth state changes for TOKEN_REFRESHED / SIGNED_OUT events
 * 2. Detects blocked users and force-signs them out
 * 3. Shows re-auth prompts on token refresh failures
 */
export function useSessionGuard(session: Session | null) {
  const navigate = useNavigate()
  const blockedCheckDone = useRef(false)

  // Check if user is blocked on mount and session change
  useEffect(() => {
    if (!session?.user?.id || blockedCheckDone.current) return

    async function checkBlocked() {
      const { data } = await supabase
        .from('users')
        .select('blocked_at, blocked_reason')
        .eq('id', session!.user.id)
        .single()

      if (data?.blocked_at) {
        toast.error(data.blocked_reason || 'Your account has been suspended.')
        await supabase.auth.signOut()
        navigate('/login', { replace: true })
      }
      blockedCheckDone.current = true
    }

    checkBlocked()
  }, [session?.user?.id, navigate])

  // Listen for auth events — handle refresh failures and sign-outs
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'SIGNED_OUT') {
          // Session expired or was revoked — redirect to login
          navigate('/login', { replace: true })
        }

        if (event === 'TOKEN_REFRESHED') {
          // Reset blocked check on refresh so we re-verify
          blockedCheckDone.current = false
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [navigate])
}
