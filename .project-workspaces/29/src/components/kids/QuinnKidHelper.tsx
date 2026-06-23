import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Sparkles, X, ChevronDown, Send, Loader2, MessageCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface QuinnKidHelperProps {
  tips?: string[];
  currentContext?: 'learn' | 'trade' | 'stats';
  portfolioValue?: number;
  recentProfit?: boolean;
  className?: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quinn-chat`;

interface KidMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const contextQuestions: Record<string, { emoji: string; label: string; prompt: string }[]> = {
  learn: [
    { emoji: '🤔', label: 'What is a stock?', prompt: '[Youth Mode – age 8-14] What is a stock? Explain like I\'m a kid.' },
    { emoji: '💰', label: 'How do I make money?', prompt: '[Youth Mode – age 8-14] How do people make money from stocks? Explain simply.' },
    { emoji: '📈', label: 'Why do prices go up?', prompt: '[Youth Mode – age 8-14] Why do stock prices go up and down? Use a kid-friendly example.' },
    { emoji: '🏦', label: 'What is saving?', prompt: '[Youth Mode – age 8-14] Why is saving money important? Give me a fun example.' },
  ],
  trade: [
    { emoji: '🛒', label: 'How do I buy stocks?', prompt: '[Youth Mode – age 8-14] How does buying a stock work? Explain step by step for a kid.' },
    { emoji: '📉', label: 'What if I lose money?', prompt: '[Youth Mode – age 8-14] What happens if my stock goes down? Is that bad? Help me understand.' },
    { emoji: '🎯', label: 'How do I pick stocks?', prompt: '[Youth Mode – age 8-14] How should I pick which company to invest in? Give kid-friendly tips.' },
    { emoji: '⏰', label: 'When should I sell?', prompt: '[Youth Mode – age 8-14] When is the right time to sell a stock? Explain for a beginner kid.' },
  ],
  stats: [
    { emoji: '🏆', label: 'Am I doing well?', prompt: '[Youth Mode – age 8-14] How do I know if my investments are doing well? What should I look at?' },
    { emoji: '⭐', label: 'What are dividends?', prompt: '[Youth Mode – age 8-14] What is a dividend? Explain like I\'m 10 years old.' },
    { emoji: '🎲', label: 'What is risk?', prompt: '[Youth Mode – age 8-14] What does "risk" mean in investing? Use a fun example.' },
    { emoji: '🌱', label: 'What is compound interest?', prompt: '[Youth Mode – age 8-14] What is compound interest? Explain the "money snowball" idea.' },
  ],
};

const celebrations = [
  { emoji: "🎉", message: "Awesome!" },
  { emoji: "⭐", message: "Amazing!" },
  { emoji: "🚀", message: "To the moon!" },
  { emoji: "💪", message: "You got this!" },
  { emoji: "🌟", message: "Superstar!" },
];

const contextTips: Record<string, string[]> = {
  learn: [
    "📚 Learning is the best investment! Each lesson makes you smarter.",
    "⭐ Earn stars by completing quizzes. Can you get them all?",
    "💡 Did you know? The best investors never stop learning!",
    "🎯 Pick a lesson card to start your adventure!",
  ],
  trade: [
    "🚀 Ready to pick a company? Choose one you know and love!",
    "💰 Remember: Only invest what you can afford to lose!",
    "📈 Watch your stocks grow over time. Patience is key!",
    "🎪 This is practice money — so have fun experimenting!",
  ],
  stats: [
    "🏆 Check out your achievements! How many have you unlocked?",
    "📊 Your stats show how you're doing. Keep improving!",
    "⭐ Collect more stars to become a Money Wizard!",
    "🌟 Great job tracking your progress!",
  ],
};

export function QuinnKidHelper({
  tips = [],
  currentContext = 'learn',
  portfolioValue,
  recentProfit,
  className,
}: QuinnKidHelperProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [chatMode, setChatMode] = useState(false);
  const [messages, setMessages] = useState<KidMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { session } = useAuth();

  const allTips = tips.length > 0 ? tips : (contextTips[currentContext] || contextTips.learn);
  const questions = contextQuestions[currentContext] || contextQuestions.learn;

  // Cycle through tips (only when not in chat mode)
  useEffect(() => {
    if (chatMode) return;
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentTipIndex((prev) => (prev + 1) % allTips.length);
        setIsAnimating(false);
      }, 300);
    }, 8000);
    return () => clearInterval(interval);
  }, [allTips.length, chatMode]);

  // Celebration animation when profit
  useEffect(() => {
    if (recentProfit) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
    }
  }, [recentProfit]);

  const sendQuestion = useCallback(async (label: string, prompt: string) => {
    setChatMode(true);
    setIsLoading(true);

    const userMsg: KidMessage = { id: crypto.randomUUID(), role: 'user', content: label };
    setMessages(prev => [...prev, userMsg]);

    let assistantContent = '';
    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
        }
        return [...prev, { id: crypto.randomUUID(), role: 'assistant', content: assistantContent }];
      });
    };

    try {
      const { data: { session: liveSession } } = await supabase.auth.getSession();
      const token = liveSession?.access_token ?? session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok || !response.body) {
        updateAssistant("Hmm, I couldn't think of an answer right now. Try again! 🤔");
        setIsLoading(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) updateAssistant(content);
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) updateAssistant(content);
          } catch { /* ignore */ }
        }
      }
    } catch (error) {
      console.error('Kid Quinn chat error:', error);
      updateAssistant("Oops! Something went wrong. Let's try again! 🔄");
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  const handleBackToTips = () => {
    setChatMode(false);
    setMessages([]);
  };

  const randomCelebration = celebrations[Math.floor(Math.random() * celebrations.length)];

  if (!isExpanded) {
    return (
      <Button
        onClick={() => setIsExpanded(true)}
        className={cn(
          'fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full shadow-lg',
          'bg-gradient-to-br from-chart-3 to-primary animate-bounce',
          className
        )}
      >
        <Sparkles className="h-6 w-6 text-white" />
      </Button>
    );
  }

  return (
    <div
      className={cn(
        'fixed bottom-20 right-4 z-30 w-80 rounded-2xl shadow-xl',
        'bg-card border-2 border-primary/30 overflow-hidden',
        'animate-in slide-in-from-bottom-5 duration-300',
        'flex flex-col max-h-[70vh]',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-chart-3 to-primary shrink-0">
        <div className="relative">
          <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          {showCelebration && (
            <span className="absolute -top-2 -right-2 text-xl animate-bounce">
              {randomCelebration.emoji}
            </span>
          )}
        </div>
        <div className="flex-1 text-white">
          <h4 className="font-bold text-sm">Quinn</h4>
          <p className="text-xs opacity-80">Your Money Buddy</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
          onClick={() => setIsExpanded(false)}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      {/* Celebration Message */}
      {showCelebration && (
        <div className="bg-gain/20 text-gain text-center py-2 text-sm font-bold animate-pulse shrink-0">
          {randomCelebration.emoji} {randomCelebration.message} You made a profit! {randomCelebration.emoji}
        </div>
      )}

      {/* Portfolio Summary */}
      {portfolioValue !== undefined && (
        <div className="px-4 py-2 bg-muted/50 border-b border-border/50 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Your Treasure</span>
            <span className="font-bold text-sm">${portfolioValue.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Chat Mode */}
      {chatMode ? (
        <>
          <ScrollArea className="flex-1 p-3 min-h-0">
            <div className="space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {msg.role === 'assistant' && (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-chart-3 to-primary">
                      <Sparkles className="h-3 w-3 text-white" />
                    </div>
                  )}
                  <div className={cn(
                    'max-w-[85%] rounded-xl px-3 py-2 text-xs',
                    msg.role === 'user'
                      ? 'rounded-br-sm bg-primary text-primary-foreground'
                      : 'rounded-tl-sm bg-muted/70 border border-border/50'
                  )}>
                    {msg.role === 'user' ? (
                      <p>{msg.content}</p>
                    ) : (
                      <div className="prose prose-xs dark:prose-invert max-w-none">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-1 last:mb-0 text-xs leading-relaxed">{children}</p>,
                            ul: ({ children }) => <ul className="mb-1 ml-3 list-disc text-xs">{children}</ul>,
                            ol: ({ children }) => <ol className="mb-1 ml-3 list-decimal text-xs">{children}</ol>,
                            li: ({ children }) => <li className="mb-0.5 text-xs">{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold text-primary">{children}</strong>,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-chart-3 to-primary">
                    <Sparkles className="h-3 w-3 text-white" />
                  </div>
                  <div className="rounded-xl rounded-tl-sm bg-muted/70 border border-border/50 px-3 py-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Follow-up questions in chat mode */}
          {!isLoading && (
            <div className="p-2 border-t border-border/50 space-y-1.5 shrink-0">
              <p className="text-[10px] text-muted-foreground text-center">Ask me more! 👇</p>
              <div className="flex flex-wrap gap-1 justify-center">
                {questions
                  .filter(q => !messages.some(m => m.role === 'user' && m.content === q.label))
                  .slice(0, 3)
                  .map((q, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] px-2 gap-1 rounded-full"
                      onClick={() => sendQuestion(q.label, q.prompt)}
                      disabled={isLoading}
                    >
                      {q.emoji} {q.label}
                    </Button>
                  ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-6 text-[10px] text-muted-foreground"
                onClick={handleBackToTips}
              >
                ← Back to tips
              </Button>
            </div>
          )}
        </>
      ) : (
        /* Tips + Questions Mode */
        <div className="p-4">
          {/* Rotating Tip */}
          <div
            className={cn(
              'text-sm transition-opacity duration-300 mb-3',
              isAnimating ? 'opacity-0' : 'opacity-100'
            )}
          >
            {allTips[currentTipIndex]}
          </div>

          {/* Tip Navigation Dots */}
          <div className="flex justify-center gap-1 mb-4">
            {allTips.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentTipIndex(i)}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === currentTipIndex ? 'w-4 bg-primary' : 'w-1.5 bg-muted-foreground/30'
                )}
              />
            ))}
          </div>

          {/* Quick Questions */}
          <div className="border-t border-border/50 pt-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
              <MessageCircle className="h-3 w-3" /> Ask Quinn
            </p>
            <div className="space-y-1.5">
              {questions.map((q, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="w-full h-auto py-1.5 px-3 text-xs justify-start gap-2 rounded-xl hover:bg-primary/10 hover:border-primary/50 transition-all"
                  onClick={() => sendQuestion(q.label, q.prompt)}
                  disabled={isLoading}
                >
                  <span className="text-base">{q.emoji}</span>
                  <span>{q.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
