import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { IdleTimeoutModal } from '@/components/auth/IdleTimeoutModal';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const clearLocalAuthArtifacts = () => {
    localStorage.removeItem("kidsbloom_session");
    sessionStorage.removeItem("kidsbloom_profile");

    // Defensive: remove persisted auth tokens + PKCE helpers (prevents "sticky" sessions)
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("sb-")) {
          localStorage.removeItem(key);
        }
        if (key.startsWith("supabase.auth.")) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // ignore
    }
  };

  const handleSignOut = async () => {
    // Immediately clear in-memory state so UI updates even if events are delayed.
    setSession(null);
    setUser(null);

    // Clear local artifacts first so the UI isn't blocked by a slow sign-out request.
    clearLocalAuthArtifacts();

    // Try to sign out, but don't hang forever.
    let error: any = null;
    try {
      const result: any = await Promise.race([
        supabase.auth.signOut({ scope: "local" }),
        new Promise((resolve) => setTimeout(() => resolve({ error: null }), 2500)),
      ]);
      error = result?.error ?? null;
    } catch {
      // ignore
    } finally {
      clearLocalAuthArtifacts();
    }

    if (error) {
      console.error("Sign out error:", error);
    }
  };

  // Idle timeout - 15 min warning, 30 min auto-logout
  const { showWarning, remainingTime, stayActive } = useIdleTimeout({
    warningTimeout: 15 * 60 * 1000,  // 15 minutes
    logoutTimeout: 30 * 60 * 1000,   // 30 minutes
    onLogout: handleSignOut,
    enabled: !!user, // Only active when logged in
  });

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Log login events for engagement tracking (DAU/MAU)
        if (event === 'SIGNED_IN' && session?.user) {
          // Use setTimeout to avoid blocking the auth flow
          setTimeout(async () => {
            try {
              await supabase.rpc('log_audit_event', {
                p_action: 'login',
                p_entity_type: 'user',
                p_entity_id: session.user.id,
                p_details: { provider: session.user.app_metadata?.provider || 'email' }
              });
            } catch (err) {
              console.error('Failed to log login event:', err);
            }
          }, 100);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    // Ensure we start from a clean slate (prevents session crossover / "already signed in" loop)
    setSession(null);
    setUser(null);

    clearLocalAuthArtifacts();

    // Best-effort local sign-out (don’t hang the UI if it’s slow)
    try {
      await Promise.race([
        supabase.auth.signOut({ scope: "local" }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("signOut timeout")), 2500)),
      ]);
    } catch {
      // ignore
    } finally {
      clearLocalAuthArtifacts();
    }

    const redirectUrl = `${window.location.origin}/auth/callback`;

    // Use manual redirect for maximum reliability (prevents iframe/popup oddities)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
        queryParams: { prompt: "select_account" },
      },
    });

    if (error) throw error;
    if (!data?.url) throw new Error("Google sign-in URL was not returned.");

    window.location.assign(data.url);
  };

  const signOut = async () => {
    await handleSignOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithGoogle, signOut }}>
      {children}
      <IdleTimeoutModal
        open={showWarning}
        remainingTime={remainingTime}
        onStayActive={stayActive}
        onLogout={handleSignOut}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
