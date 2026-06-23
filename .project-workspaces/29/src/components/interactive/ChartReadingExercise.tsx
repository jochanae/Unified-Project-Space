import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  RotateCcw,
  Lightbulb,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PatternQuestion {
  id: string;
  type: 'pattern' | 'trend' | 'support-resistance' | 'timeframe';
  question: string;
  chartData: { x: number; price: number }[];
  options: { id: string; label: string; correct: boolean; explanation: string }[];
  hint?: string;
  correctZones?: { x1: number; x2: number; type: 'support' | 'resistance' }[];
}

// Generate realistic price data with patterns
function generatePriceData(pattern: string, length = 50): { x: number; price: number }[] {
  const data: { x: number; price: number }[] = [];
  let price = 100;
  
  for (let i = 0; i < length; i++) {
    const noise = (Math.random() - 0.5) * 2;
    
    switch (pattern) {
      case 'uptrend':
        price += 0.5 + noise;
        break;
      case 'downtrend':
        price -= 0.5 + noise;
        break;
      case 'double-bottom':
        if (i < 15) price -= 0.4 + noise * 0.5;
        else if (i < 25) price += 0.3 + noise * 0.5;
        else if (i < 35) price -= 0.4 + noise * 0.5;
        else price += 0.5 + noise * 0.5;
        break;
      case 'head-shoulders':
        if (i < 10) price += 0.4 + noise * 0.3;
        else if (i < 15) price -= 0.3 + noise * 0.3;
        else if (i < 25) price += 0.6 + noise * 0.3;
        else if (i < 35) price -= 0.6 + noise * 0.3;
        else if (i < 40) price += 0.4 + noise * 0.3;
        else price -= 0.5 + noise * 0.3;
        break;
      case 'consolidation':
        price += noise * 0.5;
        break;
      case 'breakout':
        if (i < 35) price += noise * 0.3;
        else price += 1 + noise * 0.5;
        break;
      default:
        price += noise;
    }
    
    data.push({ x: i, price: Math.max(50, price) });
  }
  
  return data;
}

const EXERCISES: PatternQuestion[] = [
  {
    id: 'trend-1',
    type: 'trend',
    question: 'What is the overall trend in this chart?',
    chartData: generatePriceData('uptrend'),
    options: [
      { id: 'up', label: '📈 Uptrend', correct: true, explanation: 'Correct! The price is making higher highs and higher lows - the classic definition of an uptrend.' },
      { id: 'down', label: '📉 Downtrend', correct: false, explanation: 'Look again - the price is moving from lower-left to upper-right, indicating an uptrend.' },
      { id: 'sideways', label: '➡️ Sideways/Consolidation', correct: false, explanation: 'Not quite - there is a clear directional movement upward.' },
    ],
    hint: 'Look at where the price started vs. where it ended',
  },
  {
    id: 'trend-2',
    type: 'trend',
    question: 'Identify the trend direction:',
    chartData: generatePriceData('downtrend'),
    options: [
      { id: 'up', label: '📈 Uptrend', correct: false, explanation: 'Notice how the price is declining over time - this is a downtrend.' },
      { id: 'down', label: '📉 Downtrend', correct: true, explanation: 'Correct! Lower highs and lower lows indicate a downtrend. Sellers are in control.' },
      { id: 'sideways', label: '➡️ Sideways/Consolidation', correct: false, explanation: 'The price has a clear downward direction.' },
    ],
    hint: 'Connect the peaks - are they going up or down?',
  },
  {
    id: 'pattern-1',
    type: 'pattern',
    question: 'What chart pattern do you see?',
    chartData: generatePriceData('double-bottom'),
    options: [
      { id: 'double-top', label: 'Double Top', correct: false, explanation: 'A double top has two peaks, not two troughs.' },
      { id: 'double-bottom', label: 'Double Bottom (W)', correct: true, explanation: 'Correct! This W-shaped pattern with two similar lows is a bullish reversal signal.' },
      { id: 'triangle', label: 'Triangle', correct: false, explanation: 'Triangles have converging trendlines, not the W-shape seen here.' },
    ],
    hint: 'Look at the shape - does it remind you of a letter?',
  },
  {
    id: 'pattern-2',
    type: 'pattern',
    question: 'Identify this classic pattern:',
    chartData: generatePriceData('head-shoulders'),
    options: [
      { id: 'cup-handle', label: 'Cup and Handle', correct: false, explanation: 'Cup and handle has a U-shaped cup, not three peaks.' },
      { id: 'head-shoulders', label: 'Head and Shoulders', correct: true, explanation: 'Correct! Three peaks with the middle one higher - a bearish reversal pattern.' },
      { id: 'flag', label: 'Flag Pattern', correct: false, explanation: 'Flags are continuation patterns with parallel lines.' },
    ],
    hint: 'Count the peaks and compare their heights',
  },
  {
    id: 'breakout-1',
    type: 'support-resistance',
    question: 'What happened at the end of this chart?',
    chartData: generatePriceData('breakout'),
    options: [
      { id: 'breakdown', label: 'Breakdown below support', correct: false, explanation: 'The price moved UP strongly, not down.' },
      { id: 'breakout', label: 'Breakout above resistance', correct: true, explanation: 'Correct! After consolidating, price broke above the range - a bullish breakout signal!' },
      { id: 'reversal', label: 'Reversal pattern', correct: false, explanation: 'This shows continuation after a breakout, not a reversal.' },
    ],
    hint: 'Compare the price action before and after the sharp move',
  },
];

