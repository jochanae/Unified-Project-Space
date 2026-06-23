import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useKidTrading } from '@/hooks/useKidTrading';
import { useKidProfile, MAX_FREE_KIDS } from '@/hooks/useKidProfile';
import { KidPortfolioStats } from '@/components/kids/KidPortfolioStats';
import { KidTradeWizard } from '@/components/kids/KidTradeWizard';
import { KidShortWizard } from '@/components/kids/KidShortWizard';
import { KidTradesList } from '@/components/kids/KidTradesList';
import { KidOnboardingWizard } from '@/components/kids/KidOnboardingWizard';
import { KidAllowanceTracker } from '@/components/kids/KidAllowanceTracker';
import { QuinnKidHelper } from '@/components/kids/QuinnKidHelper';
import { KidPortfolioChart } from '@/components/kids/KidPortfolioChart';
import { KidAchievementsGrid } from '@/components/kids/KidAchievements';
import { KidGoalsSection } from '@/components/kids/KidGoalsSection';
import { KidProfileHub } from '@/components/kids/KidProfileHub';
import { KidPredictionGame } from '@/components/kids/KidPredictionGame';
import { KidCompoundInterestCalc } from '@/components/kids/KidCompoundInterestCalc';
import { KidGlossary } from '@/components/kids/KidGlossary';
import { AVATAR_PRESETS } from '@/hooks/useKidProfile';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import {
  TrendingUp,
  TrendingDown,
  Rocket,
  Star,
  Trophy,
  Lightbulb,
  PiggyBank,
  ArrowRight,
  Sparkles,
  Target,
  Coins,
  BookOpen,
  BarChart3,
  RefreshCcw,
  Plus,
  Home,
  ArrowLeft,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const lessons = [
  {
    id: 'saving',
    title: 'Saving Money',
    description: 'Learn why saving is like collecting treasures!',
    icon: PiggyBank,
    color: 'from-chart-3 to-chart-3/60',
    content: [
      "Saving money is like collecting treasure! Every coin you save is one step closer to your goals.",
      "When you save $1 every day, after 30 days you'll have $30! That's the magic of saving.",
      "Think of your savings as seeds. Plant them today, and watch them grow into bigger things later!",
    ],
    quiz: {
      question: "If you save $2 every day for a week, how much will you have?",
      options: ["$7", "$14", "$10"],
      correct: 1,
    },
  },
  {
    id: 'investing',
    title: 'What is Investing?',
    description: 'Discover how your money can grow on its own!',
    icon: TrendingUp,
    color: 'from-gain to-gain/60',
    content: [
      "Investing is like planting a money tree! You put in some money, and over time it can grow bigger.",
      "When you invest in a company, you become a tiny owner. If the company does well, your money grows!",
      "The stock market is like a big store where people buy and sell pieces of companies.",
    ],
    quiz: {
      question: "What happens to your money when you invest in a successful company?",
      options: ["It stays the same", "It can grow bigger", "It disappears"],
      correct: 1,
    },
  },
  {
    id: 'stocks',
    title: 'Understanding Stocks',
    description: 'Be a part-owner of your favorite companies!',
    icon: Star,
    color: 'from-gold to-gold/60',
    content: [
      "A stock is like a tiny piece of a company. When you buy Apple stock, you own a tiny piece of Apple!",
      "Stock prices go up and down like a roller coaster. That's why we invest for the long term.",
      "Famous investors like Warren Buffett started learning about stocks when they were kids just like you!",
    ],
    quiz: {
      question: "What do you own when you buy a stock?",
      options: ["A product from the store", "A tiny piece of a company", "The whole company"],
      correct: 1,
    },
  },
  {
    id: 'goals',
    title: 'Setting Money Goals',
    description: 'Dream big and make a plan!',
    icon: Target,
    color: 'from-primary to-primary/60',
    content: [
      "Every big journey starts with a goal! What do you want to save for? A bike? A game? College?",
      "Break big goals into smaller steps. Want to save $100? That's just $10 saved 10 times!",
      "Write down your goals and track your progress. Seeing how far you've come is super motivating!",
    ],
    quiz: {
      question: "What's the best way to reach a big savings goal?",
      options: ["Give up because it's too hard", "Break it into smaller steps", "Wait for someone to give you money"],
      correct: 1,
    },
  },
  {
    id: 'shorting',
    title: 'Short Selling Basics',
    description: 'Learn how to profit when prices go DOWN!',
    icon: TrendingDown,
    color: 'from-loss to-loss/60',
    content: [
      "Usually you buy a stock and hope it goes UP. But what if you think it's going DOWN? There's a move for that — it's called short selling!",
      "Short selling is like borrowing a toy, selling it for $10, then buying it back later when it's on sale for $7. You keep the $3 difference! 🎉",
      "But be careful! If the price goes UP instead of down, you have to buy it back at a higher price — and you lose money. That's why shorting is riskier!",
      "Pro investors use short selling as a tool, not a gamble. They research carefully and only short when they have a good reason to think the price will drop.",
    ],
    quiz: {
      question: "When do you make money on a short trade?",
      options: ["When the price goes up", "When the price goes down", "When the price stays the same"],
      correct: 1,
    },
  },
  {
    id: 'compound',
    title: 'The Money Snowball',
    description: 'Discover how your money makes MORE money!',
    icon: Sparkles,
    color: 'from-gold to-chart-3/60',
    content: [
      "Imagine rolling a snowball down a hill. It starts tiny, but picks up more snow as it rolls and gets BIGGER and BIGGER! 🏔️⛄",
      "Compound interest works the same way! You earn interest on your savings, and then you earn interest ON that interest. Your money grows faster and faster!",
      "Here's the magic: $5 a week at 7% interest becomes over $36,000 in 30 years! But you only put in about $7,800 yourself — the rest is FREE money from compound interest! 🤑",
      "The SECRET? Start early! The longer your money snowballs, the bigger it gets. That's why saving as a kid is like having a superpower! 💪",
    ],
    quiz: {
      question: "What makes compound interest so powerful?",
      options: ["You earn interest only on what you save", "You earn interest on your interest too", "The bank gives you free money randomly"],
      correct: 1,
    },
  },
  {
    id: 'why-invest',
    title: 'Why Invest Early?',
    description: 'The #1 money superpower nobody told you about!',
    icon: Rocket,
    color: 'from-primary to-chart-4/60',
    content: [
      "Imagine two friends: Alex and Sam. Alex starts saving $5/week at age 10. Sam waits until age 20. Who do you think has more money at 50? 🤔",
      "ALEX wins by a LOT! Even though Alex only saved $2,600 more than Sam, compound interest turned that head start into thousands more dollars! Starting early is a superpower! 🦸",
      "Here's another way to think about it: If you put $5 under your mattress every week for 20 years, you'd have $5,200. But if you INVEST it, you could have over $11,000! That's more than DOUBLE! 📈",
      "The stock market goes up and down like a roller coaster, but over long periods (10+ years), it has ALWAYS gone up. Patient investors win! 🎢➡️📈",
    ],
    quiz: {
      question: "Why is starting to invest early better?",
      options: ["You get special discounts", "Your money has more time to compound and grow", "The stock market is easier for kids"],
      correct: 1,
    },
  },
];

export default function KidMode() {
  const { user, isLoading: authLoading, subscriptionTier } = useAuth();
  const kidProfile = useKidProfile();
  const selectedPortfolioId = kidProfile.profile?.portfolio_id || null;
  const { stats, trades, buyStock, sellStock, resetPortfolio, isLoading, portfolio } = useKidTrading(selectedPortfolioId);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [showAddChild, setShowAddChild] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [enteredChild, setEnteredChild] = useState(false); // true = child dashboard active
  const [pendingPinProfileId, setPendingPinProfileId] = useState<string | null>(null); // awaiting PIN
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState('');
  
  const [activeTab, setActiveTab] = useState('learn');
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [lessonStep, setLessonStep] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [earnedStars, setEarnedStars] = useState<string[]>([]);
  const [showTradeWizard, setShowTradeWizard] = useState(false);
  const [showShortWizard, setShowShortWizard] = useState(false);

  const hasUnlockedShorting = earnedStars.includes('shorting');

  const currentLesson = lessons.find(l => l.id === selectedLesson);
  const isPro = subscriptionTier === 'pro';
  const canAddMore = isPro || (kidProfile?.profiles?.length ?? 0) < MAX_FREE_KIDS;

  // No auto-enter — always show the Hub so it feels like a proper landing page

  const handleQuizAnswer = (index: number) => {
    setQuizAnswer(index);
    if (currentLesson && index === currentLesson.quiz.correct) {
      if (!earnedStars.includes(currentLesson.id)) {
        setEarnedStars(prev => [...prev, currentLesson.id]);
      }
    }
  };

  const resetLesson = () => {
    setSelectedLesson(null);
    setLessonStep(0);
    setQuizAnswer(null);
  };

  const handleAddChild = () => {
    if (!canAddMore) {
      setShowUpgradeModal(true);
      return;
    }
    setShowAddChild(true);
  };

  const handleSelectChild = (profileId: string) => {
    kidProfile.selectProfile(profileId);
    const selected = kidProfile.profiles.find(p => p.id === profileId);
    // If profile has a PIN, require verification first
    if (selected?.pin_hash) {
      setPendingPinProfileId(profileId);
      setPinError('');
    } else {
      setEnteredChild(true);
    }
  };

  const handlePinSubmit = async (pin: string) => {
    if (!pendingPinProfileId) return;
    const valid = await kidProfile.verifyPin(pin);
    if (valid) {
      setPendingPinProfileId(null);
      setPinError('');
      setPinValue('');
      setEnteredChild(true);
    } else {
      setPinError('Wrong PIN! Try again 🔑');
      setPinValue('');
    }
  };

  const handlePinCancel = () => {
    setPendingPinProfileId(null);
    setPinError('');
    setPinValue('');
  };

  const handleBackToHub = () => {
    setEnteredChild(false);
    resetLesson();
    setShowTradeWizard(false);
    setShowShortWizard(false);
  };

  const totalStars = (earnedStars?.length ?? 0) + (stats?.starsEarned ?? 0);
  const totalTradesCount = trades?.length ?? 0; // all trades (open + closed)

  // Navigation header shared across all views
  const KidNav = () => (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-b-4 border-dashed border-primary/30">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {enteredChild && (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full gap-1.5 hover:bg-primary/10 text-muted-foreground"
              onClick={handleBackToHub}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Switch Kid</span>
            </Button>
          )}
          <button
            onClick={() => { handleBackToHub(); }}
            className="flex items-center gap-2 group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-gold/60 shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-12">
              <Sparkles className="h-4 w-4 text-gold-foreground" />
            </div>
            <span className="text-lg font-bold gradient-text hidden sm:inline">
              IntoIQ Youth
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {enteredChild && (
            <div className="flex items-center gap-1 bg-gold/10 px-2.5 py-1.5 rounded-full">
              <Star className="h-3.5 w-3.5 text-gold fill-gold" />
              <span className="font-bold text-gold text-sm">
                {totalStars}
              </span>
            </div>
          )}
          <ThemeToggle />
          {authLoading ? (
            <div className="h-8 w-20 rounded-full bg-muted animate-pulse" />
          ) : user ? (
            <Link to="/dashboard">
              <Button variant="outline" size="sm" className="rounded-full text-xs gap-1.5">
                <Home className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Parent</span> Dashboard
              </Button>
            </Link>
          ) : (
            <Link to="/login">
              <Button size="sm" className="rounded-full bg-gradient-to-r from-primary to-gain text-xs">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );

  // Show onboarding for first-time users (no profiles at all)
  // Show add-child wizard (onboarding)
  if (showAddChild) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-muted/30 to-primary/5">
        <KidNav />
        <div className="pt-24 pb-12 px-4">
          <div className="container mx-auto max-w-6xl">
            <Button
              variant="ghost"
              onClick={() => setShowAddChild(false)}
              className="mb-4 rounded-full gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <KidOnboardingWizard
              isSubmitting={isOnboarding}
              onComplete={async (data) => {
                setIsOnboarding(true);
                const created = await kidProfile.createProfile({
                  ...data,
                });
                setIsOnboarding(false);
                setShowAddChild(false);
                if (created) {
                  setEnteredChild(true);
                }
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // PIN verification screen
  if (user && pendingPinProfileId) {
    const pendingProfile = kidProfile.profiles.find(p => p.id === pendingPinProfileId);
    const avatar = pendingProfile ? AVATAR_PRESETS.find(a => a.id === pendingProfile.avatar_preset) : null;
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-muted/30 to-primary/5">
        <KidNav />
        <div className="pt-24 pb-12 px-4 flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-6 max-w-sm mx-auto">
            <div className="text-6xl mb-2">{avatar?.emoji || '🔒'}</div>
            <h2 className="text-2xl font-bold">
              Hi {pendingProfile?.display_name}! 👋
            </h2>
            <p className="text-muted-foreground">Enter your 4-digit PIN to continue</p>
            <div className="flex justify-center">
              <InputOTP
                maxLength={4}
                value={pinValue}
                onChange={(v) => {
                  setPinValue(v);
                  setPinError('');
                }}
                onComplete={handlePinSubmit}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            {pinError && <p className="text-sm text-loss font-medium">{pinError}</p>}
            <Button variant="ghost" onClick={handlePinCancel} className="rounded-full">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Universal landing page — always the first stop
  if (user && !kidProfile.isLoading && !enteredChild) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-muted/30 to-primary/5">
        <KidNav />
        <div className="pt-24 pb-12 px-4">
          <KidProfileHub
            profiles={kidProfile.profiles}
            canAddMore={canAddMore}
            onSelect={handleSelectChild}
            onAddNew={handleAddChild}
            onUpgrade={() => setShowUpgradeModal(true)}
          />
        </div>
        <UpgradeModal
          open={showUpgradeModal}
          onOpenChange={setShowUpgradeModal}
          feature="Unlimited kid profiles"
          requiredTier="pro"
          description="Free accounts can add up to 2 kids. Upgrade to Pro for unlimited kid profiles!"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/30 to-primary/5">
      <KidNav />

      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Practice Mode Banner - only show on Trade tab */}
          {activeTab === 'trade' && (
            <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-gold/40 bg-gradient-to-r from-gold/10 via-chart-3/10 to-gold/10">
              <div className="rounded-lg p-2 bg-gold/20">
                <Sparkles className="h-5 w-5 text-gold" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gold text-gold-foreground">
                    🎮 PRACTICE MODE
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  All trading uses pretend money — perfect for learning! No real money involved.
                </p>
              </div>
            </div>
          )}

          {/* Gamified Welcome Hero */}
          {user && kidProfile.profile && (() => {
            const avatar = AVATAR_PRESETS.find(a => a.id === kidProfile.profile!.avatar_preset);
            const name = kidProfile.profile!.display_name;
            const stars = totalStars;
            const tradesCompleted = totalTradesCount;

            // Determine rank based on stars
            const ranks = [
              { min: 0, title: 'Money Explorer', emoji: '🗺️' },
              { min: 5, title: 'Coin Collector', emoji: '🪙' },
              { min: 15, title: 'Savings Star', emoji: '⭐' },
              { min: 30, title: 'Wealth Builder', emoji: '🏗️' },
              { min: 50, title: 'Money Wizard', emoji: '🧙' },
              { min: 100, title: 'Finance Legend', emoji: '👑' },
            ];
            const currentRank = [...ranks].reverse().find(r => stars >= r.min) || ranks[0];
            const nextRank = ranks.find(r => r.min > stars);
            const progressToNext = nextRank 
              ? Math.min(100, ((stars - currentRank.min) / (nextRank.min - currentRank.min)) * 100)
              : 100;

            // Time-based greeting
            const hour = new Date().getHours();
            const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

            // Fun money facts
            const funFacts = [
              "💡 Did you know? The first coins were made over 2,600 years ago!",
              "🐷 Fun fact: Piggy banks got their name from a type of clay called 'pygg'!",
              "🌍 There are over 180 different currencies in the world!",
              "📈 The stock market has been around for over 400 years!",
              "💎 Warren Buffett bought his first stock when he was just 11!",
              "🏦 The word 'bank' comes from the Italian word 'banco' meaning bench!",
            ];
            const todayFact = funFacts[new Date().getDate() % funFacts.length];

            return (
              <div className="mb-6 rounded-2xl overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-card to-gold/5 shadow-lg animate-fade-in">
                {/* Top section with avatar and greeting */}
                <div className="p-5 pb-3">
                  <div className="flex items-center gap-4">
                    {/* Large animated avatar */}
                    <div className="relative">
                      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-gold/20 flex items-center justify-center text-4xl animate-[bounce_3s_ease-in-out_infinite] border-2 border-primary/30">
                        {avatar?.emoji || '🧒'}
                      </div>
                      <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-gold flex items-center justify-center shadow-md">
                        <span className="text-xs">{currentRank.emoji}</span>
                      </div>
                    </div>
                    
                    {/* Greeting + rank */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        {greeting} 👋
                      </p>
                      <h2 className="text-2xl font-bold text-primary truncate">{name}!</h2>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs font-medium text-gold">{currentRank.emoji} {currentRank.title}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-px bg-border/50 mx-5">
                  <div className="bg-card/80 p-3 text-center rounded-tl-lg">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="h-3.5 w-3.5 text-gold fill-gold" />
                      <span className="font-bold text-lg">{stars}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Stars</p>
                  </div>
                  <div className="bg-card/80 p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <BarChart3 className="h-3.5 w-3.5 text-primary" />
                      <span className="font-bold text-lg">{tradesCompleted}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Trades</p>
                  </div>
                  <div className="bg-card/80 p-3 text-center rounded-tr-lg">
                    <div className="flex items-center justify-center gap-1">
                      <Trophy className="h-3.5 w-3.5 text-chart-3" />
                      <span className="font-bold text-lg">{earnedStars.length}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Lessons</p>
                  </div>
                </div>

                {/* Level progress bar */}
                {nextRank && (
                  <div className="px-5 pt-3 pb-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground">Next: {nextRank.emoji} {nextRank.title}</span>
                      <span className="text-[10px] text-muted-foreground">{stars}/{nextRank.min} ⭐</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-primary to-gold transition-all duration-1000 ease-out"
                        style={{ width: `${progressToNext}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Daily fun fact */}
                <div className="mx-5 my-3 px-3 py-2 rounded-xl bg-muted/50 border border-border/50">
                  <p className="text-xs text-muted-foreground">{todayFact}</p>
                </div>
              </div>
            );
          })()}

          {/* Main Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-6 h-14 rounded-full bg-muted/50 p-1">
              <TabsTrigger 
                value="learn" 
                className="rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-gain data-[state=active]:text-primary-foreground"
              >
                <BookOpen className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Learn</span>
              </TabsTrigger>
              <TabsTrigger 
                value="words" 
                className="rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-chart-4 data-[state=active]:to-primary data-[state=active]:text-primary-foreground"
              >
                <span className="mr-1 sm:mr-2">📖</span>
                <span className="hidden sm:inline">Words</span>
              </TabsTrigger>
              <TabsTrigger 
                value="savings" 
                className="rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-chart-3 data-[state=active]:to-primary data-[state=active]:text-primary-foreground"
              >
                <PiggyBank className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Savings</span>
              </TabsTrigger>
              <TabsTrigger 
                value="goals" 
                className="rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-gold data-[state=active]:to-chart-3 data-[state=active]:text-primary-foreground"
              >
                <Target className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Goals</span>
              </TabsTrigger>
              <TabsTrigger 
                value="trade" 
                className="rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-gain data-[state=active]:to-gold data-[state=active]:text-primary-foreground"
              >
                <TrendingUp className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Trade</span>
              </TabsTrigger>
              <TabsTrigger 
                value="stats" 
                className="rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-chart-3 data-[state=active]:to-primary data-[state=active]:text-primary-foreground"
              >
                <BarChart3 className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Stats</span>
              </TabsTrigger>
            </TabsList>

            {/* Learn Tab */}
            <TabsContent value="learn" className="space-y-6">
              {!selectedLesson ? (
                <>
                  {/* Lesson Cards */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {lessons.map((lesson) => {
                      const hasEarnedStar = earnedStars.includes(lesson.id);
                      return (
                        <Card
                          key={lesson.id}
                          className={cn(
                            'relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl border-2',
                            hasEarnedStar ? 'border-yellow-400' : 'border-transparent'
                          )}
                          onClick={() => setSelectedLesson(lesson.id)}
                        >
                          {hasEarnedStar && (
                            <div className="absolute top-2 right-2">
                              <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
                            </div>
                          )}
                          <div className={cn('h-2 bg-gradient-to-r', lesson.color)} />
                          <CardContent className="p-6">
                            <div
                              className={cn(
                                'inline-flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br mb-4',
                                lesson.color
                              )}
                            >
                              <lesson.icon className="h-6 w-6 text-white" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">{lesson.title}</h3>
                            <p className="text-muted-foreground mb-4">{lesson.description}</p>
                            <Button className="w-full rounded-full group">
                              Start Lesson
                              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Compound Interest Calculator */}
                  <KidCompoundInterestCalc />

                  {/* Fun Facts Section */}
                  <Card className="bg-gradient-to-r from-primary/5 to-gain/5 border-2 border-primary/20">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-gain">
                          <Lightbulb className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold mb-2">Fun Money Fact!</h3>
                          <p className="text-muted-foreground">
                            Did you know? If you saved just $1 a day starting at age 10, and invested it wisely,
                            you could have over $100,000 by the time you're 60! 🤯 That's the power of compound interest!
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : currentLesson ? (
                /* Lesson View */
                <div className="max-w-2xl mx-auto">
                  <Button
                    variant="ghost"
                    onClick={resetLesson}
                    className="mb-6 rounded-full gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Lessons
                  </Button>

                  <Card className="overflow-hidden">
                    <div className={cn('h-3 bg-gradient-to-r', currentLesson.color)} />
                    <CardContent className="p-8">
                      <div className="text-center mb-8">
                        <div
                          className={cn(
                            'inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br mb-4',
                            currentLesson.color
                          )}
                        >
                          <currentLesson.icon className="h-8 w-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold">{currentLesson.title}</h2>
                      </div>

                      {lessonStep < currentLesson.content.length ? (
                        /* Content Steps */
                        <div className="space-y-6">
                          <div className="bg-muted/50 rounded-xl p-6 text-lg">
                            {currentLesson.content[lessonStep]}
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex gap-1">
                              {currentLesson.content.map((_, i) => (
                                <div
                                  key={i}
                                  className={cn(
                                    'h-2 w-8 rounded-full',
                                    i <= lessonStep ? 'bg-primary' : 'bg-muted'
                                  )}
                                />
                              ))}
                            </div>
                            <Button
                              onClick={() => setLessonStep(lessonStep + 1)}
                              className="rounded-full"
                            >
                              {lessonStep === currentLesson.content.length - 1 ? 'Take Quiz' : 'Next'}
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* Quiz */
                        <div className="space-y-6">
                          <div className="text-center">
                            <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                            <h3 className="text-xl font-bold mb-2">Quiz Time!</h3>
                            <p className="text-muted-foreground">{currentLesson.quiz.question}</p>
                          </div>

                          <div className="space-y-3">
                            {currentLesson.quiz.options.map((option, i) => (
                              <Button
                                key={i}
                                variant="outline"
                                className={cn(
                                  'w-full h-auto py-4 text-left justify-start rounded-xl text-base',
                                  quizAnswer === i &&
                                    (i === currentLesson.quiz.correct
                                      ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                                      : 'border-red-500 bg-red-50 dark:bg-red-900/30')
                                )}
                                onClick={() => handleQuizAnswer(i)}
                                disabled={quizAnswer !== null}
                              >
                                <Coins className="h-5 w-5 mr-3" />
                                {option}
                              </Button>
                            ))}
                          </div>

                          {quizAnswer !== null && (
                            <div className="text-center space-y-4">
                              {quizAnswer === currentLesson.quiz.correct ? (
                                <div className="bg-gain/10 rounded-xl p-4">
                                  <Star className="h-8 w-8 text-gold fill-gold mx-auto mb-2" />
                                  <p className="font-bold text-gain">
                                    Amazing! You earned a star! ⭐
                                  </p>
                                </div>
                              ) : (
                                <div className="bg-gold/10 rounded-xl p-4">
                                  <p className="font-medium text-gold">
                                    Not quite! The correct answer was: {currentLesson.quiz.options[currentLesson.quiz.correct]}
                                  </p>
                                </div>
                              )}
                              <Button onClick={resetLesson} className="rounded-full gap-2">
                                <ArrowLeft className="h-4 w-4" />
                                Back to Lessons
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : null}
            </TabsContent>

            {/* Words/Glossary Tab */}
            <TabsContent value="words" className="space-y-6">
              <KidGlossary />
            </TabsContent>

            {/* Trade Tab */}
            <TabsContent value="trade" className="space-y-6">
              {user ? (
                <>
                  {/* Quick Stats Bar */}
                  <Card className="bg-gradient-to-r from-primary/10 via-gain/10 to-gold/10">
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <PiggyBank className="h-5 w-5 text-chart-3" />
                            <span className="font-bold">${stats.balance.toFixed(2)}</span>
                            <span className="text-sm text-muted-foreground">available</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-gain" />
                            <span className="font-bold">{stats.openPositions}</span>
                            <span className="text-sm text-muted-foreground">investments</span>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            onClick={() => { setShowTradeWizard(true); setShowShortWizard(false); }}
                            className="rounded-full bg-gradient-to-r from-primary to-gain"
                            disabled={isLoading}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Buy Stock
                          </Button>
                          {hasUnlockedShorting ? (
                            <Button
                              onClick={() => { setShowShortWizard(true); setShowTradeWizard(false); }}
                              className="rounded-full bg-gradient-to-r from-loss to-primary text-primary-foreground"
                              disabled={isLoading}
                            >
                              <TrendingDown className="h-4 w-4 mr-2" />
                              Short Stock
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              className="rounded-full opacity-70 gap-1.5"
                              onClick={() => {
                                setActiveTab('learn');
                                setSelectedLesson('shorting');
                              }}
                              title="Complete the Short Selling lesson to unlock!"
                            >
                              <Lock className="h-3.5 w-3.5" />
                              Short
                              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full ml-0.5">🎓 Unlock</span>
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="icon" className="rounded-full">
                                <RefreshCcw className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Reset Everything?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will delete all your trades and reset your piggy bank to $1,000. 
                                  Your lesson stars will stay! Are you sure?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={resetPortfolio}>
                                  Yes, Reset
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Trade Wizard / Short Wizard / Trades List */}
                  {showTradeWizard ? (
                    <div>
                      <Button
                        variant="ghost"
                        onClick={() => setShowTradeWizard(false)}
                        className="mb-4 rounded-full gap-2"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Trades
                      </Button>
                      <KidTradeWizard
                        balance={stats.balance}
                        onSubmit={buyStock}
                        onCancel={() => setShowTradeWizard(false)}
                      />
                    </div>
                  ) : showShortWizard ? (
                    <div>
                      <Button
                        variant="ghost"
                        onClick={() => setShowShortWizard(false)}
                        className="mb-4 rounded-full gap-2"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Trades
                      </Button>
                      <KidShortWizard
                        balance={stats.balance}
                        onSubmit={buyStock}
                        onCancel={() => setShowShortWizard(false)}
                      />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <KidTradesList trades={trades} onSell={sellStock} />
                      
                      {/* Prediction Game */}
                      <KidPredictionGame />
                    </div>
                  )}
                </>
              ) : (
                <Card className="text-center py-12">
                  <CardContent>
                    <span className="text-6xl block mb-4">🔐</span>
                    <h3 className="text-xl font-bold mb-2">Sign in to Trade!</h3>
                    <p className="text-muted-foreground mb-4">
                      Create an account to start your trading journey
                    </p>
                    <Link to="/login">
                      <Button className="rounded-full bg-gradient-to-r from-primary to-gain">
                        Sign In
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Savings Tab */}
            <TabsContent value="savings" className="space-y-6">
              {user && kidProfile.profile ? (
                <KidAllowanceTracker
                  profile={kidProfile.profile}
                  transactions={kidProfile.transactions}
                  onAddAllowance={kidProfile.addAllowance}
                  onVerifyPin={kidProfile.verifyPin}
                />
              ) : (
                <Card className="text-center py-12">
                  <CardContent>
                    <span className="text-6xl block mb-4">🐷</span>
                    <h3 className="text-xl font-bold mb-2">Sign in to Track Savings!</h3>
                    <p className="text-muted-foreground mb-4">
                      Save your allowance and watch it grow
                    </p>
                    <Link to="/login">
                      <Button className="rounded-full bg-gradient-to-r from-primary to-gain">
                        Sign In
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Goals Tab */}
            <TabsContent value="goals" className="space-y-6">
              {user ? (
                <KidGoalsSection portfolioId={portfolio?.id} kidProfileId={kidProfile.profile?.id} allowanceBalance={kidProfile.profile?.allowance_balance} />
              ) : (
                <Card className="text-center py-12">
                  <CardContent>
                    <span className="text-6xl block mb-4">🎯</span>
                    <h3 className="text-xl font-bold mb-2">Sign in to Set Goals!</h3>
                    <p className="text-muted-foreground mb-4">
                      Track your goals and earn stars when you complete them
                    </p>
                    <Link to="/login">
                      <Button className="rounded-full bg-gradient-to-r from-primary to-gain">
                        Sign In
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Stats Tab */}
            <TabsContent value="stats" className="space-y-6">
              {user ? (
                <>
                  <KidPortfolioStats stats={stats} />
                  
                  {/* Portfolio Chart */}
                  <KidPortfolioChart 
                    trades={trades} 
                    portfolioValue={stats.portfolioValue}
                    initialBalance={stats.initialBalance}
                  />
                  
                  {/* Achievements */}
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-gold" />
                        Achievements
                      </h3>
                      <KidAchievementsGrid 
                        stats={stats}
                        lessonsCompleted={earnedStars.length}
                      />
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="text-center py-12">
                  <CardContent>
                    <span className="text-6xl block mb-4">📊</span>
                    <h3 className="text-xl font-bold mb-2">Sign in to See Stats!</h3>
                    <p className="text-muted-foreground mb-4">
                      Track your progress and unlock achievements
                    </p>
                    <Link to="/login">
                      <Button className="rounded-full bg-gradient-to-r from-primary to-gain">
                        Sign In
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Quinn Helper */}
      {user && (
        <QuinnKidHelper
          currentContext={activeTab as 'learn' | 'trade' | 'stats'}
          portfolioValue={stats.portfolioValue}
          recentProfit={stats.totalProfitLoss > 0}
        />
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        feature="Unlimited kid profiles"
        requiredTier="pro"
        description="Free accounts can add up to 2 kids. Upgrade to Pro for unlimited kid profiles!"
      />
    </div>
  );
}
