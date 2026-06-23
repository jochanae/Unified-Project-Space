import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MessageSquare,
  Bug,
  Lightbulb,
  Star,
  Loader2,
  HelpCircle,
  Keyboard,
  FileText,
  BookOpen,
  Users,
  StickyNote,
  ExternalLink,
  Layers,
  Calculator,
  LineChart,
  BarChart3,
  PlayCircle,
  BookMarked,
  Bell,
} from 'lucide-react';
import { toast } from 'sonner';
import { ShareMenu } from '@/components/social/ShareMenu';
import { DonationButton } from '@/components/social/DonationButton';
import { cn } from '@/lib/utils';
import { QuinnIcon } from '@/components/icons/QuinnIcon';
import { QuinnChat } from '@/components/quinn/QuinnChat';
import { QuinnPopoutWindow } from '@/components/quinn/QuinnPopout';
import { FooterShortcutsSettings } from './FooterShortcutsSettings';
import { useFooterShortcuts, FooterShortcut } from '@/hooks/useFooterShortcuts';
import { useIsMobile } from '@/hooks/use-mobile';

type FeedbackType = 'bug' | 'feedback' | 'feature_request' | 'satisfaction';

const feedbackTypeConfig = {
  bug: { icon: Bug, label: 'Report Bug', color: 'text-destructive' },
  feedback: { icon: MessageSquare, label: 'General Feedback', color: 'text-primary' },
  feature_request: { icon: Lightbulb, label: 'Feature Request', color: 'text-gold' },
  satisfaction: { icon: Star, label: 'Rate Experience', color: 'text-gain' },
};

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Keyboard,
  HelpCircle,
  FileText,
  BookOpen,
  Users,
  StickyNote,
  MessageSquare,
  Layers,
  Calculator,
  LineChart,
  BarChart3,
  PlayCircle,
  BookMarked,
  Bell,
  Target: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  ),
};

