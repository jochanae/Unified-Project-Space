import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { clearProfileCache } from "@/hooks/useProfile";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isReady: boolean;
  isVerified: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Photo-first avatar logic. On every signin we make sure profiles.avatar_url is populated:
 *   1. If the user already has a custom avatar saved → leave it alone.
 *   2. Else, if the OAuth provider gave us a photo (Google `picture` / `avatar_url`) → cache it.
 *   3. Else, the public board falls back to the gold initials medallion on its own.
 *
 * Runs once per signin, fire-and-forget. Failures are silent — this is a best-effort cache,
 * never block the auth flow on it.
 */
async function syncProviderAvatar(user: User): Promise<void> {
  try {
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const providerPhoto =
      (typeof meta.avatar_url === "string" && meta.avatar_url) ||
      (typeof meta.picture === "string" && meta.picture) ||
      null;
    if (!providerPhoto) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("avatar_url, avatar_mode")
      .eq("id", user.id)
      .maybeSingle();

    // Only fill the gap — never overwrite a user-uploaded photo or a previously cached one.
    if (!profile || profile.avatar_url) return;

    await supabase.from("profiles").update({ avatar_url: providerPhoto }).eq("id", user.id);
  } catch {
    // best-effort cache — ignore failures
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Listener first, then bootstrap
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
      setIsReady(true);
      if (newSession?.user) void syncProviderAvatar(newSession.user);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      setIsReady(true);
      if (data.session?.user) void syncProviderAvatar(data.session.user);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const user = session?.user ?? null;
  const isVerified = Boolean(user?.email_confirmed_at || user?.confirmed_at);

  const signOut = async () => {
    clearProfileCache();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, isReady, isVerified, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
