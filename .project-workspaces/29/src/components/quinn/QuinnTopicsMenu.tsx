import { useState, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, MessageCircle, Lightbulb, UserCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TopicAction {
  label: string;
  emoji: string;
  askPrompt: string;
  libraryPath: string;
}

interface TopicGroup {
  label: string;
  emoji: string;
  askPrompt: string;
  libraryPath: string;
  children?: TopicAction[];
}

// Quick example prompts users can tap to try
const TRY_SAYING_PROMPTS = [
  "How do I start building wealth?",
  "Help me plan for retirement",
  "What's a good beginner trading strategy?",
  "How should I budget my income?",
  "Explain IULs and life insurance",
  "How do I manage investment risk?",
];

const TOPICS: TopicGroup[] = [
  {
    label: 'Start Here',
    emoji: '🥇',
    askPrompt:
      "Hi Quinn! I'd like to share where I am financially and where I want to go. Can you help me understand my situation and map out a path forward?",
    libraryPath: '/learn',
  },
  // Financial Planning First
  {
    label: 'Retirement Planning',
    emoji: '🏦',
    askPrompt: 'Help me plan for retirement - 401k, IRA, Roth IRA, Social Security, and strategies for maximizing retirement savings',
    libraryPath: '/library?topic=retirement',
  },
  {
    label: 'Budget & Savings',
    emoji: '💰',
    askPrompt: 'Help me create a budget and savings plan - emergency funds, the 50/30/20 rule, paying down debt, and building a financial safety net',
    libraryPath: '/library?topic=budget',
  },
  {
    label: 'Insurance & Protection',
    emoji: '🛡️',
    askPrompt: "Tell me about insurance-based financial products - IULs, whole life, living benefits, annuities, and how to protect my family's financial future",
    libraryPath: '/library?topic=insurance',
  },
  // Investing
  {
    label: 'Stocks & ETFs',
    emoji: '📈',
    askPrompt: 'Tell me about stocks and ETFs - fundamentals, valuation, and dividends',
    libraryPath: '/library?topic=stocks',
  },
  {
    label: 'Options',
    emoji: '🎯',
    askPrompt: 'Explain options trading - calls, puts, spreads, iron condors, and the Greeks',
    libraryPath: '/library?topic=options',
    children: [
      {
        label: '0DTE Strategies',
        emoji: '⚡',
        askPrompt:
          'Explain 0DTE (zero days to expiration) options trading - same-day expiration strategies, rapid theta decay, credit spreads, and risk management for 0DTE',
        libraryPath: '/library?topic=0dte',
      },
    ],
  },
  {
    label: 'Forex & Futures',
    emoji: '🌍',
    askPrompt: 'Tell me about forex and futures trading - currencies, commodities, and hedging',
    libraryPath: '/library?topic=forex',
  },
  {
    label: 'Crypto',
    emoji: '₿',
    askPrompt: 'Explain cryptocurrency - Bitcoin, Ethereum, DeFi, and market cycles',
    libraryPath: '/library?topic=crypto',
  },
  {
    label: 'REITs',
    emoji: '🏠',
    askPrompt: 'Tell me about REITs - real estate investing, dividends, and sectors',
    libraryPath: '/library?topic=reits',
  },
  {
    label: 'Bonds',
    emoji: '💵',
    askPrompt: 'Explain bonds - treasuries, corporates, and fixed income strategies',
    libraryPath: '/library?topic=bonds',
  },
  {
    label: 'Technical Analysis',
    emoji: '📊',
    askPrompt: 'Explain technical analysis - charts, patterns, and indicators',
    libraryPath: '/library?topic=technical',
  },
  {
    label: 'Risk Management',
    emoji: '⚖️',
    askPrompt: 'Tell me about risk management - position sizing, stop-losses, and allocation',
    libraryPath: '/library?topic=risk',
  },
  {
    label: 'Trading Psychology',
    emoji: '🧠',
    askPrompt: 'Explain trading psychology - discipline, habits, and handling losses',
    libraryPath: '/library?topic=psychology',
  },
];

interface QuinnTopicsMenuProps {
  onAskQuinn: (message: string) => void;
  /** Open the profile editor in the surrounding Quinn surface. */
  onOpenProfile?: () => void;
  /** Close/minimize the surrounding Quinn surface before route navigation. */
  onNavigateAway?: () => void;
}

export function QuinnTopicsMenu({ onAskQuinn, onOpenProfile, onNavigateAway }: QuinnTopicsMenuProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleAsk = (topic: TopicAction | TopicGroup) => {
    setOpen(false);
    onAskQuinn(topic.askPrompt);
  };

  const handleTrySaying = (prompt: string) => {
    setOpen(false);
    onAskQuinn(prompt);
  };

  const handleViewLessons = (topic: TopicAction | TopicGroup) => {
    setOpen(false);
    onNavigateAway?.();
    navigate(topic.libraryPath);
  };

  const renderTopicItem = (topic: TopicGroup, isChild = false) => (
    <DropdownMenuSub key={topic.label}>
      <DropdownMenuSubTrigger className={`flex items-center gap-2 ${isChild ? 'pl-6' : ''}`}>
        <span aria-hidden>{topic.emoji}</span>
        <span>{topic.label}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-44">
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            handleAsk(topic);
          }}
          className="gap-2"
        >
          <MessageCircle className="h-4 w-4" />
          Ask Quinn
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            handleViewLessons(topic);
          }}
          className="gap-2"
        >
          <BookOpen className="h-4 w-4" />
          Learn
        </DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Browse topics">
          <Lightbulb className="h-4 w-4 text-gold" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 max-h-[70vh] overflow-y-auto">
        <DropdownMenuLabel className="flex items-center gap-2 text-sm">
          <Lightbulb className="h-4 w-4 text-gold" />
          Quick Topics
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Try Saying section - at the top for quick access */}
        <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
          <Sparkles className="h-3 w-3" />
          Try saying...
        </DropdownMenuLabel>
        <div className="px-2 pb-2 space-y-1">
          {TRY_SAYING_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleTrySaying(prompt)}
              className="w-full text-left text-xs px-2 py-1.5 rounded-md bg-muted/50 hover:bg-primary/10 hover:text-primary transition-colors truncate"
            >
              "{prompt}"
            </button>
          ))}
        </div>
        <DropdownMenuSeparator />

        {onOpenProfile && (
          <>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setOpen(false);
                onOpenProfile();
              }}
              className="gap-2"
            >
              <UserCircle2 className="h-4 w-4" />
              Complete my profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {TOPICS.map((topic) => (
          <Fragment key={topic.label}>
            {renderTopicItem(topic)}
            {topic.children?.map((child) => renderTopicItem(child as TopicGroup, true))}
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

