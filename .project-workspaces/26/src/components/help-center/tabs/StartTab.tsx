import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Rocket, Wallet, Target, PiggyBank, CreditCard, TrendingUp, CheckCircle2, Users } from "lucide-react";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

interface StartTabProps {
  searchQuery?: string;
}

const gettingStartedSteps = [
  {
    icon: Wallet,
    title: "Set Up Your Accounts",
    description: "Add your bank accounts, credit cards, and other financial accounts to get a complete picture of your finances.",
    steps: [
      "Go to the Accounts page",
      "Click 'Add Account'",
      "Choose manual entry or connect via Plaid",
      "Enter your account details and current balance"
    ]
  },
  {
    icon: Target,
    title: "Create Your First Budget",
    description: "Set spending limits for different categories to stay on track with your financial goals.",
    steps: [
      "Navigate to the Budgets page",
      "Click 'Create Budget'",
      "Choose a category (Food, Entertainment, etc.)",
      "Set your monthly spending limit"
    ]
  },
  {
    icon: PiggyBank,
    title: "Set Savings Goals",
    description: "Define what you're saving for and track your progress toward reaching those goals.",
    steps: [
      "Go to the Goals page",
      "Click 'Create Goal'",
      "Name your goal and set a target amount",
      "Add contributions as you save"
    ]
  },
  {
    icon: CreditCard,
    title: "Track Your Bills",
    description: "Never miss a payment by adding your recurring bills and setting up reminders.",
    steps: [
      "Navigate to the Bills page",
      "Click 'Add Bill'",
      "Enter the bill name, amount, and due date",
      "Enable reminders to get notified before bills are due"
    ]
  },
  {
    icon: TrendingUp,
    title: "Monitor Your Credit",
    description: "Keep track of your credit score and get tips on how to improve it over time.",
    steps: [
      "Go to the Credit page",
      "Add your credit score manually",
      "Set a credit score goal",
      "Track changes over time"
    ]
  },
  {
    icon: Users,
    title: "Set Up KidsBloom (Optional)",
    description: "Teach your children about money with interactive tools, games, and lessons. Create family groups to manage together.",
    steps: [
      "Go to the Kids page from the menu",
      "Create a kid profile with a PIN",
      "Assign chores with rewards to teach earning",
      "Explore games, lessons, and stories for financial literacy"
    ]
  }
];

export const StartTab = ({ searchQuery = "" }: StartTabProps) => {
  const { isFeatureEnabled } = useFeatureFlags();
  
  const filteredSteps = gettingStartedSteps.filter(step => {
    // Hide kids step when kids feature is disabled
    if (step.title.includes("KidsBloom") && !isFeatureEnabled('kids')) return false;
    
    return !searchQuery || 
      step.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      step.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      step.steps.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card className="bg-gradient-to-br from-primary/10 via-card to-accent/5 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/20">
              <Rocket className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Welcome! Let's Get Started</CardTitle>
              <p className="text-muted-foreground text-sm mt-1">
                Your journey to financial wellness starts here
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-foreground">
            CoinsBloom helps you take control of your finances by tracking your spending, 
            setting budgets, achieving savings goals, and building better money habits. 
            Follow these steps to get started.
          </p>
        </CardContent>
      </Card>

      {/* Getting Started Steps */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Getting Started Guide</h2>
        
        {filteredSteps.map((step, index) => {
          const Icon = step.icon;
          return (
            <Card key={index} className="bg-card border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="text-primary font-bold">Step {index + 1}:</span>
                      {step.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {step.description}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="ml-11 space-y-2">
                  {step.steps.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-bloom-green shrink-0 mt-0.5" />
                      <span className="text-foreground">{s}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Tips */}
      <Card className="bg-muted/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-base">💡 Quick Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-foreground">
            <strong>Sync regularly:</strong> Keep your account balances up to date for accurate insights.
          </p>
          <p className="text-sm text-foreground">
            <strong>Check weekly:</strong> Review your spending at least once a week to stay on budget.
          </p>
          <p className="text-sm text-foreground">
            <strong>Celebrate wins:</strong> When you hit a goal or stay under budget, take a moment to appreciate your progress!
          </p>
          <p className="text-sm text-foreground">
            <strong>Simple Mode:</strong> Want a streamlined experience? Go to Settings and enable "Simple Mode" to focus on core budgeting features only.
          </p>
          <p className="text-sm text-foreground">
            <strong>Meet Bloom:</strong> Open the Bloom Workstation (the Inner Sanctum) for your Financial Architect. She uses Strategic Memory to remember your plans across sessions and turns conversations into Strategic Blueprints.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
