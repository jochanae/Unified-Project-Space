import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, MessageCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useQuinnGreeting } from '@/hooks/useQuinnGreeting';

interface TopicAction {
  label: string;
  emoji: string;
  askPrompt: string;
  libraryPath: string;
}

// Primary entry point - separated for special styling
const START_HERE: TopicAction = {
  label: 'Start Here',
  emoji: '🥇',
  askPrompt: "Hi Quinn! I'd like to share where I am financially and where I want to go. Can you help me understand my situation and map out a path forward?",
  libraryPath: '/learn'
};

const TOPICS: TopicAction[] = [
  // Financial Planning & Wealth Building (FIRST - signals broader finance)
  { label: 'Retirement Planning', emoji: '🏦', askPrompt: 'Help me plan for retirement - 401k, IRA, Roth IRA, contribution limits, tax advantages, Social Security, and strategies for maximizing retirement savings', libraryPath: '/library?topic=retirement' },
  { label: 'Budget & Savings', emoji: '💰', askPrompt: 'Help me create a budget and savings plan - emergency funds, the 50/30/20 rule, paying down debt, and building a financial safety net', libraryPath: '/library?topic=budget' },
  { label: 'Insurance & Protection', emoji: '🛡️', askPrompt: 'Tell me about insurance-based financial products - IULs, whole life, living benefits, annuities, and how to protect my family\'s financial future', libraryPath: '/library?topic=insurance' },
  { label: 'Stocks & ETFs', emoji: '📈', askPrompt: 'Tell me about stocks and ETFs - fundamentals, valuation, and dividends', libraryPath: '/library?topic=stocks' },
  // More Investing
  { label: 'Dividend Investing', emoji: '🪙', askPrompt: 'Tell me about dividend investing - building passive income, DRIP programs, dividend aristocrats, yield vs growth, and creating a dividend portfolio', libraryPath: '/library?topic=dividends' },
  { label: 'Portfolio Allocation', emoji: '🥧', askPrompt: 'Tell me about portfolio allocation - diversification, asset allocation strategies, rebalancing, modern portfolio theory, and age-based allocation', libraryPath: '/library?topic=allocation' },
  { label: 'Bonds', emoji: '💵', askPrompt: 'Explain bonds - treasuries, corporates, and fixed income strategies', libraryPath: '/library?topic=bonds' },
  { label: 'REITs', emoji: '🏠', askPrompt: 'Tell me about REITs - real estate investing, dividends, and sectors', libraryPath: '/library?topic=reits' },
  // Trading
  { label: 'Options', emoji: '🎯', askPrompt: 'Explain options trading - calls, puts, spreads, iron condors, and the Greeks', libraryPath: '/library?topic=options' },
  { label: '0DTE Strategies', emoji: '⚡', askPrompt: 'Explain 0DTE (zero days to expiration) options trading - same-day expiration strategies, rapid theta decay, credit spreads, and risk management for 0DTE', libraryPath: '/library?topic=0dte' },
  { label: 'Forex & Futures', emoji: '🌍', askPrompt: 'Tell me about forex and futures trading - currencies, commodities, and hedging', libraryPath: '/library?topic=forex' },
  { label: 'Commodities', emoji: '🪙', askPrompt: 'Explain commodities trading - gold, silver, oil, natural gas, and agricultural products. Cover spot vs futures and how to invest', libraryPath: '/library?topic=commodities' },
  { label: 'Crypto', emoji: '₿', askPrompt: 'Explain cryptocurrency - Bitcoin, Ethereum, DeFi, and market cycles', libraryPath: '/library?topic=crypto' },
  // Trading Styles
  { label: 'Swing Trading', emoji: '🔄', askPrompt: 'Explain swing trading - holding positions for days to weeks, identifying swing setups, entry/exit timing, and managing overnight risk', libraryPath: '/library?topic=swing' },
  { label: 'Earnings Trading', emoji: '📅', askPrompt: 'Tell me about earnings trading - playing quarterly reports, IV crush, straddles/strangles around earnings, and pre/post announcement strategies', libraryPath: '/library?topic=earnings' },
  // Analysis & Risk
  { label: 'Technical Analysis', emoji: '📊', askPrompt: 'Explain technical analysis - charts, patterns, and indicators', libraryPath: '/library?topic=technical' },
  { label: 'Fundamental Analysis', emoji: '📋', askPrompt: 'Explain fundamental analysis - earnings, P/E ratios, revenue growth, balance sheets, and how to value stocks using fundamentals', libraryPath: '/library?topic=fundamentals' },
  { label: 'Risk Management', emoji: '⚖️', askPrompt: 'Tell me about risk management - position sizing, stop-losses, and allocation', libraryPath: '/library?topic=risk' },
  { label: 'Trading Psychology', emoji: '🧠', askPrompt: 'Explain trading psychology - discipline, habits, and handling losses', libraryPath: '/library?topic=psychology' },
];

