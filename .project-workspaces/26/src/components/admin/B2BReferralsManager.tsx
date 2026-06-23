import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Building2, DollarSign, Users, Clock, CheckCircle, XCircle, Phone, Mail, Plus, Edit2, Rocket, Banknote } from "lucide-react";
import { format } from "date-fns";

type B2BReferralStatus = "pending" | "contacted" | "negotiating" | "converted" | "rejected";
type PayoutStatus = "pending" | "processing" | "paid";

type ReferrerType = "professional" | "user";

interface B2BReferral {
  id: string;
  referrer_professional_id: string | null;
  referrer_user_id: string | null;
  referrer_type: ReferrerType;
  referred_business_name: string;
  referred_contact_name: string | null;
  referred_contact_email: string | null;
  referred_contact_phone: string | null;
  business_type: string | null;
  estimated_seats: number | null;
  status: B2BReferralStatus;
  deal_value: number;
  commission_percent: number;
  commission_amount: number;
  base_monthly_fee: number;
  per_seat_fee: number;
  monthly_revenue: number;
  commission_months_total: number;
  commission_months_paid: number;
  total_commission_paid: number;
  payout_status: PayoutStatus;
  payout_date: string | null;
  payout_method: string | null;
  payout_reference: string | null;
  notes: string | null;
  admin_notes: string | null;
  contacted_at: string | null;
  converted_at: string | null;
  created_at: string;
  professionals?: {
    name: string;
    title: string | null;
  } | null;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

interface ProfileData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

const statusColors: Record<B2BReferralStatus, string> = {
  pending: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
  contacted: "bg-blue-500/20 text-blue-700 border-blue-500/30",
  negotiating: "bg-purple-500/20 text-purple-700 border-purple-500/30",
  converted: "bg-green-500/20 text-green-700 border-green-500/30",
  rejected: "bg-red-500/20 text-red-700 border-red-500/30",
};

const payoutStatusColors: Record<PayoutStatus, string> = {
  pending: "bg-gray-500/20 text-gray-700 border-gray-500/30",
  processing: "bg-orange-500/20 text-orange-700 border-orange-500/30",
  paid: "bg-green-500/20 text-green-700 border-green-500/30",
};

export function B2BReferralsManager() {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingReferral, setEditingReferral] = useState<B2BReferral | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [creatingPartner, setCreatingPartner] = useState<string | null>(null);
  const [markingPaid, setMarkingPaid] = useState<B2BReferral | null>(null);
  const [payoutReference, setPayoutReference] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("check");

