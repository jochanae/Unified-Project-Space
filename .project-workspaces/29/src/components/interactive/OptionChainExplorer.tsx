import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2,
  Lightbulb,
  ArrowRight,
  MousePointerClick,
  Hand,
  SlidersHorizontal,
  Sparkles,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface OptionData {
  strike: number;
  callBid: number;
  callAsk: number;
  callDelta: number;
  callGamma: number;
  callTheta: number;
  callVega: number;
  callIV: number;
  callOI: number;
  putBid: number;
  putAsk: number;
  putDelta: number;
  putGamma: number;
  putTheta: number;
  putVega: number;
  putIV: number;
  putOI: number;
}

interface GreekExplanation {
  name: string;
  symbol: string;
  description: string;
  example: string;
  color: string;
}

const GREEK_EXPLANATIONS: Record<string, GreekExplanation> = {
  delta: {
    name: 'Delta',
    symbol: 'Δ',
    description: 'How much the option price moves for each $1 move in the stock.',
    example: 'Delta of 0.50 = Option gains $0.50 when stock rises $1',
    color: 'text-primary',
  },
  gamma: {
    name: 'Gamma',
    symbol: 'Γ',
    description: 'How fast Delta changes as the stock moves.',
    example: 'Higher gamma = Delta changes faster near the strike price',
    color: 'text-chart-3',
  },
  theta: {
    name: 'Theta',
    symbol: 'Θ',
    description: 'How much value the option loses each day from time decay.',
    example: 'Theta of -0.05 = Option loses $5 per day (per contract)',
    color: 'text-loss',
  },
  vega: {
    name: 'Vega',
    symbol: 'ν',
    description: 'How sensitive the option is to changes in volatility.',
    example: 'Higher vega = Option gains more if volatility increases',
    color: 'text-chart-4',
  },
  iv: {
    name: 'Implied Volatility',
    symbol: 'IV',
    description: "The market's expectation of future price movement.",
    example: 'High IV = Market expects big moves = More expensive options',
    color: 'text-chart-5',
  },
  oi: {
    name: 'Open Interest',
    symbol: 'OI',
    description: 'Total number of outstanding option contracts.',
    example: 'High OI at a strike = Important support/resistance level',
    color: 'text-muted-foreground',
  },
};

// Generate realistic mock option chain data
function generateOptionChain(stockPrice: number, daysToExpiry: number): OptionData[] {
  const chain: OptionData[] = [];
  const baseIV = 0.25 + Math.random() * 0.15;
  
  // Generate strikes from -10% to +10% of stock price in $5 increments
  const minStrike = Math.floor(stockPrice * 0.9 / 5) * 5;
  const maxStrike = Math.ceil(stockPrice * 1.1 / 5) * 5;
  
  for (let strike = minStrike; strike <= maxStrike; strike += 5) {
    const moneyness = (stockPrice - strike) / stockPrice;
    const timeValue = Math.sqrt(daysToExpiry / 365);
    
    // Simplified Black-Scholes approximations
    const callIntrinsic = Math.max(0, stockPrice - strike);
    const putIntrinsic = Math.max(0, strike - stockPrice);
    
    const callExtrinsic = stockPrice * baseIV * timeValue * Math.exp(-moneyness * moneyness * 2);
    const putExtrinsic = stockPrice * baseIV * timeValue * Math.exp(-moneyness * moneyness * 2);
    
    // Delta approximation
    const callDelta = 0.5 + 0.5 * Math.tanh(moneyness * 5);
    const putDelta = callDelta - 1;
    
    // Gamma peaks at ATM
    const gamma = 0.1 * Math.exp(-moneyness * moneyness * 10) / (stockPrice * 0.01);
    
    // Theta (time decay)
    const theta = -callExtrinsic * 0.05 / timeValue;
    
    // Vega
    const vega = stockPrice * 0.01 * timeValue * Math.exp(-moneyness * moneyness * 2);
    
    // IV smile
    const ivAdjust = 1 + Math.abs(moneyness) * 0.5;
    
    const spread = 0.05 + Math.random() * 0.05;
    
    chain.push({
      strike,
      callBid: Math.max(0.01, callIntrinsic + callExtrinsic - spread / 2),
      callAsk: Math.max(0.05, callIntrinsic + callExtrinsic + spread / 2),
      callDelta: Math.min(1, Math.max(0, callDelta)),
      callGamma: gamma,
      callTheta: theta,
      callVega: vega,
      callIV: baseIV * ivAdjust * 100,
      callOI: Math.floor(Math.random() * 5000 + 100),
      putBid: Math.max(0.01, putIntrinsic + putExtrinsic - spread / 2),
      putAsk: Math.max(0.05, putIntrinsic + putExtrinsic + spread / 2),
      putDelta: Math.max(-1, Math.min(0, putDelta)),
      putGamma: gamma,
      putTheta: theta,
      putVega: vega,
      putIV: baseIV * ivAdjust * 100,
      putOI: Math.floor(Math.random() * 5000 + 100),
    });
  }
  
  return chain;
}

