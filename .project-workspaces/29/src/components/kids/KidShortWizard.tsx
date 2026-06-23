import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { KID_FRIENDLY_STOCKS, KidTradeInput } from '@/hooks/useKidTrading';
import { ArrowRight, ArrowLeft, TrendingDown, Check, Shield, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KidShortWizardProps {
  balance: number;
  onSubmit: (input: KidTradeInput) => Promise<any>;
  onCancel: () => void;
}

type ShortStep = 'explain' | 'company' | 'shares' | 'review';

export function KidShortWizard({ balance, onSubmit, onCancel }: KidShortWizardProps) {
  const [step, setStep] = useState<ShortStep>('explain');
  const [selectedStock, setSelectedStock] = useState<typeof KID_FRIENDLY_STOCKS[0] | null>(null);
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
  const totalCost = currentPrice * quantity; // margin held
  const canAfford = totalCost <= balance;
  const maxShares = Math.floor(balance / currentPrice);

  const handleNext = () => {
    if (step === 'explain') setStep('company');
    else if (step === 'company' && selectedStock) setStep('shares');
    else if (step === 'shares') setStep('review');
  };

  const handleBack = () => {
    if (step === 'company') setStep('explain');
    else if (step === 'shares') setStep('company');
    else if (step === 'review') setStep('shares');
  };

  const handleSubmit = async () => {
    if (!selectedStock || !canAfford) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        symbol: selectedStock.symbol,
        company_name: selectedStock.name,
        entry_price: currentPrice,
        quantity,
        notes: `SHORT TRADE 📉 | ${notes}`.trim(),
        emoji: '📉',
      });
      onCancel();
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepIndicators = [
    { key: 'explain', label: 'Learn', number: 1 },
    { key: 'company', label: 'Pick', number: 2 },
    { key: 'shares', label: 'Amount', number: 3 },
    { key: 'review', label: 'Review', number: 4 },
  ];
  const currentStepIndex = stepIndicators.findIndex(x => x.key === step);

  return (
    <Card className="overflow-hidden border-2 border-loss/30">
      <div className="h-2 bg-gradient-to-r from-loss via-primary to-gold" />
      <CardContent className="p-6">
        {/* Step Indicators */}
        <div className="flex items-center justify-center gap-1 mb-8">
          {stepIndicators.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={cn(
                  'flex items-center justify-center h-8 w-8 rounded-full text-sm font-bold transition-all',
                  step === s.key
                    ? 'bg-loss text-loss-foreground scale-110'
                    : currentStepIndex > i
                    ? 'bg-gain text-gain-foreground'
                    : 'bg-muted text-muted-foreground'
                )}>
                  {currentStepIndex > i ? <Check className="h-4 w-4" /> : s.number}
                </div>
                <span className="text-[10px] text-muted-foreground mt-1">{s.label}</span>
              </div>
              {i < stepIndicators.length - 1 && (
                <div className={cn('w-8 h-1 mx-1 rounded mb-4', currentStepIndex > i ? 'bg-gain' : 'bg-muted')} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Quick explainer */}
        {step === 'explain' && (
          <div className="space-y-6 max-w-md mx-auto">
            <div className="text-center">
              <span className="text-5xl block mb-3">📉</span>
              <h3 className="text-xl font-bold">Short Selling — The Reverse Trade!</h3>
              <p className="text-muted-foreground mt-2">You already know how to buy low and sell high. Shorting flips that around!</p>
            </div>

            <div className="space-y-4">
              <Card className="bg-muted/50">
                <CardContent className="p-4 flex gap-3">
                  <span className="text-2xl">1️⃣</span>
                  <div>
                    <p className="font-bold text-sm">Borrow & Sell</p>
                    <p className="text-xs text-muted-foreground">You "borrow" shares and sell them at today's price.</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/50">
                <CardContent className="p-4 flex gap-3">
                  <span className="text-2xl">2️⃣</span>
                  <div>
                    <p className="font-bold text-sm">Wait for the Dip</p>
                    <p className="text-xs text-muted-foreground">You hope the price goes <strong>down</strong>.</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/50">
                <CardContent className="p-4 flex gap-3">
                  <span className="text-2xl">3️⃣</span>
                  <div>
                    <p className="font-bold text-sm">Buy Back Cheaper</p>
                    <p className="text-xs text-muted-foreground">You buy the shares back at the lower price. The difference is your profit! 🎉</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="bg-loss/5 border border-loss/20 rounded-xl p-4 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-loss shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold text-loss">⚠️ Be careful!</p>
                <p className="text-muted-foreground">
                  If the price goes <strong>up</strong> instead, you lose money. Shorting is riskier than buying — that's why it's an advanced move!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Pick Company */}
        {step === 'company' && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <TrendingDown className="h-8 w-8 text-loss mx-auto mb-2" />
              <h3 className="text-xl font-bold">Which Stock Will Go Down?</h3>
              <p className="text-muted-foreground">Pick a company you think will drop in price</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {KID_FRIENDLY_STOCKS.map((stock) => (
                <button
                  key={stock.symbol}
                  onClick={() => setSelectedStock(stock)}
                  className={cn(
                    'p-4 rounded-xl border-2 transition-all hover:scale-105 text-center',
                    selectedStock?.symbol === stock.symbol
                      ? 'border-loss bg-loss/10 shadow-lg'
                      : 'border-border hover:border-loss/50'
                  )}
                >
                  <span className="text-3xl block mb-1">{stock.emoji}</span>
                  <p className="font-bold text-sm">{stock.name}</p>
                  <p className="text-xs text-muted-foreground">{stock.symbol}</p>
                  <p className="text-sm font-semibold text-loss mt-2">${getStockPrice(stock.symbol).toFixed(2)}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Shares */}
        {step === 'shares' && selectedStock && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <span className="text-5xl block mb-2">{selectedStock.emoji}</span>
              <h3 className="text-xl font-bold">How many {selectedStock.name} shares to short?</h3>
              <p className="text-muted-foreground text-sm">
                We'll hold ${currentPrice.toFixed(2)} per share from your piggy bank as a safety deposit
              </p>
            </div>

            <div className="max-w-xs mx-auto space-y-4">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1} className="h-12 w-12 rounded-full text-xl">-</Button>
                <Input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.min(maxShares, parseInt(e.target.value) || 1)))} className="text-center text-2xl font-bold h-14" min={1} max={maxShares} />
                <Button variant="outline" size="icon" onClick={() => setQuantity(Math.min(maxShares, quantity + 1))} disabled={quantity >= maxShares} className="h-12 w-12 rounded-full text-xl">+</Button>
              </div>

              <div className="text-center space-y-1">
                <p className={cn('text-2xl font-bold', canAfford ? 'text-foreground' : 'text-loss')}>
                  Safety Deposit: ${totalCost.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">You have ${balance.toFixed(2)} in your piggy bank</p>
                {!canAfford && <p className="text-sm text-loss font-medium">Not enough coins! Try fewer shares.</p>}
              </div>

              <Textarea
                placeholder="Why do you think this stock will drop? (optional)"
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
              <span className="text-5xl block mb-2">📉</span>
              <h3 className="text-xl font-bold">Ready to Short!</h3>
              <p className="text-muted-foreground">You're betting this price will go <strong>down</strong></p>
            </div>

            <Card className="bg-loss/5 max-w-sm mx-auto border border-loss/20">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{selectedStock.emoji}</span>
                  <div>
                    <p className="font-bold text-lg">{selectedStock.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedStock.symbol} · SHORT</p>
                  </div>
                  <TrendingDown className="h-6 w-6 text-loss ml-auto" />
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Short price</span>
                    <span className="font-medium">${currentPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shares</span>
                    <span className="font-medium">{quantity}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Safety deposit</span>
                    <span className="font-medium">${totalCost.toFixed(2)}</span>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                  <p className="flex items-center gap-1.5 font-medium text-foreground mb-1">
                    <Shield className="h-3.5 w-3.5" /> How you make money:
                  </p>
                  <p>If {selectedStock.name} drops from ${currentPrice.toFixed(2)} to, say, ${(currentPrice * 0.9).toFixed(2)}, 
                  you earn ${(currentPrice * 0.1 * quantity).toFixed(2)}!</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button variant="ghost" onClick={step === 'explain' ? onCancel : handleBack} className="rounded-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {step === 'explain' ? 'Cancel' : 'Back'}
          </Button>

          {step !== 'review' ? (
            <Button
              onClick={handleNext}
              disabled={step === 'company' && !selectedStock}
              className="rounded-full bg-gradient-to-r from-loss to-primary"
            >
              Next Step
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canAfford || isSubmitting} className="rounded-full bg-gradient-to-r from-loss to-primary">
              {isSubmitting ? 'Shorting...' : '📉 Short It!'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
