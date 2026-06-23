import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Stripe tier configuration - Learner is free, Pro is $39/month
export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Learner',
    price_id: null,
    product_id: null,
  },
  pro: {
    name: 'Pro',
    price_id: 'price_1Sx8gxDV9f0t2B692Dg755ng',
    product_id: 'prod_TuyeaOH8lw9PGt',
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;
export type UserRole = 'super_admin' | 'admin' | 'user';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  subscription_tier: string;
  stripe_customer_id: string | null;
  username: string | null;
  show_real_name: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole | null;
  isLoading: boolean;
  isSubscribed: boolean;
  subscriptionTier: SubscriptionTier;
  subscriptionEnd: string | null;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  checkSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('free');
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('[AUTH] Error fetching profile:', profileError);
        setIsProfileLoaded(true);
        return;
      }

      setProfile(profileData);

      // Fetch user role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (roleError) {
        console.error('[AUTH] Error fetching role:', roleError);
        setRole('user');
      } else {
        setRole(roleData.role as UserRole);
      }
    } catch (error) {
      console.error('[AUTH] Error in fetchProfile:', error);
    } finally {
      setIsProfileLoaded(true);
    }
  };

  const checkSubscription = async () => {
    if (!session?.access_token) return;

    // Auto-grant Pro access to admins
    if (role === 'admin' || role === 'super_admin') {
      setIsSubscribed(true);
      setSubscriptionTier('pro');
      setSubscriptionEnd(null);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('[AUTH] Error checking subscription:', error);
        return;
      }

      setIsSubscribed(data.subscribed);
      setSubscriptionEnd(data.subscription_end || null);

      // Determine tier from product_id
      if (data.subscribed && data.product_id) {
        if (data.product_id === SUBSCRIPTION_TIERS.pro.product_id || data.product_id === 'admin_override') {
          setSubscriptionTier('pro');
        } else {
          setSubscriptionTier('free');
        }
      } else {
        setSubscriptionTier('free');
      }
    } catch (error) {
      console.error('[AUTH] Error checking subscription:', error);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Set up auth state listener
    // The Supabase client handles token refresh automatically (autoRefreshToken: true).
    // We just respond to the events it emits.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('[AUTH] onAuthStateChange:', event, !!currentSession?.user);
        if (!isMounted) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // Use setTimeout to avoid potential Supabase auth deadlocks
          // (fetch calls during onAuthStateChange can block the auth flow)
          setTimeout(async () => {
            if (!isMounted) return;
            await fetchProfile(currentSession.user.id);
            if (isMounted) setIsLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
          setIsProfileLoaded(true);
          setIsSubscribed(false);
          setSubscriptionTier('free');
          setSubscriptionEnd(null);
          setIsLoading(false);
        }
      }
    );

    // Safety net: if auth never resolves within 8 seconds, stop loading
    // This prevents infinite "Authenticating..." screens
    const safetyTimer = setTimeout(() => {
      if (isMounted && isLoading) {
        console.warn('[AUTH] Safety timer: forcing loading to complete');
        setIsLoading(false);
        setIsProfileLoaded(true);
      }
    }, 8000);

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  // Check subscription when session or role changes
  useEffect(() => {
    if (session) {
      checkSubscription();

      // Auto-refresh subscription status every 5 minutes
      const interval = setInterval(checkSubscription, 300000);
      return () => clearInterval(interval);
    }
  }, [session, role]);

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName,
          },
        },
      });

      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('[AUTH] signIn called');
      const result = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      console.log('[AUTH] signInWithPassword result:', { error: result.error?.message, hasUser: !!result.data?.user, hasSession: !!result.data?.session });
      
      return { error: result.error ? new Error(result.error.message) : null };
    } catch (error) {
      console.log('[AUTH] signIn caught error:', error);
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
    setIsSubscribed(false);
    setSubscriptionTier('free');
    setSubscriptionEnd(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        isLoading: isLoading || !isProfileLoaded,
        isSubscribed,
        subscriptionTier,
        subscriptionEnd,
        signUp,
        signIn,
        signOut,
        checkSubscription,
      }}
    >
      {children}
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
