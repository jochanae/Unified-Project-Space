import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PiggyBank, Plus, Minus, ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KidCard } from './KidCard';
import { KidPinGate } from './KidPinGate';
import type { KidProfile, AllowanceTransaction } from '@/hooks/useKidProfile';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const DEPOSIT_SUGGESTIONS = [
  { label: '🎂 Birthday Money', description: 'Birthday Money' },
  { label: '⭐ Allowance', description: 'Weekly Allowance' },
  { label: '🏆 Chore Reward', description: 'Chore Reward' },
  { label: '🎁 Gift', description: 'Gift Money' },
  { label: '💼 Side Hustle', description: 'Earned It Myself' },
];

const WITHDRAW_SUGGESTIONS = [
  { label: '🎮 Game', description: 'Bought a Game' },
  { label: '🧸 Toy', description: 'Bought a Toy' },
  { label: '🍦 Treats', description: 'Snacks & Treats' },
  { label: '👕 Clothes', description: 'Clothes Shopping' },
  { label: '🎟️ Fun Outing', description: 'Fun Activity' },
];

const QUICK_AMOUNTS = [1, 5, 10, 20];
const PAGE_SIZE = 8;

interface KidAllowanceTrackerProps {
  profile: KidProfile;
  transactions: AllowanceTransaction[];
  onAddAllowance: (amount: number, description: string, type: 'deposit' | 'withdraw') => Promise<boolean>;
  onVerifyPin: (pin: string) => Promise<boolean>;
}

export function KidAllowanceTracker({ profile, transactions, onAddAllowance, onVerifyPin }: KidAllowanceTrackerProps) {
  const [isBalanceRevealed, setIsBalanceRevealed] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [txType, setTxType] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(transactions.length / PAGE_SIZE);
  const pagedTransactions = transactions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;

    setIsSubmitting(true);
    const success = await onAddAllowance(numAmount, description || (txType === 'deposit' ? 'Allowance deposit' : 'Withdrawal'), txType);
    if (success) {
      setAmount('');
      setDescription('');
      setShowAddDialog(false);
      setPage(0);
    }
    setIsSubmitting(false);
  };

  const openDialog = (type: 'deposit' | 'withdraw') => {
    setTxType(type);
    setAmount('');
    setDescription('');
    setShowAddDialog(true);
  };

  const selectSuggestion = (desc: string) => {
    setDescription(prev => prev === desc ? '' : desc);
  };

  const selectQuickAmount = (val: number) => {
    setAmount(String(val));
  };

  const suggestions = txType === 'deposit' ? DEPOSIT_SUGGESTIONS : WITHDRAW_SUGGESTIONS;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-lg font-bold flex items-center justify-center gap-2">
          <PiggyBank className="h-5 w-5 text-primary" />
          My Savings
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">Track the money you earn, save & spend</p>
      </div>

      {/* Card + PIN Section */}
      <div className="flex flex-col items-center gap-4">
        <KidCard
          profile={profile}
          showBalance={isBalanceRevealed}
          balance={profile.allowance_balance}
        />
        <KidPinGate
          onVerify={onVerifyPin}
          isRevealed={isBalanceRevealed}
          onReveal={() => setIsBalanceRevealed(true)}
          onHide={() => setIsBalanceRevealed(false)}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-center">
        <Button
          onClick={() => openDialog('deposit')}
          className="rounded-full bg-gradient-to-r from-gain to-chart-3 gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Money
        </Button>
        <Button
          variant="outline"
          onClick={() => openDialog('withdraw')}
          className="rounded-full gap-2"
        >
          <Minus className="h-4 w-4" />
          Spend
        </Button>
      </div>

      {/* Transaction Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {txType === 'deposit' ? (
                <><ArrowDownRight className="h-5 w-5 text-gain" /> Add to Savings</>
              ) : (
                <><ArrowUpRight className="h-5 w-5 text-loss" /> Log Spending</>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Quick Amount Buttons */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Quick Pick</label>
              <div className="flex gap-2 flex-wrap">
                {QUICK_AMOUNTS.map(val => (
                  <Button
                    key={val}
                    type="button"
                    size="sm"
                    variant={amount === String(val) ? 'default' : 'outline'}
                    className="rounded-full text-sm px-4"
                    onClick={() => selectQuickAmount(val)}
                  >
                    ${val}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Amount */}
            <div>
              <label className="text-sm font-medium mb-1 block">Or type an amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-7 text-lg h-12"
                  autoFocus
                />
              </div>
            </div>

            {/* Quick Reason Suggestions */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">What's it for?</label>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map(s => (
                  <Button
                    key={s.description}
                    type="button"
                    size="sm"
                    variant={description === s.description ? 'default' : 'outline'}
                    className="rounded-full text-xs h-7 px-2.5"
                    onClick={() => selectSuggestion(s.description)}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
              <Input
                value={suggestions.some(s => s.description === description) ? '' : description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Or type your own reason..."
                maxLength={100}
                className="mt-2 text-sm"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!amount || parseFloat(amount) <= 0 || isSubmitting}
              className={cn(
                'w-full rounded-full',
                txType === 'deposit' ? 'bg-gradient-to-r from-gain to-chart-3' : ''
              )}
            >
              {isSubmitting ? 'Saving...' : txType === 'deposit' ? '💰 Add to Savings' : '💸 Log Spending'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-primary" />
            Savings Activity
          </CardTitle>
          <p className="text-xs text-muted-foreground">Every dollar in and out</p>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-sm">
              No activity yet! Add some savings to get started 🐷
            </p>
          ) : (
            <>
              <div className="space-y-2">
                {pagedTransactions.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      {tx.type === 'deposit' ? (
                        <ArrowDownRight className="h-4 w-4 text-gain" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-loss" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{tx.description || (tx.type === 'deposit' ? 'Deposit' : 'Spent')}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn(
                      'font-mono',
                      tx.type === 'deposit' ? 'text-gain border-gain/30' : 'text-loss border-loss/30'
                    )}>
                      {tx.type === 'deposit' ? '+' : '-'}${tx.amount.toFixed(2)}
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" /> Newer
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {page + 1} / {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                    className="gap-1"
                  >
                    Older <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
