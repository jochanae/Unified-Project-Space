import { Check } from "lucide-react";

const journeys = [
  {
    title: "Budget Beginner",
    description: "Start your money journey with solid fundamentals",
    audience: "Students, young adults, new to budgeting",
    features: ["Unlimited budgets & transactions", "Bill reminders", "Up to 5 savings goals", "Smart Insights"],
    recommendation: "FREE - Everything you need",
  },
  {
    title: "Team Finance",
    description: "Build your financial future together with partners or family",
    audience: "Couples, roommates, family households",
    features: ["CREATE collaborative budgets & goals", "Joint financial planning", "Shared vision board", "Real-time syncing"],
    recommendation: "Premium - $9.99/mo",
  },
  {
    title: "Teaching Kids Money",
    description: "Kids use CoinsBloom FREE, parents monitor for FREE or manage actively with Premium",
    audience: "Parent with kids",
    features: ["Kids App (100% FREE)", "View & monitor kids' accounts (FREE)", "Active management - allowances & chores (Premium)", "Money Academy"],
    recommendation: "FREE for viewing + Premium for active management",
  },
  {
    title: "Financial Optimizer",
    description: "Unlock full power with AI, automation & advanced tools",
    audience: "Power users, debt payoff focused, wealth building",
    features: ["Bloom — Financial Architect", "What-If simulator", "Bank linking & autopay", "Advanced analytics & exports"],
    recommendation: "Premium - $9.99/mo",
  },
];

export const UserJourneysSection = () => {
  return (
    <section className="container py-20">
      <div className="text-center mb-12">
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
          Built For Your Journey
        </h2>
        <p className="text-muted-foreground text-lg">
          Whatever your financial goals, we have the tools to help you succeed
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {journeys.map((journey) => (
          <div
            key={journey.title}
            className="p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
          >
            <h3 className="font-display text-xl font-bold mb-2">{journey.title}</h3>
            <p className="text-muted-foreground mb-2">{journey.description}</p>
            <p className="text-sm text-bloom-purple font-medium mb-4">
              Perfect for: {journey.audience}
            </p>

            <ul className="space-y-2 mb-4">
              {journey.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-bloom-green flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="pt-4 border-t border-border">
              <p className="text-sm">
                <span className="text-muted-foreground">Recommended: </span>
                <span className="font-semibold text-bloom-purple">{journey.recommendation}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