interface QuinnWelcomeProps {
  onAskQuinn: (message: string) => void;
  /** Close/minimize the surrounding Quinn surface before route navigation. */
  onNavigateAway?: () => void;
  /** The context-aware greeting data */
  greetingContext?: {
    greeting: string;
    subtext: string;
    showTopics: boolean;
    context: {
      isFirstVisit: boolean;
      hasRecentTrades: boolean;
      recentTradeCount: number;
      planItemsDueCount: number;
      planItemsCompletedThisWeek: number;
    };
  };
}

export function QuinnWelcome({ onAskQuinn, onNavigateAway, greetingContext }: QuinnWelcomeProps) {
  const navigate = useNavigate();
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const [topicsExpanded, setTopicsExpanded] = useState(false);
  
  // Use provided greeting context or fetch our own
  const localGreeting = useQuinnGreeting();
  const { greeting, subtext, showTopics, isLoading, context } = greetingContext 
    ? { ...greetingContext, isLoading: false } 
    : localGreeting;

  const handleAskQuinn = (topic: TopicAction) => {
    setOpenPopover(null);
    onAskQuinn(topic.askPrompt);
  };

  const handleViewLessons = (topic: TopicAction) => {
    setOpenPopover(null);
    onNavigateAway?.();
    navigate(topic.libraryPath);
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 animate-pulse">
        <div className="h-8 w-64 bg-muted rounded-lg mb-4" />
        <div className="h-4 w-48 bg-muted rounded mb-2" />
      </div>
    );
  }

  // Parse greeting to extract name if present (for bold styling)
  const greetingParts = greeting.split('**');
  
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center max-w-2xl mx-auto">
      {/* Hero Greeting - Large, Bold, Centered */}
      <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-3">
        {greetingParts.map((part, i) => 
          i % 2 === 1 ? (
            <span key={i} className="text-primary">{part}</span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </h1>
      
      {/* Subtext */}
      <p className="text-muted-foreground text-base sm:text-lg mb-4 max-w-md">
        {subtext}
      </p>
      
      {/* Context-aware action buttons - make greeting actionable */}
      {!context.isFirstVisit && (
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {context.hasRecentTrades && context.recentTradeCount > 0 && (
            <button
              onClick={() => onAskQuinn(`Yes, please analyze my ${context.recentTradeCount} recent trades. Give me insights on my performance, patterns, and areas for improvement.`)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
                "bg-primary text-primary-foreground",
                "hover:bg-primary/90 active:scale-[0.98]",
                "transition-all duration-200 cursor-pointer",
                "shadow-md shadow-primary/20"
              )}
            >
              📊 Yes, analyze my trades
            </button>
          )}
          {context.planItemsDueCount > 0 && (
            <button
              onClick={() => onAskQuinn(`I have ${context.planItemsDueCount} items due in my plan. Help me prioritize what to focus on today.`)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
                "bg-gold/20 text-gold border border-gold/30",
                "hover:bg-gold/30 active:scale-[0.98]",
                "transition-all duration-200 cursor-pointer"
              )}
            >
              📋 Review my plan items
            </button>
          )}
          {context.planItemsCompletedThisWeek > 0 && !context.hasRecentTrades && (
            <button
              onClick={() => onAskQuinn(`I completed ${context.planItemsCompletedThisWeek} plan items this week! What should I focus on next to keep building momentum?`)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
                "bg-gain/20 text-gain border border-gain/30",
                "hover:bg-gain/30 active:scale-[0.98]",
                "transition-all duration-200 cursor-pointer"
              )}
            >
              🎉 What's next?
            </button>
          )}
        </div>
      )}

      {/* Start Here - Primary CTA for first-time users */}
      {context.isFirstVisit && (
        <button
          onClick={() => onAskQuinn(START_HERE.askPrompt)}
          className={cn(
            "flex items-center gap-3 px-6 py-4 rounded-full mb-6",
            "bg-primary text-primary-foreground",
            "hover:bg-primary/90 active:scale-[0.98]",
            "transition-all duration-200 cursor-pointer",
            "shadow-lg shadow-primary/25",
            "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
          )}
        >
          <span className="text-xl">{START_HERE.emoji}</span>
          <span className="font-medium">{START_HERE.label}</span>
        </button>
      )}

      {/* Quick Action Chips - ChatGPT style grid */}
      {showTopics && (
        <div className="w-full max-w-lg">
          {/* Primary action chips - always visible */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {TOPICS.slice(0, 4).map((topic) => (
              <Popover 
                key={topic.label} 
                open={openPopover === topic.label}
                onOpenChange={(open) => setOpenPopover(open ? topic.label : null)}
              >
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm",
                      "bg-muted/50 hover:bg-muted",
                      "border border-border/50 hover:border-border",
                      "transition-all duration-200 cursor-pointer",
                      "focus:outline-none focus:ring-2 focus:ring-primary/30"
                    )}
                  >
                    <span className="text-base">{topic.emoji}</span>
                    <span className="text-foreground font-medium">{topic.label}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="center">
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2"
                      onClick={() => handleAskQuinn(topic)}
                    >
                      <MessageCircle className="h-4 w-4" />
                      Ask Quinn
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2"
                      onClick={() => handleViewLessons(topic)}
                    >
                      <BookOpen className="h-4 w-4" />
                      View Lessons
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            ))}
          </div>

          {/* Expandable section for more topics */}
          <Collapsible open={topicsExpanded} onOpenChange={setTopicsExpanded}>
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "flex items-center justify-center gap-2 w-full py-2 text-sm",
                  "text-muted-foreground hover:text-foreground",
                  "transition-colors duration-200 cursor-pointer",
                  "focus:outline-none"
                )}
              >
                <span>{topicsExpanded ? 'Show less' : 'More topics'}</span>
                <ChevronDown 
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    topicsExpanded && "rotate-180"
                  )} 
                />
              </button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="pt-2">
              <div className="flex flex-wrap justify-center gap-2">
                {TOPICS.slice(4).map((topic) => (
                  <Popover 
                    key={topic.label} 
                    open={openPopover === topic.label}
                    onOpenChange={(open) => setOpenPopover(open ? topic.label : null)}
                  >
                    <PopoverTrigger asChild>
                      <button
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm",
                          "bg-muted/30 hover:bg-muted/60",
                          "border border-border/30 hover:border-border/50",
                          "transition-all duration-200 cursor-pointer",
                          "focus:outline-none focus:ring-2 focus:ring-primary/30"
                        )}
                      >
                        <span>{topic.emoji}</span>
                        <span className="text-muted-foreground hover:text-foreground">{topic.label}</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2" align="center">
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start gap-2"
                          onClick={() => handleAskQuinn(topic)}
                        >
                          <MessageCircle className="h-4 w-4" />
                          Ask Quinn
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start gap-2"
                          onClick={() => handleViewLessons(topic)}
                        >
                          <BookOpen className="h-4 w-4" />
                          View Lessons
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* First-time user tip - subtle, at bottom */}
      {context.isFirstVisit && (
        <p className="text-muted-foreground text-xs mt-8 max-w-sm">
          📎 Tip: You can attach images or documents for me to analyze
        </p>
      )}
    </div>
  );
}
