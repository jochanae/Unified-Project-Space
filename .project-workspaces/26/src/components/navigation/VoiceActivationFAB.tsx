import React, { useState, useEffect, useRef, useCallback } from "react";
import { Rnd } from "react-rnd";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, Settings, RefreshCw, EyeOff, HelpCircle, Clock, Ban, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { processVoiceCommand, VoiceCommandResult } from "@/lib/ai-voice-processor";
import { queryClient } from "@/lib/queryClient";

interface VoiceActivationFABProps {
  onOpenInsights?: () => void;
  onDismiss?: () => void;
  className?: string;
}

interface Position {
  x: number;
  y: number;
}

// Voice commands mapping for CoinsBloom routes
const VOICE_COMMANDS: Record<string, string> = {
  'dashboard': '/dashboard',
  'home': '/dashboard',
  'transactions': '/transactions',
  'money': '/transactions',
  'budgets': '/budgets',
  'budget': '/budgets',
  'bloom burst': '/budgets',
  'bloom bursts': '/budgets',
  'bloomburst': '/budgets',
  'bills': '/bills',
  'accounts': '/accounts',
  'savings': '/goals',
  'goals': '/goals',
  'reports': '/reports',
  'analytics': '/reports',
  'vision board': '/vision-board',
  'vision': '/vision-board',
  'kids': '/kids',
  'money academy': '/money-academy',
  'learning': '/money-academy',
  'debts': '/debts',
  'debt': '/debts',
  'credit': '/credit',
  'professionals': '/professionals',
  'help center': '/help-center',
  'advanced': '/advanced-tools',
  'settings': '/settings',
  'coach': 'open-bloomcoach',
  'quinn': 'open-bloomcoach',
  'help': 'open-bloomcoach',
};

