import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const KIDSBLOOM_SESSION_KEY = "kidsbloom_session";

interface KidProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  avatar_emoji: string | null;
  avatar_url: string | null;
  age_tier: "under_10" | "teen";
  current_balance: number;
  // New bucket balances
  spend_balance: number;
  save_balance: number;
  give_balance: number;
  // Split percentages for auto-allocation
  split_spend_percent: number;
  split_save_percent: number;
  split_give_percent: number;
  total_earned: number;
  total_spent: number;
  total_saved: number;
  streak_days: number;
  card_theme_id: string | null;
  dark_mode_enabled: boolean;
  notifications_enabled: boolean;
}

interface KidsSession {
  kidId: string;
  profileId: string;
  userId: string;
  timestamp: number;
}

export function useKidsSession() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<KidProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Get session from localStorage (persists across browser sessions)
  const getStoredSession = useCallback((): KidsSession | null => {
    try {
      const stored = localStorage.getItem(KIDSBLOOM_SESSION_KEY);
      if (stored) {
        const session = JSON.parse(stored) as KidsSession;
        // Session expires after 30 days
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        if (Date.now() - session.timestamp < thirtyDaysMs) {
          return session;
        }
        // Expired, clear it
        localStorage.removeItem(KIDSBLOOM_SESSION_KEY);
      }
    } catch (e) {
      console.error("Error reading kids session:", e);
      localStorage.removeItem(KIDSBLOOM_SESSION_KEY);
    }
    return null;
  }, []);

  // Store session in localStorage
  const storeSession = useCallback((kidProfile: KidProfile) => {
    const session: KidsSession = {
      kidId: kidProfile.id,
      profileId: kidProfile.id,
      userId: kidProfile.user_id,
      timestamp: Date.now(),
    };
    localStorage.setItem(KIDSBLOOM_SESSION_KEY, JSON.stringify(session));
    // Also keep in sessionStorage for backward compatibility
    sessionStorage.setItem("kidsbloom_profile", JSON.stringify(kidProfile));
  }, []);

  // Clear session
  const clearSession = useCallback(async () => {
    localStorage.removeItem(KIDSBLOOM_SESSION_KEY);
    sessionStorage.removeItem("kidsbloom_profile");
    setProfile(null);
    setIsAuthenticated(false);
    // Also sign out from auth (LOCAL only) — avoids revoking tokens and signing out other tabs/devices
    await supabase.auth.signOut({ scope: "local" });
  }, []);

  // Fetch profile from database using Supabase auth session
  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // First check if there's an active Supabase auth session
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      if (authSession?.user) {
        // User is authenticated with Supabase - fetch their kid profile
        const { data: profileData, error } = await supabase
          .from("kids_profiles")
          .select("*")
          .eq("user_id", authSession.user.id)
          .single();

        if (!error && profileData) {
          setProfile(profileData);
          setIsAuthenticated(true);
          storeSession(profileData);
          setIsLoading(false);
          return profileData;
        }
      }
      
      // Fall back to stored session (for backward compatibility)
      const storedSession = getStoredSession();
      
      if (!storedSession) {
        setIsLoading(false);
        setIsAuthenticated(false);
        return null;
      }

      // Try to fetch profile using stored session
      const { data: profileData, error } = await supabase
        .from("kids_profiles")
        .select("*")
        .eq("id", storedSession.profileId)
        .single();

      if (error || !profileData) {
        console.error("Profile not found:", error);
        localStorage.removeItem(KIDSBLOOM_SESSION_KEY);
        sessionStorage.removeItem("kidsbloom_profile");
        setIsLoading(false);
        setIsAuthenticated(false);
        return null;
      }

      setProfile(profileData);
      setIsAuthenticated(true);
      setIsLoading(false);
      return profileData;
    } catch (error) {
      console.error("Error fetching profile:", error);
      localStorage.removeItem(KIDSBLOOM_SESSION_KEY);
      sessionStorage.removeItem("kidsbloom_profile");
      setIsLoading(false);
      setIsAuthenticated(false);
      return null;
    }
  }, [getStoredSession, storeSession]);

  // Login function - called after successful authentication
  const login = useCallback(async (kidProfile: KidProfile) => {
    storeSession(kidProfile);
    setProfile(kidProfile);
    setIsAuthenticated(true);
    
    // Update last_active_at
    await supabase
      .from("kids_profiles")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", kidProfile.id);
  }, [storeSession]);

  // Logout function
  const logout = useCallback(async () => {
    await clearSession();
    navigate("/kidsbloom/login");
  }, [clearSession, navigate]);

  // Refresh profile from database
  const refreshProfile = useCallback(async () => {
    if (!profile) return null;
    
    const { data: profileData, error } = await supabase
      .from("kids_profiles")
      .select("*")
      .eq("id", profile.id)
      .single();

    if (!error && profileData) {
      setProfile(profileData);
      return profileData;
    }
    return null;
  }, [profile]);

  // Update profile locally (for immediate UI updates)
  const updateProfileLocal = useCallback((updates: Partial<KidProfile>) => {
    setProfile(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setIsAuthenticated(false);
          localStorage.removeItem(KIDSBLOOM_SESSION_KEY);
          sessionStorage.removeItem("kidsbloom_profile");
        } else if (event === 'SIGNED_IN' && session?.user) {
          // Defer the profile fetch to avoid deadlock
          setTimeout(() => {
            fetchProfile();
          }, 0);
        }
      }
    );

    // Initialize on mount
    fetchProfile();

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  return {
    profile,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshProfile,
    updateProfileLocal,
    clearSession,
  };
}
