import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ArrowRight, Building2, Gift, Crown } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Full-featured financial management for individuals.",
    features: [
      "Unlimited transactions",
      "Budgets, goals & accounts",
      "Bills tracking with reminders",
      "Debt manager (DTI, Snowball/Avalanche)",
      "Credit score tracking & simulator",
      "Advanced tools (Tax, Insurance, Business, Charity)",
      "Vision board",
      "Reports with PDF/CSV export",
      "Money Academy education",
      "Voice commands & SMS tracking",
      "KidsBloom (up to 2 kids)",
      "Bloom — Financial Architect (3/day)",
      "Join collaborative goals & budgets",
    ],
    cta: "Get Started Free",
    href: "/signup",
    popular: false,
  },
  {
    name: "Premium",
    price: "$9.99",
    period: "/month",
    description: "Everything in Free, plus family features & unlimited AI.",
    features: [
      "Everything in Free",
      "Unlimited Bloom — Financial Architect",
      "KidsBloom Premium (3+ kids)",
      "Family group chat",
      "Shared chore board",
      "CREATE collaborative goals & budgets",
      "Plaid bank linking (auto-sync)",
      "Priority support",
    ],
    cta: "Start Premium",
    href: "/signup?plan=premium",
    popular: true,
  },
];

export default function Pricing() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50/80 via-purple-50/60 to-pink-50/80 dark:from-slate-950 dark:via-purple-950/20 dark:to-slate-950">
      <Helmet>
        <title>Pricing | CoinsBloom - Affordable Financial Wellness</title>
        <meta name="description" content="Choose the CoinsBloom plan that's right for you. Free forever plan available. Premium features starting at $9.99/month." />
      </Helmet>

      <Navbar />
      
      <main className="flex-grow">
        {/* Hero */}
        <section className="container py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start free and upgrade when you're ready. No hidden fees, cancel anytime.
          </p>
        </section>

        {/* Pricing Cards */}
        <section className="container pb-16">
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {plans.map((plan) => (
              <Card 
                key={plan.name} 
                className={`relative border-2 ${plan.popular ? 'border-primary shadow-lg scale-105' : 'border-border'}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-sm font-medium rounded-full flex items-center gap-1">
                    <Crown className="h-3.5 w-3.5" />
                    Most Popular
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <CardDescription className="mt-2">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full" 
                    variant={plan.popular ? "default" : "outline"}
                    asChild
                  >
                    <Link to={plan.href}>
                      {plan.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Referral Section */}
        <section className="container pb-16">
          <Card className="max-w-3xl mx-auto border-2 border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-purple-500/5">
            <CardHeader className="text-center">
              <div className="mx-auto h-12 w-12 rounded-lg bg-pink-500/10 flex items-center justify-center mb-4">
                <Gift className="h-6 w-6 text-pink-500" />
              </div>
              <CardTitle className="text-2xl">Refer & Earn</CardTitle>
              <CardDescription>
                Know a business that could benefit from CoinsBloom? Earn 10-15% monthly commission for up to 12 months.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button asChild variant="outline" className="border-pink-500/30 hover:bg-pink-500/10">
                <Link to="/refer">
                  Learn About Referrals
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* B2B Section */}
        <section className="container pb-16">
          <Card className="max-w-3xl mx-auto border-2 border-primary/20 bg-primary/5">
            <CardHeader className="text-center">
              <div className="mx-auto h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">For Businesses & Partners</CardTitle>
              <CardDescription>
                Offer financial wellness to your team or clients with our B2B partner program.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Custom branded portal</li>
                <li>• Team management dashboard</li>
                <li>• Volume pricing starting at $29/mo + $7/seat</li>
              </ul>
              <Button asChild>
                <Link to="/partner/signup">
                  Become a Partner
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
}