  const { data: referrals, isLoading } = useQuery({
    queryKey: ["b2b-referrals", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("b2b_partner_referrals")
        .select(`
          *,
          professionals (name, title)
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as B2BReferralStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch user profiles for user referrals
      const userReferrals = data?.filter(r => r.referrer_user_id) || [];
      const userIds = userReferrals.map(r => r.referrer_user_id).filter(Boolean);
      
      let profilesMap: Record<string, ProfileData> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .in("id", userIds as string[]);
        
        if (profiles) {
          profilesMap = profiles.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {} as Record<string, ProfileData>);
        }
      }
      
      // Merge profiles into referrals
      return data?.map(r => ({
        ...r,
        profiles: r.referrer_user_id ? profilesMap[r.referrer_user_id] || null : null
      })) as B2BReferral[];
    },
  });

  const { data: professionals } = useQuery({
    queryKey: ["professionals-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professionals")
        .select("id, name, title")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: users } = useQuery({
    queryKey: ["users-list-for-referrals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .order("first_name");
      if (error) throw error;
      return data;
    },
  });

  const updateReferral = useMutation({
    mutationFn: async (referral: Partial<B2BReferral> & { id: string }) => {
      const { id, professionals: _, ...updateData } = referral;
      
      // Auto-calculate commission if deal_value and commission_percent are set
      if (updateData.deal_value !== undefined && updateData.commission_percent !== undefined) {
        updateData.commission_amount = (updateData.deal_value * updateData.commission_percent) / 100;
      }
      
      // Set converted_at when status changes to converted
      if (updateData.status === "converted" && !referral.converted_at) {
        updateData.converted_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("b2b_partner_referrals")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["b2b-referrals"] });
      toast.success("Referral updated");
      setEditingReferral(null);
    },
    onError: (error) => {
      toast.error("Failed to update referral");
      console.error(error);
    },
  });

  const createReferral = useMutation({
    mutationFn: async (referral: Partial<B2BReferral>) => {
      const { error } = await supabase
        .from("b2b_partner_referrals")
        .insert([referral as any]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["b2b-referrals"] });
      toast.success("Referral created");
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to create referral");
      console.error(error);
    },
  });

  const createPartnerFromReferral = async (referralId: string) => {
    setCreatingPartner(referralId);
    try {
      const { data, error } = await supabase.functions.invoke('create-partner-from-referral', {
        body: { referralId },
      });
      
      if (error) throw error;
      
      toast.success(data.message || "Partner created successfully!");
      queryClient.invalidateQueries({ queryKey: ["b2b-referrals"] });
    } catch (error: any) {
      console.error("Error creating partner:", error);
      toast.error(error.message || "Failed to create partner");
    } finally {
      setCreatingPartner(null);
    }
  };

  const markAsPaid = useMutation({
    mutationFn: async ({ referralId, method, reference }: { referralId: string; method: string; reference: string }) => {
      const { error } = await supabase
        .from("b2b_partner_referrals")
        .update({
          payout_status: "paid",
          payout_method: method,
          payout_reference: reference,
          payout_date: new Date().toISOString().split('T')[0],
        })
        .eq("id", referralId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["b2b-referrals"] });
      toast.success("Marked as paid!");
      setMarkingPaid(null);
      setPayoutReference("");
      setPayoutMethod("check");
    },
    onError: (error) => {
      toast.error("Failed to update payout status");
      console.error(error);
    },
  });

  // Stats
  const stats = {
    total: referrals?.length || 0,
    pending: referrals?.filter(r => r.status === "pending").length || 0,
    converted: referrals?.filter(r => r.status === "converted").length || 0,
    totalDealValue: referrals?.filter(r => r.status === "converted").reduce((sum, r) => sum + (r.deal_value || 0), 0) || 0,
    pendingPayouts: referrals?.filter(r => r.status === "converted" && r.payout_status === "pending").length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Referrals</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-muted-foreground">Pending</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Converted</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.converted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Deal Value</span>
            </div>
            <p className="text-2xl font-bold mt-1">${stats.totalDealValue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-muted-foreground">Pending Payouts</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.pendingPayouts}</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Label>Filter by Status:</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="negotiating">Negotiating</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Referral
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add B2B Referral</DialogTitle>
            </DialogHeader>
            <ReferralForm
              professionals={professionals || []}
              users={users || []}
              onSubmit={(data) => createReferral.mutate(data)}
              isLoading={createReferral.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Referrals Table */}
      <Card>
        <CardHeader>
          <CardTitle>B2B Partner Referrals</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : referrals?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No referrals found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead>Referred By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Deal Value</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Payout</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals?.map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{referral.referred_business_name}</p>
                          <p className="text-xs text-muted-foreground">{referral.business_type}</p>
                          {referral.referred_contact_email && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {referral.referred_contact_email}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {referral.referrer_type === 'professional' && referral.professionals ? (
                          <div>
                            <p className="font-medium">{referral.professionals.name}</p>
                            <p className="text-xs text-muted-foreground">{referral.professionals.title}</p>
                            <Badge variant="outline" className="mt-1 text-xs">Professional</Badge>
                          </div>
                        ) : referral.referrer_type === 'user' && referral.profiles ? (
                          <div>
                            <p className="font-medium">
                              {referral.profiles.first_name} {referral.profiles.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">{referral.profiles.email}</p>
                            <Badge variant="secondary" className="mt-1 text-xs">User</Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Direct / Admin</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[referral.status]} variant="outline">
                          {referral.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {referral.deal_value > 0 ? `$${referral.deal_value.toLocaleString()}` : "—"}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{referral.commission_percent}%</p>
                          <p className="text-xs text-muted-foreground">
                            ${((referral.monthly_revenue || 0) * (referral.commission_percent || 0) / 100).toFixed(2)}/mo
                          </p>
                          {referral.status === 'converted' && (
                            <p className="text-xs text-green-600">
                              {referral.commission_months_paid || 0}/{referral.commission_months_total || 12} months
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge className={payoutStatusColors[referral.payout_status]} variant="outline">
                            {referral.payout_status}
                          </Badge>
                          {referral.payout_status === "pending" && referral.status === "converted" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => {
                                setMarkingPaid(referral);
                                setPayoutReference("");
                                setPayoutMethod(referral.payout_method || "check");
                              }}
                            >
                              <Banknote className="h-3 w-3 mr-1" />
                              Pay
                            </Button>
                          )}
                          {referral.payout_status === "paid" && referral.payout_reference && (
                            <span className="text-xs text-muted-foreground">
                              {referral.payout_method}: {referral.payout_reference}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{format(new Date(referral.created_at), "MMM d, yyyy")}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Dialog open={editingReferral?.id === referral.id} onOpenChange={(open) => !open && setEditingReferral(null)}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => setEditingReferral(referral)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Edit Referral</DialogTitle>
                              </DialogHeader>
                              {editingReferral && (
                                <ReferralForm
                                  professionals={professionals || []}
                                  users={users || []}
                                  initialData={editingReferral}
                                  onSubmit={(data) => updateReferral.mutate({ id: editingReferral.id, ...data })}
                                  isLoading={updateReferral.isPending}
                                  isEdit
                                />
                              )}
                            </DialogContent>
                          </Dialog>
                          
                          {/* Create Partner button - show for approved/negotiating referrals */}
                          {(referral.status === 'negotiating' || referral.status === 'contacted') && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => createPartnerFromReferral(referral.id)}
                              disabled={creatingPartner === referral.id}
                              className="text-primary border-primary/30 hover:bg-primary/10"
                            >
                              <Rocket className="h-4 w-4 mr-1" />
                              {creatingPartner === referral.id ? "Creating..." : "Create Partner"}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mark as Paid Dialog */}
      <Dialog open={!!markingPaid} onOpenChange={(open) => !open && setMarkingPaid(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark Payout as Paid</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Referral: <strong>{markingPaid?.referred_business_name}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                Commission: <strong>${((markingPaid?.monthly_revenue || 0) * (markingPaid?.commission_percent || 0) / 100).toFixed(2)}/mo</strong>
              </p>
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={payoutMethod} onValueChange={setPayoutMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="venmo">Venmo</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="zelle">Zelle</SelectItem>
                  <SelectItem value="ach">ACH Transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reference # (Check #, Transaction ID, etc.)</Label>
              <Input
                value={payoutReference}
                onChange={(e) => setPayoutReference(e.target.value)}
                placeholder="e.g., Check #1234 or Venmo @username"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setMarkingPaid(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (markingPaid) {
                    markAsPaid.mutate({
                      referralId: markingPaid.id,
                      method: payoutMethod,
                      reference: payoutReference,
                    });
                  }
                }}
                disabled={markAsPaid.isPending}
              >
                {markAsPaid.isPending ? "Saving..." : "Mark as Paid"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ReferralFormProps {
  professionals: { id: string; name: string; title: string | null }[];
  users: { id: string; first_name: string | null; last_name: string | null; email: string | null }[];
  initialData?: Partial<B2BReferral>;
  onSubmit: (data: Partial<B2BReferral>) => void;
  isLoading: boolean;
  isEdit?: boolean;
}

function ReferralForm({ professionals, users, initialData, onSubmit, isLoading, isEdit }: ReferralFormProps) {
  const [formData, setFormData] = useState<Partial<B2BReferral>>({
    referrer_professional_id: initialData?.referrer_professional_id || null,
    referrer_user_id: initialData?.referrer_user_id || null,
    referrer_type: initialData?.referrer_type || "professional",
    referred_business_name: initialData?.referred_business_name || "",
    referred_contact_name: initialData?.referred_contact_name || "",
    referred_contact_email: initialData?.referred_contact_email || "",
    referred_contact_phone: initialData?.referred_contact_phone || "",
    business_type: initialData?.business_type || "",
    estimated_seats: initialData?.estimated_seats || 0,
    status: initialData?.status || "pending",
    deal_value: initialData?.deal_value || 0,
    commission_percent: initialData?.commission_percent || 10,
    payout_status: initialData?.payout_status || "pending",
    payout_method: initialData?.payout_method || "",
    payout_reference: initialData?.payout_reference || "",
    notes: initialData?.notes || "",
    admin_notes: initialData?.admin_notes || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Set referrer_type based on which field is filled
    const dataToSubmit = {
      ...formData,
      referrer_type: (formData.referrer_user_id ? "user" : "professional") as ReferrerType,
    };
    onSubmit(dataToSubmit);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Referred By (Professional)</Label>
          <Select
            value={formData.referrer_professional_id || "none"}
            onValueChange={(v) => setFormData({ 
              ...formData, 
              referrer_professional_id: v === "none" ? null : v,
              referrer_user_id: v !== "none" ? null : formData.referrer_user_id // Clear user if professional selected
            })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select professional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {professionals.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} {p.title && `- ${p.title}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Referred By (User)</Label>
          <Select
            value={formData.referrer_user_id || "none"}
            onValueChange={(v) => setFormData({ 
              ...formData, 
              referrer_user_id: v === "none" ? null : v,
              referrer_professional_id: v !== "none" ? null : formData.referrer_professional_id // Clear professional if user selected
            })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select user" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.first_name || u.last_name 
                    ? `${u.first_name || ''} ${u.last_name || ''}`.trim()
                    : u.email || 'Unknown User'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            Select Professional OR User (not both)
          </p>
        </div>

        <div className="col-span-2">
          <Label>Business Name *</Label>
          <Input
            value={formData.referred_business_name}
            onChange={(e) => setFormData({ ...formData, referred_business_name: e.target.value })}
            required
          />
        </div>

        <div>
          <Label>Contact Name</Label>
          <Input
            value={formData.referred_contact_name || ""}
            onChange={(e) => setFormData({ ...formData, referred_contact_name: e.target.value })}
          />
        </div>

        <div>
          <Label>Contact Email</Label>
          <Input
            type="email"
            value={formData.referred_contact_email || ""}
            onChange={(e) => setFormData({ ...formData, referred_contact_email: e.target.value })}
          />
        </div>

        <div>
          <Label>Contact Phone</Label>
          <Input
            value={formData.referred_contact_phone || ""}
            onChange={(e) => setFormData({ ...formData, referred_contact_phone: e.target.value })}
          />
        </div>

        <div>
          <Label>Business Type</Label>
          <Select
            value={formData.business_type || ""}
            onValueChange={(v) => setFormData({ ...formData, business_type: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="credit_union">Credit Union</SelectItem>
              <SelectItem value="employer">Employer</SelectItem>
              <SelectItem value="financial_institution">Financial Institution</SelectItem>
              <SelectItem value="nonprofit">Nonprofit</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Estimated Seats</Label>
          <Input
            type="number"
            value={formData.estimated_seats || ""}
            onChange={(e) => setFormData({ ...formData, estimated_seats: parseInt(e.target.value) || 0 })}
          />
        </div>

        <div>
          <Label>Status</Label>
          <Select
            value={formData.status}
            onValueChange={(v) => setFormData({ ...formData, status: v as B2BReferralStatus })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="negotiating">Negotiating</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isEdit && (
          <>
            <div>
              <Label>Deal Value ($)</Label>
              <Input
                type="number"
                value={formData.deal_value || ""}
                onChange={(e) => setFormData({ ...formData, deal_value: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label>Commission %</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.commission_percent || ""}
                onChange={(e) => setFormData({ ...formData, commission_percent: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label>Payout Status</Label>
              <Select
                value={formData.payout_status}
                onValueChange={(v) => setFormData({ ...formData, payout_status: v as PayoutStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Payout Method</Label>
              <Select
                value={formData.payout_method || ""}
                onValueChange={(v) => setFormData({ ...formData, payout_method: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="stripe">Stripe</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label>Payout Reference (Transaction ID / Check #)</Label>
              <Input
                value={formData.payout_reference || ""}
                onChange={(e) => setFormData({ ...formData, payout_reference: e.target.value })}
              />
            </div>
          </>
        )}

        <div className="col-span-2">
          <Label>Notes</Label>
          <Textarea
            value={formData.notes || ""}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
          />
        </div>

        {isEdit && (
          <div className="col-span-2">
            <Label>Admin Notes (Internal)</Label>
            <Textarea
              value={formData.admin_notes || ""}
              onChange={(e) => setFormData({ ...formData, admin_notes: e.target.value })}
              rows={2}
            />
          </div>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Saving..." : isEdit ? "Update Referral" : "Create Referral"}
      </Button>
    </form>
  );
}