interface ChartReadingExerciseProps {
  className?: string;
  onComplete?: () => void;
}

export function ChartReadingExercise({ className, onComplete }: ChartReadingExerciseProps) {
  const [currentExercise, setCurrentExercise] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [attempts, setAttempts] = useState(0);
  
  const exercise = EXERCISES[currentExercise];
  const progress = ((currentExercise + 1) / EXERCISES.length) * 100;
  const isComplete = currentExercise >= EXERCISES.length;
  
  const minPrice = Math.min(...exercise.chartData.map(d => d.price)) * 0.95;
  const maxPrice = Math.max(...exercise.chartData.map(d => d.price)) * 1.05;
  
  const handleAnswerSelect = (optionId: string) => {
    if (showResult) return;
    setSelectedAnswer(optionId);
  };
  
  const handleSubmit = () => {
    if (!selectedAnswer) return;
    
    const isCorrect = exercise.options.find(o => o.id === selectedAnswer)?.correct;
    if (isCorrect) {
      setScore(s => s + (attempts === 0 ? 1 : 0.5)); // Half points if used hint
    }
    setShowResult(true);
  };
  
  const handleNext = () => {
    if (currentExercise < EXERCISES.length - 1) {
      setCurrentExercise(c => c + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setShowHint(false);
      setAttempts(0);
    } else if (onComplete) {
      onComplete();
    }
  };
  
  const handleReset = () => {
    setCurrentExercise(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setShowHint(false);
    setAttempts(0);
  };
  
  const handleShowHint = () => {
    setShowHint(true);
    setAttempts(a => a + 1);
  };
  
  const selectedOption = exercise.options.find(o => o.id === selectedAnswer);
  
  if (isComplete) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gain/20 mb-4">
            <CheckCircle2 className="h-8 w-8 text-gain" />
          </div>
          <h2 className="text-xl font-bold mb-2">Exercise Complete! 🎉</h2>
          <p className="text-muted-foreground mb-4">
            You scored {score.toFixed(1)} out of {EXERCISES.length} points
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            {onComplete && (
              <Button onClick={onComplete}>
                Continue
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              📈 Chart Reading Exercise
              <Badge variant="outline" className="bg-chart-4/10 text-chart-4 border-chart-4/30">
                Interactive
              </Badge>
            </CardTitle>
            <CardDescription>
              Question {currentExercise + 1} of {EXERCISES.length} • Score: {score.toFixed(1)}
            </CardDescription>
          </div>
        </div>
        <Progress value={progress} className="h-1.5 mt-3" />
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Question */}
        <h3 className="font-semibold text-base">{exercise.question}</h3>
        
        {/* Chart */}
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={exercise.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.5} />
              <XAxis 
                dataKey="x" 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                domain={[minPrice, maxPrice]}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v.toFixed(0)}`}
              />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Hint */}
        {!showHint && !showResult && (
          <Button variant="ghost" size="sm" onClick={handleShowHint} className="text-chart-3">
            <Lightbulb className="h-4 w-4 mr-1" />
            Need a hint?
          </Button>
        )}
        {showHint && !showResult && (
          <div className="p-3 rounded-lg bg-chart-3/10 border border-chart-3/30 text-sm">
            💡 <strong>Hint:</strong> {exercise.hint}
          </div>
        )}
        
        {/* Answer Options */}
        <div className="grid gap-2">
          {exercise.options.map((option) => {
            const isSelected = selectedAnswer === option.id;
            const isCorrect = option.correct;
            
            let bgClass = '';
            let borderClass = '';
            
            if (showResult) {
              if (isCorrect) {
                bgClass = 'bg-gain/10';
                borderClass = 'border-gain';
              } else if (isSelected && !isCorrect) {
                bgClass = 'bg-loss/10';
                borderClass = 'border-loss';
              }
            } else if (isSelected) {
              bgClass = 'bg-primary/10';
              borderClass = 'border-primary';
            }
            
            return (
              <button
                key={option.id}
                onClick={() => handleAnswerSelect(option.id)}
                disabled={showResult}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all',
                  'hover:bg-muted/50 disabled:cursor-default',
                  isSelected ? borderClass : 'border-border',
                  bgClass
                )}
              >
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                  isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                )}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
                </div>
                <span className="flex-1">{option.label}</span>
                {showResult && isCorrect && (
                  <CheckCircle2 className="h-5 w-5 text-gain shrink-0" />
                )}
                {showResult && isSelected && !isCorrect && (
                  <XCircle className="h-5 w-5 text-loss shrink-0" />
                )}
              </button>
            );
          })}
        </div>
        
        {/* Result Explanation */}
        {showResult && selectedOption && (
          <div className={cn(
            'p-4 rounded-lg',
            selectedOption.correct ? 'bg-gain/10 border border-gain/30' : 'bg-loss/10 border border-loss/30'
          )}>
            <div className="flex items-start gap-2">
              {selectedOption.correct ? (
                <CheckCircle2 className="h-5 w-5 text-gain shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-loss shrink-0 mt-0.5" />
              )}
              <p className="text-sm">{selectedOption.explanation}</p>
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-2">
          {!showResult ? (
            <Button onClick={handleSubmit} disabled={!selectedAnswer}>
              Check Answer
            </Button>
          ) : (
            <Button onClick={handleNext}>
              {currentExercise < EXERCISES.length - 1 ? 'Next Question' : 'View Results'}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
