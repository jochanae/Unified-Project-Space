import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface CreditScore {
  id: string;
  score: number;
  bureau: string;
  score_date: string;
}

interface CurrentScoresSummaryProps {
  creditScores: CreditScore[];
  isLoading: boolean;
}

const bureauConfig = [
  { name: 'Experian', key: 'Experian', color: 'from-blue-500/20 to-blue-600/10', borderColor: 'border-blue-500/30', textColor: 'text-blue-400' },
  { name: 'Equifax', key: 'Equifax', color: 'from-red-500/20 to-red-600/10', borderColor: 'border-red-500/30', textColor: 'text-red-400' },
  { name: 'TransUnion', key: 'TransUnion', color: 'from-purple-500/20 to-purple-600/10', borderColor: 'border-purple-500/30', textColor: 'text-purple-400' },
  { name: 'Tri-Merge', key: 'Tri-Merge', color: 'from-emerald-500/20 to-emerald-600/10', borderColor: 'border-emerald-500/30', textColor: 'text-emerald-400' },
];

const getScoreColor = (score: number | null): string => {
  if (!score) return 'text-muted-foreground';
  if (score >= 800) return 'text-emerald-400';
  if (score >= 740) return 'text-green-400';
  if (score >= 670) return 'text-lime-400';
  if (score >= 580) return 'text-yellow-400';
  return 'text-red-400';
};

const getLatestScoreByBureau = (creditScores: CreditScore[], bureau: string): CreditScore | null => {
  return creditScores.find(score => score.bureau === bureau) || null;
};

const calculateTriMerge = (creditScores: CreditScore[]): number | null => {
  const bureaus = ['Experian', 'Equifax', 'TransUnion'];
  const scores = bureaus
    .map(bureau => getLatestScoreByBureau(creditScores, bureau)?.score)
    .filter((score): score is number => score !== undefined);
  
  if (scores.length === 0) return null;
  if (scores.length === 1) return scores[0];
  if (scores.length === 2) return Math.round((scores[0] + scores[1]) / 2);
  
  // For 3 scores, use the middle score (median)
  const sorted = [...scores].sort((a, b) => a - b);
  return sorted[1];
};

const CurrentScoresSummary = ({ creditScores, isLoading }: CurrentScoresSummaryProps) => {
  // Get the most recent date from all scores for Tri-Merge display
  const getLatestDate = (): string | null => {
    if (creditScores.length === 0) return null;
    const dates = creditScores.map(s => new Date(s.score_date).getTime());
    const latestTime = Math.max(...dates);
    const latestScore = creditScores.find(s => new Date(s.score_date).getTime() === latestTime);
    return latestScore?.score_date || null;
  };

  if (isLoading) {
    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          Credit Scores
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {bureauConfig.map((bureau) => (
            <Card key={bureau.key} className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-12 mt-1" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const triMergeScore = calculateTriMerge(creditScores);
  const latestDate = getLatestDate();

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
        Credit Scores
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {bureauConfig.map((bureau, index) => {
          const scoreData = bureau.key === 'Tri-Merge' 
            ? null 
            : getLatestScoreByBureau(creditScores, bureau.key);
          const score = bureau.key === 'Tri-Merge' 
            ? triMergeScore 
            : scoreData?.score || null;
          
          // For Tri-Merge, use the latest date from all scores
          const displayDate = bureau.key === 'Tri-Merge' 
            ? latestDate 
            : scoreData?.score_date;
          
          return (
            <motion.div
              key={bureau.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className={`p-4 bg-gradient-to-br ${bureau.color} ${bureau.borderColor} border h-full`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${bureau.textColor}`}>{bureau.name}</span>
                  {bureau.key === 'Tri-Merge' && (
                    <Popover>
                      <PopoverTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </PopoverTrigger>
                      <PopoverContent className="text-xs p-2 w-auto">
                        <p>Middle score from all 3 bureaus</p>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
                <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
                  {score !== null ? score : '---'}
                </div>
                {displayDate && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(displayDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default CurrentScoresSummary;
