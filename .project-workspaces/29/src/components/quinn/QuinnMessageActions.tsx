import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  RotateCcw, 
  ThumbsUp, 
  ThumbsDown, 
  Copy, 
  MoreHorizontal,
  MessageSquare,
  Check,
  BookOpen,
  Target,
  Calculator,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface QuinnMessageActionsProps {
  messageContent: string;
  messageId: string;
  onRetry?: () => void;
  onFeedback?: (type: 'positive' | 'negative') => void;
  showAddToPlan?: boolean;
  showShareToCommunity?: boolean;
}

export function QuinnMessageActions({
  messageContent,
  messageId,
  onRetry,
  onFeedback,
}: QuinnMessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);
  const navigate = useNavigate();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageContent);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleFeedback = (type: 'positive' | 'negative') => {
    setFeedback(type);
    onFeedback?.(type);
    toast.success(type === 'positive' ? 'Thanks for the feedback! 👍' : 'Thanks, I\'ll try to do better!');
  };

  // Recommended shortcuts based on context
  const getRecommendedShortcuts = () => {
    const shortcuts = [];
    
    // Check for strategy mentions
    if (/(?:strategy|spread|condor|butterfly|straddle|strangle|options?)/i.test(messageContent)) {
      shortcuts.push({
        icon: Target,
        label: 'View Strategies',
        action: () => navigate('/strategies'),
      });
    }
    
    // Check for learning/lesson mentions
    if (/(?:learn|lesson|understand|beginner|tutorial|course)/i.test(messageContent)) {
      shortcuts.push({
        icon: BookOpen,
        label: 'Go to Learn Hub',
        action: () => navigate('/learn'),
      });
    }
    
    // Check for calculator mentions
    if (/(?:calculate|calculator|position size|risk|margin|compound)/i.test(messageContent)) {
      shortcuts.push({
        icon: Calculator,
        label: 'Open Calculator',
        action: () => navigate('/tools/position-size'),
      });
    }
    
    // Check for journal mentions
    if (/(?:journal|log|track|trade history|record)/i.test(messageContent)) {
      shortcuts.push({
        icon: MessageSquare,
        label: 'Open Journal',
        action: () => navigate('/journal'),
      });
    }
    
    return shortcuts;
  };

  const recommendedShortcuts = getRecommendedShortcuts();

  return (
    <div className="mt-3 space-y-2">
      {/* Primary action buttons row */}
      <div className="flex items-center gap-1 pt-2 border-t border-border/30">
        <TooltipProvider delayDuration={300}>
          {/* Retry button */}
          {onRetry && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={onRetry}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Regenerate response</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Thumbs up */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8",
                  feedback === 'positive' 
                    ? "text-gain bg-gain/10" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => handleFeedback('positive')}
                disabled={feedback !== null}
              >
                <ThumbsUp className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Good response</p>
            </TooltipContent>
          </Tooltip>

          {/* Thumbs down */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8",
                  feedback === 'negative' 
                    ? "text-loss bg-loss/10" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => handleFeedback('negative')}
                disabled={feedback !== null}
              >
                <ThumbsDown className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Needs improvement</p>
            </TooltipContent>
          </Tooltip>

          {/* Copy button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-gain" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{copied ? 'Copied!' : 'Copy message'}</p>
            </TooltipContent>
          </Tooltip>

          {/* More options dropdown */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>More options</p>
              </TooltipContent>
            </Tooltip>
            
            <DropdownMenuContent align="start" className="w-56">
              {/* Recommended shortcuts - Show first */}
              {recommendedShortcuts.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Recommended
                  </div>
                  {recommendedShortcuts.map((shortcut, i) => (
                    <DropdownMenuItem 
                      key={i} 
                      onClick={shortcut.action}
                      className="gap-2"
                    >
                      <shortcut.icon className="h-4 w-4" />
                      {shortcut.label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}
              
              {/* Copy in menu too */}
              <DropdownMenuItem onClick={handleCopy} className="gap-2">
                <Copy className="h-4 w-4" />
                Copy message
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TooltipProvider>
      </div>
    </div>
  );
}
