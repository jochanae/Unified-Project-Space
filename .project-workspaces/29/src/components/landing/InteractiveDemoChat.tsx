import { useState, useEffect, useRef } from 'react';
import { Sparkles, MessageSquare, Target, TrendingUp, Shield, GraduationCap, PiggyBank } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface DemoConversation {
  id: string;
  label: string;
  mobileLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  messages: ChatMessage[];
}

const DEMO_CONVERSATIONS: DemoConversation[] = [
  {
    id: 'getting-started',
    label: 'Getting Started',
    mobileLabel: 'Start',
    icon: Target,
    color: 'from-primary to-primary/60',
    messages: [
      { role: 'user', content: "I'm new to investing. Where do I even start?" },
      { role: 'assistant', content: "Great question! Let's start with where you are now. Do you have an emergency fund covering 3-6 months of expenses? That's the foundation before investing." },
      { role: 'user', content: "I have about 2 months saved up." },
      { role: 'assistant', content: "Good start! Let's add that to your Plan. I'd suggest building to 3 months first, then we can explore low-risk investing options. Want me to add 'Build emergency fund to 3 months' to your Foundations section?" },
    ],
  },
  {
    id: 'trading-strategy',
    label: 'Trading Strategy',
    mobileLabel: 'Trading',
    icon: TrendingUp,
    color: 'from-chart-3 to-chart-3/60',
    messages: [
      { role: 'user', content: "What's a covered call and when should I use it?" },
      { role: 'assistant', content: "A covered call is when you own 100 shares and sell a call option against them to collect premium. It works best when you're mildly bullish or neutral on the stock." },
      { role: 'user', content: "How do I pick the right strike price?" },
      { role: 'assistant', content: "Choose a strike above your cost basis where you'd be happy selling. Higher strikes = less premium but more upside. Want me to add 'Learn covered call strike selection' to your Trading Plan?" },
    ],
  },
  {
    id: 'retirement',
    label: 'Retirement',
    mobileLabel: 'Retire',
    icon: PiggyBank,
    color: 'from-gain to-gain/60',
    messages: [
      { role: 'user', content: "Should I max out my 401k or invest on my own?" },
      { role: 'assistant', content: "First, get your full employer match—that's free money! After that, it depends on your tax situation. Roth IRA is great if you expect higher taxes later." },
      { role: 'user', content: "My employer matches 4%. I'm contributing 6% now." },
      { role: 'assistant', content: "Perfect—you're getting the full match! Next step: consider a Roth IRA for tax-free growth. Should I add 'Open Roth IRA' to your Wealth Building section?" },
    ],
  },
  {
    id: 'risk-management',
    label: 'Risk Management',
    mobileLabel: 'Risk',
    icon: Shield,
    color: 'from-chart-4 to-chart-4/60',
    messages: [
      { role: 'user', content: "How much should I risk on each trade?" },
      { role: 'assistant', content: "A common rule is risking no more than 1-2% of your portfolio per trade. This way, even a losing streak won't wipe you out." },
      { role: 'user', content: "So if I have $10,000, I should risk $100-200 max?" },
      { role: 'assistant', content: "Exactly! Position size = Risk Amount ÷ (Entry - Stop Loss). Let me add 'Define position sizing rules' to your Trading Plan's Risk Management section." },
    ],
  },
  {
    id: 'learning',
    label: 'Learning Path',
    mobileLabel: 'Learn',
    icon: GraduationCap,
    color: 'from-violet-500 to-violet-500/60',
    messages: [
      { role: 'user', content: "I want to learn options but it seems so complex." },
      { role: 'assistant', content: "Options can feel overwhelming at first! Let's break it down: start with understanding calls and puts, then move to basic strategies like covered calls." },
      { role: 'user', content: "What order should I learn things in?" },
      { role: 'assistant', content: "Here's a path: 1) Calls & Puts basics, 2) The Greeks, 3) Covered Calls, 4) Cash-Secured Puts. Want me to create a Learning Plan with these milestones?" },
    ],
  },
];

