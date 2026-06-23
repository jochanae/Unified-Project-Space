import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Calculator, 
  CreditCard, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface SimulatorAction {
  id: string;
  label: string;
  description: string;
  impact: number; // positive = good for score, negative = bad
  category: 'positive' | 'negative' | 'neutral';
  enabled: boolean;
  hasSlider?: boolean;
  sliderValue?: number;
  sliderMax?: number;
  sliderLabel?: string;
}

interface CreditScoreSimulatorProps {
  currentScore: number;
}

const CreditScoreSimulator = ({ currentScore }: CreditScoreSimulatorProps) => {
  const [actions, setActions] = useState<SimulatorAction[]>([
    {
      id: 'pay-off-credit-card',
      label: 'Pay off credit card balance',
      description: 'Reducing credit utilization can boost your score',
      impact: 30,
      category: 'positive',
      enabled: false,
      hasSlider: true,
      sliderValue: 50,
      sliderMax: 100,
      sliderLabel: 'Balance to pay off',
    },
    {
      id: 'on-time-payments',
      label: 'Make 6 months of on-time payments',
      description: 'Payment history is 35% of your score',
      impact: 25,
      category: 'positive',
      enabled: false,
    },
    {
      id: 'lower-utilization',
      label: 'Lower credit utilization to under 30%',
      description: 'Keep balances low relative to credit limits',
      impact: 20,
      category: 'positive',
      enabled: false,
    },
    {
      id: 'dispute-errors',
      label: 'Dispute errors on credit report',
      description: 'Removing inaccuracies can help your score',
      impact: 15,
      category: 'positive',
      enabled: false,
    },
    {
      id: 'new-credit-card',
      label: 'Open a new credit card',
      description: 'Hard inquiry may temporarily lower score',
      impact: -10,
      category: 'negative',
      enabled: false,
    },
    {
      id: 'close-old-account',
      label: 'Close an old credit account',
      description: 'May reduce average account age and available credit',
      impact: -15,
      category: 'negative',
      enabled: false,
    },
    {
      id: 'miss-payment',
      label: 'Miss a payment (30+ days late)',
      description: 'Late payments can significantly hurt your score',
      impact: -80,
      category: 'negative',
      enabled: false,
    },
    {
      id: 'max-out-card',
      label: 'Max out a credit card',
      description: 'High utilization hurts your score',
      impact: -45,
      category: 'negative',
      enabled: false,
    },
  ]);

  const toggleAction = (id: string) => {
    setActions(prev => prev.map(action => 
      action.id === id ? { ...action, enabled: !action.enabled } : action
    ));
  };

  const updateSliderValue = (id: string, value: number) => {
    setActions(prev => prev.map(action => 
      action.id === id ? { ...action, sliderValue: value } : action
    ));
  };

  const resetAll = () => {
    setActions(prev => prev.map(action => ({ ...action, enabled: false })));
  };

  const calculateNewScore = (): number => {
    let totalImpact = 0;
    actions.forEach(action => {
      if (action.enabled) {
        if (action.hasSlider && action.sliderValue !== undefined) {
          totalImpact += Math.round(action.impact * (action.sliderValue / 100));
        } else {
          totalImpact += action.impact;
        }
      }
    });
    
    // Clamp between 300 and 850
    return Math.max(300, Math.min(850, currentScore + totalImpact));
  };

  const newScore = calculateNewScore();
  const scoreDiff = newScore - currentScore;
  const enabledCount = actions.filter(a => a.enabled).length;

  const getScoreColor = (score: number): string => {
    if (score >= 800) return 'text-emerald-500';
    if (score >= 740) return 'text-green-500';
    if (score >= 670) return 'text-lime-500';
    if (score >= 580) return 'text-yellow-500';
    return 'text-red-500';
  };

  const positiveActions = actions.filter(a => a.category === 'positive');
  const negativeActions = actions.filter(a => a.category === 'negative');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Credit Score Simulator
          </div>
          {enabledCount > 0 && (
            <Button variant="ghost" size="sm" onClick={resetAll} className="gap-1">
              <RefreshCw className="h-4 w-4" />
              Reset
            </Button>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          See how different actions might affect your credit score
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score Comparison */}
        <div className="flex items-center justify-center gap-8 p-6 bg-muted/30 rounded-xl">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Current Score</p>
            <p className={`text-4xl font-bold ${getScoreColor(currentScore)}`}>
              {currentScore}
            </p>
          </div>
          
          <motion.div
            animate={{ scale: scoreDiff !== 0 ? [1, 1.1, 1] : 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center"
          >
            {scoreDiff > 0 ? (
              <TrendingUp className="h-8 w-8 text-emerald-500" />
            ) : scoreDiff < 0 ? (
              <TrendingDown className="h-8 w-8 text-red-500" />
            ) : (
              <div className="h-8 w-8 flex items-center justify-center text-muted-foreground">—</div>
            )}
            <AnimatePresence mode="wait">
              <motion.span
                key={scoreDiff}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={`text-sm font-medium ${
                  scoreDiff > 0 ? 'text-emerald-500' : scoreDiff < 0 ? 'text-red-500' : 'text-muted-foreground'
                }`}
              >
                {scoreDiff > 0 ? '+' : ''}{scoreDiff} pts
              </motion.span>
            </AnimatePresence>
          </motion.div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Projected Score</p>
            <motion.p
              key={newScore}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className={`text-4xl font-bold ${getScoreColor(newScore)}`}
            >
              {newScore}
            </motion.p>
          </div>
        </div>

        {/* Actions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Positive Actions */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <h3 className="font-semibold text-foreground">Actions that may help</h3>
            </div>
            {positiveActions.map((action) => (
              <motion.div
                key={action.id}
                layout
                className={`p-4 rounded-lg border transition-colors ${
                  action.enabled 
                    ? 'bg-emerald-500/10 border-emerald-500/30' 
                    : 'bg-muted/30 border-transparent hover:border-muted-foreground/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Label htmlFor={action.id} className="font-medium cursor-pointer">
                        {action.label}
                      </Label>
                      <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 text-xs">
                        +{action.hasSlider && action.sliderValue 
                          ? Math.round(action.impact * (action.sliderValue / 100))
                          : action.impact} pts
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                    
                    {action.hasSlider && action.enabled && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 space-y-2"
                      >
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{action.sliderLabel}</span>
                          <span>{action.sliderValue}%</span>
                        </div>
                        <Slider
                          value={[action.sliderValue || 50]}
                          onValueChange={([val]) => updateSliderValue(action.id, val)}
                          max={action.sliderMax || 100}
                          step={10}
                          className="w-full"
                        />
                      </motion.div>
                    )}
                  </div>
                  <Switch
                    id={action.id}
                    checked={action.enabled}
                    onCheckedChange={() => toggleAction(action.id)}
                  />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Negative Actions */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <h3 className="font-semibold text-foreground">Actions that may hurt</h3>
            </div>
            {negativeActions.map((action) => (
              <motion.div
                key={action.id}
                layout
                className={`p-4 rounded-lg border transition-colors ${
                  action.enabled 
                    ? 'bg-red-500/10 border-red-500/30' 
                    : 'bg-muted/30 border-transparent hover:border-muted-foreground/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Label htmlFor={action.id} className="font-medium cursor-pointer">
                        {action.label}
                      </Label>
                      <Badge variant="outline" className="bg-red-500/20 text-red-400 text-xs">
                        {action.impact} pts
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                  <Switch
                    id={action.id}
                    checked={action.enabled}
                    onCheckedChange={() => toggleAction(action.id)}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
          <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> This simulator provides estimates based on general credit scoring factors. 
            Actual score changes may vary depending on your complete credit profile and the specific scoring model used.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CreditScoreSimulator;
