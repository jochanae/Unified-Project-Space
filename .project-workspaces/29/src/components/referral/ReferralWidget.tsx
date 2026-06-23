import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Gift, Copy, Users, CheckCircle2, Share2, Loader2, DollarSign, Sparkles, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

// Reward configuration
const FREE_USER_PRO_MONTHS_CAP = 3; // Max 3 months Pro from referrals
const FREE_USER_CREDIT_AFTER_CAP = 5; // $5 credit per referral after cap
const PRO_USER_CREDIT = 15; // $15 credit per referral for Pro users

// Helper to get reward info based on tier and existing rewards
const getReferralRewards = (tier: string, proMonthsEarned: number) => {
  if (tier === 'pro') {
    return {
      referrer: { type: 'credit', value: PRO_USER_CREDIT, description: `$${PRO_USER_CREDIT} account credit` },
      referee: { type: 'tier_unlock', value: '1 month Pro', description: '1 month free Pro' },
    };
  }
  
  // Free/Learner tier - check if cap reached
  if (proMonthsEarned >= FREE_USER_PRO_MONTHS_CAP) {
    return {
      referrer: { type: 'credit', value: FREE_USER_CREDIT_AFTER_CAP, description: `$${FREE_USER_CREDIT_AFTER_CAP} account credit` },
      referee: { type: 'tier_unlock', value: '1 month Pro', description: '1 month free Pro' },
    };
  }
  
  return {
    referrer: { type: 'tier_unlock', value: '1 month Pro', description: '1 month free Pro' },
    referee: { type: 'tier_unlock', value: '1 month Pro', description: '1 month free Pro' },
  };
};

export function ReferralWidget() {
  const { user, subscriptionTier } = useAuth();
  const queryClient = useQueryClient();

  // Get or create referral code
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile-referral', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Generate referral code if doesn't exist
  const generateCode = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      // Generate code
      const { data: codeData, error: codeError } = await supabase.rpc('generate_referral_code');
      if (codeError) throw codeError;

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ referral_code: codeData })
        .eq('user_id', user.id);

      if (updateError) throw updateError;
      return codeData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile-referral'] });
      toast.success('Referral code generated!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Get referral stats
  const { data: referralStats } = useQuery({
    queryKey: ['referral-stats', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id);

      if (error) throw error;

      const rewarded = data.filter((r) => r.status === 'rewarded');
      const proMonthsEarned = Math.min(rewarded.length, FREE_USER_PRO_MONTHS_CAP);
      const creditsEarned = rewarded.length > FREE_USER_PRO_MONTHS_CAP 
        ? (rewarded.length - FREE_USER_PRO_MONTHS_CAP) * FREE_USER_CREDIT_AFTER_CAP 
        : 0;

      return {
        total: data.length,
        signedUp: data.filter((r) => r.status !== 'pending').length,
        converted: data.filter((r) => r.status === 'converted' || r.status === 'rewarded').length,
        rewardsEarned: rewarded.length,
        proMonthsEarned,
        creditsEarned,
      };
    },
    enabled: !!user,
  });

  // Calculate rewards based on tier and earned rewards
  const proMonthsEarned = referralStats?.proMonthsEarned ?? 0;
  const rewards = getReferralRewards(subscriptionTier, proMonthsEarned);

  const referralCode = profile?.referral_code;
  const referralLink = referralCode
    ? `${window.location.origin}/signup?ref=${referralCode}`
    : null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const shareReferral = async () => {
    if (!referralLink) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join IntoIQ',
          text: 'Learn trading with IntoIQ! Use my referral link to get started:',
          url: referralLink,
        });
      } catch (e) {
        // User cancelled or share failed
      }
    } else {
      copyToClipboard(referralLink);
    }
  };

  if (!user) return null;

  return (
    <CollapsibleCard
      title="Refer & Earn"
      description="Earn rewards by inviting friends"
      icon={<Gift className="h-5 w-5 text-gold" />}
      defaultOpen={false}
      storageKey="referral-widget"
    >
      <div className="space-y-4">
        {/* Reward Info - Dynamic based on tier */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-gain/10 border border-gain/20 text-center">
            {rewards.referrer.type === 'credit' ? (
              <>
                <div className="flex items-center justify-center gap-1">
                  <DollarSign className="h-5 w-5 text-gain" />
                  <p className="text-2xl font-bold text-gain">{rewards.referrer.value}</p>
                </div>
                <p className="text-xs text-muted-foreground">You get credit</p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center gap-1">
                  <Sparkles className="h-4 w-4 text-gain" />
                  <p className="text-lg font-bold text-gain">{rewards.referrer.value}</p>
                </div>
                <p className="text-xs text-muted-foreground">You get free</p>
              </>
            )}
          </div>
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
            <div className="flex items-center justify-center gap-1">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-lg font-bold text-primary">{rewards.referee.value}</p>
            </div>
            <p className="text-xs text-muted-foreground">Friend gets free</p>
          </div>
        </div>
        
        {/* Tier-specific messaging */}
        {subscriptionTier === 'free' && proMonthsEarned < FREE_USER_PRO_MONTHS_CAP && (
          <p className="text-xs text-muted-foreground text-center">
            Refer friends to unlock Pro features for both of you! ({FREE_USER_PRO_MONTHS_CAP - proMonthsEarned} months left)
          </p>
        )}
        {subscriptionTier === 'free' && proMonthsEarned >= FREE_USER_PRO_MONTHS_CAP && (
          <p className="text-xs text-muted-foreground text-center">
            You've earned max Pro months! Now earn ${FREE_USER_CREDIT_AFTER_CAP} credit per referral.
          </p>
        )}
        {subscriptionTier === 'pro' && (
          <p className="text-xs text-muted-foreground text-center">
            Earn ${PRO_USER_CREDIT} credit toward your next billing when friends try Pro.
          </p>
        )}

        {/* Referral Code */}
        {referralCode ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted/50 rounded-lg px-4 py-3 font-mono text-xl font-semibold tracking-wider">
              {referralCode}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 shrink-0"
              onClick={() => copyToClipboard(referralCode)}
            >
              <Copy className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              className="h-12 w-12 shrink-0"
              onClick={shareReferral}
            >
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => generateCode.mutate()}
            disabled={generateCode.isPending || profileLoading}
            className="w-full"
          >
            {generateCode.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Generate My Referral Code
          </Button>
        )}

        {/* Stats */}
        {referralStats && referralStats.total > 0 && (
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Users className="h-4 w-4" />
                Referrals sent
              </span>
              <Badge variant="secondary">{referralStats.total}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                Signed up
              </span>
              <Badge variant="secondary">{referralStats.signedUp}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-muted-foreground flex items-center gap-1">
                <Gift className="h-4 w-4" />
                Rewards earned
              </span>
              <Badge className="bg-gold/10 text-gold">
                {subscriptionTier === 'free' 
                  ? referralStats.proMonthsEarned > 0 
                    ? `${referralStats.proMonthsEarned} mo Pro${referralStats.creditsEarned > 0 ? ` + $${referralStats.creditsEarned}` : ''}`
                    : 'None yet'
                  : `$${referralStats.rewardsEarned * PRO_USER_CREDIT} credit`}
              </Badge>
            </div>
          </div>
        )}

        {/* CoinsBloom subtle mention */}
        <div className="pt-3 border-t">
          <a
            href="https://coinsbloom.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors group"
          >
            <span>💰</span>
            <span>Smart budgeting with</span>
            <span className="font-semibold text-primary group-hover:underline">CoinsBloom</span>
            <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100" />
          </a>
        </div>
      </div>
    </CollapsibleCard>
  );
}
