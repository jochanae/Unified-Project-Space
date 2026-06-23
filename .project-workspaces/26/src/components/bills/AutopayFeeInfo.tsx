import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Building2, Sparkles, Info } from 'lucide-react';
import { FeeQuote } from '@/hooks/useAutopay';
import { cn } from '@/lib/utils';

interface AutopayFeeInfoProps {
  quote: FeeQuote | null;
  loading?: boolean;
  selectedMethodType?: 'stripe_card' | 'plaid_ach';
  compact?: boolean;
}

export function AutopayFeeInfo({ quote, loading, selectedMethodType, compact = false }: AutopayFeeInfoProps) {
  if (loading) {
    return (
      <div className="animate-pulse h-20 bg-muted rounded-lg" />
    );
  }

  if (!quote) {
    return null;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  if (compact) {
    const currentFee = selectedMethodType === 'plaid_ach' ? quote.ach : quote.card;
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Info className="h-4 w-4" />
        <span>
          Fee: {currentFee.fee === 0 ? 'Free' : formatCurrency(currentFee.fee)}
          {selectedMethodType === 'plaid_ach' && quote.isPremium && (
            <Badge variant="secondary" className="ml-2 text-xs">Premium Benefit</Badge>
          )}
        </span>
      </div>
    );
  }

  return (
    <Card className="bg-muted/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Payment Fee Breakdown</span>
          {quote.isPremium && (
            <Badge variant="default" className="text-xs">Premium</Badge>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {/* Card Option */}
          <div className={cn(
            "p-3 rounded-lg border transition-colors",
            selectedMethodType === 'stripe_card' 
              ? "border-primary bg-primary/5" 
              : "border-border bg-background"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Card</span>
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold">{formatCurrency(quote.card.total)}</p>
              <p className="text-xs text-muted-foreground">
                Fee: {formatCurrency(quote.card.fee)}
              </p>
              <p className="text-xs text-muted-foreground">
                {quote.card.feeDescription}
              </p>
            </div>
          </div>

          {/* Bank Account (ACH) Option */}
          <div className={cn(
            "p-3 rounded-lg border transition-colors relative",
            selectedMethodType === 'plaid_ach' 
              ? "border-primary bg-primary/5" 
              : "border-border bg-background"
          )}>
            {quote.ach.premiumBenefit && (
              <Badge variant="secondary" className="absolute -top-2 -right-2 text-xs">
                Free with Premium
              </Badge>
            )}
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Bank</span>
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold">{formatCurrency(quote.ach.total)}</p>
              <p className="text-xs text-muted-foreground">
                Fee: {quote.ach.fee === 0 ? 'Free' : formatCurrency(quote.ach.fee)}
              </p>
              <p className="text-xs text-muted-foreground">
                {quote.ach.feeDescription}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Bill Amount:</span>
            <span className="font-medium">{formatCurrency(quote.billAmount)}</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-sm text-muted-foreground">Processing Fee:</span>
            <span className="font-medium">
              {selectedMethodType === 'plaid_ach' 
                ? (quote.ach.fee === 0 ? 'Free' : formatCurrency(quote.ach.fee))
                : formatCurrency(quote.card.fee)
              }
            </span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-sm font-medium">Total Charged:</span>
            <span className="font-semibold text-primary">
              {formatCurrency(selectedMethodType === 'plaid_ach' ? quote.ach.total : quote.card.total)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AutopayFeeComparisonBanner({ isPremium }: { isPremium: boolean }) {
  if (isPremium) {
    return (
      <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
        <Sparkles className="h-5 w-5 text-primary" />
        <div>
          <p className="text-sm font-medium">Premium Benefit Active</p>
          <p className="text-xs text-muted-foreground">Bank account payments are free!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
      <Info className="h-5 w-5 text-muted-foreground" />
      <div>
        <p className="text-sm font-medium">Save on fees with Premium</p>
        <p className="text-xs text-muted-foreground">
          Upgrade to get free bank account payments (saves up to $5/payment)
        </p>
      </div>
    </div>
  );
}
