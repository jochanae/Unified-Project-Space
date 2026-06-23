import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import {
  BarChart2,
  Shield,
  Sunrise,
  Brain,
  Eye,
  CalendarCheck,
  ChevronDown,
  Sparkles,
  CheckCircle2,
  Circle,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TradingPlanPrompt {
  label: string;
  hint: string;
  inputType: 'text' | 'yesno';
}

interface TradingPlanSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
  prompts: TradingPlanPrompt[];
}

const tradingPlanSections: TradingPlanSection[] = [
  {
    id: 'rules',
    title: 'My Trading Rules',
    icon: BarChart2,
    color: 'text-blue-500',
    description: 'Define what setups you trade, your timeframes, and your entry/exit criteria.',
    prompts: [
      { label: 'What setups do I trade?', hint: 'e.g. Breakouts above resistance on the daily chart', inputType: 'text' },
      { label: 'What timeframes do I use?', hint: 'e.g. Daily for direction, 15-min for entries', inputType: 'text' },
      { label: 'What are my entry criteria?', hint: 'e.g. Price above 20 EMA + volume spike + MACD crossover', inputType: 'text' },
      { label: 'What are my exit criteria?', hint: 'e.g. Trailing stop at 2 ATR, or target hit at 2:1 R/R', inputType: 'text' },
    ],
  },
  {
    id: 'risk',
    title: 'Risk Management',
    icon: Shield,
    color: 'text-amber-500',
    description: 'Protect your capital. Most professionals risk 1-2% per trade maximum.',
    prompts: [
      { label: 'Max risk per trade', hint: 'e.g. 1% of account ($100 on a $10,000 account)', inputType: 'text' },
      { label: 'Max daily loss limit', hint: 'e.g. 3% — I stop trading if I hit this', inputType: 'text' },
      { label: 'Position sizing rule', hint: 'e.g. Risk Amount ÷ (Entry – Stop Loss) = Share count', inputType: 'text' },
      { label: 'Max open positions', hint: 'e.g. No more than 3 trades at once', inputType: 'text' },
    ],
  },
  {
    id: 'premarket',
    title: 'Pre-Market Routine',
    icon: Sunrise,
    color: 'text-orange-500',
    description: 'What you check before placing any trade. Preparation beats prediction.',
    prompts: [
      { label: 'Check the economic calendar', hint: 'Any high-impact events today (FOMC, CPI, earnings)?', inputType: 'yesno' },
      { label: 'Review overnight moves', hint: 'How did futures, Asia, and Europe trade?', inputType: 'yesno' },
      { label: 'Scan my watchlist levels', hint: 'Are any setups near my entry zones?', inputType: 'yesno' },
      { label: 'Read the news', hint: 'Any sector-specific news affecting my positions or watchlist?', inputType: 'yesno' },
    ],
  },
  {
    id: 'emotional',
    title: 'Emotional Readiness',
    icon: Brain,
    color: 'text-purple-500',
    description: 'A quick self-check. The best traders know when NOT to trade.',
    prompts: [
      { label: 'Am I trading with a clear mind?', hint: 'Not stressed, tired, angry, or distracted', inputType: 'yesno' },
      { label: 'Am I chasing or revenge trading?', hint: 'If I missed a move, I wait for the next setup', inputType: 'yesno' },
      { label: 'Am I following my plan?', hint: 'No impulsive trades — only setups from my rules above', inputType: 'yesno' },
      { label: 'Can I accept being wrong?', hint: 'If I\'m not okay losing this trade, I sit it out', inputType: 'yesno' },
    ],
  },
  {
    id: 'watchlist',
    title: 'Watchlist & Setups',
    icon: Eye,
    color: 'text-emerald-500',
    description: 'Current symbols you\'re tracking and the levels you\'re watching.',
    prompts: [
      { label: 'Symbol & setup', hint: 'e.g. AAPL — watching $195 support for a bounce', inputType: 'text' },
      { label: 'Key levels', hint: 'e.g. Support: $190, Resistance: $200', inputType: 'text' },
      { label: 'Catalyst or reason', hint: 'e.g. Earnings beat + sector rotation into tech', inputType: 'text' },
    ],
  },
  {
    id: 'review',
    title: 'Weekly Review',
    icon: CalendarCheck,
    color: 'text-chart-3',
    description: 'End-of-week reflection. This is how you improve over time.',
    prompts: [
      { label: 'What went well this week?', hint: 'Trades I executed according to plan', inputType: 'text' },
      { label: 'What mistakes did I make?', hint: 'Trades I took outside my rules', inputType: 'text' },
      { label: 'What will I improve next week?', hint: 'e.g. Be more patient with entries, tighten stops', inputType: 'text' },
      { label: 'Overall P&L this week', hint: 'Track your progress even if it\'s small', inputType: 'text' },
    ],
  },
];

