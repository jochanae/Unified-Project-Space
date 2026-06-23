import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Target,
  Shield,
  TrendingUp,
  BarChart3,
  Zap,
  Clock,
  DollarSign,
  Check,
  Bitcoin,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: typeof Target;
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'asset',
    title: 'Asset Class',
    description: 'Which markets do you want to trade?',
    icon: BarChart3,
  },
  {
    id: 'goal',
    title: 'Trading Goal',
    description: "What's your primary trading objective?",
    icon: Target,
  },
  {
    id: 'style',
    title: 'Trading Style',
    description: 'How do you prefer to trade?',
    icon: Clock,
  },
  {
    id: 'risk',
    title: 'Risk Tolerance',
    description: "How much risk are you comfortable with?",
    icon: Shield,
  },
  {
    id: 'capital',
    title: 'Capital',
    description: 'How much are you working with?',
    icon: DollarSign,
  },
  {
    id: 'strategy',
    title: 'Strategy',
    description: 'Quinn will build your strategy',
    icon: Zap,
  },
];

const ASSET_OPTIONS = [
  { id: 'equity', label: 'Stocks', description: 'Trade shares of companies', icon: TrendingUp },
  { id: 'options', label: 'Options', description: 'Trade options contracts', icon: Target },
  { id: 'forex', label: 'Forex', description: 'Trade currency pairs', icon: Globe },
  { id: 'crypto', label: 'Crypto', description: 'Trade cryptocurrencies', icon: Bitcoin },
];

const GOAL_OPTIONS = [
  { id: 'growth', label: 'Capital Growth', description: 'Maximize long-term gains', icon: TrendingUp },
  { id: 'income', label: 'Steady Income', description: 'Generate regular returns', icon: DollarSign },
  { id: 'learn', label: 'Learn & Practice', description: 'Build skills risk-free', icon: BarChart3 },
];

const STYLE_OPTIONS_BY_ASSET: Record<string, { id: string; label: string; description: string }[]> = {
  equity: [
    { id: 'day', label: 'Day Trading', description: 'Multiple trades per day' },
    { id: 'swing', label: 'Swing Trading', description: 'Hold for days to weeks' },
    { id: 'position', label: 'Position Trading', description: 'Hold for weeks to months' },
    { id: 'scalp', label: 'Scalping', description: 'Quick trades, small gains' },
  ],
  options: [
    { id: 'day', label: 'Day Trading', description: 'Open & close same day' },
    { id: 'swing', label: 'Swing Trading', description: 'Hold for days to weeks' },
    { id: 'spreads', label: 'Spreads', description: 'Multi-leg strategies for defined risk' },
    { id: 'income', label: 'Income Selling', description: 'Sell premium for steady income' },
  ],
  forex: [
    { id: 'day', label: 'Day Trading', description: 'Intraday moves in majors' },
    { id: 'swing', label: 'Swing Trading', description: 'Ride multi-day trends' },
    { id: 'scalp', label: 'Scalping', description: 'Quick pip captures' },
    { id: 'carry', label: 'Carry Trade', description: 'Earn interest rate differentials' },
  ],
  crypto: [
    { id: 'day', label: 'Day Trading', description: 'Intraday crypto moves' },
    { id: 'swing', label: 'Swing Trading', description: 'Multi-day crypto trends' },
    { id: 'hodl', label: 'HODL', description: 'Buy and hold long-term' },
    { id: 'scalp', label: 'Scalping', description: 'Quick trades on volatility' },
  ],
};

const RISK_OPTIONS = [
  { id: 'conservative', label: 'Conservative', description: '1-2% per trade', color: 'text-gain' },
  { id: 'moderate', label: 'Moderate', description: '2-5% per trade', color: 'text-chart-3' },
  { id: 'aggressive', label: 'Aggressive', description: '5-10% per trade', color: 'text-loss' },
];

