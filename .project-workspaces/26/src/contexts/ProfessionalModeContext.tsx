import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ProfessionalProfile {
  id: string;
  name: string;
  title: string | null;
  partner_id: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  is_featured: boolean;
}

interface ProfessionalStats {
  totalViews: number;
  viewsThisMonth: number;
  viewsThisWeek: number;
  totalReferrals: number;
  referralsThisMonth: number;
  convertedToPremium: number;
}

interface ProfessionalModeContextType {
  professional: ProfessionalProfile | null;
  stats: ProfessionalStats | null;
  loading: boolean;
  isProfessionalMode: boolean;
  toggleProfessionalMode: () => void;
  isLinkedProfessional: boolean;
  refreshStats: () => Promise<void>;
}

const ProfessionalModeContext = createContext<ProfessionalModeContextType | undefined>(undefined);

export function ProfessionalModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [professional, setProfessional] = useState<ProfessionalProfile | null>(null);
  const [stats, setStats] = useState<ProfessionalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProfessionalMode, setIsProfessionalMode] = useState(false);

  const fetchProfessionalProfile = useCallback(async () => {
    if (!user) {
      setProfessional(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("professionals")
        .select("id, name, title, partner_id, avatar_url, is_verified, is_featured")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      setProfessional(data);
    } catch (error) {
      console.error("Error fetching professional profile:", error);
      setProfessional(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchStats = useCallback(async () => {
    if (!professional) {
      setStats(null);
      return;
    }

    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).toISOString();

      // Fetch view stats
      const { data: viewsData, error: viewsError } = await supabase
        .from("professional_profile_views")
        .select("viewed_at")
        .eq("professional_id", professional.id);

      if (viewsError) throw viewsError;

      const totalViews = viewsData?.length || 0;
      const viewsThisMonth = viewsData?.filter(v => v.viewed_at >= startOfMonth).length || 0;
      const viewsThisWeek = viewsData?.filter(v => v.viewed_at >= startOfWeek).length || 0;

      // Fetch referral stats
      const { data: referralsData, error: referralsError } = await supabase
        .from("professional_referrals")
        .select("created_at, converted_to_premium")
        .eq("professional_id", professional.id);

      if (referralsError) throw referralsError;

      const totalReferrals = referralsData?.length || 0;
      const referralsThisMonth = referralsData?.filter(r => r.created_at >= startOfMonth).length || 0;
      const convertedToPremium = referralsData?.filter(r => r.converted_to_premium).length || 0;

      setStats({
        totalViews,
        viewsThisMonth,
        viewsThisWeek,
        totalReferrals,
        referralsThisMonth,
        convertedToPremium,
      });
    } catch (error) {
      console.error("Error fetching professional stats:", error);
      setStats(null);
    }
  }, [professional]);

  useEffect(() => {
    fetchProfessionalProfile();
  }, [fetchProfessionalProfile]);

  useEffect(() => {
    if (professional && isProfessionalMode) {
      fetchStats();
    }
  }, [professional, isProfessionalMode, fetchStats]);

  // Load saved mode preference
  useEffect(() => {
    if (professional) {
      const saved = localStorage.getItem(`professionalMode_${professional.id}`);
      if (saved === "true") {
        setIsProfessionalMode(true);
      }
    }
  }, [professional]);

  const toggleProfessionalMode = useCallback(() => {
    setIsProfessionalMode(prev => {
      const newValue = !prev;
      if (professional) {
        localStorage.setItem(`professionalMode_${professional.id}`, String(newValue));
      }
      return newValue;
    });
  }, [professional]);

  return (
    <ProfessionalModeContext.Provider
      value={{
        professional,
        stats,
        loading,
        isProfessionalMode,
        toggleProfessionalMode,
        isLinkedProfessional: !!professional,
        refreshStats: fetchStats,
      }}
    >
      {children}
    </ProfessionalModeContext.Provider>
  );
}

export function useProfessionalMode() {
  const context = useContext(ProfessionalModeContext);
  if (context === undefined) {
    throw new Error("useProfessionalMode must be used within a ProfessionalModeProvider");
  }
  return context;
}
