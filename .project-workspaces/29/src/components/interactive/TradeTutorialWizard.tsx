import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  ArrowLeft,
  DollarSign,
  Target,
  Shield,
  TrendingUp,
  Calculator,
  Lightbulb,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  validation?: (value: any) => boolean;
  hint?: string;
}

interface TradeTutorialWizardProps {
  className?: string;
  onComplete?: () => void;
}

export function TradeTutorialWizard({ className, onComplete }: TradeTutorialWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState({
    symbol: '',
    direction: '',
    entryPrice: '',
    targetPrice: '',
    stopLoss: '',
    positionSize: '',
    riskAmount: '',
  });
  const [showFeedback, setShowFeedback] = useState<{ step: number; message: string } | null>(null);
  
  const updateFormData = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setShowFeedback(null);
  };
  
  const calculateRiskReward = () => {
    const entry = parseFloat(formData.entryPrice) || 0;
    const target = parseFloat(formData.targetPrice) || 0;
    const stop = parseFloat(formData.stopLoss) || 0;
    
    if (entry && target && stop) {
      const reward = Math.abs(target - entry);
      const risk = Math.abs(entry - stop);
      return risk > 0 ? (reward / risk).toFixed(2) : '0';
    }
    return '-';
  };
  
  const calculatePositionSize = () => {
    const risk = parseFloat(formData.riskAmount) || 0;
    const entry = parseFloat(formData.entryPrice) || 0;
    const stop = parseFloat(formData.stopLoss) || 0;
    
    if (risk && entry && stop) {
      const riskPerShare = Math.abs(entry - stop);
      return riskPerShare > 0 ? Math.floor(risk / riskPerShare) : 0;
    }
    return 0;
  };
  
  const steps: TutorialStep[] = [
    {
      id: 'symbol',
      title: 'Choose Your Stock',
      description: 'Every trade starts with picking what to trade',
      icon: <TrendingUp className="h-5 w-5" />,
      hint: 'Enter any stock symbol like AAPL, TSLA, or SPY',
      content: (
        <div className="space-y-4">
          <div>
            <Label htmlFor="symbol">Stock Symbol</Label>
            <Input
              id="symbol"
              placeholder="e.g., AAPL"
              value={formData.symbol}
              onChange={(e) => updateFormData('symbol', e.target.value.toUpperCase())}
              className="mt-1 text-lg font-mono"
              maxLength={5}
            />
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-sm">
            <p className="font-medium mb-1">💡 Tip: Start with stocks you know</p>
            <p className="text-muted-foreground">
              Popular beginner stocks: AAPL (Apple), MSFT (Microsoft), SPY (S&P 500 ETF)
            </p>
          </div>
        </div>
      ),
      validation: () => formData.symbol.length >= 1 && formData.symbol.length <= 5,
    },
    {
      id: 'direction',
      title: 'Pick Your Direction',
      description: 'Are you betting the stock goes up or down?',
      icon: <Target className="h-5 w-5" />,
      hint: 'Most beginners start with Long trades (betting it goes up)',
      content: (
        <div className="space-y-4">
          <RadioGroup
            value={formData.direction}
            onValueChange={(value) => updateFormData('direction', value)}
            className="gap-3"
          >
            <div className={cn(
              'flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all',
              formData.direction === 'long' ? 'border-gain bg-gain/5' : 'border-border hover:bg-muted/50'
            )}>
              <RadioGroupItem value="long" id="long" />
              <Label htmlFor="long" className="flex-1 cursor-pointer">
                <span className="font-semibold text-gain">📈 Long (Buy)</span>
                <p className="text-sm text-muted-foreground mt-1">
                  You think the price will go UP. Buy low, sell high.
                </p>
              </Label>
            </div>
            <div className={cn(
              'flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all',
              formData.direction === 'short' ? 'border-loss bg-loss/5' : 'border-border hover:bg-muted/50'
            )}>
              <RadioGroupItem value="short" id="short" />
              <Label htmlFor="short" className="flex-1 cursor-pointer">
                <span className="font-semibold text-loss">📉 Short (Sell)</span>
                <p className="text-sm text-muted-foreground mt-1">
                  You think the price will go DOWN. Sell high, buy back lower.
                </p>
              </Label>
            </div>
          </RadioGroup>
        </div>
      ),
      validation: () => !!formData.direction,
    },
    {
      id: 'entry',
      title: 'Set Your Entry Price',
      description: 'At what price will you enter the trade?',
      icon: <DollarSign className="h-5 w-5" />,
      hint: 'This could be the current price or a specific level you want to wait for',
      content: (
        <div className="space-y-4">
          <div>
            <Label htmlFor="entry">Entry Price ($)</Label>
            <Input
              id="entry"
              type="number"
              placeholder="e.g., 175.50"
              value={formData.entryPrice}
              onChange={(e) => updateFormData('entryPrice', e.target.value)}
              className="mt-1 text-lg font-mono"
              step="0.01"
            />
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-sm">
            <p className="font-medium mb-1">💡 Entry Types</p>
            <ul className="text-muted-foreground space-y-1">
              <li>• <strong>Market order:</strong> Buy immediately at current price</li>
              <li>• <strong>Limit order:</strong> Set a specific price to enter</li>
            </ul>
          </div>
        </div>
      ),
      validation: () => parseFloat(formData.entryPrice) > 0,
    },
    {
      id: 'target',
      title: 'Set Your Profit Target',
      description: 'Where will you take profits?',
      icon: <Target className="h-5 w-5" />,
      hint: 'Most successful traders have a clear exit plan BEFORE entering',
      content: (
        <div className="space-y-4">
          <div>
            <Label htmlFor="target">Target Price ($)</Label>
            <Input
              id="target"
              type="number"
              placeholder={formData.direction === 'long' ? 'Higher than entry' : 'Lower than entry'}
              value={formData.targetPrice}
              onChange={(e) => updateFormData('targetPrice', e.target.value)}
              className="mt-1 text-lg font-mono"
              step="0.01"
            />
          </div>
          {formData.entryPrice && formData.targetPrice && (
            <div className="p-3 rounded-lg bg-gain/10 border border-gain/30 text-sm">
              <p className="font-medium text-gain">Potential profit per share:</p>
              <p className="text-xl font-mono font-bold text-gain">
                ${Math.abs(parseFloat(formData.targetPrice) - parseFloat(formData.entryPrice)).toFixed(2)}
              </p>
            </div>
          )}
        </div>
      ),
      validation: () => {
        const entry = parseFloat(formData.entryPrice);
        const target = parseFloat(formData.targetPrice);
        if (formData.direction === 'long') return target > entry;
        return target < entry;
      },
    },
    {
      id: 'stoploss',
      title: 'Protect Yourself with a Stop Loss',
      description: 'This is your safety net - where you exit if wrong',
      icon: <Shield className="h-5 w-5" />,
      hint: 'A stop loss automatically sells if price moves against you',
      content: (
        <div className="space-y-4">
          <div>
            <Label htmlFor="stop">Stop Loss Price ($)</Label>
            <Input
              id="stop"
              type="number"
              placeholder={formData.direction === 'long' ? 'Lower than entry' : 'Higher than entry'}
              value={formData.stopLoss}
              onChange={(e) => updateFormData('stopLoss', e.target.value)}
              className="mt-1 text-lg font-mono"
              step="0.01"
            />
          </div>
          {formData.entryPrice && formData.stopLoss && formData.targetPrice && (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-loss/10 border border-loss/30 text-sm">
                <p className="font-medium text-loss">Max risk per share:</p>
                <p className="text-xl font-mono font-bold text-loss">
                  ${Math.abs(parseFloat(formData.entryPrice) - parseFloat(formData.stopLoss)).toFixed(2)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-sm">
                <p className="font-medium">Risk/Reward Ratio:</p>
                <p className="text-xl font-mono font-bold">
                  1:{calculateRiskReward()}
                </p>
              </div>
            </div>
          )}
          <div className="p-3 rounded-lg bg-chart-3/10 border border-chart-3/30 text-sm">
            <p className="font-medium text-chart-3 mb-1">🎯 Golden Rule</p>
            <p className="text-muted-foreground">
              Aim for at least 1:2 risk/reward. Risk $1 to make $2.
            </p>
          </div>
        </div>
      ),
      validation: () => {
        const entry = parseFloat(formData.entryPrice);
        const stop = parseFloat(formData.stopLoss);
        if (formData.direction === 'long') return stop < entry;
        return stop > entry;
      },
    },
    {
      id: 'size',
      title: 'Calculate Position Size',
      description: 'How much of your account to risk on this trade',
      icon: <Calculator className="h-5 w-5" />,
      hint: 'Most pros risk 1-2% of their account per trade',
      content: (
        <div className="space-y-4">
          <div>
            <Label htmlFor="risk">Risk Amount ($)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              How much are you willing to lose if this trade hits your stop loss?
            </p>
            <Input
              id="risk"
              type="number"
              placeholder="e.g., 100"
              value={formData.riskAmount}
              onChange={(e) => updateFormData('riskAmount', e.target.value)}
              className="mt-1 text-lg font-mono"
              step="1"
            />
          </div>
          {formData.riskAmount && formData.stopLoss && formData.entryPrice && (
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
              <p className="font-medium mb-2">Calculated Position Size:</p>
              <p className="text-3xl font-mono font-bold text-primary">
                {calculatePositionSize()} shares
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Total investment: ${(calculatePositionSize() * parseFloat(formData.entryPrice)).toFixed(2)}
              </p>
            </div>
          )}
          <div className="p-3 rounded-lg bg-muted/50 text-sm">
            <p className="font-medium mb-1">📐 The Math</p>
            <p className="text-muted-foreground font-mono text-xs">
              Shares = Risk Amount ÷ (Entry - Stop Loss)
            </p>
          </div>
        </div>
      ),
      validation: () => parseFloat(formData.riskAmount) > 0,
    },
    {
      id: 'summary',
      title: 'Review Your Trade Plan',
      description: 'Everything looks good! Ready to trade',
      icon: <Sparkles className="h-5 w-5" />,
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-chart-3/10 border">
            <h3 className="font-bold text-lg mb-3">📋 Trade Summary</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Symbol</p>
                <p className="font-semibold">{formData.symbol}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Direction</p>
                <p className={cn('font-semibold', formData.direction === 'long' ? 'text-gain' : 'text-loss')}>
                  {formData.direction === 'long' ? '📈 Long' : '📉 Short'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Entry</p>
                <p className="font-semibold font-mono">${formData.entryPrice}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Target</p>
                <p className="font-semibold font-mono text-gain">${formData.targetPrice}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Stop Loss</p>
                <p className="font-semibold font-mono text-loss">${formData.stopLoss}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Position</p>
                <p className="font-semibold font-mono">{calculatePositionSize()} shares</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-3">
              <div>
                <p className="text-muted-foreground text-xs">Risk/Reward</p>
                <p className="text-xl font-bold">1:{calculateRiskReward()}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Max Risk</p>
                <p className="text-xl font-bold text-loss">${formData.riskAmount}</p>
              </div>
            </div>
          </div>
          
          <div className="p-3 rounded-lg bg-gain/10 border border-gain/30 text-sm">
            <div className="flex gap-2">
              <CheckCircle2 className="h-5 w-5 text-gain shrink-0" />
              <div>
                <p className="font-medium text-gain">You've created a complete trade plan!</p>
                <p className="text-muted-foreground mt-1">
                  Professional traders always plan before they trade. You're thinking like a pro!
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];
  
  const step = steps[currentStep];
  const canProceed = !step.validation || step.validation(formData);
  
  const handleNext = () => {
    if (!canProceed && step.validation) {
      setShowFeedback({
        step: currentStep,
        message: step.hint || 'Please complete this step before continuing',
      });
      return;
    }
    
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(c => c + 1);
      setShowFeedback(null);
    } else if (onComplete) {
      onComplete();
    }
  };
  
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(c => c - 1);
      setShowFeedback(null);
    }
  };
  
  const progress = ((currentStep + 1) / steps.length) * 100;
  
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              🎓 Step-by-Step Trade Tutorial
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                Interactive
              </Badge>
            </CardTitle>
            <CardDescription>
              Learn by doing - build a real trade plan
            </CardDescription>
          </div>
        </div>
        
        <Progress value={progress} className="h-1.5 mt-3" />
        
        {/* Step indicators */}
        <div className="flex items-center justify-center gap-1 mt-3 flex-wrap">
          {steps.map((s, i) => (
            <div
              key={s.id}
              className={cn(
                'flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium transition-all',
                i === currentStep 
                  ? 'bg-primary text-primary-foreground scale-110' 
                  : completedSteps.has(i)
                    ? 'bg-gain/20 text-gain'
                    : 'bg-muted text-muted-foreground'
              )}
            >
              {completedSteps.has(i) ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Step header */}
        <div className="flex items-center gap-3 pb-3 border-b">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            {step.icon}
          </div>
          <div>
            <h3 className="font-semibold">{step.title}</h3>
            <p className="text-sm text-muted-foreground">{step.description}</p>
          </div>
        </div>
        
        {/* Step content */}
        {step.content}
        
        {/* Feedback */}
        {showFeedback?.step === currentStep && (
          <div className="p-3 rounded-lg bg-chart-3/10 border border-chart-3/30 text-sm">
            <div className="flex gap-2">
              <Lightbulb className="h-4 w-4 text-chart-3 shrink-0 mt-0.5" />
              <p>{showFeedback.message}</p>
            </div>
          </div>
        )}
        
        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Button onClick={handleNext}>
            {currentStep === steps.length - 1 ? 'Complete' : 'Continue'}
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
