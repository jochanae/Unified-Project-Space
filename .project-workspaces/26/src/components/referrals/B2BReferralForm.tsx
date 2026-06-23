import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Building2, Users, DollarSign, Send } from "lucide-react";

const formSchema = z.object({
  referred_business_name: z.string().min(2, "Business name is required"),
  referred_contact_name: z.string().min(2, "Contact name is required"),
  referred_contact_email: z.string().email("Valid email required"),
  referred_contact_phone: z.string().optional(),
  business_type: z.string().optional(),
  estimated_seats: z.number().min(1, "At least 1 seat required").max(1000),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface B2BReferralFormProps {
  referrerType: 'professional' | 'user';
  professionalId?: string;
  commissionRate: number;
  onSuccess?: () => void;
}

export function B2BReferralForm({ referrerType, professionalId, commissionRate, onSuccess }: B2BReferralFormProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      referred_business_name: "",
      referred_contact_name: "",
      referred_contact_email: "",
      referred_contact_phone: "",
      business_type: "",
      estimated_seats: 10,
      notes: "",
    },
  });

  const estimatedSeats = form.watch("estimated_seats") || 0;
  const monthlyRevenue = 29 + (estimatedSeats * 7);
  const monthlyCommission = monthlyRevenue * (commissionRate / 100);
  const yearlyCommission = monthlyCommission * 12;

  const onSubmit = async (data: FormData) => {
    if (!user) {
      toast.error("You must be logged in to submit a referral");
      return;
    }

    setIsSubmitting(true);
    try {
      const referralData = {
        referred_business_name: data.referred_business_name,
        referred_contact_name: data.referred_contact_name,
        referred_contact_email: data.referred_contact_email,
        referred_contact_phone: data.referred_contact_phone || null,
        business_type: data.business_type || null,
        estimated_seats: data.estimated_seats,
        notes: data.notes || null,
        referrer_type: referrerType as 'professional' | 'user',
        commission_percent: commissionRate,
        status: 'pending' as const,
        payout_status: 'pending' as const,
        referrer_professional_id: referrerType === 'professional' && professionalId ? professionalId : null,
        referrer_user_id: referrerType === 'user' ? user.id : null,
      };

      const { data: insertedReferral, error } = await supabase
        .from('b2b_partner_referrals')
        .insert(referralData)
        .select()
        .single();

      if (error) throw error;

      // Send notification email to admin
      try {
        await supabase.functions.invoke('notify-b2b-referral', {
          body: {
            referralId: insertedReferral.id,
            businessName: data.referred_business_name,
            contactName: data.referred_contact_name,
            contactEmail: data.referred_contact_email,
            estimatedSeats: data.estimated_seats,
            referrerName: user.email,
            referrerType: referrerType,
          },
        });
      } catch (notifyError) {
        console.warn("Failed to send notification:", notifyError);
        // Don't fail the submission if notification fails
      }

      toast.success("Referral submitted successfully!");
      form.reset();
      onSuccess?.();
    } catch (error: any) {
      console.error("Error submitting referral:", error);
      toast.error(error.message || "Failed to submit referral");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Refer a Business Partner
        </CardTitle>
        <CardDescription>
          Earn {commissionRate}% commission monthly for up to 12 months on every business you refer
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Earnings Preview */}
        <div className="mb-6 p-4 rounded-lg bg-primary/10 border border-primary/20">
          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Estimated Earnings Preview
          </h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Partner Pays</p>
              <p className="font-semibold">${monthlyRevenue}/mo</p>
            </div>
            <div>
              <p className="text-muted-foreground">Your Commission</p>
              <p className="font-semibold text-primary">${monthlyCommission.toFixed(2)}/mo</p>
            </div>
            <div>
              <p className="text-muted-foreground">12-Month Total</p>
              <p className="font-semibold text-primary">${yearlyCommission.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="referred_business_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Financial Services" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="referred_contact_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="referred_contact_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@acme.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="referred_contact_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="(555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="business_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Type</FormLabel>
                    <FormControl>
                      <Input placeholder="Financial Advisory, Insurance, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="estimated_seats"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Estimated Number of Employees/Seats *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min={1} 
                      max={1000}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Partner pays $29/month + $7 per employee seat
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any additional context about this referral..."
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? "Submitting..." : "Submit Referral"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
