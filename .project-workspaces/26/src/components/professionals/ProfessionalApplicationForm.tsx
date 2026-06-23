import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import ImageUploader from "@/components/admin/ImageUploader";
import { Loader2, CheckCircle } from "lucide-react";

const applicationSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  title: z.string().min(2, "Title is required").max(100),
  specialties: z.array(z.string()).min(1, "Please select at least one specialty"),
  states_licensed: z.array(z.string()).optional(),
  bio: z.string().min(50, "Bio must be at least 50 characters").max(1000),
  avatar_url: z.string().optional(),
  website_url: z.string().url().optional().or(z.literal("")),
  years_experience: z.coerce.number().min(0).max(70).optional(),
  certifications: z.string().max(500).optional(),
  linkedin_url: z.string().url().optional().or(z.literal("")),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

interface ProfessionalApplicationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const specialties = [
  { value: "financial_advisor", label: "Financial Advisor" },
  { value: "tax_professional", label: "Tax Professional" },
  { value: "credit_counselor", label: "Credit Counselor" },
  { value: "debt_specialist", label: "Debt Specialist" },
  { value: "investment_advisor", label: "Investment Advisor" },
  { value: "insurance_agent", label: "Insurance Agent" },
  { value: "real_estate", label: "Real Estate Agent" },
  { value: "mortgage_officer", label: "Mortgage Loan Officer" },
  { value: "estate_planning", label: "Estate Planning" },
];

const usStates = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"
];

export const ProfessionalApplicationForm = ({
  open,
  onOpenChange,
}: ProfessionalApplicationFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      title: "",
      specialties: [],
      states_licensed: [],
      bio: "",
      avatar_url: "",
      website_url: "",
      years_experience: undefined,
      certifications: "",
      linkedin_url: "",
    },
  });

  const handleSubmit = async (data: ApplicationFormData) => {
    setIsSubmitting(true);
    try {
      // Capture user_id when applicant is signed in so they can later view their own application
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("professional_applications")
        .insert({
          user_id: user?.id ?? null,
          full_name: data.full_name,
          email: data.email,
          phone: data.phone || null,
          title: data.title,
          specialty: data.specialties[0] || "", // Primary specialty for backward compat
          specialties: data.specialties,
          states_licensed: data.states_licensed || [],
          bio: data.bio,
          avatar_url: data.avatar_url || null,
          website_url: data.website_url || null,
          years_experience: data.years_experience || null,
          certifications: data.certifications || null,
          linkedin_url: data.linkedin_url || null,
        });

      if (error) throw error;

      setIsSuccess(true);
      toast.success("Application submitted successfully!");
    } catch (error: any) {
      console.error("Error submitting application:", error);
      toast.error(error.message || "Failed to submit application");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSuccess) {
      form.reset();
      setIsSuccess(false);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {isSuccess ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl">Application Submitted!</DialogTitle>
              <DialogDescription className="text-base">
                Thank you for applying to join our network of professionals. We'll review your application and get back to you within 3-5 business days.
              </DialogDescription>
            </DialogHeader>
            <Button onClick={handleClose} className="mt-4">
              Close
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Apply to be a Professional</DialogTitle>
              <DialogDescription>
                Join our network of verified financial experts and help families make better financial decisions.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="John Smith" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="(555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Professional Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="Certified Financial Planner" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="specialties"
                  render={() => (
                    <FormItem>
                      <FormLabel>Specialties * (Select all that apply)</FormLabel>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {specialties.map((specialty) => (
                          <FormField
                            key={specialty.value}
                            control={form.control}
                            name="specialties"
                            render={({ field }) => (
                              <FormItem
                                key={specialty.value}
                                className="flex flex-row items-start space-x-2 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(specialty.value)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, specialty.value])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== specialty.value
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  {specialty.label}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="states_licensed"
                  render={() => (
                    <FormItem>
                      <FormLabel>States Licensed</FormLabel>
                      <FormDescription>Select states where you hold active licenses</FormDescription>
                      <div className="grid grid-cols-6 gap-1.5 mt-2 max-h-32 overflow-y-auto p-2 border rounded-md">
                        {usStates.map((state) => (
                          <FormField
                            key={state}
                            control={form.control}
                            name="states_licensed"
                            render={({ field }) => (
                              <FormItem
                                key={state}
                                className="flex flex-row items-center space-x-1 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(state)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), state])
                                        : field.onChange(
                                            field.value?.filter((value) => value !== state)
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-xs font-normal cursor-pointer">
                                  {state}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Professional Bio *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell us about your experience, expertise, and how you help clients..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="avatar_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profile Photo</FormLabel>
                      <FormControl>
                      <ImageUploader
                          value={field.value || ""}
                          onChange={field.onChange}
                          bucket="avatars"
                          folder="professional-applications"
                          label="Upload your professional headshot"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="years_experience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Years of Experience</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={70}
                            placeholder="10"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="website_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://yoursite.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="certifications"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Certifications & Licenses</FormLabel>
                      <FormControl>
                        <Input placeholder="CFP, CPA, Series 7, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="linkedin_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>LinkedIn Profile</FormLabel>
                      <FormControl>
                        <Input placeholder="https://linkedin.com/in/yourprofile" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="flex-1">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Application"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