const CAPITAL_OPTIONS_BY_ASSET: Record<string, { id: string; label: string; description: string }[]> = {
  equity: [
    { id: 'small', label: 'Under $1,000', description: 'Fractional shares' },
    { id: 'medium', label: '$1,000 – $10,000', description: 'Building a portfolio' },
    { id: 'large', label: '$10,000 – $50,000', description: 'Serious capital' },
    { id: 'xlarge', label: 'Over $50,000', description: 'Full portfolio' },
  ],
  options: [
    { id: 'small', label: 'Under $2,000', description: 'Buying single contracts' },
    { id: 'medium', label: '$2,000 – $10,000', description: 'Running spreads' },
    { id: 'large', label: '$10,000 – $50,000', description: 'Multi-leg strategies' },
    { id: 'xlarge', label: 'Over $50,000', description: 'Full options portfolio' },
  ],
  forex: [
    { id: 'small', label: 'Under $500', description: 'Micro lots (1,000 units)' },
    { id: 'medium', label: '$500 – $5,000', description: 'Mini lots (10,000 units)' },
    { id: 'large', label: '$5,000 – $25,000', description: 'Standard lots' },
    { id: 'xlarge', label: 'Over $25,000', description: 'Professional sizing' },
  ],
  crypto: [
    { id: 'small', label: 'Under $500', description: 'Starting small' },
    { id: 'medium', label: '$500 – $5,000', description: 'Building positions' },
    { id: 'large', label: '$5,000 – $25,000', description: 'Diversified crypto' },
    { id: 'xlarge', label: 'Over $25,000', description: 'Serious portfolio' },
  ],
};

interface StrategyWizardProps {
  onComplete?: (strategy: any) => void;
  onClose?: () => void;
}