// Long press duration in ms
const LONG_PRESS_DURATION = 500;
export function AppFooter() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { activeShortcuts } = useFooterShortcuts();
  const [isOpen, setIsOpen] = useState(false);
  const [isQuinnOpen, setIsQuinnOpen] = useState(false);
  const [isPopoutOpen, setIsPopoutOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [type, setType] = useState<FeedbackType>('feedback');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState<number>(0);

  // Long press handling
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  // Split shortcuts for left/right sides (3 left, rest on right)
  const leftShortcuts = activeShortcuts.slice(0, 3);
  const rightShortcuts = activeShortcuts.slice(3);

  // Hide footer on certain pages
  const hiddenPaths = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/pricing', '/youth-mode'];
  const shouldHide = hiddenPaths.includes(location.pathname);

  // If route changes (including Quinn-triggered navigations), close the overlay so it never blocks the destination.
  useEffect(() => {
    setIsQuinnOpen(false);
  }, [location.pathname]);

  // Simple click handler for Quinn button
  const handleQuinnClick = useCallback(() => {
    // Clear any pending long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    // If it was a long press, don't toggle (popout already opened)
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }
    setIsQuinnOpen(prev => !prev);
  }, []);

  // Long press handlers for popout (touch devices only)
  const handleQuinnTouchStart = useCallback(() => {
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      // Trigger haptic feedback on mobile if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      setIsPopoutOpen(true);
      toast.success('Quinn Pop-out opened!', { duration: 2000 });
    }, LONG_PRESS_DURATION);
  }, []);

  const handleQuinnTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleQuinnTouchCancel = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    isLongPressRef.current = false;
  }, []);

  const handlePopoutClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPopoutOpen(true);
  }, []);

  // Listen for external requests to open Quinn (e.g., from PWA shortcut)
  useEffect(() => {
    const handleOpenQuinn = () => {
      setIsQuinnOpen(true);
    };

    window.addEventListener('open-quinn-chat', handleOpenQuinn);
    return () => window.removeEventListener('open-quinn-chat', handleOpenQuinn);
  }, []);

  // Auto-capture errors with security sanitization
  useEffect(() => {
    // Rate limiting: track error counts per minute
    const errorCounts = new Map<string, { count: number; timestamp: number }>();
    const MAX_ERRORS_PER_MINUTE = 5;

    // Sanitize URL by removing query params and hash (may contain tokens)
    const sanitizeUrl = (url: string): string => {
      try {
        const sanitized = new URL(url);
        sanitized.search = '';
        sanitized.hash = '';
        return sanitized.toString();
      } catch {
        return url.split('?')[0].split('#')[0];
      }
    };

    // Limit stack trace to first 5 frames to reduce information exposure
    const limitStackTrace = (stack: string | undefined): string | undefined => {
      if (!stack) return undefined;
      const lines = stack.split('\n');
      return lines.slice(0, 6).join('\n'); // Header + 5 frames
    };

    // Filter out errors that may contain sensitive information
    const containsSensitiveInfo = (message: string): boolean => {
      const sensitivePatterns = /\b(token|password|secret|key|auth|bearer|api_key|apikey|credential)\b/i;
      return sensitivePatterns.test(message);
    };

    // Rate limit check
    const shouldRateLimit = (errorKey: string): boolean => {
      const now = Date.now();
      const entry = errorCounts.get(errorKey);
      
      if (!entry || now - entry.timestamp > 60000) {
        errorCounts.set(errorKey, { count: 1, timestamp: now });
        return false;
      }
      
      if (entry.count >= MAX_ERRORS_PER_MINUTE) {
        return true;
      }
      
      entry.count++;
      return false;
    };

    const handleError = async (event: ErrorEvent) => {
      try {
        const errorMessage = event.message || 'Unknown error';
        
        // Skip logging if message contains sensitive keywords
        if (containsSensitiveInfo(errorMessage)) {
          console.warn('Error logging skipped: message may contain sensitive information');
          return;
        }

        // Rate limit by error location
        const errorKey = `${event.filename}:${event.lineno}`;
        if (shouldRateLimit(errorKey)) {
          console.warn('Error logging rate limited');
          return;
        }

        await supabase.from('feedback').insert({
          user_id: user?.id || null,
          type: 'error',
          title: errorMessage.substring(0, 100),
          message: errorMessage.substring(0, 500), // Limit message length
          error_data: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            stack: limitStackTrace(event.error?.stack),
          },
          page_url: sanitizeUrl(window.location.href),
          user_agent: navigator.userAgent,
        });
      } catch (e) {
        console.error('Failed to log error:', e);
      }
    };

    const handleUnhandledRejection = async (event: PromiseRejectionEvent) => {
      try {
        const reasonStr = String(event.reason);
        
        // Skip logging if reason contains sensitive keywords
        if (containsSensitiveInfo(reasonStr)) {
          console.warn('Rejection logging skipped: may contain sensitive information');
          return;
        }

        // Rate limit by reason hash
        const errorKey = `rejection:${reasonStr.substring(0, 50)}`;
        if (shouldRateLimit(errorKey)) {
          console.warn('Rejection logging rate limited');
          return;
        }

        await supabase.from('feedback').insert({
          user_id: user?.id || null,
          type: 'error',
          title: 'Unhandled Promise Rejection',
          message: reasonStr.substring(0, 500), // Limit message length
          error_data: {
            reason: reasonStr.substring(0, 500),
            stack: limitStackTrace(event.reason?.stack),
          },
          page_url: sanitizeUrl(window.location.href),
          user_agent: navigator.userAgent,
        });
      } catch (e) {
        console.error('Failed to log rejection:', e);
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [user]);

  const resetForm = () => {
    setType('feedback');
    setTitle('');
    setMessage('');
    setRating(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('feedback').insert({
        user_id: user?.id || null,
        type,
        title: title || null,
        message,
        rating: type === 'satisfaction' ? rating : null,
        page_url: window.location.href,
        user_agent: navigator.userAgent,
      });

      if (error) throw error;

      toast.success('Thank you for your feedback!');
      resetForm();
      setIsOpen(false);
    } catch (error: any) {
      console.error('Feedback error:', error);
      toast.error('Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (shouldHide) return null;

  const TypeIcon = feedbackTypeConfig[type].icon;

  const renderShortcut = (shortcut: FooterShortcut) => {
    const Icon = iconMap[shortcut.icon];
    if (!Icon) return null;

    const buttonClass = "h-11 px-2 xs:px-3 text-[10px] text-muted-foreground flex flex-col items-center gap-0.5 transition-all duration-200 hover:text-foreground hover:bg-accent/50 hover:scale-105 active:scale-95";

    // Handle special actions
    if (shortcut.action === 'keys') {
      return (
        <Button
          key={shortcut.id}
          variant="ghost"
          size="sm"
          className={buttonClass}
          onClick={() => document.dispatchEvent(new CustomEvent('toggle-shortcuts-dialog'))}
        >
          <Icon className={cn("h-5 w-5 transition-transform", shortcut.color)} />
          <span className="hidden xs:inline">{shortcut.label}</span>
        </Button>
      );
    }

    if (shortcut.action === 'feedback') {
      return (
        <Dialog key={shortcut.id} open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={buttonClass}
            >
              <Icon className={cn("h-5 w-5 transition-transform", shortcut.color)} />
              <span className="hidden xs:inline">{shortcut.label}</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TypeIcon className={cn('h-5 w-5', feedbackTypeConfig[type].color)} />
                Send Feedback
              </DialogTitle>
              <DialogDescription>
                Help us improve IntoIQ by sharing your thoughts
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as FeedbackType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(feedbackTypeConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <config.icon className={cn('h-4 w-4', config.color)} />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Subject (optional)</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief summary..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    type === 'bug'
                      ? 'Describe what happened and steps to reproduce...'
                      : type === 'feature_request'
                      ? 'Describe the feature you\'d like to see...'
                      : 'Share your thoughts...'
                  }
                  rows={4}
                  required
                />
              </div>

              {type === 'satisfaction' && (
                <div className="space-y-2">
                  <Label>Rating</Label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-1 transition-transform hover:scale-110"
                      >
                        <Star
                          className={cn(
                            'h-8 w-8',
                            star <= rating ? 'fill-gold text-gold' : 'text-muted-foreground'
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Submit
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      );
    }

    // Regular link shortcuts
    return (
      <Button
        key={shortcut.id}
        variant="ghost"
        size="sm"
        className={buttonClass}
        asChild
      >
        <Link to={shortcut.href || '#'}>
          <Icon className={cn("h-5 w-5 transition-transform", shortcut.color)} />
          <span className="hidden xs:inline">{shortcut.label}</span>
        </Link>
      </Button>
    );
  };

  return (
    <>
      {/* Main Footer - extra padding for safe area on mobile PWA */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-card/98 backdrop-blur-xl border-t border-border/50 pb-[env(safe-area-inset-bottom,0px)]">
        {/* Subtle corner actions - Share & Donate */}
        <div className="absolute -top-8 right-2 flex items-center gap-2">
          <ShareMenu variant="ghost" size="sm" className="h-7 text-xs bg-card/80 backdrop-blur-sm border border-border/30 hover:border-border shadow-sm" />
          <DonationButton variant="subtle" />
        </div>
        
        <div className="flex items-center justify-between h-14 px-2">
          {/* Left shortcuts (3 items) */}
          <div className="flex items-center justify-evenly flex-1">
            {leftShortcuts.map(renderShortcut)}
          </div>

          {/* Center spacer for Quinn button */}
          <div className="w-20 shrink-0" />

          {/* Center: Raised Quinn Button with Label + Pop-out icon */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-7 z-10 flex flex-col items-center">
            <div className="relative">
              {/* Main Quinn Button - purple gradient with chat bubble icon */}
              <Button
                onClick={handleQuinnClick}
                onTouchStart={handleQuinnTouchStart}
                onTouchEnd={handleQuinnTouchEnd}
                onTouchCancel={handleQuinnTouchCancel}
                className={cn(
                  "h-18 w-18 rounded-full shadow-xl border-4 border-background p-0",
                  "bg-gradient-to-br from-violet-500 via-purple-500 to-violet-600",
                  "hover:shadow-2xl hover:shadow-violet-500/40 hover:scale-105",
                  "transition-all duration-300 flex flex-col items-center justify-center",
                  isQuinnOpen && "ring-2 ring-violet-400/50 ring-offset-2 ring-offset-background"
                )}
                style={{ height: '72px', width: '72px' }}
                size="icon"
              >
                <QuinnIcon variant="chat-q" size={40} />
                <span 
                  className="text-[9px] font-medium text-white/90 -mt-0.5"
                  style={{ fontFamily: "'Georgia', 'Times New Roman', serif", fontStyle: 'italic' }}
                >
                  Ask Quinn
                </span>
              </Button>

              {/* Floating Pop-out icon - desktop only */}
              <button
                onClick={handlePopoutClick}
                className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-muted/90 border border-border/50 hidden md:flex items-center justify-center shadow-md hover:bg-muted hover:scale-110 transition-all"
                title="Open floating window (or long-press)"
              >
                <ExternalLink className="h-2.5 w-2.5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Right shortcuts + Edit button */}
          <div className="flex items-center justify-evenly flex-1">
            {rightShortcuts.map(renderShortcut)}
            <FooterShortcutsSettings />
          </div>
        </div>
      </footer>

      {/* Quinn Chat Panel */}
      <div
        className={cn(
          "fixed z-50 overflow-hidden border border-border/50 shadow-2xl bg-background",
          "transition-all duration-300 ease-out",
          isMobile
            ? "inset-x-0 bottom-0 h-[100dvh] w-full rounded-t-2xl"
            : "bottom-16 left-1/2 -translate-x-1/2 w-[400px] h-[500px] max-h-[70vh] max-w-[calc(100vw-2rem)] rounded-2xl",
          isQuinnOpen
            ? "opacity-100 translate-y-0"
            : isMobile
              ? "opacity-0 translate-y-full pointer-events-none"
              : "opacity-0 translate-y-8 scale-95 pointer-events-none"
        )}
      >
        <QuinnChat
          onNavigateAway={() => setIsQuinnOpen(false)}
          onClose={isMobile ? () => setIsQuinnOpen(false) : undefined}
          showCloseButton={isMobile}
        />
      </div>

      {/* Backdrop for Quinn */}
      {isQuinnOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
          onClick={() => setIsQuinnOpen(false)}
        />
      )}

      {/* Pop-out floating window */}
      {isPopoutOpen && (
        <QuinnPopoutWindow onClose={() => setIsPopoutOpen(false)} />
      )}
    </>
  );
}
