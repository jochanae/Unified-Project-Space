import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Brain, 
  FileText, 
  Bell, 
  CreditCard,
  Crown,
  Lock
} from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { AIImprovementPlanDialog } from './tools/AIImprovementPlanDialog';
import { DisputeLetterDialog } from './tools/DisputeLetterDialog';
import { UtilizationAlertsDialog } from './tools/UtilizationAlertsDialog';
import { CardRecommendationsDialog } from './tools/CardRecommendationsDialog';

const premiumFeatures = [
  {
    id: 'ai-improvement',
    title: 'AI-Powered Improvement Plans',
    description: 'Get personalized, step-by-step strategies to boost your credit score based on your unique financial profile.',
    icon: <Brain className="h-6 w-6" />,
    color: 'from-purple-600 to-indigo-600',
  },
  {
    id: 'dispute-templates',
    title: 'Dispute Letter Templates',
    description: 'Access professionally written templates to dispute errors on your credit report and protect your score.',
    icon: <FileText className="h-6 w-6" />,
    color: 'from-blue-600 to-cyan-600',
  },
  {
    id: 'utilization-alerts',
    title: 'Credit Utilization Alerts',
    description: 'Receive smart notifications when your utilization approaches thresholds that could impact your score.',
    icon: <Bell className="h-6 w-6" />,
    color: 'from-amber-600 to-orange-600',
  },
  {
    id: 'card-recommendations',
    title: 'Personalized Card Recommendations',
    description: 'Get AI-matched credit card suggestions based on your credit score, spending habits, and goals.',
    icon: <CreditCard className="h-6 w-6" />,
    color: 'from-emerald-600 to-teal-600',
  },
];

const CreditPremiumFeatures = () => {
  const { subscribed, tier } = useSubscription();
  const isPremium = subscribed || tier === 'premium' || tier === 'family';

  const [openDialog, setOpenDialog] = useState<string | null>(null);

  const handleOpenTool = (id: string) => {
    setOpenDialog(id);
  };

  return (
    <div className="space-y-6">
      {/* Section Header with Color Accent */}
      <div className="flex items-center gap-3 pb-2 border-b border-purple-500/30">
        <div className="p-2 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600">
          <Crown className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Premium Credit Tools</h2>
          <p className="text-sm text-muted-foreground">
            {isPremium 
              ? 'Your advanced credit improvement tools'
              : 'Upgrade to unlock powerful credit tools'
            }
          </p>
        </div>
        {isPremium && (
          <Badge className="ml-auto bg-purple-500/20 text-purple-400 border-purple-500/30">
            <Sparkles className="h-3 w-3 mr-1" />
            Active
          </Badge>
        )}
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {premiumFeatures.map((feature, index) => (
          <motion.div
            key={feature.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="h-full bg-muted/30 border-muted-foreground/20 hover:border-primary/30 transition-all group">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${feature.color} text-white flex-shrink-0`}>
                    {feature.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                      {feature.title}
                      {!isPremium && (
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                    {isPremium && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="mt-3 gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                        onClick={() => handleOpenTool(feature.id)}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Open Tool
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Upgrade CTA for free users */}
      {!isPremium && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-gradient-to-r from-primary via-primary/90 to-primary/80 border-0 text-primary-foreground overflow-hidden relative">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
            <CardContent className="p-6 relative z-10">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-2xl font-bold mb-2">Unlock All Premium Features</h3>
                  <p className="text-primary-foreground/80 mb-4">
                    Get AI-powered improvement plans, dispute templates, smart alerts, and personalized recommendations.
                  </p>
                  <Button size="lg" variant="secondary" className="gap-2">
                    <Crown className="h-4 w-4" />
                    Upgrade to Premium
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tool Dialogs */}
      <AIImprovementPlanDialog open={openDialog === 'ai-improvement'} onOpenChange={(o) => !o && setOpenDialog(null)} />
      <DisputeLetterDialog open={openDialog === 'dispute-templates'} onOpenChange={(o) => !o && setOpenDialog(null)} />
      <UtilizationAlertsDialog open={openDialog === 'utilization-alerts'} onOpenChange={(o) => !o && setOpenDialog(null)} />
      <CardRecommendationsDialog open={openDialog === 'card-recommendations'} onOpenChange={(o) => !o && setOpenDialog(null)} />
    </div>
  );
};

export default CreditPremiumFeatures;
