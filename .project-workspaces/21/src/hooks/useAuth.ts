import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });
  const initialSessionResolved = useRef(false);
  // Track whether we ever had a valid session — used to detect session loss
  const hadSession = useRef(false);
  // Capture sessions from early auth events (SIGNED_IN, INITIAL_SESSION)
  // that fire before getSession resolves — prevents the race condition
  // where getSession returns null while the listener already has the session.
  const pendingSession = useRef<Session | null>(null);

  useEffect(() => {
    // Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log('[useAuth] onAuthStateChange:', _event, 'hasSession:', !!session, 'initialResolved:', initialSessionResolved.current);
        
        // Track that we once had a valid session
        if (session) hadSession.current = true;

        // Fire-and-forget login audit on real sign-in events.
        // INITIAL_SESSION fires on every reload, so we exclude it.
        if (_event === 'SIGNED_IN' && session) {
          supabase.functions
            .invoke('record-login', { body: { event_type: 'signin' } })
            .catch(() => { /* silent */ });
        }

        if (initialSessionResolved.current) {
          // After initial load, update everything atomically.
          setState({ user: session?.user ?? null, session, loading: false });
        } else {
          // Before getSession resolves, stash the session so we don't lose it.
          // Don't update React state yet to avoid a flash where user is set
          // but loading hasn't been cleared.
          pendingSession.current = session;
        }
      }
    );


    // getSession is the single source of truth for the initial auth resolution.
    // But if it returns null while the listener already received a session,
    // prefer the listener's session (race condition fix).
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        initialSessionResolved.current = true;
        const resolved = session || pendingSession.current;
        if (resolved) hadSession.current = true;
        console.log('[useAuth] getSession resolved:', !!session, 'pending:', !!pendingSession.current, 'final:', !!resolved);
        setState({ user: resolved?.user ?? null, session: resolved, loading: false });
      })
      .catch((err) => {
        initialSessionResolved.current = true;
        const resolved = pendingSession.current;
        if (resolved) hadSession.current = true;
        console.error('[useAuth] getSession error:', err, 'pending:', !!resolved);
        setState({ user: resolved?.user ?? null, session: resolved, loading: false });
      });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { user: state.user, session: state.session, loading: state.loading, signOut, hadSession };
}