export function VoiceActivationFAB({ onOpenInsights, onDismiss, className }: VoiceActivationFABProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 20, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [status, setStatus] = useState<"idle" | "listening" | "processing" | "success" | "error">("idle");
  
  const recognitionRef = useRef<any>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isIOSDevice = () => {
    if (typeof window === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  };

  const getSafeViewportHeight = () => {
    if (typeof window === 'undefined') return 0;
    if (isIOSDevice() && window.visualViewport) {
      return window.visualViewport.height;
    }
    return window.innerHeight;
  };

  // Initialize position
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const width = window.innerWidth;
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;
      const isIOS = isIOSDevice();
      
      const savedPosition = localStorage.getItem('voice-fab-position');
      if (savedPosition) {
        setPosition(JSON.parse(savedPosition));
      } else {
        const viewportHeight = getSafeViewportHeight();
        const iosBottomSafeArea = isIOS ? 40 : 0;
        let bottomSpacing = isMobile ? (viewportHeight < 600 ? 150 : 250) : isTablet ? 220 : 180;
        
        setPosition({
          x: window.innerWidth - (isMobile ? 80 : isTablet ? 100 : 120),
          y: viewportHeight - bottomSpacing - iosBottomSafeArea
        });
      }
    }
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setStatus("listening");
        setShowTooltip(true);
        setTranscript("");
      };

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript;
        setTranscript(transcript);
        
        if (event.results[current].isFinal) {
          processVoiceCommandHandler(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('[VoiceActivationFAB] Error:', event.error);
        setStatus("error");
        setIsListening(false);
        setShowTooltip(false);
        
        if (event.error !== 'aborted') {
          toast({
            title: "Voice Recognition Error",
            description: getErrorMessage(event.error),
            variant: "destructive"
          });
        }
        
        setTimeout(() => setStatus("idle"), 2000);
      };

      recognition.onend = () => {
        setIsListening(false);
        if (status === "listening") {
          setStatus("idle");
          setShowTooltip(false);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  const getErrorMessage = (error: string): string => {
    switch (error) {
      case 'not-allowed':
        return 'Microphone permission denied. Please enable microphone access.';
      case 'no-speech':
        return 'No speech detected. Please try again.';
      case 'network':
        return 'Network error. Please check your connection.';
      default:
        return 'Could not start voice recognition. Please try again.';
    }
  };

  const processVoiceCommandHandler = async (command: string) => {
    setStatus("processing");
    setIsProcessing(true);
    
    try {
      const result: VoiceCommandResult = await processVoiceCommand(command, {
        currentPath: location.pathname,
        currentDate: new Date(),
      });

      if (result.success) {
        setStatus("success");
        
        switch (result.action) {
          case 'navigate':
            const targetRoute = VOICE_COMMANDS[result.target?.toLowerCase() || ''] || result.target;
            
            if (targetRoute === 'open-bloomcoach' || result.target?.toLowerCase().includes('coach')) {
              toast({
                title: "Opening Bloom",
                description: "Your AI financial mentor is ready to help"
              });
              if (onOpenInsights) {
                onOpenInsights();
              } else {
                navigate('/help-center');
              }
            } else {
              toast({
                title: "Navigating",
                description: result.response || `Going to ${result.target}`
              });
              navigate(targetRoute || '/dashboard');
            }
            break;

          case 'transaction':
            toast({
              title: "Transaction Added",
              description: result.response || `Added ${result.type}: $${result.amount?.toFixed(2)}`
            });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            setTimeout(() => navigate('/transactions'), 1000);
            break;

          case 'budget':
            toast({
              title: "Budget Created",
              description: result.response || `Set budget of $${result.amount}`
            });
            queryClient.invalidateQueries({ queryKey: ['budgets'] });
            setTimeout(() => navigate('/budgets'), 1000);
            break;

          case 'bill':
            toast({
              title: "Bill Payment",
              description: result.response || `Paying ${result.target} bill`
            });
            queryClient.invalidateQueries({ queryKey: ['bills'] });
            setTimeout(() => navigate('/bills'), 1000);
            break;

          case 'savings':
            toast({
              title: "Savings Goal",
              description: result.response || `Created savings goal`
            });
            queryClient.invalidateQueries({ queryKey: ['goals'] });
            setTimeout(() => navigate('/goals'), 1000);
            break;

          case 'query':
            toast({
              title: "Answer",
              description: result.response,
              duration: 5000,
            });
            break;

          default:
            toast({
              title: "Command Processed",
              description: result.response || "Command completed successfully"
            });
        }
      } else {
        setStatus("error");
        toast({
          title: result.needsClarification ? "Need More Info" : "Command Failed",
          description: result.response || result.clarificationQuestion || "Could not process command",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Voice command error:', error);
      setStatus("error");
      toast({
        title: "Error",
        description: "Failed to process voice command. Please try again.",
        variant: "destructive"
      });
    }

    setIsProcessing(false);
    setShowTooltip(false);
    
    setTimeout(() => {
      setStatus("idle");
      setTranscript("");
    }, 2000);
  };

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      toast({
        title: "Voice Not Supported",
        description: "Your browser doesn't support voice recognition",
        variant: "destructive"
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setShowTooltip(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
            setShowTooltip(false);
          }
        }, 10000);
      } catch (error) {
        console.error('[VoiceActivationFAB] Error starting:', error);
        toast({
          title: "Could not start listening",
          description: "Please check your microphone permissions",
          variant: "destructive"
        });
      }
    }
  }, [isListening, toast]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Only activate if we weren't dragging
    if (!isDragging) {
      toggleListening();
    }
    // Reset dragging state after a short delay
    setTimeout(() => setIsDragging(false), 100);
  };

  const getButtonColor = () => {
    switch (status) {
      case "listening":
        return "from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 border-2 border-white/60";
      case "processing":
        return "from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 border-2 border-white/60";
      case "success":
        return "from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 border-2 border-white/60";
      case "error":
        return "from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 border-2 border-white/60";
      default:
        return "from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 border-2 border-white/60";
    }
  };

  const handleResetPosition = () => {
    if (typeof window !== 'undefined') {
      const width = window.innerWidth;
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;
      const isIOS = isIOSDevice();
      const viewportHeight = getSafeViewportHeight();
      const iosBottomSafeArea = isIOS ? 40 : 0;
      let bottomSpacing = isMobile ? (viewportHeight < 600 ? 150 : 250) : isTablet ? 220 : 180;
      
      const newPosition = {
        x: window.innerWidth - (isMobile ? 80 : isTablet ? 100 : 120),
        y: viewportHeight - bottomSpacing - iosBottomSafeArea
      };
      
      setPosition(newPosition);
      localStorage.setItem('voice-fab-position', JSON.stringify(newPosition));
      
      toast({
        title: "Position Reset",
        description: "Microphone button moved to default position"
      });
    }
  };

  const handleDismissForDay = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    localStorage.setItem('voice-fab-dismissed-until', tomorrow.toISOString());
    toast({
      title: "Voice Button Hidden",
      description: "Will reappear tomorrow"
    });
    if (onDismiss) {
      onDismiss();
    }
    window.dispatchEvent(new Event('storage'));
  };

  const handleDismissPermanently = () => {
    localStorage.setItem('voice-fab-dismissed', 'true');
    localStorage.removeItem('voice-fab-dismissed-until');
    toast({
      title: "Voice Button Hidden",
      description: "Restore in Settings → Dashboard Appearance"
    });
    if (onDismiss) {
      onDismiss();
    }
    window.dispatchEvent(new Event('storage'));
  };

  const handleShowHelp = () => {
    localStorage.removeItem('voice-fab-used');
    toast({
      title: "Voice Commands Help",
      description: "Say commands like 'Go to dashboard', 'Open budgets', 'Add expense $50', or 'Talk to Bloom'"
    });
  };

  return (
    <>
      <Rnd
        position={{ x: position.x, y: position.y }}
        onDragStart={() => setIsDragging(true)}
        onDragStop={(e, d) => {
          // Keep isDragging true briefly to prevent click activation
          setTimeout(() => setIsDragging(false), 150);
          setPosition({ x: d.x, y: d.y });
          if (typeof window !== 'undefined') {
            localStorage.setItem('voice-fab-position', JSON.stringify({ x: d.x, y: d.y }));
          }
        }}
        bounds="parent"
        enableResizing={false}
        dragHandleClassName="voice-fab-drag-handle"
        className="fixed z-40"
        style={{ pointerEvents: 'auto' }}
      >
        <div className="relative flex flex-col items-center gap-2">
          {/* Drag Handle - visible grip indicator */}
          <div 
            className="voice-fab-drag-handle absolute -top-3 left-1/2 -translate-x-1/2 bg-white/40 dark:bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5 cursor-grab active:cursor-grabbing shadow-sm border border-white/30 dark:border-white/20 opacity-60 hover:opacity-100 transition-opacity"
            title="Drag to reposition"
          >
            <GripVertical className="h-3 w-3 text-foreground/60" />
          </div>
          
          {showTooltip && transcript && (
            <div className={cn(
              "absolute bottom-full mb-2 left-1/2 -translate-x-1/2",
              "bg-popover text-popover-foreground px-3 py-1 rounded-lg text-sm",
              "whitespace-nowrap max-w-[200px] truncate",
              "animate-in fade-in slide-in-from-bottom-2"
            )}>
              {isProcessing ? "Processing..." : transcript}
            </div>
          )}
          
          <Button
            size="icon"
            onClick={handleClick}
            onTouchEnd={(e) => {
              e.preventDefault();
              if (!isDragging) handleClick(e as any);
            }}
            className={cn(
              "h-16 w-16 md:h-20 md:w-20 rounded-full shadow-xl",
              "bg-gradient-to-r transition-all duration-300",
              "backdrop-blur-md border-2 border-white/40",
              getButtonColor(),
              "text-white relative overflow-hidden",
              status === "listening" && "animate-pulse",
              className
            )}
            data-testid="voice-activation-fab"
            title={isListening ? "Tap to stop listening" : "Tap to use voice commands"}
          >
            {status === "listening" && (
              <>
                <span className="absolute inset-0 animate-ping bg-white/30 rounded-full" />
                <span className="absolute inset-0 animate-ping animation-delay-200 bg-white/20 rounded-full" />
              </>
            )}
            
            <div className="relative z-10">
              {isProcessing ? (
                <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin" />
              ) : isListening ? (
                <MicOff className="h-6 w-6 md:h-8 md:w-8" />
              ) : (
                <Mic className="h-6 w-6 md:h-8 md:w-8" />
              )}
            </div>
          </Button>
          
          <div onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-background/90 hover:bg-background shadow-lg backdrop-blur-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Settings className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover border shadow-lg z-50">
                <DropdownMenuItem onClick={handleResetPosition}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reset Position
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShowHelp}>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Voice Commands Help
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">Hide Voice Button</DropdownMenuLabel>
                <DropdownMenuItem onClick={handleDismissForDay}>
                  <Clock className="mr-2 h-4 w-4" />
                  Hide for Today
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDismissPermanently} className="text-destructive focus:text-destructive">
                  <Ban className="mr-2 h-4 w-4" />
                  Hide Until Restored
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {(status === "success" || status === "error") && (
            <div className={cn(
              "absolute inset-0 rounded-full pointer-events-none",
              "animate-in zoom-in-50 fade-in duration-300",
              status === "success" ? "ring-4 ring-green-400" : "ring-4 ring-red-400"
            )} />
          )}
        </div>
      </Rnd>

      {!localStorage.getItem('voice-fab-used') && (
        <div className="fixed bottom-4 right-20 z-40 bg-popover text-popover-foreground px-3 py-2 rounded-lg text-sm max-w-[250px] shadow-lg border">
          <div className="font-medium mb-1">Voice Commands</div>
          <div className="text-xs opacity-90">
            Tap the microphone to use voice commands. Say "Go to dashboard", "Open budgets", or "Talk to Bloom"
          </div>
          <button
            onClick={() => {
              localStorage.setItem('voice-fab-used', 'true');
              // Force re-render instead of reload
              window.dispatchEvent(new Event('storage'));
              // Hide the tooltip immediately by forcing a re-render
              const tooltip = document.querySelector('[data-voice-tooltip]');
              if (tooltip) tooltip.remove();
              else window.location.reload();
            }}
            className="mt-2 text-xs underline"
          >
            Got it
          </button>
        </div>
      )}
    </>
  );
}

export default VoiceActivationFAB;
