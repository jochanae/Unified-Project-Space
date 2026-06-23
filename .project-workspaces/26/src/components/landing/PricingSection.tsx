import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";

const plans = [
  {
    name: "Free",
    description: "Complete budgeting for individuals & families",
    price: "$0",
    features: [
      "Unlimited transactions & budgets",
      "Unlimited vision boards",
      "Monitor kids' accounts (FREE)",
      "Smart Insights (AI tips)",
      "Join collaborative budgets & goals",
    ],
    cta: "Start Free",
    popular: false,
  },
  {
    name: "Premium",
    description: "AI power, automation & active family management",
    price: "$9.99",
    period: "/month",
    features: [
      "Everything in Free",
      "Unlimited savings goals & SMS",
      "Bank linking & autopay",
      "CREATE collaborative budgets & goals",
      "Bloom — Financial Architect",
    ],
    cta: "Go Premium",
    popular: true,
  },
];

export const PricingSection = () => {
  return (
    <section className="container py-20">
      <div className="text-center mb-4">
        <p className="text-bloom-purple font-medium mb-2">Simple, Transparent Pricing</p>
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
          Simple Plans. Powerful Tools.
        </h2>
        <p className="text-muted-foreground text-lg">
          Start free, upgrade when you're ready. No hidden fees.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-12">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative p-8 rounded-2xl border ${
              plan.popular
                ? "border-primary bg-card shadow-xl"
                : "border-border bg-card"
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-4 py-1 text-xs font-semibold rounded-full gradient-primary text-primary-foreground">
                  Most Popular
                </span>
              </div>
            )}

            <div className="text-center mb-6">
              <h3 className="font-display text-2xl font-bold mb-2">{plan.name}</h3>
              <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>
              <div className="flex items-baseline justify-center">
                <span className="font-display text-4xl font-bold">{plan.price}</span>
                {plan.period && (
                  <span className="text-muted-foreground ml-1">{plan.period}</span>
                )}
              </div>
            </div>

            <ul className="space-y-3 mb-8">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-bloom-green flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              className={`w-full ${plan.popular ? "gradient-primary border-0" : ""}`}
              variant={plan.popular ? "default" : "outline"}
              asChild
            >
              <Link
                to="/signup"
                onClick={() => trackEvent("pricing_cta_click", { plan: plan.name })}
              >
                {plan.cta}
              </Link>
            </Button>
          </div>
        ))}
      </div>

      <div className="text-center mt-8">
        <p className="text-sm text-muted-foreground">
          ✓ No credit card required for Free plan • ✓ Cancel anytime • ✓ Secure & Private
        </p>
        <Button variant="link" className="text-bloom-purple mt-2" asChild>
          <Link to="/pricing" onClick={() => trackEvent("pricing_view_full_comparison")}>View detailed feature comparison →</Link>
        </Button>
      </div>
    </section>
  );
};