export function InteractiveDemoChat() {
  const [activeConversation, setActiveConversation] = useState(DEMO_CONVERSATIONS[0]);
  const [visibleMessages, setVisibleMessages] = useState<number>(0);
  const [isTyping, setIsTyping] = useState(false);
  const [typedText, setTypedText] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Reset and animate when conversation changes
  useEffect(() => {
    setVisibleMessages(0);
    setIsTyping(false);
    setTypedText('');
    
    // Start showing messages
    const showNextMessage = (index: number) => {
      if (index >= activeConversation.messages.length) return;
      
      const message = activeConversation.messages[index];
      
      if (message.role === 'assistant') {
        // Show typing indicator first
        setIsTyping(true);
        
        // Then type out the message
        setTimeout(() => {
          setIsTyping(false);
          typeMessage(message.content, () => {
            setVisibleMessages(index + 1);
            setTimeout(() => showNextMessage(index + 1), 800);
          });
        }, 600);
      } else {
        // User messages appear instantly
        setVisibleMessages(index + 1);
        setTimeout(() => showNextMessage(index + 1), 400);
      }
    };

    const timer = setTimeout(() => showNextMessage(0), 300);
    return () => clearTimeout(timer);
  }, [activeConversation]);

  // Typewriter effect for assistant messages
  const typeMessage = (fullText: string, onComplete: () => void) => {
    let currentIndex = 0;
    setTypedText('');
    
    const typeInterval = setInterval(() => {
      if (currentIndex < fullText.length) {
        setTypedText(fullText.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(typeInterval);
        setTypedText('');
        onComplete();
      }
    }, 15); // Adjust speed here
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [visibleMessages, typedText, isTyping]);

  const currentTypingIndex = visibleMessages;
  const isCurrentlyTyping = typedText.length > 0;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Topic Tabs */}
      <div className="flex flex-wrap justify-center gap-2 mb-6 sm:mb-8">
        {DEMO_CONVERSATIONS.map((conv) => {
          const Icon = conv.icon;
          const isActive = activeConversation.id === conv.id;
          
          return (
            <button
              key={conv.id}
              onClick={() => setActiveConversation(conv)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300",
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "bg-card border border-border/50 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5"
              )}
            >
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{conv.label}</span>
              <span className="sm:hidden">{conv.mobileLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Chat Container */}
      <div 
        ref={chatContainerRef}
        className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-4 sm:p-6 min-h-[320px] max-h-[400px] overflow-y-auto scroll-smooth"
      >
        <div className="space-y-4">
          {activeConversation.messages.map((message, index) => {
            const isVisible = index < visibleMessages || (index === currentTypingIndex && isCurrentlyTyping);
            const isBeingTyped = index === currentTypingIndex && isCurrentlyTyping;
            const showTypedContent = isBeingTyped ? typedText : message.content;

            if (!isVisible && index !== currentTypingIndex) return null;

            if (message.role === 'user') {
              return (
                <div 
                  key={index} 
                  className={cn(
                    "flex justify-end animate-fade-in",
                    index >= visibleMessages && "opacity-0"
                  )}
                >
                  <div className="max-w-[85%] sm:max-w-md rounded-2xl rounded-br-sm bg-gradient-to-r from-primary to-primary/80 px-4 py-3 text-primary-foreground shadow-lg shadow-primary/20">
                    <p className="text-xs sm:text-sm font-medium">{message.content}</p>
                  </div>
                </div>
              );
            }

            return (
              <div key={index} className="flex gap-2 sm:gap-3 animate-fade-in">
                <div className={cn(
                  "flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full shadow-lg bg-gradient-to-br",
                  activeConversation.color
                )}>
                  <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="max-w-[85%] sm:max-w-lg rounded-2xl rounded-tl-sm bg-card border border-border/50 px-4 py-3 shadow-md">
                  {isBeingTyped ? (
                    <p className="text-xs sm:text-sm leading-relaxed">
                      {showTypedContent}
                      <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse" />
                    </p>
                  ) : index < visibleMessages ? (
                    <p className="text-xs sm:text-sm leading-relaxed">{message.content}</p>
                  ) : null}
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex gap-2 sm:gap-3 animate-fade-in">
              <div className={cn(
                "flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full shadow-lg bg-gradient-to-br",
                activeConversation.color
              )}>
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-card border border-border/50 px-4 py-3 shadow-md">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Caption */}
      <p className="text-center text-xs sm:text-sm text-muted-foreground mt-4">
        Click a topic above to see Quinn in action • Real conversations, real guidance
      </p>
    </div>
  );
}
