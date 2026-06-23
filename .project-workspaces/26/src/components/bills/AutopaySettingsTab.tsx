import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CreditCard, Building2, Plus, Zap, Clock, AlertCircle, CheckCircle2, DollarSign } from 'lucide-react';
import { AutopayMethodsList, AddAutopayMethodModal } from './AutopayMethodsManager';
import { useAutopayMethods, useScheduledAutopays, useAutopayFeeQuote } from '@/hooks/useAutopay';
import { AutopayFeeComparisonBanner } from './AutopayFeeInfo';
import { format } from 'date-fns';

interface Bill {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  is_autopay: boolean;
}

interface AutopaySettingsTabProps {
  bills: Bill[];
  onBillUpdated: () => void;
}

export function AutopaySettingsTab({ bills, onBillUpdated }: AutopaySettingsTabProps) {
  const [showAddMethodModal, setShowAddMethodModal] = useState(false);
  const { methods, loading: methodsLoading, refetch: refetchMethods, defaultMethod } = useAutopayMethods();
  const { scheduled, loading: scheduledLoading } = useScheduledAutopays();
  
  // Get fee quote for displaying fee info (use $100 as sample amount)
  const { quote: feeQuote, loading: feeLoading } = useAutopayFeeQuote(100, defaultMethod?.id);

  const autopayEnabledBills = bills.filter(b => b.is_autopay);
  const upcomingPayments = scheduled.filter(s => s.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Payment Methods Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Methods
          </CardTitle>
          <CardDescription>
            Manage cards and bank accounts for automatic bill payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AutopayMethodsList 
            onAddNew={() => setShowAddMethodModal(true)} 
          />
        </CardContent>
      </Card>

      {/* Fee Information Banner */}
      {feeQuote && (
        <AutopayFeeComparisonBanner isPremium={feeQuote.isPremium} />
      )}

      {/* Fee Breakdown Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Processing Fees
          </CardTitle>
          <CardDescription>
            Fees are applied to cover payment processing costs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Card Payments</span>
              </div>
              <p className="text-2xl font-bold">2.9% + $0.30</p>
              <p className="text-sm text-muted-foreground mt-1">
                All users pay card fees
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-muted/30 relative">
              {!feeQuote?.isPremium && (
                <Badge variant="secondary" className="absolute -top-2 -right-2 text-xs">
                  Free with Premium
                </Badge>
              )}
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Bank Payments (ACH)</span>
              </div>
              <p className="text-2xl font-bold">
                {feeQuote?.isPremium ? (
                  <span className="text-emerald-600">Free</span>
                ) : (
                  '0.8% (max $5)'
                )}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {feeQuote?.isPremium 
                  ? 'Included with your Premium subscription'
                  : 'Premium users get free bank payments'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Autopay Payments */}
      {upcomingPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Upcoming Automatic Payments
            </CardTitle>
            <CardDescription>
              Scheduled payments that will be processed automatically
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingPayments.map((payment) => {
                const bill = bills.find(b => b.id === payment.bill_id);
                return (
                  <div 
                    key={payment.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Zap className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{bill?.name || 'Unknown Bill'}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(payment.scheduled_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${payment.amount.toFixed(2)}</p>
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Autopay-Enabled Bills */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            Bills with Autopay Enabled
          </CardTitle>
          <CardDescription>
            {autopayEnabledBills.length > 0 
              ? `${autopayEnabledBills.length} bill${autopayEnabledBills.length > 1 ? 's' : ''} set to pay automatically`
              : 'Enable autopay on your bills to pay them automatically'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {autopayEnabledBills.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No bills have autopay enabled yet.</p>
              <p className="text-sm">Edit a bill and enable autopay to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {autopayEnabledBills.map((bill) => (
                <div 
                  key={bill.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{bill.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Due: {format(new Date(bill.due_date), 'MMM d')} • ${bill.amount.toFixed(2)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                    <Zap className="h-3 w-3 mr-1" />
                    Autopay On
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-blue-800 dark:text-blue-300">How Autopay Works</p>
              <ul className="space-y-1 text-blue-700 dark:text-blue-400">
                <li>• Add a payment method (card or bank account)</li>
                <li>• Enable autopay on individual bills when creating/editing them</li>
                <li>• Payments are automatically processed on the bill's due date</li>
                <li>• You'll receive notifications before and after each payment</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Payment Method Modal */}
      <AddAutopayMethodModal
        open={showAddMethodModal}
        onOpenChange={setShowAddMethodModal}
        onSuccess={refetchMethods}
      />
    </div>
  );
}
