import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { KID_FRIENDLY_STOCKS } from '@/hooks/useKidTrading';
import { TrendingUp, TrendingDown, Star, Sparkles, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KidPredictionGameProps {
  onStarEarned?: () => void;
}

interface PredictionRound {
  stock: typeof KID_FRIENDLY_STOCKS[0];
  startPrice: number;
  endPrice: number;
  prediction: 'up' | 'down' | null;
  revealed: boolean;
}

function generateRound(): PredictionRound {
  const stock = KID_FRIENDLY_STOCKS[Math.floor(Math.random() * KID_FRIENDLY_STOCKS.length)];
  const basePrices: Record<string, number> = {
    AAPL: 178, DIS: 95, NFLX: 485, SBUX: 98, NKE: 107,
    TSLA: 248, AMZN: 178, GOOGL: 141, MSFT: 378, MCD: 294,
  };
  const startPrice = basePrices[stock.symbol] || 100;
  const change = (Math.random() - 0.45) * startPrice * 0.08; // slight upward bias
  const endPrice = Math.round((startPrice + change) * 100) / 100;
  return { stock, startPrice, endPrice, prediction: null, revealed: false };
}

export function KidPredictionGame({ onStarEarned }: KidPredictionGameProps) {
  const [round, setRound] = useState<PredictionRound>(generateRound);
  const [streak, setStreak] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalPlayed, setTotalPlayed] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);

  const makePrediction = (direction: 'up' | 'down') => {
    setRound(prev => ({ ...prev, prediction: direction }));
  };

  const revealResult = () => {
    setRound(prev => ({ ...prev, revealed: true }));
    const actualDirection = round.endPrice >= round.startPrice ? 'up' : 'down';
    const correct = round.prediction === actualDirection;
    setTotalPlayed(p => p + 1);
    if (correct) {
      setTotalCorrect(c => c + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak % 3 === 0) {
        onStarEarned?.();
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 2000);
      }
    } else {
      setStreak(0);
    }
  };

  const nextRound = () => {
    setRound(generateRound());
  };

  const actualDirection = round.endPrice >= round.startPrice ? 'up' : 'down';
  const isCorrect = round.prediction === actualDirection;
  const priceChange = round.endPrice - round.startPrice;
  const pctChange = ((priceChange) / round.startPrice * 100);

  return (
    <Card className="overflow-hidden border-2 border-primary/20">
      <div className="h-2 bg-gradient-to-r from-primary via-gold to-gain" />
      <CardContent className="p-6">
        <div className="text-center mb-6">
          <span className="text-4xl block mb-2">🔮</span>
          <h3 className="text-xl font-bold">Predict the Market!</h3>
          <p className="text-sm text-muted-foreground">
            Will the stock go up or down? Earn a ⭐ for every 3 correct predictions!
          </p>
        </div>

        {/* Stats bar */}
        <div className="flex justify-center gap-6 mb-6 text-sm">
          <div className="flex items-center gap-1.5">
            <Star className="h-4 w-4 text-gold fill-gold" />
            <span className="font-medium">{totalCorrect}/{totalPlayed} correct</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-medium">{streak} streak</span>
          </div>
        </div>

        {/* Stock card */}
        <div className="max-w-sm mx-auto">
          <Card className="bg-muted/50">
            <CardContent className="p-6 text-center">
              <span className="text-5xl block mb-2">{round.stock.emoji}</span>
              <p className="text-xl font-bold">{round.stock.name}</p>
              <p className="text-sm text-muted-foreground mb-1">{round.stock.symbol} · {round.stock.description}</p>
              <p className="text-2xl font-bold text-primary mt-3">${round.startPrice.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Current price</p>

              {round.revealed && (
                <div className={cn(
                  'mt-4 p-3 rounded-xl',
                  isCorrect ? 'bg-gain/10 border border-gain/30' : 'bg-loss/10 border border-loss/30'
                )}>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    {actualDirection === 'up' 
                      ? <TrendingUp className="h-5 w-5 text-gain" />
                      : <TrendingDown className="h-5 w-5 text-loss" />
                    }
                    <span className={cn('text-lg font-bold', actualDirection === 'up' ? 'text-gain' : 'text-loss')}>
                      ${round.endPrice.toFixed(2)} ({pctChange >= 0 ? '+' : ''}{pctChange.toFixed(1)}%)
                    </span>
                  </div>
                  <p className="text-sm font-medium">
                    {isCorrect ? '🎉 You got it right!' : '😊 Not this time — keep practicing!'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action buttons */}
          {!round.prediction && (
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Button
                onClick={() => makePrediction('up')}
                className="h-16 rounded-xl bg-gain hover:bg-gain/90 text-gain-foreground text-lg font-bold gap-2"
              >
                <TrendingUp className="h-5 w-5" />
                Going Up!
              </Button>
              <Button
                onClick={() => makePrediction('down')}
                className="h-16 rounded-xl bg-loss hover:bg-loss/90 text-loss-foreground text-lg font-bold gap-2"
              >
                <TrendingDown className="h-5 w-5" />
                Going Down!
              </Button>
            </div>
          )}

          {round.prediction && !round.revealed && (
            <div className="mt-4 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                You predicted: <strong>{round.prediction === 'up' ? '📈 Going Up!' : '📉 Going Down!'}</strong>
              </p>
              <Button onClick={revealResult} className="rounded-full bg-gradient-to-r from-primary to-gold text-lg px-8 py-3 h-auto">
                🥁 Reveal Result!
              </Button>
            </div>
          )}

          {round.revealed && (
            <div className="mt-4 text-center">
              <Button onClick={nextRound} className="rounded-full gap-2" variant="outline">
                <RotateCcw className="h-4 w-4" />
                Next Stock
              </Button>
            </div>
          )}
        </div>

        {/* Celebration overlay */}
        {showCelebration && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm pointer-events-none">
            <div className="text-center animate-bounce">
              <span className="text-7xl block">⭐</span>
              <p className="text-2xl font-bold text-gold mt-2">Star Earned!</p>
              <p className="text-muted-foreground">3 correct predictions in a row!</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