interface TutorialStep {
  id: string;
  title: string;
  instruction: string;
  hint: string;
  icon: React.ReactNode;
  highlightArea: 'itm-calls' | 'otm-puts' | 'greeks' | 'slider' | null;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'click-itm-call',
    title: 'Find In-The-Money Calls',
    instruction: 'Tap any cell in the GREEN highlighted area on the left. These are "In-The-Money" calls - they have real value because the stock price ($175) is above the strike price.',
    hint: 'Look for the green-shaded rows on the CALLS side (left)',
    icon: <MousePointerClick className="h-5 w-5" />,
    highlightArea: 'itm-calls',
  },
  {
    id: 'click-otm-put',
    title: 'Find Out-of-The-Money Puts',
    instruction: 'Now tap any cell in the PUTS section (right side) where there\'s NO red background. These "Out-of-The-Money" puts are below the stock price.',
    hint: 'Right side, tap rows WITHOUT the red background',
    icon: <MousePointerClick className="h-5 w-5" />,
    highlightArea: 'otm-puts',
  },
  {
    id: 'explore-greeks',
    title: 'Learn the Greeks',
    instruction: 'Tap and hold on any Greek symbol (Δ, Θ, IV, OI) in the column headers to see what it means. These "Greeks" measure option risk.',
    hint: 'Tap the Δ or Θ in the header row',
    icon: <Hand className="h-5 w-5" />,
    highlightArea: 'greeks',
  },
  {
    id: 'change-expiry',
    title: 'See Time Decay',
    instruction: 'Drag the "Days to Expiry" slider to see how option prices change over time. Notice how prices drop as expiration approaches!',
    hint: 'Move the slider left or right',
    icon: <SlidersHorizontal className="h-5 w-5" />,
    highlightArea: 'slider',
  },
];

interface OptionChainExplorerProps {
  className?: string;
  onComplete?: () => void;
}

