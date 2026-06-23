import { useState, useEffect } from "react";
import { Mail, Check, X, AlertCircle, Loader2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

interface PendingBill {
  id: string;
  detected_payee: string;
  detected_amount: number | null;
  detected_due_date: string | null;
  detected_category: string | null;
  confidence_score: number;
  subject: string | null;
  from_address: string | null;
  received_at: string | null;
  status: string;
}

export const GmailBillImport = () => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingBills, setPendingBills] = useState<PendingBill[]>([]);
  const [gmailAddress, setGmailAddress] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      checkConnection();
      fetchPendingBills();
    }
  }, [user]);

  const checkConnection = async () => {
    const { data } = await supabase
      .from('gmail_connections')
      .select('gmail_address, is_active')
      .eq('user_id', user!.id)
      .single();

    setIsConnected(!!data?.is_active);
    setGmailAddress(data?.gmail_address || null);
    setIsLoading(false);
  };

  const fetchPendingBills = async () => {
    const { data } = await supabase
      .from('pending_email_bills')
      .select('*')
      .eq('user_id', user!.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    setPendingBills(data || []);
  };

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('gmail-auth', {
        body: { action: 'get_auth_url' }
      });

      if (error) throw error;
      
      // Redirect to Google OAuth
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Error connecting Gmail:', error);
      toast.error('Failed to connect Gmail');
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await supabase
        .from('gmail_connections')
        .delete()
        .eq('user_id', user!.id);

      setIsConnected(false);
      setGmailAddress(null);
      toast.success('Gmail disconnected');
    } catch (error) {
      toast.error('Failed to disconnect');
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('gmail-sync', {
        body: { action: 'sync_bills' }
      });

      if (error) throw error;

      toast.success(`Found ${data.newBillsCount || 0} potential bills`);
      fetchPendingBills();
    } catch (error) {
      console.error('Error syncing:', error);
      toast.error('Failed to sync emails');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleApprove = async (bill: PendingBill) => {
    try {
      const { error } = await supabase.functions.invoke('gmail-sync', {
        body: { 
          action: 'approve_bill', 
          pendingBillId: bill.id 
        }
      });

      if (error) throw error;

      toast.success(`${bill.detected_payee} added to your bills`);
      fetchPendingBills();
    } catch (error) {
      toast.error('Failed to add bill');
    }
  };

  const handleReject = async (billId: string) => {
    try {
      await supabase
        .from('pending_email_bills')
        .update({ status: 'rejected', rejected_at: new Date().toISOString() })
        .eq('id', billId);

      setPendingBills(prev => prev.filter(b => b.id !== billId));
      toast.success('Bill dismissed');
    } catch (error) {
      toast.error('Failed to dismiss');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connection Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5 text-red-500" />
            Gmail Bill Detection
            <Badge variant="secondary" className="text-xs font-normal">Beta</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isConnected ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                    <Check className="h-3 w-3 mr-1" /> Connected
                  </Badge>
                  {gmailAddress && (
                    <span className="text-sm text-muted-foreground">{gmailAddress}</span>
                  )}
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={handleDisconnect}>
                  <Unlink className="h-4 w-4 mr-1" /> Disconnect
                </Button>
              </div>
              <Button 
                type="button"
                onClick={handleSync} 
                disabled={isSyncing}
                className="w-full"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Scanning emails...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Scan for Bills
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                We only read bill-related emails and never store email content
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Connect your Gmail to automatically detect bills from your emails. 
                You'll review and approve each bill before it's added.
              </p>
              <Button type="button" onClick={handleConnect} className="w-full bg-red-500 hover:bg-red-600">
                <Mail className="h-4 w-4 mr-2" />
                Connect Gmail
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Bills */}
      {pendingBills.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Bills to Review ({pendingBills.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingBills.map(bill => (
              <div 
                key={bill.id}
                className="p-3 rounded-lg border bg-muted/30 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold">{bill.detected_payee}</h4>
                    <p className="text-xs text-muted-foreground">
                      From: {bill.from_address || 'Unknown'}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {Math.round((bill.confidence_score || 0) * 100)}% match
                  </Badge>
                </div>
                
                <div className="flex flex-wrap gap-2 text-sm">
                  {bill.detected_amount && (
                    <span className="font-medium">${bill.detected_amount.toFixed(2)}</span>
                  )}
                  {bill.detected_due_date && (
                    <span className="text-muted-foreground">
                      Due: {format(new Date(bill.detected_due_date), 'MMM d, yyyy')}
                    </span>
                  )}
                  {bill.detected_category && (
                    <Badge variant="outline">{bill.detected_category}</Badge>
                  )}
                </div>

                {bill.subject && (
                  <p className="text-xs text-muted-foreground truncate">
                    "{bill.subject}"
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <Button 
                    type="button"
                    size="sm" 
                    onClick={() => handleApprove(bill)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Check className="h-4 w-4 mr-1" /> Add Bill
                  </Button>
                  <Button 
                    type="button"
                    size="sm" 
                    variant="outline"
                    onClick={() => handleReject(bill.id)}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-1" /> Not a Bill
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
