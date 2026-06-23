import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Wallet, Target, PiggyBank, CreditCard, TrendingUp, Users, 
  BarChart3, Bell, Shield, Smartphone, ArrowRight, Sparkles 
} from "lucide-react";

const features = [
  {
    icon: Wallet,
    title: "Smart Budgeting",
    description: "Create and manage budgets with intelligent category tracking. Set limits, get alerts, and stay on track.",
  },
  {
    icon: Target,
    title: "Goal Tracking",
    description: "Set financial goals and track your progress. Collaborate with family members on shared goals.",
  },
  {
    icon: PiggyBank,
    title: "Savings Automation",
    description: "Automate your savings with smart rules. Link budgets to goals for hands-free wealth building.",
  },
  {
    icon: CreditCard,
    title: "Bill Management",
    description: "Never miss a payment. Auto-detect recurring bills from your bank, get push notifications, and manage payments.",
  },
  {
    icon: TrendingUp,
    title: "Credit Monitoring",
    description: "Track your credit score over time. Set improvement goals and get personalized tips.",
  },
  {
    icon: Users,
    title: "Family Finance",
    description: "Manage kids' finances, assign chores, teach money skills with KidsBloom.",
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    description: "Visualize your spending patterns with detailed charts and exportable reports.",
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    description: "Instant push notifications for budget thresholds, upcoming bills, and important financial events.",
  },
  {
    icon: Shield,
    title: "Bank-Level Security",
    description: "Your data is protected with enterprise-grade encryption and secure authentication.",
  },
  {
    icon: Smartphone,
    title: "Mobile Ready",
    description: "Access your finances anywhere. Works seamlessly on desktop, tablet, and mobile.",
  },
];

export default function Features() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50/80 via-purple-50/60 to-pink-50/80 dark:from-slate-950 dark:via-purple-950/20 dark:to-slate-950">
      <Helmet>
        <title>Features | CoinsBloom - Complete Financial Wellness Platform</title>
        <meta name="description" content="Explore all CoinsBloom features: budgeting, goal tracking, bill management, credit monitoring, family finance tools, and more." />
      </Helmet>

      <Navbar />
      
      <main className="flex-grow">
        {/* Hero */}
        <section className="container py-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">All-in-One Financial Platform</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Everything You Need to Master Your Money
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            From daily budgeting to long-term goals, CoinsBloom has the tools to help you build wealth and financial confidence.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/signup">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/pricing">View Pricing</Link>
            </Button>
          </div>
        </section>

        {/* Features Grid */}
        <section className="container py-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="border-2 hover:border-primary/30 transition-colors">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container py-16">
          <div className="bg-primary/5 rounded-2xl p-8 md:p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Take Control?</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Join thousands of users who are already building better financial habits with CoinsBloom.
            </p>
            <Button size="lg" asChild>
              <Link to="/signup">
                Start Free Today
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}