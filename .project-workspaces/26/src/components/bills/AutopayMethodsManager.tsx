import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Building2, Plus, Trash2, Star, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAutopayMethods, AutopayMethod } from '@/hooks/useAutopay';

// Initialize Stripe - publishable key loaded from env var (with fallback for safety)
const STRIPE_PK = (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined) ?? '';
const stripePromise = STRIPE_PK ? loadStripe(STRIPE_PK) : Promise.resolve(null);

interface AddAutopayMethodModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

function StripeCardForm({ 
  onSuccess, 
  onCancel 
}: { 
  onSuccess: () => void; 
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [setAsDefault, setSetAsDefault] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    try {
      const { error: submitError, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });

      if (submitError) {
        throw new Error(submitError.message);
      }

      if (setupIntent?.payment_method) {
        // Save the payment method
        const { data, error: saveError } = await supabase.functions.invoke('setup-autopay-method', {
          body: {
            action: 'save_payment_method',
            payment_method_id: setupIntent.payment_method,
            display_name: displayName || undefined,
            set_as_default: setAsDefault,
          },
        });

        if (saveError) throw saveError;
        if (data.error) throw new Error(data.error);

        toast.success('Card added successfully');
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add card');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="displayName">Nickname (optional)</Label>
        <Input
          id="displayName"
          placeholder="e.g., My Visa Card"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Card Details</Label>
        <div className="p-3 border rounded-lg bg-background">
          <PaymentElement />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="setDefault"
          checked={setAsDefault}
          onCheckedChange={(checked) => setSetAsDefault(checked as boolean)}
        />
        <Label htmlFor="setDefault" className="text-sm">
          Set as default payment method
        </Label>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-500">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading || !stripe} className="flex-1">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Adding...
            </>
          ) : (
            'Add Card'
          )}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function PlaidACHForm({ 
  onSuccess, 
  onCancel 
}: { 
  onSuccess: () => void; 
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [displayName, setDisplayName] = useState('');
  const [setAsDefault, setSetAsDefault] = useState(true);

  useEffect(() => {
    fetchLinkedAccounts();
  }, []);

  const fetchLinkedAccounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('setup-plaid-ach', {
        body: { action: 'list_linked_accounts' },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setAccounts(data.accounts || []);
    } catch (err) {
      console.error('Error fetching accounts:', err);
      toast.error('Failed to load bank accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAccount) {
      toast.error('Please select a bank account');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('setup-plaid-ach', {
        body: {
          action: 'setup_ach_payment',
          plaid_item_id: selectedAccount.plaid_item_id,
          account_id: selectedAccount.account_id,
          display_name: displayName || undefined,
          set_as_default: setAsDefault,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success('Bank account added for autopay');
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add bank account');
    } finally {
      setLoading(false);
    }
  };

  if (loading && accounts.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-8">
        <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-4">
          No linked bank accounts found. Please link a bank account first using Plaid.
        </p>
        <Button variant="outline" onClick={onCancel}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Select Bank Account</Label>
        <div className="space-y-2">
          {accounts.map((account) => (
            <Card
              key={`${account.plaid_item_id}-${account.account_id}`}
              className={`cursor-pointer transition-all ${
                selectedAccount?.account_id === account.account_id
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'hover:border-primary/50'
              }`}
              onClick={() => setSelectedAccount(account)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <Building2 className="h-8 w-8 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">{account.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {account.institution_name} • ****{account.mask}
                  </p>
                </div>
                {selectedAccount?.account_id === account.account_id && (
                  <Badge variant="secondary">Selected</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="achDisplayName">Nickname (optional)</Label>
        <Input
          id="achDisplayName"
          placeholder="e.g., Main Checking"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="achSetDefault"
          checked={setAsDefault}
          onCheckedChange={(checked) => setSetAsDefault(checked as boolean)}
        />
        <Label htmlFor="achSetDefault" className="text-sm">
          Set as default payment method
        </Label>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={loading || !selectedAccount} className="flex-1">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Setting up...
            </>
          ) : (
            'Add Bank Account'
          )}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function AddAutopayMethodModal({ open, onOpenChange, onSuccess }: AddAutopayMethodModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'card' | 'bank'>('card');

  useEffect(() => {
    if (open && tab === 'card') {
      createSetupIntent();
    }
  }, [open, tab]);

  const createSetupIntent = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('setup-autopay-method', {
        body: { action: 'create_setup_intent' },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setClientSecret(data.client_secret);
    } catch (err) {
      toast.error('Failed to initialize card setup');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    onOpenChange(false);
    setClientSecret(null);
    onSuccess?.();
  };

  const handleCancel = () => {
    onOpenChange(false);
    setClientSecret(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Payment Method
          </DialogTitle>
          <DialogDescription>
            Add a card or bank account for automatic bill payments
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'card' | 'bank')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="card" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Card
            </TabsTrigger>
            <TabsTrigger value="bank" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Bank Account
            </TabsTrigger>
          </TabsList>

          <TabsContent value="card" className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : clientSecret ? (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <StripeCardForm onSuccess={handleSuccess} onCancel={handleCancel} />
              </Elements>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Failed to load card form. Please try again.
              </div>
            )}
          </TabsContent>

          <TabsContent value="bank" className="mt-4">
            <PlaidACHForm onSuccess={handleSuccess} onCancel={handleCancel} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

interface ManageAutopayMethodsProps {
  onAddNew: () => void;
}

export function AutopayMethodsList({ onAddNew }: ManageAutopayMethodsProps) {
  const { methods, loading, deleteMethod, setDefault } = useAutopayMethods();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (methods.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">
            No payment methods added yet. Add one to enable autopay for your bills.
          </p>
          <Button onClick={onAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add Payment Method
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {methods.map((method) => (
        <PaymentMethodCard
          key={method.id}
          method={method}
          onDelete={() => deleteMethod(method.id)}
          onSetDefault={() => setDefault(method.id)}
        />
      ))}
      <Button variant="outline" className="w-full" onClick={onAddNew}>
        <Plus className="h-4 w-4 mr-2" />
        Add Payment Method
      </Button>
    </div>
  );
}

function PaymentMethodCard({
  method,
  onDelete,
  onSetDefault,
}: {
  method: AutopayMethod;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  const isCard = method.method_type === 'stripe_card';

  return (
    <Card className={method.is_default ? 'border-primary' : ''}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {isCard ? (
            <CreditCard className="h-8 w-8 text-muted-foreground" />
          ) : (
            <Building2 className="h-8 w-8 text-muted-foreground" />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium">{method.display_name}</p>
              {method.is_default && (
                <Badge variant="secondary" className="text-xs">
                  <Star className="h-3 w-3 mr-1" />
                  Default
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {isCard ? (
                <>
                  {method.brand?.toUpperCase()} ****{method.last_four}
                </>
              ) : (
                <>
                  {method.bank_name} ****{method.last_four}
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {!method.is_default && (
              <Button variant="ghost" size="sm" onClick={onSetDefault}>
                <Star className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500 hover:text-red-600">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
