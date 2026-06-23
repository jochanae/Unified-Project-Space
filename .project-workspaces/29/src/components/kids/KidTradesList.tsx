import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { KidTrade } from '@/hooks/useKidTrading';
import { TrendingUp, TrendingDown, DollarSign, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface KidTradesListProps {
  trades: KidTrade[];
  onSell: (tradeId: string, exitPrice: number) => Promise<any>;
}

type SellPhase = 'price' | 'reflection' | 'done';

const LOSS_LESSONS = [
  { emoji: '📉', title: 'Prices Go Down Sometimes', body: "Just like a roller coaster, stock prices go up AND down. Even the best investors lose money sometimes — what matters is what you learn!" },
  { emoji: '🧠', title: 'Every Loss Is a Lesson', body: "When you lose money on a trade, ask yourself: What happened? Did the company change? Did the market change? This thinking makes you smarter!" },
  { emoji: '💪', title: "It's Okay to Lose", body: "The best investors in the world lose on trades all the time. The key is to learn, stay patient, and not give up." },
];

const WIN_CELEBRATIONS = [
  { emoji: '🌟', title: 'Great Call!', body: "Your prediction paid off! You spotted something good about this company. Keep trusting your research!" },
  { emoji: '🎯', title: 'Nice Trade!', body: "You bought low and sold high — that's the goal! Remember: not every trade will win, but this one did!" },
];

const REFLECTION_PROMPTS_LOSS = [
  "What do you think made the price go down?",
  "Would you buy this stock again? Why or why not?",
  "What could you watch for next time before buying?",
];

const REFLECTION_PROMPTS_WIN = [
  "Why do you think the price went up?",
  "Would you buy this stock again at today's price?",
  "What made you feel confident about this company?",
];

export function KidTradesList({ trades, onSell }: KidTradesListProps) {
  const [sellDialog, setSellDialog] = useState<{ trade: KidTrade; price: string } | null>(null);
  const [sellPhase, setSellPhase] = useState<SellPhase>('price');
  const [reflection, setReflection] = useState('');
  const [isSelling, setIsSelling] = useState(false);
  const [lastResult, setLastResult] = useState<{ profitLoss: number; trade: KidTrade } | null>(null);

  const openTrades = trades.filter(t => t.status === 'open');
  const closedTrades = trades.filter(t => t.status === 'closed');

  const handleSell = async () => {
    if (!sellDialog) return;
    const price = parseFloat(sellDialog.price);
    if (isNaN(price) || price <= 0) return;

    setIsSelling(true);
    try {
      const result = await onSell(sellDialog.trade.id, price);
      if (result) {
        const pl = (price - sellDialog.trade.entry_price) * sellDialog.trade.quantity;
        setLastResult({ profitLoss: pl, trade: sellDialog.trade });
        setSellPhase('reflection');
      }
    } finally {
      setIsSelling(false);
    }
  };

  const closeSellDialog = () => {
    setSellDialog(null);
    setSellPhase('price');
    setReflection('');
    setLastResult(null);
  };

  const getCurrentPrice = (_symbol: string, entryPrice: number) => {
    const change = (Math.random() - 0.5) * 0.1;
    return entryPrice * (1 + change);
  };

  const isProfit = lastResult ? lastResult.profitLoss >= 0 : false;
  const lesson = isProfit
    ? WIN_CELEBRATIONS[Math.floor(Math.random() * WIN_CELEBRATIONS.length)]
    : LOSS_LESSONS[Math.floor(Math.random() * LOSS_LESSONS.length)];
  const reflectionPrompt = isProfit
    ? REFLECTION_PROMPTS_WIN[Math.floor(Math.random() * REFLECTION_PROMPTS_WIN.length)]
    : REFLECTION_PROMPTS_LOSS[Math.floor(Math.random() * REFLECTION_PROMPTS_LOSS.length)];

  if (trades.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <span className="text-6xl block mb-4">🚀</span>
          <h3 className="text-xl font-bold mb-2">No trades yet!</h3>
          <p className="text-muted-foreground">Start by buying your first stock above!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Open Positions */}
      {openTrades.length > 0 && (
        <div>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">📈</span> Your Investments ({openTrades.length})
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {openTrades.map((trade) => {
              const currentPrice = getCurrentPrice(trade.symbol, trade.entry_price);
              const potentialPL = (currentPrice - trade.entry_price) * trade.quantity;
              const plPercent = ((currentPrice - trade.entry_price) / trade.entry_price) * 100;
              const tradeIsProfit = potentialPL >= 0;

              return (
                <Card key={trade.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className={cn('h-1.5', tradeIsProfit ? 'bg-gain' : 'bg-loss')} />
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{trade.emoji || '📊'}</span>
                        <div>
                          <p className="font-bold">{trade.company_name || trade.symbol}</p>
                          <p className="text-xs text-muted-foreground">{trade.symbol}</p>
                        </div>
                      </div>
                      <div className={cn(
                        'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                        tradeIsProfit ? 'bg-gain/10 text-gain' : 'bg-loss/10 text-loss'
                      )}>
                        {tradeIsProfit ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {plPercent >= 0 ? '+' : ''}{plPercent.toFixed(1)}%
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                      <div>
                        <p className="text-muted-foreground">Shares</p>
                        <p className="font-medium">{trade.quantity}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Bought at</p>
                        <p className="font-medium">${trade.entry_price.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Now worth</p>
                        <p className="font-medium">${(currentPrice * trade.quantity).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Profit/Loss</p>
                        <p className={cn('font-medium', tradeIsProfit ? 'text-gain' : 'text-loss')}>
                          {tradeIsProfit ? '+' : ''}${potentialPL.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {trade.notes && (
                      <p className="text-xs text-muted-foreground italic mb-3 line-clamp-2">"{trade.notes}"</p>
                    )}

                    <Button
                      onClick={() => {
                        setSellDialog({ trade, price: currentPrice.toFixed(2) });
                        setSellPhase('price');
                        setReflection('');
                        setLastResult(null);
                      }}
                      className="w-full rounded-full"
                      variant={tradeIsProfit ? "default" : "secondary"}
                    >
                      <DollarSign className="h-4 w-4 mr-1" />
                      Sell Now
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Closed Trades */}
      {closedTrades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">📖</span> Trade Journal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {closedTrades.map((trade) => {
                const tradeIsProfit = (trade.profit_loss || 0) >= 0;
                return (
                  <div key={trade.id} className={cn(
                    'flex items-center justify-between p-3 rounded-lg border',
                    tradeIsProfit ? 'bg-gain/5 border-gain/20' : 'bg-loss/5 border-loss/20'
                  )}>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{trade.emoji || '📊'}</span>
                      <div>
                        <p className="font-medium">
                          {trade.company_name || trade.symbol}
                          <span className="text-muted-foreground text-sm ml-2">{trade.quantity} shares</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(trade.entry_date), 'MMM d')} → {trade.exit_date && format(new Date(trade.exit_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn('font-bold', tradeIsProfit ? 'text-gain' : 'text-loss')}>
                        {tradeIsProfit ? '+' : ''}${(trade.profit_loss || 0).toFixed(2)}
                      </p>
                      {tradeIsProfit && <span className="text-xs">⭐ Star earned!</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sell Dialog — Two Phases */}
      <Dialog open={!!sellDialog} onOpenChange={() => closeSellDialog()}>
        <DialogContent className="sm:max-w-md">
          {sellPhase === 'price' && sellDialog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="text-2xl">{sellDialog.trade.emoji}</span>
                  Sell {sellDialog.trade.company_name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <p className="text-muted-foreground">
                  You have {sellDialog.trade.quantity} shares. Enter the selling price:
                </p>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sell Price per Share</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={sellDialog.price}
                      onChange={(e) => setSellDialog({ ...sellDialog, price: e.target.value })}
                      className="pl-8"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
                {(() => {
                  const pl = (parseFloat(sellDialog.price || '0') - sellDialog.trade.entry_price) * sellDialog.trade.quantity;
                  const plIsProfit = pl >= 0;
                  return (
                    <>
                      <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Bought at:</span>
                          <span>${sellDialog.trade.entry_price.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Selling at:</span>
                          <span>${parseFloat(sellDialog.price || '0').toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold border-t pt-1 mt-1">
                          <span>Profit/Loss:</span>
                          <span className={plIsProfit ? 'text-gain' : 'text-loss'}>
                            ${pl.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Contextual mini-lesson before confirming */}
                      {!plIsProfit && pl < 0 && (
                        <div className="flex gap-3 items-start bg-loss/5 border border-loss/20 rounded-lg p-3">
                          <Lightbulb className="h-5 w-5 text-loss mt-0.5 shrink-0" />
                          <div className="text-sm">
                            <p className="font-semibold text-loss">Selling at a loss?</p>
                            <p className="text-muted-foreground mt-0.5">
                              That's okay! Sometimes it's smart to sell before the price drops even more. 
                              This is called <strong>"cutting your losses"</strong> — and it's what pros do too.
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={closeSellDialog}>Cancel</Button>
                <Button
                  onClick={handleSell}
                  disabled={isSelling || !sellDialog.price || parseFloat(sellDialog.price) <= 0}
                  className="bg-gradient-to-r from-primary to-gain"
                >
                  {isSelling ? 'Selling...' : '💰 Confirm Sale'}
                </Button>
              </DialogFooter>
            </>
          )}

          {sellPhase === 'reflection' && lastResult && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-center">
                  <span className="text-2xl">{lesson.emoji}</span>
                  {lesson.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Lesson card */}
                <div className={cn(
                  'rounded-xl p-4 text-sm',
                  isProfit ? 'bg-gain/10 border border-gain/20' : 'bg-loss/5 border border-loss/20'
                )}>
                  <p>{lesson.body}</p>
                </div>

                {/* Result summary */}
                <div className="text-center">
                  <p className={cn('text-2xl font-bold', isProfit ? 'text-gain' : 'text-loss')}>
                    {isProfit ? '+' : ''}${lastResult.profitLoss.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    on {lastResult.trade.company_name} ({lastResult.trade.quantity} shares)
                  </p>
                </div>

                {/* Reflection prompt */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5">
                    <Lightbulb className="h-4 w-4 text-gold" />
                    Quick Reflection (optional)
                  </label>
                  <p className="text-xs text-muted-foreground mb-2">{reflectionPrompt}</p>
                  <Textarea
                    value={reflection}
                    onChange={e => setReflection(e.target.value)}
                    placeholder="Write your thoughts..."
                    rows={2}
                    className="resize-none"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={closeSellDialog} className="w-full rounded-full">
                  {isProfit ? '⭐ Awesome, Done!' : '💪 Got It, Let\'s Keep Going!'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
