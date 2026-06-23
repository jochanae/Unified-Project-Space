import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, SUBSCRIPTION_TIERS } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { supabase } from '@/integrations/supabase/client';
import intoiqLogo from '@/assets/intoiq-logo.png';
import {
  CheckCircle2,
  Target,
  ArrowLeft,
  Loader2,
  Crown,
} from 'lucide-react';
import { toast } from 'sonner';

const pricingPlans = [
  {
    id: 'free' as const,
    name: 'Learner',
    price: '$0',
    description: 'Start your financial education',
    features: [
      '10 AI conversations/month',
      'My Money Plan (goal tracking)',
      'Strategy calculator',
      'Trade journal',
      'Paper trading (Youth Mode)',
      'Youth Mode',
      'Glossary & resources',
    ],
    cta: 'Start Free',
    highlighted: false,
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    price: '$39',
    period: '/month',
    description: 'For serious investors',
    features: [
      'Unlimited AI conversations',
      'Everything in Learner',
      'My Finances (budget & savings tracker)',
      'Advanced analytics dashboard',
      'Multi-broker CSV import',
      'Export reports (PDF & CSV)',
      'AI trade analysis',
    ],
    cta: 'Go Pro',
    highlighted: true,
  },
];

export default function Pricing() {
  const { user, session, subscriptionTier, isSubscribed } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSelectPlan = async (planId: 'free' | 'learner' | 'pro') => {
    if (planId === 'free') {
      if (user) {
        navigate('/dashboard');
      } else {
        navigate('/signup');
      }
      return;
    }

    if (!user || !session) {
      toast.info('Please sign in to subscribe');
      navigate('/login', { state: { from: { pathname: '/pricing' } } });
      return;
    }

    const priceId = SUBSCRIPTION_TIERS[planId].price_id;
    if (!priceId) {
      toast.error('Invalid plan selected');
      return;
    }

    setLoadingPlan(planId);

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
      setLoadingPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!session) return;

    setLoadingPlan('manage');

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Portal error:', error);
      toast.error('Failed to open subscription management. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const isCurrentPlan = (planId: string) => {
    return subscriptionTier === planId;
  };

  return (
    <div className="min-h-screen bg-background animated-gradient">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center group">
            <img 
              src={intoiqLogo} 
              alt="IntoIQ" 
              className="h-11 w-auto rounded-lg transition-transform duration-300 group-hover:scale-105"
            />
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user ? (
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Log in
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm" className="glow-button">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-24 sm:pt-32 pb-16 sm:pb-24">
        <div className="px-4 sm:px-6 lg:px-8 mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <Badge variant="secondary" className="mb-4 bg-primary/10 border-primary/20">
              <Target className="h-3 w-3 mr-1 text-primary" />
              <span className="text-primary">Pricing</span>
            </Badge>
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-3 sm:mb-4">
              Choose your <span className="gradient-text">path</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-lg px-4">
              Start free and upgrade as you grow. No hidden fees.
            </p>
          </div>

          {/* Current Subscription Status */}
          {user && isSubscribed && (
            <div className="max-w-md mx-auto mb-8">
              <Card className="border-gain/50 bg-gain/5">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Crown className="h-5 w-5 text-gain" />
                    <span className="font-medium">
                      You're on the {SUBSCRIPTION_TIERS[subscriptionTier].name} plan
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleManageSubscription}
                    disabled={loadingPlan === 'manage'}
                  >
                    {loadingPlan === 'manage' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Manage'
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 max-w-3xl mx-auto">
            {pricingPlans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative overflow-hidden h-full transition-all duration-500 ${
                  plan.highlighted
                    ? 'card-popular scale-105 z-10'
                    : 'border-border bg-card hover-elevate card-glow'
                } ${isCurrentPlan(plan.id) ? 'ring-2 ring-gain' : ''}`}
              >
                {plan.highlighted && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-primary to-gain py-1.5 text-center">
                    <span className="text-xs font-semibold text-primary-foreground">
                      Most Popular
                    </span>
                  </div>
                )}
                {isCurrentPlan(plan.id) && (
                  <div className="absolute top-0 right-0 m-2">
                    <Badge className="bg-gain text-gain-foreground">Your Plan</Badge>
                  </div>
                )}
                <CardContent
                  className={`p-8 relative ${plan.highlighted ? 'pt-12' : ''}`}
                >
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    {plan.description}
                  </p>

                  <div className="mb-8">
                    <span className="text-5xl font-bold">{plan.price}</span>
                    {plan.period && (
                      <span className="text-muted-foreground">{plan.period}</span>
                    )}
                  </div>

                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm">
                        <CheckCircle2 className="h-5 w-5 text-gain mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`w-full h-12 text-base ${
                      plan.highlighted
                        ? 'glow-button'
                        : 'hover:bg-primary hover:text-primary-foreground'
                    }`}
                    variant={plan.highlighted ? 'default' : 'outline'}
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={loadingPlan !== null || isCurrentPlan(plan.id)}
                  >
                    {loadingPlan === plan.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : isCurrentPlan(plan.id) ? (
                      'Current Plan'
                    ) : (
                      plan.cta
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Back link */}
          <div className="text-center mt-12">
            <Link to="/">
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
