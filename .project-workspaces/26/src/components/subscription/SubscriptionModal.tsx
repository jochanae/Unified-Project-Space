import { useState } from "react";
import { Check, Crown, Sparkles, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier?: string;
}

const PREMIUM_PRICE_ID = "price_1SQsvPC6CkNu7qeVPplfEDq9";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    tier: "free",
    features: [
      "Unlimited transactions & budgets",
      "Unlimited vision boards",
      "Monitor kids' accounts",
      "Smart Insights (AI tips)",
      "Join collaborative budgets & goals",
    ],
    popular: false,
  },
  {
    name: "Premium",
    price: "$9.99",
    period: "/month",
    tier: "premium",
    priceId: PREMIUM_PRICE_ID,
    features: [
      "Everything in Free",
      "Unlimited savings goals & SMS",
      "Bank linking & autopay",
      "CREATE collaborative budgets & goals",
      "Bloom — Financial Architect",
    ],
    popular: true,
  },
];

export function SubscriptionModal({ open, onOpenChange, currentTier = "free" }: SubscriptionModalProps) {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (priceId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold flex items-center justify-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Choose Your Plan
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          {plans.map((plan) => {
            const isCurrentPlan = plan.tier === currentTier;
            
            return (
              <div
                key={plan.name}
                className={`relative p-6 rounded-xl border-2 transition-all ${
                  plan.popular
                    ? "border-primary bg-primary/5 shadow-lg"
                    : "border-border bg-card"
                } ${isCurrentPlan ? "ring-2 ring-green-500" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-primary text-primary-foreground flex items-center gap-1">
                      <Crown className="h-3 w-3" />
                      Most Popular
                    </span>
                  </div>
                )}

                {isCurrentPlan && (
                  <div className="absolute -top-3 right-4">
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-500 text-white">
                      Current Plan
                    </span>
                  </div>
                )}

                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <div className="flex items-baseline justify-center">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground ml-1">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {plan.priceId ? (
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => handleSubscribe(plan.priceId!)}
                    disabled={loading || isCurrentPlan}
                  >
                    {loading ? "Loading..." : isCurrentPlan ? "Current Plan" : "Subscribe"}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant="outline"
                    disabled
                  >
                    {isCurrentPlan ? "Current Plan" : "Free Forever"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          ✓ Cancel anytime • ✓ Secure payment via Stripe • ✓ 24/7 Support
        </p>
      </DialogContent>
    </Dialog>
  );
}
