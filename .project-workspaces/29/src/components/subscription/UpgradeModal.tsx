import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Sparkles, Rocket, Loader2 } from 'lucide-react';
import { useAuth, SUBSCRIPTION_TIERS, SubscriptionTier } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
  requiredTier: 'pro';
  description?: string;
}

const tierInfo = {
  pro: {
    icon: Crown,
    color: 'from-amber-500 to-orange-500',
    price: '$39',
    benefits: [
      'Unlimited AI conversations',
      'My Finances (budget & savings tracker)',
      'Advanced analytics dashboard',
      'Multi-broker CSV import',
      'Export reports (PDF & CSV)',
      'AI trade analysis',
    ],
  },
};

export function UpgradeModal({
  open,
  onOpenChange,
  feature,
  requiredTier,
  description,
}: UpgradeModalProps) {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const info = tierInfo[requiredTier];
  const Icon = info.icon;

  const handleUpgrade = async () => {
    if (!session) {
      onOpenChange(false);
      navigate('/login', { state: { from: { pathname: '/pricing' } } });
      return;
    }

    const priceId = SUBSCRIPTION_TIERS[requiredTier].price_id;
    if (!priceId) {
      navigate('/pricing');
      onOpenChange(false);
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setIsLoading(false);
      onOpenChange(false);
    }
  };

  const handleViewPricing = () => {
    onOpenChange(false);
    navigate('/pricing');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-chart-3/20">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${info.color}`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
          </div>
          <DialogTitle className="text-xl">
            Unlock {feature}
          </DialogTitle>
          <DialogDescription className="text-center">
            {description || `This feature requires the ${SUBSCRIPTION_TIERS[requiredTier].name} plan or higher.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge className={`bg-gradient-to-r ${info.color} text-white border-0`}>
                  {SUBSCRIPTION_TIERS[requiredTier].name}
                </Badge>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold">{info.price}</span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
            </div>
            <ul className="space-y-2">
              {info.benefits.map((benefit) => (
                <li key={benefit} className="flex items-center gap-2 text-sm">
                  <Rocket className="h-4 w-4 text-gain shrink-0" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={handleUpgrade}
            disabled={isLoading}
            className={`w-full bg-gradient-to-r ${info.color} hover:opacity-90`}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Icon className="mr-2 h-4 w-4" />
                Upgrade to {SUBSCRIPTION_TIERS[requiredTier].name}
              </>
            )}
          </Button>
          <Button variant="ghost" onClick={handleViewPricing}>
            Compare all plans
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
