import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SubscriptionState {
  subscribed: boolean;
  tier: "free" | "premium" | "family";
  productId: string | null;
  subscriptionEnd: string | null;
  loading: boolean;
  error: string | null;
}

const FIRST_LOGIN_KEY = "coinsbloom_first_login_shown";

export function useSubscription() {
  const { user, session } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    tier: "free",
    productId: null,
    subscriptionEnd: null,
    loading: true,
    error: null,
  });
  const [showFirstLoginModal, setShowFirstLoginModal] = useState(false);

  const checkSubscription = useCallback(async () => {
    if (!session?.access_token) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      setState({
        subscribed: data.subscribed || false,
        tier: data.tier || "free",
        productId: data.product_id || null,
        subscriptionEnd: data.subscription_end || null,
        loading: false,
        error: null,
      });

      // Check if this is first login and user is on free tier
      // Only show modal once - check localStorage synchronously before setting state
      const hasShownModal = localStorage.getItem(FIRST_LOGIN_KEY);
      if (!hasShownModal && !data.subscribed) {
        // Set localStorage FIRST before triggering modal
        localStorage.setItem(FIRST_LOGIN_KEY, "true");
        setShowFirstLoginModal(true);
      }
    } catch (error: any) {
      console.error("Error checking subscription:", error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (user && session) {
      checkSubscription();
    } else {
      setState({
        subscribed: false,
        tier: "free",
        productId: null,
        subscriptionEnd: null,
        loading: false,
        error: null,
      });
    }
  }, [user, session, checkSubscription]);

  // Auto-refresh subscription status every 60 seconds
  useEffect(() => {
    if (!user || !session) return;

    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, session, checkSubscription]);

  const openCustomerPortal = async () => {
    if (!session?.access_token) {
      console.error("No session available");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      console.error("Error opening customer portal:", error);
    }
  };

  const dismissFirstLoginModal = () => {
    setShowFirstLoginModal(false);
  };

  return {
    ...state,
    checkSubscription,
    openCustomerPortal,
    showFirstLoginModal,
    dismissFirstLoginModal,
  };
}