const STORAGE_KEY = 'trading-plan-answers';
const CHECKLIST_KEY = 'trading-plan-checklist';
const YESNO_KEY = 'trading-plan-yesno';

type Answers = Record<string, Record<number, string>>;
type Checklist = Record<string, Record<number, boolean>>;
type YesNoState = Record<string, Record<number, 'yes' | 'no' | null>>;

function usePersistedState<T>(key: string, fallback: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState];
}

function YesNoToggle({
  value,
  onChange,
}: {
  value: 'yes' | 'no' | null;
  onChange: (val: 'yes' | 'no' | null) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(value === 'yes' ? null : 'yes')}
        className={cn(
          'px-3 py-1 rounded-md text-xs font-medium transition-all border',
          value === 'yes'
            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
            : 'bg-muted/50 text-muted-foreground border-border/50 hover:bg-accent/50'
        )}
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => onChange(value === 'no' ? null : 'no')}
        className={cn(
          'px-3 py-1 rounded-md text-xs font-medium transition-all border',
          value === 'no'
            ? 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30'
            : 'bg-muted/50 text-muted-foreground border-border/50 hover:bg-accent/50'
        )}
      >
        No
      </button>
      {value !== null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="px-2 py-1 rounded-md text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip
        </button>
      )}
    </div>
  );
}

