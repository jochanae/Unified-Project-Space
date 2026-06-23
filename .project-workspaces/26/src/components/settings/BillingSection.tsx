import { useState } from 'react';
import { CreditCard, Check, Crown, Sparkles, Zap, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: PlanFeature[];
  isCurrent?: boolean;
  isPopular?: boolean;
  icon: React.ReactNode;
  gradient: string;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: '/forever',
    description: 'Get started with basic features',
    icon: <Zap className="h-5 w-5" />,
    gradient: 'from-slate-500 to-slate-600',
    features: [
      { text: 'Basic budget tracking', included: true },
      { text: 'Up to 3 accounts', included: true },
      { text: 'Monthly reports', included: true },
      { text: 'AI Coach (limited)', included: true },
      { text: 'Goals tracking', included: false },
      { text: 'Bill reminders', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$9.99',
    period: '/month',
    description: 'Everything you need to manage finances',
    icon: <Sparkles className="h-5 w-5" />,
    gradient: 'from-purple-500 to-purple-600',
    isPopular: true,
    isCurrent: true,
    features: [
      { text: 'Unlimited budget tracking', included: true },
      { text: 'Unlimited accounts', included: true },
      { text: 'Weekly & monthly reports', included: true },
      { text: 'AI Coach (unlimited)', included: true },
      { text: 'Goals tracking', included: true },
      { text: 'Bill reminders', included: true },
    ],
  },
  {
    id: 'family',
    name: 'Family',
    price: '$19.99',
    period: '/month',
    description: 'Perfect for families & households',
    icon: <Crown className="h-5 w-5" />,
    gradient: 'from-amber-500 to-orange-500',
    features: [
      { text: 'Everything in Pro', included: true },
      { text: 'Up to 5 family members', included: true },
      { text: 'Kids accounts (Bloom Buds)', included: true },
      { text: 'Family goals & challenges', included: true },
      { text: 'Priority support', included: true },
      { text: 'Advanced analytics', included: true },
    ],
  },
];

export function BillingSection() {
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const currentPlan = PLANS.find(p => p.isCurrent);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4 relative">
            <div className="absolute right-0 top-0 w-32 h-32 rounded-full bg-purple-100/50 dark:bg-purple-900/20" />
            
            <div className="relative z-10">
              <h2 className="text-2xl font-bold mb-1">Billing & Subscription</h2>
              <p className="text-muted-foreground">Manage your plan and payment methods</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Plan */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-gradient-to-br ${currentPlan?.gradient || 'from-purple-500 to-purple-600'} text-white`}>
                {currentPlan?.icon}
              </div>
              <div>
                <h3 className="font-semibold">Current Plan</h3>
                <p className="text-sm text-muted-foreground">Your active subscription</p>
              </div>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              Active
            </Badge>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-purple-100 dark:border-purple-800/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{currentPlan?.name} Plan</p>
                <p className="text-muted-foreground">{currentPlan?.price}{currentPlan?.period}</p>
              </div>
              <Sparkles className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Next billing date: January 10, 2025
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Available Plans</h3>
          </div>

          <div className="space-y-4">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all ${
                  selectedPlan === plan.id
                    ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-900/10'
                    : 'border-border hover:border-purple-300'
                }`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {plan.isPopular && (
                  <Badge className="absolute -top-2 right-4 bg-gradient-to-r from-purple-600 to-pink-600">
                    Most Popular
                  </Badge>
                )}
                {plan.isCurrent && (
                  <Badge className="absolute -top-2 left-4 bg-emerald-500">
                    Current
                  </Badge>
                )}

                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${plan.gradient} text-white`}>
                      {plan.icon}
                    </div>
                    <div>
                      <p className="font-semibold">{plan.name}</p>
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">{plan.price}</p>
                    <p className="text-xs text-muted-foreground">{plan.period}</p>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="grid grid-cols-2 gap-2">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <Check className={`h-4 w-4 ${feature.included ? 'text-emerald-500' : 'text-muted-foreground/30'}`} />
                      <span className={feature.included ? '' : 'text-muted-foreground/50 line-through'}>
                        {feature.text}
                      </span>
                    </div>
                  ))}
                </div>

                {!plan.isCurrent && (
                  <Button 
                    className="w-full mt-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle upgrade
                    }}
                  >
                    {plan.price === '$0' ? 'Downgrade' : 'Upgrade'} to {plan.name}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Payment Method</h3>
            </div>
            <Button variant="outline" size="sm">
              Add New
            </Button>
          </div>

          <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm opacity-80">Credit Card</p>
              <div className="flex gap-1">
                <div className="w-6 h-4 bg-red-500 rounded-sm" />
                <div className="w-6 h-4 bg-orange-500 rounded-sm opacity-80" />
              </div>
            </div>
            <p className="font-mono text-lg mb-4">•••• •••• •••• 4242</p>
            <div className="flex justify-between text-sm">
              <div>
                <p className="opacity-60">Card Holder</p>
                <p>Demo User</p>
              </div>
              <div className="text-right">
                <p className="opacity-60">Expires</p>
                <p>12/26</p>
              </div>
            </div>
          </div>

          <Button variant="outline" className="w-full mt-4">
            Update Payment Method
          </Button>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Billing History</h3>
          
          <div className="space-y-3">
            {[
              { date: 'Dec 10, 2024', amount: '$9.99', status: 'Paid' },
              { date: 'Nov 10, 2024', amount: '$9.99', status: 'Paid' },
              { date: 'Oct 10, 2024', amount: '$9.99', status: 'Paid' },
            ].map((invoice, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium">{invoice.date}</p>
                  <p className="text-sm text-muted-foreground">Pro Plan - Monthly</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{invoice.amount}</p>
                  <Badge variant="outline" className="text-emerald-600">
                    {invoice.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          <Button variant="link" className="w-full mt-2 text-purple-600">
            View All Invoices
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
