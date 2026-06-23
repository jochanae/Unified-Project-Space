import { useState, useRef, useEffect } from 'react';
import { useQuinnChat, Message, Attachment } from '@/hooks/useQuinnChat';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Sparkles, User, Loader2, Lightbulb, Target, TrendingUp, BookOpen, ImagePlus, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface QuinnTradingSidebarProps {
  symbol?: string;
  currentPrice?: number;
  priceChange?: number;
  context?: 'chart' | 'backtest' | 'strategy' | 'trade';
  className?: string;
}

const CONTEXT_PROMPTS: Record<string, { icon: typeof Lightbulb; label: string; prompt: string }[]> = {
  chart: [
    { icon: TrendingUp, label: 'Analyze this chart', prompt: 'Can you analyze the current chart pattern and tell me what you see?' },
    { icon: Target, label: 'Entry/exit points', prompt: 'Where would be good entry and exit points based on the current chart?' },
    { icon: BookOpen, label: 'Explain indicators', prompt: 'What technical indicators should I look at for this stock?' },
  ],
  backtest: [
    { icon: Lightbulb, label: 'Strategy ideas', prompt: 'What are some good backtesting strategies for beginners?' },
    { icon: Target, label: 'Optimize results', prompt: 'How can I improve my backtest results?' },
    { icon: BookOpen, label: 'Understand metrics', prompt: 'Explain the key metrics I should look at in backtest results.' },
  ],
  strategy: [
    { icon: Lightbulb, label: 'Build a strategy', prompt: 'Help me build a simple trading strategy step by step.' },
    { icon: Target, label: 'Risk management', prompt: 'What risk management rules should I add to my strategy?' },
    { icon: TrendingUp, label: 'Entry rules', prompt: 'What are good entry rules for a momentum strategy?' },
  ],
  trade: [
    { icon: Lightbulb, label: 'Should I trade?', prompt: 'Based on current market conditions, should I make this trade?' },
    { icon: Target, label: 'Position sizing', prompt: 'How should I size this position given my account balance?' },
    { icon: BookOpen, label: 'Risk/reward', prompt: 'Help me calculate the risk/reward ratio for this trade.' },
  ],
};

const WELCOME_MESSAGE = `Hey! 👋 I'm here to guide you through your trading session.

**I can help you with:**
- 📊 Analyzing charts and patterns
- 🎯 Finding entry/exit points
- 📈 Building and testing strategies
- ⚖️ Risk management decisions

What would you like to explore?`;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function MessageBubble({ message, isStreaming }: { message: Message; isStreaming?: boolean }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-chart-3 to-chart-3/60">
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[85%] rounded-xl px-3 py-2 text-sm',
          isUser
            ? 'rounded-br-sm bg-primary text-primary-foreground'
            : 'rounded-tl-sm bg-muted/70 border border-border/50'
        )}
      >
        {isUser ? (
          <div>
            <p className="whitespace-pre-wrap">{message.content}</p>
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {message.attachments.map((att, i) => (
                  <div key={i} className="rounded bg-primary-foreground/10 px-2 py-0.5 text-xs">
                    📎 {att.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-1.5 last:mb-0 text-sm">{children}</p>,
                ul: ({ children }) => <ul className="mb-1.5 ml-3 list-disc text-sm">{children}</ul>,
                ol: ({ children }) => <ol className="mb-1.5 ml-3 list-decimal text-sm">{children}</ol>,
                li: ({ children }) => <li className="mb-0.5 text-sm">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold text-primary">{children}</strong>,
              }}
            >
              {message.content}
            </ReactMarkdown>
            {isStreaming && (
              <span className="inline-block w-1.5 h-3 ml-0.5 bg-primary animate-pulse rounded-sm" />
            )}
          </div>
        )}
      </div>
      {isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <User className="h-3.5 w-3.5 text-primary" />
        </div>
      )}
    </div>
  );
}