export function TradingPlanTab() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () => Object.fromEntries(tradingPlanSections.map((s) => [s.id, true]))
  );

  const [answers, setAnswers] = usePersistedState<Answers>(STORAGE_KEY, {});
  const [checklist, setChecklist] = usePersistedState<Checklist>(CHECKLIST_KEY, {});
  const [yesNoState, setYesNoState] = usePersistedState<YesNoState>(YESNO_KEY, {});

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const updateAnswer = useCallback((sectionId: string, promptIndex: number, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [sectionId]: { ...prev[sectionId], [promptIndex]: value },
    }));
  }, [setAnswers]);

  const toggleCheck = useCallback((sectionId: string, promptIndex: number) => {
    setChecklist((prev) => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [promptIndex]: !prev[sectionId]?.[promptIndex],
      },
    }));
  }, [setChecklist]);

  const updateYesNo = useCallback((sectionId: string, promptIndex: number, value: 'yes' | 'no' | null) => {
    setYesNoState((prev) => ({
      ...prev,
      [sectionId]: { ...prev[sectionId], [promptIndex]: value },
    }));
  }, [setYesNoState]);

  const getAnswer = (sectionId: string, promptIndex: number) =>
    answers[sectionId]?.[promptIndex] ?? '';

  const isChecked = (sectionId: string, promptIndex: number) =>
    checklist[sectionId]?.[promptIndex] ?? false;

  const getYesNo = (sectionId: string, promptIndex: number) =>
    yesNoState[sectionId]?.[promptIndex] ?? null;

  const handleAskQuinn = (context?: string) => {
    navigate('/mentor', {
      state: {
        prefillMessage: context || "I'd like help building my trading plan. What should I focus on first?",
      },
    });
  };

  const handleSyncFromJournal = useCallback(async () => {
    if (!user) {
      toast.error('Please sign in to sync journal data');
      return;
    }
    setIsSyncing(true);
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('trades')
        .select('profit_loss, status, trade_type, symbol')
        .eq('user_id', user.id)
        .eq('status', 'closed')
        .gte('exit_date', sevenDaysAgo.toISOString())
        .order('exit_date', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.info('No closed trades found in the last 7 days');
        setIsSyncing(false);
        return;
      }

      const totalPL = data.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
      const wins = data.filter(t => (t.profit_loss || 0) > 0).length;
      const losses = data.filter(t => (t.profit_loss || 0) < 0).length;
      const winRate = data.length > 0 ? ((wins / data.length) * 100).toFixed(0) : '0';

      const sign = totalPL >= 0 ? '+' : '';
      const summary = `${sign}$${totalPL.toFixed(2)} | ${data.length} trades (${wins}W / ${losses}L) | ${winRate}% win rate`;

      // P&L is prompt index 3 in the review section
      updateAnswer('review', 3, summary);
      toast.success(`Synced ${data.length} trades from the last 7 days`);
    } catch (err) {
      console.error('Sync error:', err);
      toast.error('Failed to sync journal data');
    } finally {
      setIsSyncing(false);
    }
  }, [user, updateAnswer]);

  // Count completion
  const totalPrompts = tradingPlanSections.reduce((sum, s) => sum + s.prompts.length, 0);
  const filledCount = tradingPlanSections.reduce(
    (sum, s) =>
      sum +
      s.prompts.filter((p, i) =>
        p.inputType === 'yesno'
          ? getYesNo(s.id, i) !== null
          : getAnswer(s.id, i).trim().length > 0
      ).length,
    0
  );

  return (
    <div className="space-y-4">
      {/* Intro card */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <BarChart2 className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">My Trading Plan</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your personal trading playbook. Fill in each section to build discipline and consistency.
                Quinn can help you define any of these — just tap "Ask Quinn" on any section.
              </p>
              {filledCount > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${(filledCount / totalPrompts) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {filledCount}/{totalPrompts} defined
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sections */}
      {tradingPlanSections.map((section) => {
        const Icon = section.icon;
        const isOpen = openSections[section.id] ?? true;
        const sectionFilled = section.prompts.filter((p, i) =>
          p.inputType === 'yesno'
            ? getYesNo(section.id, i) !== null
            : getAnswer(section.id, i).trim().length > 0
        ).length;

        return (
          <Collapsible key={section.id} open={isOpen} onOpenChange={() => toggleSection(section.id)}>
            <Card className="border-border/50 overflow-hidden">
              <CollapsibleTrigger asChild>
                <button className="w-full text-left p-4 flex items-center gap-3 hover:bg-accent/30 transition-colors">
                  <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', section.color, 'bg-current/10')}>
                    <Icon className={cn('h-5 w-5', section.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm">{section.title}</h4>
                      {sectionFilled === section.prompts.length && sectionFilled > 0 && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      )}
                      {sectionFilled > 0 && sectionFilled < section.prompts.length && (
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                          {sectionFilled}/{section.prompts.length}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{section.description}</p>
                  </div>
                  <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
                  {section.prompts.map((prompt, i) => {
                    const checked = isChecked(section.id, i);
                    const answer = getAnswer(section.id, i);
                    const yesNo = getYesNo(section.id, i);
                    const isYesNo = prompt.inputType === 'yesno';

                    return (
                      <div
                        key={i}
                        className={cn(
                          'rounded-lg border border-border/30 overflow-hidden transition-colors',
                          isYesNo && yesNo === 'yes' && 'bg-emerald-500/5 border-emerald-500/20',
                          isYesNo && yesNo === 'no' && 'bg-red-500/5 border-red-500/20',
                          !isYesNo && checked && 'bg-emerald-500/5 border-emerald-500/20',
                          !isYesNo && !checked && 'bg-muted/30',
                          isYesNo && yesNo === null && 'bg-muted/30',
                        )}
                      >
                        {/* Prompt header */}
                        <div className="flex items-start gap-3 p-3">
                          {isYesNo ? (
                            <div className="mt-0.5">
                              {yesNo === 'yes' ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              ) : yesNo === 'no' ? (
                                <Circle className="h-4 w-4 text-red-400" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground/50" />
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleCheck(section.id, i)}
                              className="mt-0.5"
                            >
                              {checked ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground/50" />
                              )}
                            </button>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              'text-sm font-medium',
                              (isYesNo && yesNo !== null) && 'text-muted-foreground',
                              (!isYesNo && checked) && 'line-through text-muted-foreground'
                            )}>
                              {prompt.label}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 italic">{prompt.hint}</p>

                            {/* Yes/No toggle for applicable prompts */}
                            {isYesNo && (
                              <div className="mt-2">
                                <YesNoToggle
                                  value={yesNo}
                                  onChange={(val) => updateYesNo(section.id, i, val)}
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Textarea for text-type prompts */}
                        {!isYesNo && (
                          <div className="px-3 pb-3">
                            <Textarea
                              placeholder="Type your answer here… (saves automatically)"
                              value={answer}
                              onChange={(e) => updateAnswer(section.id, i, e.target.value)}
                              className="min-h-[60px] text-sm resize-none bg-background/50 border-border/40 focus:border-blue-500/50"
                              rows={answer.length > 100 ? 3 : 2}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                      onClick={() => handleAskQuinn(`Help me define my ${section.title.toLowerCase()}. ${section.description}`)}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Ask Quinn to help with this
                    </Button>
                    {section.id === 'review' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-chart-3 hover:bg-accent/50"
                        onClick={handleSyncFromJournal}
                        disabled={isSyncing}
                      >
                        <RefreshCw className={cn('h-3.5 w-3.5', isSyncing && 'animate-spin')} />
                        {isSyncing ? 'Syncing…' : 'Sync from Journal'}
                      </Button>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}

      {/* Bottom CTA */}
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground mb-3">
          Not sure where to start? Let Quinn walk you through it step by step.
        </p>
        <Button onClick={() => handleAskQuinn()} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Sparkles className="h-4 w-4" />
          Build My Trading Plan with Quinn
        </Button>
      </div>
    </div>
  );
}
