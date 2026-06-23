import Stripe from "https://esm.sh/stripe@18.5.0";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PREMIUM-CHECK] ${step}${detailsStr}`);
};

/**
 * Check if user has premium subscription
 * Uses cached status from profiles table first, falls back to Stripe API
 * Updates cache when checking Stripe
 */
export async function checkUserPremium(
  supabaseClient: any, 
  userId: string,
  forceRefresh = false
): Promise<{ isPremium: boolean; stripeCustomerId?: string }> {
  try {
    // Get cached premium status from profiles
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('email, is_premium, premium_until, stripe_customer_id, premium_checked_at')
      .eq('id', userId)
      .single();
    
    if (!profile?.email) {
      return { isPremium: false };
    }

    // Check if cached status is still valid (checked within last hour and not expired)
    const cacheAge = profile.premium_checked_at 
      ? Date.now() - new Date(profile.premium_checked_at).getTime()
      : Infinity;
    const cacheValidMs = 60 * 60 * 1000; // 1 hour
    
    const premiumNotExpired = profile.premium_until 
      ? new Date(profile.premium_until) > new Date()
      : false;
    
    // Use cache if valid and not forcing refresh
    if (!forceRefresh && cacheAge < cacheValidMs && profile.is_premium !== null) {
      logStep("Using cached premium status", { 
        isPremium: profile.is_premium && premiumNotExpired,
        cacheAgeMinutes: Math.round(cacheAge / 60000)
      });
      return { 
        isPremium: profile.is_premium && premiumNotExpired,
        stripeCustomerId: profile.stripe_customer_id 
      };
    }

    // Fetch from Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("No Stripe key, defaulting to free");
      return { isPremium: false };
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Find or use cached customer ID
    let customerId = profile.stripe_customer_id;
    if (!customerId) {
      const customers = await stripe.customers.list({ email: profile.email, limit: 1 });
      if (customers.data.length === 0) {
        // No Stripe customer, update cache and return
        await updatePremiumCache(supabaseClient, userId, false, null, null);
        return { isPremium: false };
      }
      customerId = customers.data[0].id;
    }

    // Check for active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    
    const hasActiveSub = subscriptions.data.length > 0;
    const premiumUntil = hasActiveSub 
      ? new Date(subscriptions.data[0].current_period_end * 1000).toISOString()
      : null;

    // Update cache
    await updatePremiumCache(supabaseClient, userId, hasActiveSub, premiumUntil, customerId);

    logStep("Fetched premium status from Stripe", { isPremium: hasActiveSub, customerId });
    return { isPremium: hasActiveSub, stripeCustomerId: customerId };

  } catch (error) {
    logStep("Premium check failed, defaulting to free", { error: String(error) });
    return { isPremium: false };
  }
}

/**
 * Update the cached premium status in profiles table
 */
async function updatePremiumCache(
  supabaseClient: any,
  userId: string,
  isPremium: boolean,
  premiumUntil: string | null,
  stripeCustomerId: string | null
): Promise<void> {
  try {
    await supabaseClient
      .from('profiles')
      .update({
        is_premium: isPremium,
        premium_until: premiumUntil,
        stripe_customer_id: stripeCustomerId,
        premium_checked_at: new Date().toISOString(),
      })
      .eq('id', userId);
  } catch (error) {
    console.error('Failed to update premium cache:', error);
  }
}

/**
 * Refresh premium status for a user (called by webhook or manual refresh)
 */
export async function refreshPremiumStatus(
  supabaseClient: any,
  userId: string
): Promise<boolean> {
  const { isPremium } = await checkUserPremium(supabaseClient, userId, true);
  return isPremium;
}
