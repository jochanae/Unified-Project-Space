import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { KID_FRIENDLY_STOCKS, KidTradeInput } from '@/hooks/useKidTrading';
import { ArrowRight, ArrowLeft, Sparkles, Check, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KidTradeWizardProps {
  balance: number;
  onSubmit: (input: KidTradeInput) => Promise<any>;
  onCancel: () => void;
}

type WizardStep = 'company' | 'prediction' | 'shares' | 'review';

const PREDICTIONS = [
  { id: 'up', emoji: '🚀', label: 'Going Up!', sublabel: "I think the price will rise", icon: TrendingUp, color: 'text-gain border-gain/40 bg-gain/10' },
  { id: 'same', emoji: '😐', label: 'Staying Flat', sublabel: "I think it'll stay about the same", icon: Minus, color: 'text-muted-foreground border-border bg-muted/50' },
  { id: 'down', emoji: '📉', label: 'Might Dip', sublabel: "I think the price could drop", icon: TrendingDown, color: 'text-loss border-loss/40 bg-loss/10' },
];

export function KidTradeWizard({ balance, onSubmit, onCancel }: KidTradeWizardProps) {
  const [step, setStep] = useState<WizardStep>('company');
  const [selectedStock, setSelectedStock] = useState<typeof KID_FRIENDLY_STOCKS[0] | null>(null);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getStockPrice = (symbol: string) => {
    const prices: Record<string, number> = {
      AAPL: 178.50, DIS: 95.20, NFLX: 485.30, SBUX: 98.75, NKE: 107.40,
      TSLA: 248.90, AMZN: 178.25, GOOGL: 141.80, MSFT: 378.50, MCD: 294.60,
    };
    return prices[symbol] || 100;
  };

  const currentPrice = selectedStock ? getStockPrice(selectedStock.symbol) : 0;
  const totalCost = currentPrice * quantity;
  const canAfford = totalCost <= balance;
  const maxShares = Math.floor(balance / currentPrice);

  const handleNext = () => {
    if (step === 'company' && selectedStock) setStep('prediction');
    else if (step === 'prediction' && prediction) setStep('shares');
    else if (step === 'shares') setStep('review');
  };

  const handleBack = () => {
    if (step === 'prediction') setStep('company');
    else if (step === 'shares') setStep('prediction');
    else if (step === 'review') setStep('shares');
  };

  const handleSubmit = async () => {
    if (!selectedStock || !canAfford) return;
    setIsSubmitting(true);
    try {
      const predLabel = PREDICTIONS.find(p => p.id === prediction)?.label || '';
      const fullNotes = [
        notes,
        `My prediction: ${predLabel}`,
      ].filter(Boolean).join(' | ');

      await onSubmit({
        symbol: selectedStock.symbol,
        company_name: selectedStock.name,
        entry_price: currentPrice,
        quantity,
        notes: fullNotes || undefined,
        emoji: selectedStock.emoji,
      });
      onCancel();
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepIndicators = [
    { key: 'company', label: 'Pick', number: 1 },
    { key: 'prediction', label: 'Predict', number: 2 },
    { key: 'shares', label: 'Amount', number: 3 },
    { key: 'review', label: 'Review', number: 4 },
  ];

  const currentStepIndex = stepIndicators.findIndex(x => x.key === step);

  return (
    <Card className="overflow-hidden border-2 border-primary/30">
      <div className="h-2 bg-gradient-to-r from-primary via-gain to-gold" />
      <CardContent className="p-6">
        {/* Step Indicators */}
        <div className="flex items-center justify-center gap-1 mb-8">
          {stepIndicators.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex items-center justify-center h-8 w-8 rounded-full text-sm font-bold transition-all',
                    step === s.key
                      ? 'bg-primary text-primary-foreground scale-110'
                      : currentStepIndex > i
                      ? 'bg-gain text-gain-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {currentStepIndex > i ? <Check className="h-4 w-4" /> : s.number}
                </div>
                <span className="text-[10px] text-muted-foreground mt-1">{s.label}</span>
              </div>
              {i < stepIndicators.length - 1 && (
                <div className={cn(
                  'w-8 h-1 mx-1 rounded mb-4',
                  currentStepIndex > i ? 'bg-gain' : 'bg-muted'
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Pick Company */}
        {step === 'company' && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Sparkles className="h-8 w-8 text-gold mx-auto mb-2" />
              <h3 className="text-xl font-bold">Pick a Company to Invest In!</h3>
              <p className="text-muted-foreground">Which company do you want to own a piece of?</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {KID_FRIENDLY_STOCKS.map((stock) => (
                <button
                  key={stock.symbol}
                  onClick={() => setSelectedStock(stock)}
                  className={cn(
                    'p-4 rounded-xl border-2 transition-all hover:scale-105 text-center',
                    selectedStock?.symbol === stock.symbol
                      ? 'border-primary bg-primary/10 shadow-lg'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <span className="text-3xl block mb-1">{stock.emoji}</span>
                  <p className="font-bold text-sm">{stock.name}</p>
                  <p className="text-xs text-muted-foreground">{stock.symbol}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stock.description}</p>
                  <p className="text-sm font-semibold text-primary mt-2">${getStockPrice(stock.symbol).toFixed(2)}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Prediction / Sentiment */}
        {step === 'prediction' && selectedStock && (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <span className="text-5xl block mb-2">🤔</span>
              <h3 className="text-xl font-bold">What Do You Think Will Happen?</h3>
              <p className="text-muted-foreground">
                Before you buy <strong>{selectedStock.name}</strong>, make a prediction!
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                There's no wrong answer — real investors always think about this before they trade.
              </p>
            </div>

            <div className="max-w-sm mx-auto space-y-3">
              {PREDICTIONS.map(p => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPrediction(p.id)}
                    className={cn(
                      'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
                      prediction === p.id
                        ? cn(p.color, 'scale-[1.02] shadow-md border-2')
                        : 'border-border hover:border-primary/30'
                    )}
                  >
                    <span className="text-3xl">{p.emoji}</span>
                    <div className="flex-1">
                      <p className="font-bold">{p.label}</p>
                      <p className="text-xs text-muted-foreground">{p.sublabel}</p>
                    </div>
                    <Icon className="h-5 w-5 opacity-50" />
                  </button>
                );
              })}
            </div>

            {prediction === 'down' && (
              <div className="max-w-sm mx-auto bg-muted/50 rounded-xl p-4 text-sm space-y-2">
                <p className="font-bold flex items-center gap-2">💡 Smart Thinking!</p>
                <p className="text-muted-foreground">
                  If you think the price might go down, you might want to wait before buying — or buy fewer shares.
                  Real investors call this being <strong>"cautious"</strong>. It's always okay to wait!
                </p>
              </div>
            )}

            {prediction === 'up' && (
              <div className="max-w-sm mx-auto bg-gain/5 rounded-xl p-4 text-sm space-y-2">
                <p className="font-bold flex items-center gap-2">🚀 Feeling Bullish!</p>
                <p className="text-muted-foreground">
                  When investors believe a stock will go up, they call it being <strong>"bullish"</strong> — 
                  like a bull charging forward! Let's see if your prediction is right.
                </p>
              </div>
            )}

            {prediction === 'same' && (
              <div className="max-w-sm mx-auto bg-muted/50 rounded-xl p-4 text-sm space-y-2">
                <p className="font-bold flex items-center gap-2">⚖️ Playing It Neutral</p>
                <p className="text-muted-foreground">
                  Sometimes stocks don't move much. If you still like the company long-term, 
                  buying and holding can be a great strategy. Patience is a superpower!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Choose Quantity */}
        {step === 'shares' && selectedStock && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <span className="text-5xl block mb-2">{selectedStock.emoji}</span>
              <h3 className="text-xl font-bold">How many {selectedStock.name} shares?</h3>
              <p className="text-muted-foreground">Each share costs ${currentPrice.toFixed(2)}</p>
            </div>

            <div className="max-w-xs mx-auto space-y-4">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1} className="h-12 w-12 rounded-full text-xl">-</Button>
                <Input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.min(maxShares, parseInt(e.target.value) || 1)))} className="text-center text-2xl font-bold h-14" min={1} max={maxShares} />
                <Button variant="outline" size="icon" onClick={() => setQuantity(Math.min(maxShares, quantity + 1))} disabled={quantity >= maxShares} className="h-12 w-12 rounded-full text-xl">+</Button>
              </div>

              <div className="text-center space-y-1">
                <p className={cn('text-2xl font-bold', canAfford ? 'text-foreground' : 'text-loss')}>
                  Total: ${totalCost.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">You have ${balance.toFixed(2)} in your piggy bank</p>
                {!canAfford && <p className="text-sm text-loss font-medium">That's too expensive! Try fewer shares.</p>}
              </div>

              <Textarea
                placeholder="Why are you buying this? (optional but fun to track!)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="resize-none"
                rows={2}
              />
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 'review' && selectedStock && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <span className="text-5xl block mb-2">🎉</span>
              <h3 className="text-xl font-bold">Ready to Buy!</h3>
              <p className="text-muted-foreground">Let's review your investment</p>
            </div>

            <Card className="bg-muted/50 max-w-sm mx-auto">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{selectedStock.emoji}</span>
                  <div>
                    <p className="font-bold text-lg">{selectedStock.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedStock.symbol}</p>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price per share</span>
                    <span className="font-medium">${currentPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Number of shares</span>
                    <span className="font-medium">{quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Your prediction</span>
                    <span className="font-medium">{PREDICTIONS.find(p => p.id === prediction)?.emoji} {PREDICTIONS.find(p => p.id === prediction)?.label}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total Cost</span>
                    <span className="text-primary">${totalCost.toFixed(2)}</span>
                  </div>
                </div>

                {notes && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">Your note:</p>
                    <p className="text-sm italic">"{notes}"</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button variant="ghost" onClick={step === 'company' ? onCancel : handleBack} className="rounded-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {step === 'company' ? 'Cancel' : 'Back'}
          </Button>

          {step !== 'review' ? (
            <Button
              onClick={handleNext}
              disabled={
                (step === 'company' && !selectedStock) ||
                (step === 'prediction' && !prediction)
              }
              className="rounded-full bg-gradient-to-r from-primary to-gain"
            >
              Next Step
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canAfford || isSubmitting} className="rounded-full bg-gradient-to-r from-gain to-primary">
              {isSubmitting ? 'Buying...' : '🎉 Buy Now!'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
