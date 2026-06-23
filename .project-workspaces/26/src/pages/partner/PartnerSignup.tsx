import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Building2, Users, CreditCard, Check, ArrowRight, Minus, Plus, Sparkles, Shield, BarChart3, Palette, Globe, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const BASE_PRICE = 29;
const SEAT_PRICE = 7;

const formSchema = z.object({
  businessName: z.string().min(2, "Business name must be at least 2 characters"),
  slug: z.string()
    .min(3, "URL slug must be at least 3 characters")
    .max(30, "URL slug must be less than 30 characters")
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens allowed"),
  contactEmail: z.string().email("Please enter a valid email"),
});

type FormData = z.infer<typeof formSchema>;

export default function PartnerSignup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [seats, setSeats] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      businessName: "",
      slug: "",
      contactEmail: user?.email || "",
    },
  });

  const monthlyTotal = BASE_PRICE + (seats * SEAT_PRICE);

  const checkSlugAvailability = async (slug: string) => {
    if (slug.length < 3) {
      setSlugAvailable(null);
      return;
    }
    
    setCheckingSlug(true);
    try {
      const { data } = await supabase
        .from("partners_public")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      
      setSlugAvailable(!data);
    } catch (error) {
      console.error("Error checking slug:", error);
    } finally {
      setCheckingSlug(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .substring(0, 30);
  };

  const onSubmit = async (data: FormData) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to create a partner account",
        variant: "destructive",
      });
      navigate(`/signin?redirect=${encodeURIComponent('/partner/signup')}`);
      return;
    }

    if (!slugAvailable) {
      toast({
        title: "URL not available",
        description: "Please choose a different URL for your partner page",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: response, error } = await supabase.functions.invoke("create-partner-checkout", {
        body: {
          partnerName: data.businessName,
          slug: data.slug,
          seats: seats,
        },
      });

      if (error) throw error;
      if (response?.url) {
        window.open(response.url, "_blank");
      }
    } catch (error: any) {
      console.error("Error creating checkout:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to start checkout process",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = [
    {
      icon: Palette,
      title: "Custom Branding",
      description: "Your logo, colors (solid or gradient), and domain"
    },
    {
      icon: Users,
      title: "Team Member Profiles",
      description: "Each advisor gets a shareable professional landing page"
    },
    {
      icon: Globe,
      title: "White-Label Experience",
      description: "Your clients see your brand, not ours"
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Track engagement and measure impact"
    },
    {
      icon: Shield,
      title: "Priority Support",
      description: "Dedicated assistance when you need it"
    },
    {
      icon: Zap,
      title: "Custom Events & Content",
      description: "Create exclusive resources for your users"
    },
  ];

  return (
    <>
      <Helmet>
        <title>Partner With CoinsBloom | White-Label Financial Wellness</title>
        <meta name="description" content="Offer your clients a premium financial wellness platform under your own brand. Custom branding, team profiles, and full control." />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
          
          <div className="relative container mx-auto px-4 pt-16 pb-12">
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
                <Sparkles className="h-4 w-4" />
                For Financial Professionals & Businesses
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                <span className="text-gradient-brand">White-Label</span> Financial Wellness
                <br />
                <span className="text-foreground">Under Your Brand</span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                CoinsBloom keeps your brand, your guidance, and your access front and center—integrated into the tools your clients rely on daily—creating meaningful visibility that strengthens relationships.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Your branding everywhere</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Individual advisor pages</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Full self-service control</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-12">
          <div className="grid lg:grid-cols-5 gap-8 max-w-7xl mx-auto">
            
            {/* Features Section - Left Side */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Everything You Need</h2>
                <p className="text-muted-foreground">Full control over your partner portal from day one.</p>
              </div>

              <div className="grid gap-4">
                {features.map((feature, index) => (
                  <div 
                    key={index} 
                    className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all"
                  >
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Form Card - Right Side */}
            <div className="lg:col-span-3">
              <Card className="border-2 border-primary/20 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5 border-b">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Get Started Today</CardTitle>
                      <CardDescription>
                        Set up your branded portal in minutes
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="businessName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Business Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Acme Financial Services"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  const slug = generateSlug(e.target.value);
                                  form.setValue("slug", slug);
                                  checkSlugAvailability(slug);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="slug"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Your Partner URL</FormLabel>
                            <FormControl>
                              <div className="flex items-center">
                                <span className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-l-md border border-r-0">
                                  coinsbloom.com/p/
                                </span>
                                <Input
                                  className="rounded-l-none"
                                  placeholder="your-company"
                                  {...field}
                                  onChange={(e) => {
                                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                                    field.onChange(value);
                                    checkSlugAvailability(value);
                                  }}
                                />
                              </div>
                            </FormControl>
                            <FormDescription className="flex items-center gap-2">
                              {checkingSlug ? (
                                <span className="text-muted-foreground">Checking availability...</span>
                              ) : slugAvailable === true ? (
                                <span className="text-green-600 flex items-center gap-1">
                                  <Check className="h-4 w-4" /> Available
                                </span>
                              ) : slugAvailable === false ? (
                                <span className="text-red-600">This URL is already taken</span>
                              ) : null}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="contactEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="admin@company.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Seat Selection */}
                      <div className="space-y-3 p-4 rounded-xl bg-muted/30 border">
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-base">Team Size</FormLabel>
                          <span className="text-sm text-muted-foreground">${SEAT_PRICE}/seat/month</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setSeats(Math.max(1, seats - 1))}
                            disabled={seats <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <div className="flex items-center gap-2 px-4 py-2 border rounded-lg bg-background flex-1 justify-center">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              min={1}
                              value={seats}
                              onChange={(e) => {
                                const value = parseInt(e.target.value, 10);
                                if (!isNaN(value) && value >= 1) {
                                  setSeats(value);
                                } else if (e.target.value === "") {
                                  setSeats(1);
                                }
                              }}
                              className="w-16 text-center text-xl font-semibold border-0 p-0 h-auto focus-visible:ring-0"
                            />
                            <span className="text-muted-foreground">seats</span>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setSeats(seats + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                          Add or remove seats anytime from your dashboard
                        </p>
                      </div>

                      {/* Price Summary */}
                      <div className="rounded-xl border-2 border-primary/20 overflow-hidden">
                        <div className="bg-primary/5 p-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Platform base</span>
                            <span>${BASE_PRICE}/mo</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{seats} team seats</span>
                            <span>${seats * SEAT_PRICE}/mo</span>
                          </div>
                        </div>
                        <div className="p-4 flex justify-between items-center bg-gradient-to-r from-primary/10 to-secondary/10">
                          <span className="font-semibold">Monthly Total</span>
                          <span className="text-2xl font-bold text-primary">${monthlyTotal}/mo</span>
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full h-12 text-lg font-semibold" 
                        size="lg"
                        disabled={isSubmitting || !slugAvailable}
                      >
                        {isSubmitting ? (
                          "Processing..."
                        ) : (
                          <>
                            Start Your Partner Account
                            <ArrowRight className="ml-2 h-5 w-5" />
                          </>
                        )}
                      </Button>

                      {!user && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 text-center space-y-3">
                          <p className="text-sm text-amber-800 dark:text-amber-200">
                            You'll sign in when you're ready to complete setup
                          </p>
                          <Button type="button" variant="outline" className="w-full" asChild>
                            <Link to={`/signin?redirect=${encodeURIComponent('/partner/signup')}`}>
                              Already have an account? Sign in
                            </Link>
                          </Button>
                        </div>
                      )}

                      <p className="text-xs text-center text-muted-foreground">
                        Cancel anytime. No long-term contracts.
                      </p>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="border-t bg-muted/30">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">Questions about becoming a partner?</p>
              <Button variant="link" className="text-primary" asChild>
                <Link to="/refer">Learn about our referral program instead →</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
