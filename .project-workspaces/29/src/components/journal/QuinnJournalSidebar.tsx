import { useState, useRef, useEffect } from 'react';
import { useQuinnChat, Message } from '@/hooks/useQuinnChat';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Sparkles, User, Loader2, Lightbulb, Target, TrendingUp, BarChart3, FileText, ImagePlus, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { Trade } from '@/hooks/useTrades';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface QuinnJournalSidebarProps {
  trades?: Trade[];
  selectedTrade?: Trade | null;
  stats?: {
    totalTrades: number;
    winRate: number;
    totalProfitLoss: number;
  };
  className?: string;
}

const QUICK_PROMPTS = [
  { icon: BarChart3, label: 'Analyze my trades', prompt: 'Can you analyze my recent trading performance and identify patterns?' },
  { icon: Target, label: 'Improve win rate', prompt: 'How can I improve my win rate based on my trading history?' },
  { icon: Lightbulb, label: 'Journal tips', prompt: 'What should I focus on when journaling my trades?' },
  { icon: FileText, label: 'Review this trade', prompt: 'Help me review and learn from my most recent trade.' },
];

const WELCOME_MESSAGE = `Hey! 👋 I'm here to help you analyze your trades and improve your performance.

**I can help you with:**
- 📊 Analyzing your trading patterns
- 🎯 Identifying areas for improvement  
- 📈 Reviewing specific trades
- ✍️ Journaling best practices

Select a trade or ask me anything!`;

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
          <p className="whitespace-pre-wrap">{message.content}</p>
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

export function QuinnJournalSidebar({
  trades = [],
  selectedTrade,
  stats,
  className,
}: QuinnJournalSidebarProps) {
  const { user } = useAuth();
  const { messages, isLoading, sendMessage, clearMessages } = useQuinnChat();
  const [input, setInput] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // When a trade is selected, prompt Quinn to analyze it
  useEffect(() => {
    if (selectedTrade && messages.length === 0) {
      const tradeContext = `[Selected Trade: ${selectedTrade.symbol} ${selectedTrade.trade_type} @ $${selectedTrade.entry_price}${selectedTrade.exit_price ? ` → $${selectedTrade.exit_price}` : ''} (${selectedTrade.status}). P&L: ${selectedTrade.profit_loss ? `$${selectedTrade.profit_loss.toFixed(2)}` : 'N/A'}. Notes: ${selectedTrade.notes || 'None'}]

Help me analyze this trade. What did I do well and what could I improve?`;
      sendMessage(tradeContext);
    }
  }, [selectedTrade]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    let contextMessage = input;
    if (stats) {
      contextMessage = `[Context: User has ${stats.totalTrades} trades, ${stats.winRate.toFixed(1)}% win rate, total P&L: $${stats.totalProfitLoss.toFixed(2)}]\n\n${input}`;
    }
    if (attachedImage) {
      contextMessage = `[User attached a chart screenshot: ${attachedImage}]\n\n${contextMessage}`;
    }

    sendMessage(contextMessage);
    setInput('');
    setAttachedImage(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from('trade-screenshots')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('trade-screenshots')
        .getPublicUrl(fileName);

      setAttachedImage(publicUrl);
      toast.success('Screenshot attached');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload screenshot');
    } finally {
      setIsUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    let contextMessage = prompt;
    if (stats) {
      contextMessage = `[Context: User has ${stats.totalTrades} trades, ${stats.winRate.toFixed(1)}% win rate, total P&L: $${stats.totalProfitLoss.toFixed(2)}]\n\n${prompt}`;
    }
    sendMessage(contextMessage);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

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
            <p className="text-[10px] text-muted-foreground">Journal Analyst</p>
          </div>
        </div>
        {selectedTrade && (
          <Badge variant="outline" className="text-xs">
            {selectedTrade.symbol}
          </Badge>
        )}
      </div>

      {/* Selected Trade Summary */}
      {selectedTrade && (
        <div className="px-3 py-2 border-b border-border/50 bg-muted/30">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Selected Trade</p>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={cn(
                'text-xs',
                selectedTrade.trade_type === 'long' ? 'border-gain/50 text-gain' : 'border-loss/50 text-loss'
              )}
            >
              {selectedTrade.trade_type}
            </Badge>
            <span className="text-sm font-medium">{selectedTrade.symbol}</span>
            {selectedTrade.profit_loss !== null && (
              <span className={cn(
                'text-xs font-mono ml-auto',
                selectedTrade.profit_loss >= 0 ? 'text-gain' : 'text-loss'
              )}>
                {selectedTrade.profit_loss >= 0 ? '+' : ''}${selectedTrade.profit_loss.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Quick Action Buttons */}
      {messages.length === 0 && !selectedTrade && (
        <div className="px-3 py-2 border-b border-border/50 space-y-1.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Quick Actions</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((prompt, i) => (
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

      {/* Attached Image Preview */}
      {attachedImage && (
        <div className="px-3 pt-2">
          <div className="relative rounded-lg border overflow-hidden">
            <img src={attachedImage} alt="Attached screenshot" className="w-full h-20 object-cover" />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-5 w-5"
              onClick={() => setAttachedImage(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-border/50">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 h-10 w-10"
            onClick={() => imageInputRef.current?.click()}
            disabled={isLoading || isUploading}
            title="Attach chart screenshot"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Quinn about your trades..."
            className="min-h-[40px] max-h-[80px] resize-none bg-muted/30 text-sm flex-1"
            disabled={isLoading}
            rows={1}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
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