export function StrategyWizard({ onComplete, onClose }: StrategyWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedStrategy, setGeneratedStrategy] = useState<any>(null);

  const progress = ((currentStep + 1) / WIZARD_STEPS.length) * 100;
  const step = WIZARD_STEPS[currentStep];
  const selectedAsset = selections.asset || 'equity';

  const handleSelect = (stepId: string, value: string) => {
    setSelections((prev) => {
      const next = { ...prev, [stepId]: value };
      // Reset style when asset changes since options differ
      if (stepId === 'asset' && prev.asset !== value) {
        delete next.style;
        delete next.capital;
      }
      return next;
    });
  };

  const handleNext = async () => {
    if (currentStep === WIZARD_STEPS.length - 2) {
      setCurrentStep(currentStep + 1);
      setIsGenerating(true);
      await new Promise((resolve) => setTimeout(resolve, 2500));
      setGeneratedStrategy({
        name: getStrategyName(),
        assetClass: selectedAsset,
        description: getStrategyDescription(),
        entryRules: getEntryRules(),
        exitRules: getExitRules(),
        riskManagement: getRiskManagement(),
      });
      setIsGenerating(false);
    } else if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getStrategyName = () => {
    const style = selections.style || 'swing';
    const goal = selections.goal || 'growth';
    const asset = selections.asset || 'equity';

    const names: Record<string, Record<string, Record<string, string>>> = {
      equity: {
        day: { growth: 'Momentum Day Trader', income: 'Scalp & Stack', learn: 'Paper Day Practice' },
        swing: { growth: 'Trend Rider', income: 'Swing for Income', learn: 'Swing Practice' },
        position: { growth: 'Long-term Grower', income: 'Dividend Collector', learn: 'Position Practice' },
        scalp: { growth: 'Quick Scalper', income: 'Micro Profit Machine', learn: 'Scalp Training' },
      },
      options: {
        day: { growth: 'Gamma Scalper', income: 'Premium Day Trader', learn: 'Options Day Lab' },
        swing: { growth: 'Volatility Surfer', income: 'Theta Harvester', learn: 'Options Swing Lab' },
        spreads: { growth: 'Spread Strategist', income: 'Iron Condor Pro', learn: 'Spread Practice' },
        income: { growth: 'Wheel Strategy', income: 'Cash-Secured Seller', learn: 'Premium Selling Lab' },
      },
      forex: {
        day: { growth: 'Pip Hunter', income: 'Forex Day Grinder', learn: 'Forex Day Practice' },
        swing: { growth: 'Trend Catcher', income: 'Swing Pip Collector', learn: 'Forex Swing Lab' },
        scalp: { growth: 'Quick Pip Scalper', income: 'Micro Pip Machine', learn: 'Scalp Practice' },
        carry: { growth: 'Carry Optimizer', income: 'Interest Earner', learn: 'Carry Trade Lab' },
      },
      crypto: {
        day: { growth: 'Crypto Momentum', income: 'Crypto Day Grinder', learn: 'Crypto Day Lab' },
        swing: { growth: 'Altcoin Surfer', income: 'Crypto Swing Income', learn: 'Crypto Swing Lab' },
        hodl: { growth: 'Diamond Hands', income: 'Staking Strategist', learn: 'HODL Practice' },
        scalp: { growth: 'Volatility Scalper', income: 'Quick Crypto Profits', learn: 'Crypto Scalp Lab' },
      },
    };
    return names[asset]?.[style]?.[goal] || 'Custom Strategy';
  };

  const getStrategyDescription = () => {
    const style = selections.style || 'swing';
    const asset = selections.asset || 'equity';

    const descriptions: Record<string, Record<string, string>> = {
      equity: {
        day: 'A fast-paced strategy focusing on intraday momentum moves with strict risk controls.',
        swing: 'Captures multi-day trends using technical indicators with balanced risk management.',
        position: 'Long-term approach focusing on fundamentals and major trend directions.',
        scalp: 'Quick in-and-out trades capturing small price movements multiple times daily.',
      },
      options: {
        day: 'Intraday options plays targeting high-gamma moves near expiration.',
        swing: 'Multi-day options positions leveraging implied volatility shifts.',
        spreads: 'Defined-risk spread strategies balancing premium collected vs. max loss.',
        income: 'Selling premium systematically to generate consistent weekly/monthly income.',
      },
      forex: {
        day: 'Intraday currency pair trades around London/NY session overlaps.',
        swing: 'Multi-day forex trends driven by macro fundamentals and technicals.',
        scalp: 'Rapid pip captures on tight-spread major pairs.',
        carry: 'Holding positions in high-yield pairs to earn interest rate differentials.',
      },
      crypto: {
        day: 'Intraday crypto moves capturing 24/7 market volatility.',
        swing: 'Multi-day crypto trends with momentum and support/resistance levels.',
        hodl: 'Long-term accumulation of high-conviction crypto assets with periodic rebalancing.',
        scalp: 'Fast crypto trades exploiting short-term volatility spikes.',
      },
    };
    return descriptions[asset]?.[style] || 'A customized trading approach based on your preferences.';
  };

  const getEntryRules = () => {
    const style = selections.style || 'swing';
    const asset = selections.asset || 'equity';

    const rules: Record<string, Record<string, string[]>> = {
      equity: {
        day: ['RSI crosses above 30 (oversold bounce)', 'Price above VWAP', 'Volume spike > 150% average'],
        swing: ['RSI between 30-50 (pullback entry)', 'Price above 20 SMA', 'MACD histogram turning positive'],
        position: ['Price above 50 & 200 SMA', 'RSI above 50', 'Positive earnings trend'],
        scalp: ['Price breaks above 5-min high', 'Bid/ask spread < 0.05%', 'High volume confirmation'],
      },
      options: {
        day: ['IV Rank > 50 for selling, < 30 for buying', 'Underlying at key support/resistance', 'Delta-based entry (0.30-0.40 for directional)'],
        swing: ['IV Rank entering favorable zone', 'Underlying trend confirmed on daily chart', 'Open interest > 500 on selected strike'],
        spreads: ['IV Rank > 40 (sell premium)', 'Place strikes at 1 standard deviation', 'Expiration 30-45 days out'],
        income: ['Sell at 30-delta or further OTM', 'IV Rank > 30', 'Underlying above 200 SMA (for puts)'],
      },
      forex: {
        day: ['Price breaks London session range', 'RSI divergence on 15-min chart', 'Trade during London/NY overlap'],
        swing: ['Daily trend confirmed (ADX > 25)', 'Pullback to 50 EMA on 4H chart', 'Correlation check with USD index'],
        scalp: ['Spread < 1.5 pips on major pair', 'Price bounces off 5-min Bollinger band', '1-min RSI crosses 30/70'],
        carry: ['Positive swap rate > 5 pips/day', 'Pair in uptrend on weekly chart', 'Central bank rate differential > 2%'],
      },
      crypto: {
        day: ['Volume spike > 200% of 20-period average', 'Break above 1-hour resistance', 'Funding rate not extreme (< 0.05%)'],
        swing: ['Daily RSI pullback to 40-50 in uptrend', 'Price holds above 21 EMA', 'On-chain accumulation signals'],
        hodl: ['Price below 200-day SMA (accumulation zone)', 'Market cap rank in top 20', 'Monthly RSI below 50'],
        scalp: ['Price breaks 5-min high/low', 'Order book imbalance > 3:1', 'Volatility (ATR) above daily average'],
      },
    };
    return rules[asset]?.[style] || rules.equity.swing;
  };

  const getExitRules = () => {
    const style = selections.style || 'swing';
    const asset = selections.asset || 'equity';

    const rules: Record<string, Record<string, string[]>> = {
      equity: {
        day: ['Take profit at 1.5% gain', 'Stop loss at 0.5%', 'Exit before market close'],
        swing: ['Take profit at 5-10% gain', 'Trailing stop at 3%', 'Exit on RSI > 70'],
        position: ['Take profit at 20%+ gain', 'Stop loss at 8%', 'Exit on fundamental change'],
        scalp: ['Take profit at 0.3-0.5% gain', 'Stop loss at 0.2%', 'Max hold time: 5 minutes'],
      },
      options: {
        day: ['Close at 50% max profit', 'Stop at 100% of premium paid', 'Exit 30 min before close'],
        swing: ['Close at 50-75% max profit', 'Roll if challenged with 7+ DTE', 'Exit if IV drops 20%+ from entry'],
        spreads: ['Close at 50% max profit', 'Close if underlying breaches short strike', 'Manage at 21 DTE'],
        income: ['Close at 50% of premium received', 'Roll tested side at 21 DTE', 'Close entire position at 200% loss'],
      },
      forex: {
        day: ['Take profit at 20-30 pips', 'Stop loss at 10-15 pips', 'Exit before session close'],
        swing: ['Take profit at 100-200 pips', 'Trailing stop at 50 pips', 'Exit on central bank announcement'],
        scalp: ['Take profit at 5-10 pips', 'Stop loss at 3-5 pips', 'Max hold time: 15 minutes'],
        carry: ['Close if swap turns negative', 'Stop loss at 2% of position', 'Review monthly on rate decision'],
      },
      crypto: {
        day: ['Take profit at 2-3%', 'Stop loss at 1%', 'Reduce size if funding rate spikes'],
        swing: ['Take profit at 10-20%', 'Trailing stop at 5%', 'Exit on exchange outflow spike'],
        hodl: ['Trim 10% at 2x entry', 'Trim 20% at 5x entry', 'Rebalance quarterly'],
        scalp: ['Take profit at 0.5-1%', 'Stop loss at 0.3%', 'Max hold time: 10 minutes'],
      },
    };
    return rules[asset]?.[style] || rules.equity.swing;
  };

  const getRiskManagement = () => {
    const risk = selections.risk || 'moderate';
    const capital = selections.capital || 'medium';
    const asset = selections.asset || 'equity';

    const riskPercent: Record<string, number> = {
      conservative: 1,
      moderate: 3,
      aggressive: 7,
    };

    const maxPositions: Record<string, Record<string, number>> = {
      equity: { small: 1, medium: 3, large: 5, xlarge: 10 },
      options: { small: 1, medium: 2, large: 4, xlarge: 8 },
      forex: { small: 1, medium: 2, large: 3, xlarge: 5 },
      crypto: { small: 1, medium: 2, large: 4, xlarge: 6 },
    };

    const sizingNote: Record<string, string> = {
      equity: 'shares',
      options: 'contracts',
      forex: 'lots',
      crypto: 'coins/tokens',
    };

    return {
      riskPerTrade: `${riskPercent[risk]}%`,
      maxOpenPositions: maxPositions[asset]?.[capital] || 3,
      dailyLossLimit: `${riskPercent[risk] * 3}%`,
      positionSizing: sizingNote[asset] || 'units',
    };
  };

  const renderStepContent = () => {
    switch (step.id) {
      case 'asset':
        return (
          <div className="grid grid-cols-2 gap-3">
            {ASSET_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => handleSelect('asset', option.id)}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left',
                  selections.asset === option.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <option.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
                {selections.asset === option.id && (
                  <Check className="h-5 w-5 text-primary ml-auto shrink-0" />
                )}
              </button>
            ))}
          </div>
        );

      case 'goal':
        return (
          <div className="grid gap-3">
            {GOAL_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => handleSelect('goal', option.id)}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
                  selections.goal === option.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <option.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{option.label}</p>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
                {selections.goal === option.id && (
                  <Check className="h-5 w-5 text-primary ml-auto" />
                )}
              </button>
            ))}
          </div>
        );

      case 'style': {
        const styleOptions = STYLE_OPTIONS_BY_ASSET[selectedAsset] || STYLE_OPTIONS_BY_ASSET.equity;
        return (
          <div className="grid grid-cols-2 gap-3">
            {styleOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleSelect('style', option.id)}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all text-left',
                  selections.style === option.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <p className="font-medium">{option.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
              </button>
            ))}
          </div>
        );
      }

      case 'risk':
        return (
          <div className="grid gap-3">
            {RISK_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => handleSelect('risk', option.id)}
                className={cn(
                  'flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left',
                  selections.risk === option.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div>
                  <p className={cn('font-medium', option.color)}>{option.label}</p>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
                {selections.risk === option.id && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </button>
            ))}
          </div>
        );

      case 'capital': {
        const capitalOptions = CAPITAL_OPTIONS_BY_ASSET[selectedAsset] || CAPITAL_OPTIONS_BY_ASSET.equity;
        return (
          <div className="grid grid-cols-2 gap-3">
            {capitalOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleSelect('capital', option.id)}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all text-left',
                  selections.capital === option.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <p className="font-medium">{option.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
              </button>
            ))}
          </div>
        );
      }

      case 'strategy':
        if (isGenerating) {
          return (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-chart-3 to-primary animate-pulse" />
                <Sparkles className="h-8 w-8 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="mt-4 font-medium">Quinn is building your strategy...</p>
              <p className="text-sm text-muted-foreground">
                Analyzing your {ASSET_OPTIONS.find(a => a.id === selectedAsset)?.label} preferences
              </p>
            </div>
          );
        }

        if (generatedStrategy) {
          const assetLabel = ASSET_OPTIONS.find(a => a.id === generatedStrategy.assetClass)?.label || 'Stocks';
          return (
            <div className="space-y-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Badge variant="secondary">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI Generated
                  </Badge>
                  <Badge variant="outline">{assetLabel}</Badge>
                </div>
                <h3 className="text-xl font-bold">{generatedStrategy.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{generatedStrategy.description}</p>
              </div>

              <div className="grid gap-3">
                <Card className="border-gain/30 bg-gain/5">
                  <CardContent className="p-3">
                    <p className="text-xs font-medium text-gain mb-2">Entry Rules</p>
                    <ul className="space-y-1">
                      {generatedStrategy.entryRules.map((rule: string, i: number) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <TrendingUp className="h-3 w-3 mt-1 text-gain shrink-0" />
                          {rule}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-loss/30 bg-loss/5">
                  <CardContent className="p-3">
                    <p className="text-xs font-medium text-loss mb-2">Exit Rules</p>
                    <ul className="space-y-1">
                      {generatedStrategy.exitRules.map((rule: string, i: number) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <Shield className="h-3 w-3 mt-1 text-loss shrink-0" />
                          {rule}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardContent className="p-3">
                    <p className="text-xs font-medium mb-2">Risk Management</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Risk/Trade:</span>{' '}
                        <span className="font-medium">{generatedStrategy.riskManagement.riskPerTrade}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Max Positions:</span>{' '}
                        <span className="font-medium">{generatedStrategy.riskManagement.maxOpenPositions}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Daily Loss Limit:</span>{' '}
                        <span className="font-medium">{generatedStrategy.riskManagement.dailyLossLimit}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Sizing:</span>{' '}
                        <span className="font-medium capitalize">{generatedStrategy.riskManagement.positionSizing}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          );
        }

        return null;

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (step.id) {
      case 'asset':
        return !!selections.asset;
      case 'goal':
        return !!selections.goal;
      case 'style':
        return !!selections.style;
      case 'risk':
        return !!selections.risk;
      case 'capital':
        return !!selections.capital;
      case 'strategy':
        return !!generatedStrategy;
      default:
        return false;
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-chart-3 to-primary">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">Strategy Wizard</CardTitle>
              <CardDescription className="text-xs">Quinn helps you build a strategy</CardDescription>
            </div>
          </div>
          <Badge variant="outline">
            Step {currentStep + 1} of {WIZARD_STEPS.length}
          </Badge>
        </div>
        <Progress value={progress} className="h-1 mt-3" />
      </CardHeader>

      <CardContent className="pt-4">
        {/* Step Header */}
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <step.icon className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">{step.title}</h3>
          </div>
          <p className="text-sm text-muted-foreground">{step.description}</p>
        </div>

        {/* Step Content */}
        {renderStepContent()}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={handleBack} disabled={currentStep === 0}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          {generatedStrategy ? (
            <Button onClick={() => onComplete?.(generatedStrategy)}>
              Use This Strategy
              <Check className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={!canProceed() || isGenerating}>
              {currentStep === WIZARD_STEPS.length - 2 ? 'Generate Strategy' : 'Next'}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
