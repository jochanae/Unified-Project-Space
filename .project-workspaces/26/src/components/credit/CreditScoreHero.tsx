import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface CreditScore {
  id: string;
  score: number;
  bureau: string;
  score_date: string;
}

interface CreditScoreHeroProps {
  latestScore: CreditScore | undefined;
  scoreChange: number;
  isLoading: boolean;
  onAddScore: () => void;
}

const getScoreRating = (score: number): { label: string; color: string; description: string } => {
  if (score >= 800) return { label: 'Exceptional', color: 'text-emerald-500', description: 'You have excellent credit!' };
  if (score >= 740) return { label: 'Very Good', color: 'text-green-500', description: 'Your credit is above average.' };
  if (score >= 670) return { label: 'Good', color: 'text-lime-500', description: 'Your credit is in good standing.' };
  if (score >= 580) return { label: 'Fair', color: 'text-yellow-500', description: 'Your credit needs some work.' };
  return { label: 'Poor', color: 'text-red-500', description: 'Focus on improving your credit.' };
};

const getScoreGaugePosition = (score: number): number => {
  // Map score (300-850) to percentage (0-100)
  return ((score - 300) / 550) * 100;
};

const CreditScoreHero = ({ latestScore, scoreChange, isLoading, onAddScore }: CreditScoreHeroProps) => {
  if (isLoading) {
    return (
      <Card className="p-6 bg-gradient-to-br from-emerald-900/20 to-teal-900/20 border-emerald-500/20">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1 text-center md:text-left">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-16 w-32 mb-4" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-48 w-48 rounded-full" />
        </div>
      </Card>
    );
  }

  if (!latestScore) {
    return (
      <Card className="p-8 bg-gradient-to-br from-emerald-900/20 to-teal-900/20 border-emerald-500/20">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Track Your Credit Score</h2>
          <p className="text-muted-foreground mb-6">
            Start tracking your credit score to monitor your financial health over time.
          </p>
          <Button onClick={onAddScore} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Your First Score
          </Button>
        </div>
      </Card>
    );
  }

  const rating = getScoreRating(latestScore.score);
  const gaugePosition = getScoreGaugePosition(latestScore.score);

  return (
    <Card className="p-6 bg-gradient-to-br from-emerald-900/20 to-teal-900/20 border-emerald-500/20 overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.1),transparent_50%)]" />
      
      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
        {/* Left Side - Score Info */}
        <div className="flex-1 text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-2 mb-2">
            <h2 className="text-lg font-medium text-muted-foreground">Your Credit Score</h2>
            <Popover>
              <PopoverTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </PopoverTrigger>
              <PopoverContent className="text-sm p-2 w-auto">
                <p>Based on {latestScore.bureau} data</p>
              </PopoverContent>
            </Popover>
          </div>
          
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="mb-4"
          >
            <span className="text-6xl md:text-7xl font-bold text-foreground">{latestScore.score}</span>
          </motion.div>

          <div className="flex items-center justify-center lg:justify-start gap-3 mb-4">
            <span className={`text-lg font-semibold ${rating.color}`}>{rating.label}</span>
            {scoreChange !== 0 && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${
                scoreChange > 0 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : scoreChange < 0 
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-muted text-muted-foreground'
              }`}>
                {scoreChange > 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : scoreChange < 0 ? (
                  <TrendingDown className="h-4 w-4" />
                ) : (
                  <Minus className="h-4 w-4" />
                )}
                <span>{scoreChange > 0 ? '+' : ''}{scoreChange} pts</span>
              </div>
            )}
          </div>

          <p className="text-muted-foreground mb-4">{rating.description}</p>

          <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
            <Button onClick={onAddScore} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add New Score
            </Button>
          </div>
        </div>

        {/* Right Side - Score Gauge */}
        <div className="relative w-64 h-48">
          <svg viewBox="0 0 200 120" className="w-full h-full">
            {/* Background arc */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="16"
              strokeLinecap="round"
            />
            
            {/* Score ranges - colored segments */}
            <path
              d="M 20 100 A 80 80 0 0 1 52 45"
              fill="none"
              stroke="hsl(0 84% 60%)"
              strokeWidth="16"
              strokeLinecap="round"
              className="opacity-40"
            />
            <path
              d="M 52 45 A 80 80 0 0 1 100 20"
              fill="none"
              stroke="hsl(45 93% 47%)"
              strokeWidth="16"
              strokeLinecap="round"
              className="opacity-40"
            />
            <path
              d="M 100 20 A 80 80 0 0 1 148 45"
              fill="none"
              stroke="hsl(82 85% 45%)"
              strokeWidth="16"
              strokeLinecap="round"
              className="opacity-40"
            />
            <path
              d="M 148 45 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="hsl(142 76% 36%)"
              strokeWidth="16"
              strokeLinecap="round"
              className="opacity-40"
            />
            
            {/* Score indicator */}
            <motion.circle
              initial={{ cx: 20, cy: 100 }}
              animate={{ 
                cx: 20 + (160 * (gaugePosition / 100)),
                cy: 100 - 80 * Math.sin(Math.PI * gaugePosition / 100)
              }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
              r="10"
              fill="hsl(var(--primary))"
              className="drop-shadow-lg"
            />
          </svg>
          
          {/* Range labels */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-muted-foreground px-2">
            <span>300</span>
            <span>580</span>
            <span>670</span>
            <span>740</span>
            <span>850</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CreditScoreHero;