export function QuinnTradingSidebar({
  symbol,
  currentPrice,
  priceChange,
  context = 'chart',
  className,
}: QuinnTradingSidebarProps) {
  const { messages, isLoading, sendMessage, clearMessages } = useQuinnChat();
  const [input, setInput] = useState('');
  const [pendingImage, setPendingImage] = useState<{ file: File; preview: string } | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Image too large. Max 5MB.');
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Only JPEG, PNG, GIF, or WebP images.');
      return;
    }
    setPendingImage({ file, preview: URL.createObjectURL(file) });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePendingImage = () => {
    if (pendingImage) {
      URL.revokeObjectURL(pendingImage.preview);
      setPendingImage(null);
    }
  };

  const buildContext = (text: string) => {
    if (!symbol) return text;
    return `[Context: User is looking at ${symbol}${currentPrice ? ` at $${currentPrice.toFixed(2)}` : ''}${priceChange !== undefined ? ` (${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%)` : ''}]\n\n${text}`;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && !pendingImage) || isLoading) return;

    let attachments: Attachment[] | undefined;
    if (pendingImage) {
      const base64 = await fileToBase64(pendingImage.file);
      attachments = [{ name: pendingImage.file.name, type: pendingImage.file.type, base64 }];
      URL.revokeObjectURL(pendingImage.preview);
      setPendingImage(null);
    }

    const text = input.trim() || (attachments ? 'Please analyze this chart image.' : '');
    sendMessage(buildContext(text), attachments);
    setInput('');
  };

  const handleQuickPrompt = (prompt: string) => {
    sendMessage(buildContext(prompt));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const quickPrompts = CONTEXT_PROMPTS[context] || CONTEXT_PROMPTS.chart;

  const displayMessages = messages.length === 0
    ? [{ id: 'welcome', role: 'assistant' as const, content: WELCOME_MESSAGE, timestamp: new Date() }]
    : messages;

  return (
    <div className={cn('flex flex-col h-full bg-card/50 backdrop-blur-sm border-l border-border/50', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-chart-3 to-chart-3/60 shadow-lg shadow-chart-3/20">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Quinn</h3>
            <p className="text-[10px] text-muted-foreground">Your Trading Guide</p>
          </div>
        </div>
        {symbol && (
          <Badge variant="outline" className="text-xs">
            {symbol}
          </Badge>
        )}
      </div>

      {/* Quick Action Buttons */}
      {messages.length === 0 && (
        <div className="px-3 py-2 border-b border-border/50 space-y-1.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Quick Actions</p>
          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.map((prompt, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => handleQuickPrompt(prompt.prompt)}
                disabled={isLoading}
              >
                <prompt.icon className="h-3 w-3" />
                {prompt.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-3">
        <div className="space-y-3">
          {displayMessages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              isStreaming={isLoading && index === displayMessages.length - 1 && message.role === 'assistant'}
            />
          ))}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-chart-3 to-chart-3/60">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="rounded-xl rounded-tl-sm bg-muted/70 border border-border/50 px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Image Preview */}
      {pendingImage && (
        <div className="px-3 py-1.5 border-t border-border/50">
          <div className="relative inline-block">
            <img src={pendingImage.preview} alt="Upload" className="h-14 w-14 rounded-lg object-cover border border-border" />
            <button
              onClick={removePendingImage}
              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive flex items-center justify-center"
            >
              <X className="h-3 w-3 text-destructive-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-border/50">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={handleImageSelect}
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 h-10 w-10"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            title="Attach chart screenshot"
          >
            <ImagePlus className="h-4 w-4" />
          </Button>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Quinn anything..."
            className="min-h-[40px] max-h-[80px] resize-none bg-muted/30 text-sm flex-1"
            disabled={isLoading}
            rows={1}
          />
          <Button
            type="submit"
            size="icon"
            disabled={(!input.trim() && !pendingImage) || isLoading}
            className="shrink-0 h-10 w-10"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}