export function OptionChainExplorer({ className, onComplete }: OptionChainExplorerProps) {
  const [stockPrice] = useState(175);
  const [daysToExpiry, setDaysToExpiry] = useState(30);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: string } | null>(null);
  const [showGreeks, setShowGreeks] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [showCelebration, setShowCelebration] = useState<string | null>(null);
  
  const chain = useMemo(() => generateOptionChain(stockPrice, daysToExpiry), [stockPrice, daysToExpiry]);
  
  const currentStepIndex = TUTORIAL_STEPS.findIndex(step => !completedSteps.has(step.id));
  const currentStep = currentStepIndex >= 0 ? TUTORIAL_STEPS[currentStepIndex] : null;
  const allStepsComplete = TUTORIAL_STEPS.every(step => completedSteps.has(step.id));
  const progressPercent = (completedSteps.size / TUTORIAL_STEPS.length) * 100;
  
  const markStepComplete = (stepId: string) => {
    if (!completedSteps.has(stepId)) {
      setCompletedSteps(prev => new Set([...prev, stepId]));
      setShowCelebration(stepId);
      setTimeout(() => setShowCelebration(null), 1500);
    }
  };
  
  const handleCellClick = (rowIndex: number, colType: string, option: OptionData) => {
    setSelectedCell({ row: rowIndex, col: colType });
    
    // Check if this completes a tutorial step
    const isITMCall = colType.startsWith('call') && option.strike < stockPrice;
    const isOTMPut = colType.startsWith('put') && option.strike < stockPrice;
    
    if (isITMCall && currentStep?.id === 'click-itm-call') {
      markStepComplete('click-itm-call');
    }
    if (isOTMPut && currentStep?.id === 'click-otm-put') {
      markStepComplete('click-otm-put');
    }
  };
  
  const handleGreekHover = () => {
    if (currentStep?.id === 'explore-greeks') {
      markStepComplete('explore-greeks');
    }
  };
  
  const handleExpiryChange = (value: number[]) => {
    setDaysToExpiry(value[0]);
    if (currentStep?.id === 'change-expiry') {
      markStepComplete('change-expiry');
    }
  };
  
  const formatPrice = (val: number) => val.toFixed(2);
  const formatGreek = (val: number) => val.toFixed(3);
  const formatPercent = (val: number) => `${val.toFixed(1)}%`;
  
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              📊 Interactive Option Chain Explorer
              <Badge variant="outline" className="bg-chart-3/10 text-chart-3 border-chart-3/30">
                Hands-on
              </Badge>
            </CardTitle>
            <CardDescription>
              Stock: ${stockPrice} • Expires in {daysToExpiry} days
            </CardDescription>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowGreeks(!showGreeks)}
          >
            {showGreeks ? 'Hide' : 'Show'} Greeks
          </Button>
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-2 mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Tutorial Progress</span>
            <span className="text-muted-foreground">{completedSteps.size} of {TUTORIAL_STEPS.length}</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Step Instructions - Prominent! */}
        <AnimatePresence mode="wait">
          {currentStep ? (
            <motion.div
              key={currentStep.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="relative overflow-hidden rounded-lg border-2 border-primary bg-primary/5 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 p-2 rounded-full bg-primary/20 text-primary">
                  {currentStep.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs">
                      Step {currentStepIndex + 1} of {TUTORIAL_STEPS.length}
                    </Badge>
                    <Target className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-base mb-1">{currentStep.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {currentStep.instruction}
                  </p>
                  <div className="mt-2 flex items-center gap-1 text-xs text-primary">
                    <Lightbulb className="h-3 w-3" />
                    <span>{currentStep.hint}</span>
                  </div>
                </div>
              </div>
              
              {/* Pulsing indicator */}
              <div className="absolute top-2 right-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                </span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-lg border-2 border-gain bg-gain/10 p-4 text-center"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-gain" />
                <h3 className="font-bold text-gain text-lg">Tutorial Complete!</h3>
                <Sparkles className="h-5 w-5 text-gain" />
              </div>
              <p className="text-sm text-muted-foreground">
                You now understand how to read an option chain. The Greeks help measure risk, and ITM/OTM determines intrinsic value.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Celebration Toast */}
        <AnimatePresence>
          {showCelebration && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm"
            >
              <div className="bg-gain text-white rounded-lg p-4 shadow-lg flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Great job! ✨</p>
                  <p className="text-sm opacity-90">
                    {TUTORIAL_STEPS.find(s => s.id === showCelebration)?.title} completed!
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Days to Expiry Slider */}
        <div className={cn(
          "flex items-center gap-4 p-3 rounded-lg transition-all",
          currentStep?.highlightArea === 'slider' && "ring-2 ring-primary ring-offset-2 ring-offset-background bg-primary/5"
        )}>
          <span className="text-sm font-medium w-32">Days to Expiry:</span>
          <Slider
            value={[daysToExpiry]}
            onValueChange={handleExpiryChange}
            min={1}
            max={90}
            step={1}
            className="flex-1"
          />
          <span className="text-sm font-mono w-12 text-right">{daysToExpiry}d</span>
        </div>
        
        {/* Option Chain Table */}
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b">
                {/* Calls header */}
                <th colSpan={showGreeks ? 6 : 3} className="text-left py-2 px-2 bg-gain/5">
                  <div className="flex items-center gap-1 text-gain">
                    <TrendingUp className="h-3 w-3" />
                    CALLS
                  </div>
                </th>
                {/* Strike */}
                <th className="py-2 px-2 bg-muted/50 font-semibold">Strike</th>
                {/* Puts header */}
                <th colSpan={showGreeks ? 6 : 3} className="text-right py-2 px-2 bg-loss/5">
                  <div className="flex items-center justify-end gap-1 text-loss">
                    PUTS
                    <TrendingDown className="h-3 w-3" />
                  </div>
                </th>
              </tr>
              <tr className={cn(
                "border-b text-muted-foreground transition-all",
                currentStep?.highlightArea === 'greeks' && "ring-2 ring-primary ring-offset-1"
              )}>
                <th className="py-1 px-1 text-left">Bid</th>
                <th className="py-1 px-1 text-left">Ask</th>
                {showGreeks && (
                  <>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <th 
                            className={cn(
                              "py-1 px-1 text-left cursor-help",
                              currentStep?.highlightArea === 'greeks' && "text-primary font-bold"
                            )}
                            onClick={handleGreekHover}
                            onMouseEnter={handleGreekHover}
                          >
                            Δ
                          </th>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-64">
                          <p className="font-medium">{GREEK_EXPLANATIONS.delta.name}</p>
                          <p className="text-xs text-muted-foreground">{GREEK_EXPLANATIONS.delta.description}</p>
                          <p className="text-xs text-chart-3 mt-1">{GREEK_EXPLANATIONS.delta.example}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <th 
                            className={cn(
                              "py-1 px-1 text-left cursor-help",
                              currentStep?.highlightArea === 'greeks' && "text-primary font-bold"
                            )}
                            onClick={handleGreekHover}
                            onMouseEnter={handleGreekHover}
                          >
                            Θ
                          </th>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-64">
                          <p className="font-medium">{GREEK_EXPLANATIONS.theta.name}</p>
                          <p className="text-xs text-muted-foreground">{GREEK_EXPLANATIONS.theta.description}</p>
                          <p className="text-xs text-chart-3 mt-1">{GREEK_EXPLANATIONS.theta.example}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <th 
                            className={cn(
                              "py-1 px-1 text-left cursor-help",
                              currentStep?.highlightArea === 'greeks' && "text-primary font-bold"
                            )}
                            onClick={handleGreekHover}
                            onMouseEnter={handleGreekHover}
                          >
                            IV
                          </th>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-64">
                          <p className="font-medium">{GREEK_EXPLANATIONS.iv.name}</p>
                          <p className="text-xs text-muted-foreground">{GREEK_EXPLANATIONS.iv.description}</p>
                          <p className="text-xs text-chart-3 mt-1">{GREEK_EXPLANATIONS.iv.example}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <th 
                            className={cn(
                              "py-1 px-1 text-left cursor-help",
                              currentStep?.highlightArea === 'greeks' && "text-primary font-bold"
                            )}
                            onClick={handleGreekHover}
                            onMouseEnter={handleGreekHover}
                          >
                            OI
                          </th>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-64">
                          <p className="font-medium">{GREEK_EXPLANATIONS.oi.name}</p>
                          <p className="text-xs text-muted-foreground">{GREEK_EXPLANATIONS.oi.description}</p>
                          <p className="text-xs text-chart-3 mt-1">{GREEK_EXPLANATIONS.oi.example}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </>
                )}
                <th className="py-1 px-1 text-center bg-muted/50 font-semibold">$</th>
                <th className="py-1 px-1 text-right">Bid</th>
                <th className="py-1 px-1 text-right">Ask</th>
                {showGreeks && (
                  <>
                    <th className="py-1 px-1 text-right">Δ</th>
                    <th className="py-1 px-1 text-right">Θ</th>
                    <th className="py-1 px-1 text-right">IV</th>
                    <th className="py-1 px-1 text-right">OI</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {chain.map((option, i) => {
                const isATM = Math.abs(option.strike - stockPrice) < 2.5;
                const callITM = option.strike < stockPrice;
                const putITM = option.strike > stockPrice;
                const putOTM = option.strike < stockPrice;
                
                const highlightITMCalls = currentStep?.highlightArea === 'itm-calls' && callITM;
                const highlightOTMPuts = currentStep?.highlightArea === 'otm-puts' && putOTM;
                
                return (
                  <tr
                    key={option.strike}
                    className={cn(
                      'border-b border-border/50 hover:bg-muted/50 transition-colors',
                      isATM && 'bg-primary/5 font-medium'
                    )}
                  >
                    {/* Call data */}
                    <td
                      className={cn(
                        'py-1.5 px-1 cursor-pointer transition-all',
                        callITM && 'bg-gain/10',
                        highlightITMCalls && 'ring-2 ring-primary ring-inset animate-pulse',
                        selectedCell?.row === i && selectedCell?.col === 'callBid' && 'ring-2 ring-primary'
                      )}
                      onClick={() => handleCellClick(i, 'callBid', option)}
                    >
                      {formatPrice(option.callBid)}
                    </td>
                    <td
                      className={cn(
                        'py-1.5 px-1 cursor-pointer transition-all',
                        callITM && 'bg-gain/10',
                        highlightITMCalls && 'ring-2 ring-primary ring-inset animate-pulse',
                        selectedCell?.row === i && selectedCell?.col === 'callAsk' && 'ring-2 ring-primary'
                      )}
                      onClick={() => handleCellClick(i, 'callAsk', option)}
                    >
                      {formatPrice(option.callAsk)}
                    </td>
                    {showGreeks && (
                      <>
                        <td className={cn('py-1.5 px-1', callITM && 'bg-gain/10', highlightITMCalls && 'animate-pulse')}>
                          {formatGreek(option.callDelta)}
                        </td>
                        <td className={cn('py-1.5 px-1 text-loss', callITM && 'bg-gain/10', highlightITMCalls && 'animate-pulse')}>
                          {formatGreek(option.callTheta)}
                        </td>
                        <td className={cn('py-1.5 px-1', callITM && 'bg-gain/10', highlightITMCalls && 'animate-pulse')}>
                          {formatPercent(option.callIV)}
                        </td>
                        <td className={cn('py-1.5 px-1 text-muted-foreground', callITM && 'bg-gain/10', highlightITMCalls && 'animate-pulse')}>
                          {option.callOI.toLocaleString()}
                        </td>
                      </>
                    )}
                    
                    {/* Strike */}
                    <td className={cn(
                      'py-1.5 px-2 text-center font-semibold bg-muted/50',
                      isATM && 'text-primary'
                    )}>
                      ${option.strike}
                      {isATM && <span className="ml-1 text-[10px]">ATM</span>}
                    </td>
                    
                    {/* Put data */}
                    <td
                      className={cn(
                        'py-1.5 px-1 text-right cursor-pointer transition-all',
                        putITM && 'bg-loss/10',
                        highlightOTMPuts && 'ring-2 ring-primary ring-inset animate-pulse',
                        selectedCell?.row === i && selectedCell?.col === 'putBid' && 'ring-2 ring-primary'
                      )}
                      onClick={() => handleCellClick(i, 'putBid', option)}
                    >
                      {formatPrice(option.putBid)}
                    </td>
                    <td
                      className={cn(
                        'py-1.5 px-1 text-right cursor-pointer transition-all',
                        putITM && 'bg-loss/10',
                        highlightOTMPuts && 'ring-2 ring-primary ring-inset animate-pulse',
                        selectedCell?.row === i && selectedCell?.col === 'putAsk' && 'ring-2 ring-primary'
                      )}
                      onClick={() => handleCellClick(i, 'putAsk', option)}
                    >
                      {formatPrice(option.putAsk)}
                    </td>
                    {showGreeks && (
                      <>
                        <td className={cn('py-1.5 px-1 text-right', putITM && 'bg-loss/10', highlightOTMPuts && 'animate-pulse')}>
                          {formatGreek(option.putDelta)}
                        </td>
                        <td className={cn('py-1.5 px-1 text-right text-loss', putITM && 'bg-loss/10', highlightOTMPuts && 'animate-pulse')}>
                          {formatGreek(option.putTheta)}
                        </td>
                        <td className={cn('py-1.5 px-1 text-right', putITM && 'bg-loss/10', highlightOTMPuts && 'animate-pulse')}>
                          {formatPercent(option.putIV)}
                        </td>
                        <td className={cn('py-1.5 px-1 text-right text-muted-foreground', putITM && 'bg-loss/10', highlightOTMPuts && 'animate-pulse')}>
                          {option.putOI.toLocaleString()}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs pt-2 border-t">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gain/20" />
            <span>ITM Call (In-The-Money)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-loss/20" />
            <span>ITM Put (In-The-Money)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-primary/20" />
            <span>ATM (At-The-Money)</span>
          </div>
        </div>
        
        {/* Greeks Quick Reference */}
        {showGreeks && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-lg bg-muted/50">
            <h4 className="col-span-full text-sm font-medium flex items-center gap-1">
              <Lightbulb className="h-4 w-4 text-chart-3" />
              Greeks Quick Reference
            </h4>
            {Object.entries(GREEK_EXPLANATIONS).slice(0, 4).map(([key, greek]) => (
              <div key={key} className="text-xs">
                <span className={cn('font-semibold', greek.color)}>{greek.symbol}</span>
                <span className="text-muted-foreground ml-1">= {greek.name}</span>
              </div>
            ))}
          </div>
        )}
        
        {/* Completion CTA */}
        {allStepsComplete && onComplete && (
          <div className="flex justify-center pt-4">
            <Button onClick={onComplete} className="gap-2">
              Continue to Next Module
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
