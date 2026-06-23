import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Heart, Coffee, CreditCard, DollarSign, ExternalLink, Loader2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DonationButtonProps {
  className?: string;
  variant?: 'subtle' | 'default';
}

const donationOptions = [
  {
    id: 'kofi',
    name: 'Ko-fi',
    description: 'Buy me a coffee',
    icon: Coffee,
    url: 'https://ko-fi.com/jochanae',
    color: 'from-[#FF5E5B] to-[#FF5E5B]/80',
    bgColor: 'bg-[#FF5E5B]/10 hover:bg-[#FF5E5B]/20',
    textColor: 'text-[#FF5E5B]',
  },
  {
    id: 'cashapp',
    name: 'Cash App',
    description: 'Send to $Jocyawn',
    icon: DollarSign,
    url: 'https://cash.app/$Jocyawn',
    color: 'from-[#00D632] to-[#00D632]/80',
    bgColor: 'bg-[#00D632]/10 hover:bg-[#00D632]/20',
    textColor: 'text-[#00D632]',
  },
  {
    id: 'stripe',
    name: 'Card Payment',
    description: 'Secure one-time donation',
    icon: CreditCard,
    url: null,
    color: 'from-primary to-primary/80',
    bgColor: 'bg-primary/10 hover:bg-primary/20',
    textColor: 'text-primary',
    isStripe: true,
  },
];

const presetAmounts = [5, 10, 25];

export function DonationButton({ className, variant = 'subtle' }: DonationButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showStripeAmount, setShowStripeAmount] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(10);
  const [customAmount, setCustomAmount] = useState('');

  const handleDonationClick = async (option: typeof donationOptions[0]) => {
    if (option.url) {
      window.open(option.url, '_blank', 'noopener,noreferrer');
    } else if (option.isStripe) {
      setShowStripeAmount(true);
    }
  };

  const handleStripeCheckout = async () => {
    const amount = selectedAmount || parseFloat(customAmount);
    
    if (!amount || amount < 1 || amount > 10000) {
      toast.error('Please enter an amount between $1 and $10,000');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-donation', {
        body: { amount },
      });
      
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Donation error:', error);
      toast.error('Unable to process donation. Please try another method.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setShowStripeAmount(false);
    setSelectedAmount(10);
    setCustomAmount('');
  };

  const handleClose = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setShowStripeAmount(false);
      setSelectedAmount(10);
      setCustomAmount('');
    }
  };

  if (variant === 'subtle') {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogTrigger asChild>
          <button
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={cn(
              "group flex items-center gap-1.5 text-xs text-[#F472B6] hover:text-[#F472B6] transition-all duration-300",
              className
            )}
            title="Support IntoIQ development"
          >
            <Heart 
              className={cn(
                "h-3.5 w-3.5 transition-all duration-300 fill-[#F472B6]/30 text-[#F472B6]",
                isHovered && "fill-[#F472B6] scale-110"
              )} 
            />
            <span className="hidden sm:inline opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              Support
            </span>
          </button>
        </DialogTrigger>
        <DonationDialog 
          onSelect={handleDonationClick} 
          isLoading={isLoading}
          showStripeAmount={showStripeAmount}
          selectedAmount={selectedAmount}
          setSelectedAmount={setSelectedAmount}
          customAmount={customAmount}
          setCustomAmount={setCustomAmount}
          onStripeCheckout={handleStripeCheckout}
          onBack={handleBack}
        />
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className={cn("gap-2", className)}>
          <Heart className="h-4 w-4" />
          Support
        </Button>
      </DialogTrigger>
      <DonationDialog 
        onSelect={handleDonationClick} 
        isLoading={isLoading}
        showStripeAmount={showStripeAmount}
        selectedAmount={selectedAmount}
        setSelectedAmount={setSelectedAmount}
        customAmount={customAmount}
        setCustomAmount={setCustomAmount}
        onStripeCheckout={handleStripeCheckout}
        onBack={handleBack}
      />
    </Dialog>
  );
}

interface DonationDialogProps {
  onSelect: (option: typeof donationOptions[0]) => void;
  isLoading: boolean;
  showStripeAmount: boolean;
  selectedAmount: number | null;
  setSelectedAmount: (amount: number | null) => void;
  customAmount: string;
  setCustomAmount: (amount: string) => void;
  onStripeCheckout: () => void;
  onBack: () => void;
}

function DonationDialog({ 
  onSelect, 
  isLoading, 
  showStripeAmount, 
  selectedAmount, 
  setSelectedAmount, 
  customAmount, 
  setCustomAmount,
  onStripeCheckout,
  onBack 
}: DonationDialogProps) {
  const handleCustomAmountChange = (value: string) => {
    // Only allow valid number input
    const sanitized = value.replace(/[^0-9.]/g, '');
    // Prevent multiple decimals
    const parts = sanitized.split('.');
    const formatted = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : sanitized;
    setCustomAmount(formatted);
    setSelectedAmount(null);
  };

  const handlePresetClick = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  if (showStripeAmount) {
    return (
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <button 
              onClick={onBack}
              className="p-1 hover:bg-muted rounded-md transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Choose Amount
            </DialogTitle>
          </div>
          <DialogDescription>
            Select a preset amount or enter your own
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Preset amounts */}
          <div className="flex gap-2">
            {presetAmounts.map((amount) => (
              <button
                key={amount}
                onClick={() => handlePresetClick(amount)}
                className={cn(
                  "flex-1 py-3 px-4 rounded-xl border-2 font-semibold transition-all duration-200",
                  selectedAmount === amount
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50 hover:bg-muted"
                )}
              >
                ${amount}
              </button>
            ))}
          </div>

          {/* Custom amount */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Custom amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="Enter amount"
                value={customAmount}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
                className={cn(
                  "pl-7",
                  customAmount && "border-primary"
                )}
              />
            </div>
          </div>

          {/* Checkout button */}
          <Button
            onClick={onStripeCheckout}
            disabled={isLoading || (!selectedAmount && !customAmount)}
            className="w-full gap-2"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Heart className="h-4 w-4" />
                Donate ${selectedAmount || customAmount || '0'}
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Secure payment powered by Stripe
        </p>
      </DialogContent>
    );
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-[#F472B6] fill-[#F472B6]/30" />
          Support IntoIQ
        </DialogTitle>
        <DialogDescription>
          Help us keep building free financial education tools. Every contribution helps!
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-3 py-4">
        {donationOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => onSelect(option)}
            disabled={isLoading && option.isStripe}
            className={cn(
              "flex items-center gap-4 p-4 rounded-xl border border-border/50 transition-all duration-300",
              option.bgColor,
              "hover:scale-[1.02] hover:border-border",
              isLoading && option.isStripe && "opacity-50 cursor-not-allowed"
            )}
          >
            <div className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg",
              option.color
            )}>
              <option.icon className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold">{option.name}</p>
              <p className="text-sm text-muted-foreground">{option.description}</p>
            </div>
            <ExternalLink className={cn("h-4 w-4", option.textColor)} />
          </button>
        ))}
      </div>

      <p className="text-xs text-center text-muted-foreground">
        IntoIQ is built with ❤️ for financial education
      </p>
    </DialogContent>
  );
}
