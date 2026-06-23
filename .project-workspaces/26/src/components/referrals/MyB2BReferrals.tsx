import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, DollarSign, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface MyB2BReferralsProps {
  referrerType: 'professional' | 'user';
  professionalId?: string;
}

export function MyB2BReferrals({ referrerType, professionalId }: MyB2BReferralsProps) {
  const { user } = useAuth();

  const { data: referrals, isLoading } = useQuery({
    queryKey: ['my-b2b-referrals', referrerType, professionalId, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('b2b_partner_referrals')
        .select('*')
        .order('created_at', { ascending: false });

      if (referrerType === 'professional' && professionalId) {
        query = query.eq('referrer_professional_id', professionalId);
      } else if (user) {
        query = query.eq('referrer_user_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'contacted':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600"><AlertCircle className="h-3 w-3 mr-1" />Contacted</Badge>;
      case 'converted':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600"><CheckCircle className="h-3 w-3 mr-1" />Converted</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPayoutBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500">Processing</Badge>;
      case 'paid':
        return <Badge className="bg-green-500">Paid</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calculate stats
  const stats = referrals ? {
    total: referrals.length,
    pending: referrals.filter(r => r.status === 'pending').length,
    converted: referrals.filter(r => r.status === 'converted').length,
    totalEarnings: referrals
      .filter(r => r.status === 'converted')
      .reduce((sum, r) => sum + (r.total_commission_paid || 0), 0),
    potentialEarnings: referrals
      .filter(r => r.status !== 'rejected')
      .reduce((sum, r) => {
        const monthlyRevenue = (r.base_monthly_fee || 29) + ((r.estimated_seats || 0) * (r.per_seat_fee || 7));
        const monthlyCommission = monthlyRevenue * ((r.commission_percent || 10) / 100);
        return sum + (monthlyCommission * 12);
      }, 0),
  } : { total: 0, pending: 0, converted: 0, totalEarnings: 0, potentialEarnings: 0 };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Referrals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.converted}</div>
            <p className="text-sm text-muted-foreground">Converted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-primary">${stats.totalEarnings.toFixed(2)}</div>
            <p className="text-sm text-muted-foreground">Total Earned</p>
          </CardContent>
        </Card>
      </div>

      {/* Potential Earnings */}
      {stats.potentialEarnings > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Potential 12-Month Earnings</p>
                <p className="text-2xl font-bold text-primary">${stats.potentialEarnings.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Referrals List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Your Referrals
          </CardTitle>
          <CardDescription>Track the status of your business referrals</CardDescription>
        </CardHeader>
        <CardContent>
          {!referrals || referrals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No referrals yet</p>
              <p className="text-sm">Submit your first business referral to start earning!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {referrals.map((referral) => {
                const monthlyRevenue = (referral.base_monthly_fee || 29) + ((referral.estimated_seats || 0) * (referral.per_seat_fee || 7));
                const monthlyCommission = monthlyRevenue * ((referral.commission_percent || 10) / 100);
                
                return (
                  <div
                    key={referral.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-medium">{referral.referred_business_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {referral.referred_contact_name} • {referral.referred_contact_email}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Submitted {format(new Date(referral.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex gap-2 mb-2">
                          {getStatusBadge(referral.status)}
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">{referral.estimated_seats} seats</span>
                          <span className="mx-2">•</span>
                          <span className="font-medium text-primary">${monthlyCommission.toFixed(2)}/mo</span>
                        </div>
                        {referral.status === 'converted' && (
                          <div className="mt-1">
                            {getPayoutBadge(referral.payout_status)}
                            <span className="text-xs text-muted-foreground ml-2">
                              {referral.commission_months_paid || 0}/{referral.commission_months_total || 12} months paid
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
