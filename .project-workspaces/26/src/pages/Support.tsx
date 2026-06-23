import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Heart, Users, Target, BookOpen, Star, Briefcase, ArrowRight, ExternalLink, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import coinsbloomLogo from "@/assets/coinsbloom-logo.png";

const Support = () => {
  const { user } = useAuth();

  // Fetch founder profile from database
  const { data: founderProfile } = useQuery({
    queryKey: ['founder-profile'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('founder_profile')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching founder profile:', error);
        return null;
      }
      return data;
    },
  });

  // Fetch donation links from database
  const { data: dbDonationLinks } = useQuery({
    queryKey: ['donation-links'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('donation_links')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) {
        console.error('Error fetching donation links:', error);
        return [];
      }
      return data || [];
    },
  });

  // Fallback values if database is empty
  const founderName = founderProfile?.name || "Jochanae Yawn";
  const founderTitle = founderProfile?.title || "Founder & CEO";
  const founderAvatar = founderProfile?.avatar_url;
  const founderInitials = founderName.split(' ').map((n: string) => n[0]).join('').toUpperCase();

  // Use database links if available, otherwise use fallback
  const donationOptions = dbDonationLinks && dbDonationLinks.length > 0
    ? dbDonationLinks.map((link, index) => ({
        id: link.id,
        title: link.name,
        subtitle: link.platform,
        buttonText: "Donate Now",
        buttonVariant: index === 0 ? "default" as const : "outline" as const,
        link: link.url,
        gradient: index === 0,
      }))
    : [
        {
          id: "stripe",
          title: "Support with Any Amount",
          subtitle: "stripe",
          buttonText: "Donate Now",
          buttonVariant: "default" as const,
          link: "https://buy.stripe.com/dRm00iarRdon7bA43A9oc03",
          gradient: true,
        },
        {
          id: "cashapp",
          title: "Donate via Cash App",
          subtitle: "cash_app",
          buttonText: "Donate Now",
          buttonVariant: "outline" as const,
          link: "#",
          gradient: false,
        },
        {
          id: "paypal",
          title: "Donate via PayPal",
          subtitle: "paypal",
          buttonText: "Donate Now",
          buttonVariant: "outline" as const,
          link: "#",
          gradient: false,
        },
      ];

  const stats = [
    { icon: Users, value: "1,000+", label: "Families Helped" },
    { icon: Target, value: "20+", label: "Years Experience" },
    { icon: BookOpen, value: "100%", label: "Free Core Features" },
  ];

  const testimonials = [
    {
      quote: "CoinsBloom helped me finally understand where my money was going. It's like having a financial advisor in my pocket!",
      name: "Sarah M.",
      role: "Working Mom",
      initials: "SM",
    },
    {
      quote: "Teaching my kids about money has never been easier. KidsBloom is a game-changer for our family.",
      name: "Marcus T.",
      role: "Father of 3",
      initials: "MT",
    },
  ];

  return (
    <div className="min-h-screen bg-background relative">
      <Helmet>
        <title>Support CoinsBloom | Help Build Financial Literacy</title>
        <meta name="description" content="Support CoinsBloom's mission to make financial literacy accessible to everyone. Learn about our founder and how you can help." />
      </Helmet>
      
      
      {/* Header - Smart based on auth status */}
      {user ? (
        <DashboardHeader />
      ) : (
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50 rounded-b-3xl">
          <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img src={coinsbloomLogo} alt="CoinsBloom" className="h-8 w-8" />
              <span className="font-semibold text-base bg-gradient-to-r from-[hsl(280,70%,55%)] via-[hsl(320,75%,55%)] to-[hsl(350,80%,55%)] bg-clip-text text-transparent">CoinsBloom</span>
            </Link>
            <Link to="/auth">
              <Button variant="outline" size="sm">Sign In</Button>
            </Link>
          </div>
        </header>
      )}

      <main className="container max-w-4xl mx-auto px-4 py-8 space-y-12">
        {/* Hero Section */}
        <section className="text-center space-y-6 relative">
          {/* Decorative circles */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -z-10" />
          <div className="absolute top-20 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl -z-10" />
          
          <Badge className="bg-gradient-to-r from-pink-500 to-rose-500 text-white border-0 px-4 py-2">
            <Heart className="h-4 w-4 mr-2 fill-current" />
            Support Independent Development
          </Badge>
          
          <h1 className="text-4xl md:text-5xl font-bold">
            Help Keep CoinsBloom
            <br />
            <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Free & Growing
            </span>
          </h1>
          
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Your support helps us continue building tools that empower families to take control of their financial future.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4">
            {stats.map((stat) => (
              <Card key={stat.label} className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-4 text-center">
                  <stat.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Founder Section */}
        <section className="relative">
          <div className="bg-gradient-to-br from-primary via-purple-500 to-pink-500 rounded-3xl p-8 text-center text-white">
            {/* Founder Photo */}
            <Avatar className="w-28 h-28 mx-auto mb-4 shadow-lg">
              <AvatarImage src={founderAvatar} alt={founderName} className="object-cover w-full h-full" />
              <AvatarFallback className="bg-white/10 text-3xl font-bold text-white">
                {founderInitials}
              </AvatarFallback>
            </Avatar>
            
            <h2 className="text-2xl font-bold">{founderName}</h2>
            <p className="text-white/80">{founderTitle}</p>
            
            <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 inline-flex items-center gap-2">
              <Heart className="h-4 w-4" />
              <span className="text-sm">
                License insurance, Real estate, Loan officer, Military veteran, Flight attendant
              </span>
            </div>
          </div>
        </section>

        {/* Meet the Founder */}
        <section className="space-y-4">
          <h2 className="text-3xl font-bold">Meet the Founder</h2>
          <div className="w-16 h-1 bg-gradient-to-r from-primary to-pink-500 rounded-full" />
          
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              I've spent over 20 years working in finance, real estate, and mortgages. As a licensed insurance agent, real estate agent, and loan officer, I've helped countless families navigate major financial decisions—from buying homes to protecting their assets.
            </p>
            <p>
              As a Delta Air Lines flight attendant, I meet people from all walks of life every single day. Combined with my experience as a military veteran and mother, I kept noticing the same gap: people lack access to simple, practical financial literacy.
            </p>
            <p>
              CoinsBloom was built to fill that gap—bringing together everything I've learned across these professions to help you take control of your finances.
            </p>
          </div>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5" />
              <p className="text-sm">
                Every feature, every tool, is designed from the heart to help you succeed.{" "}
                <span className="text-primary font-semibold">CoinsBloom's core tools will always be free.</span>
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Ways to Support */}
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold">Ways to Support</h2>
            <p className="text-muted-foreground">
              Your contribution helps fund new features, server costs, and keeps CoinsBloom accessible to everyone. Every amount makes a difference.
            </p>
          </div>

          <div className="space-y-4">
            {donationOptions.map((option) => (
              <Card 
                key={option.id} 
                className={option.gradient ? "bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5 border-primary/20" : ""}
              >
                <CardContent className="p-6 text-center space-y-4">
                  <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center ${option.gradient ? "bg-gradient-to-br from-primary to-pink-500" : "bg-muted"}`}>
                    <Heart className={`h-8 w-8 ${option.gradient ? "text-white" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{option.title}</h3>
                    <p className="text-sm text-muted-foreground">{option.subtitle}</p>
                  </div>
                  <Button 
                    variant={option.buttonVariant}
                    className={option.gradient ? "w-full bg-gradient-to-r from-primary to-pink-500 hover:from-primary/90 hover:to-pink-500/90 text-white border-0" : "w-full"}
                    asChild
                  >
                    <a href={option.link} target="_blank" rel="noopener noreferrer">
                      {option.buttonText}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground">
            You'll be securely redirected to complete your donation. Thank you for your generosity!
          </p>
        </section>

        {/* Testimonials */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-center">What Our Community Says</h2>
          
          <div className="space-y-4">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-border/50">
                <CardContent className="p-6 space-y-4">
                  <p className="text-4xl text-primary/30 font-serif">"</p>
                  <p className="text-muted-foreground -mt-4">{testimonial.quote}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-pink-500/30 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">{testimonial.initials}</span>
                    </div>
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Thank You CTA */}
        <section className="bg-gradient-to-br from-primary via-purple-500 to-pink-500 rounded-3xl p-8 text-center text-white space-y-4">
          <div className="flex justify-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-6 w-6 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
          
          <h2 className="text-3xl font-bold italic">
            Thank You for Being Part of This Journey
          </h2>
          
          <p className="text-white/80 max-w-lg mx-auto">
            Whether you donate, share CoinsBloom with friends, or simply use the app— you're helping build a more financially literate world.
          </p>
          
          <div className="space-y-3 pt-4">
            <Button 
              size="lg" 
              className="w-full max-w-sm bg-white/20 hover:bg-white/30 text-white border-0"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <Heart className="h-5 w-5 mr-2" />
              Support Now
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full max-w-sm bg-transparent border-white/30 text-white hover:bg-white/10"
              asChild
            >
              <Link to="/professionals">
                Meet Our Professionals
                <ExternalLink className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Professional CTA */}
        <section className="relative overflow-hidden">
          <Card className="bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-950/30 dark:to-blue-950/30 border-blue-200/50 dark:border-blue-800/50">
            <CardContent className="p-6 space-y-4">
              {/* Decorative circles */}
              <div className="absolute -bottom-10 right-10 w-32 h-32 bg-primary/10 rounded-full" />
              <div className="absolute -bottom-5 left-1/2 w-20 h-20 bg-purple-500/10 rounded-full" />
              
              <div className="flex items-start gap-4 relative">
                <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                  <Briefcase className="h-7 w-7 text-white" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">Are You a Financial Professional?</h3>
                  <p className="text-muted-foreground">
                    Join our network of financial experts and help our community make better financial decisions. Apply to become a featured professional on CoinsBloom and connect with users seeking expert guidance.
                  </p>
                </div>
              </div>
              
              <Button 
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0"
                asChild
              >
                <Link to="/professionals?apply=true">
                  <Check className="h-4 w-4 mr-2" />
                  Apply as Professional
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Footer Note */}
        <p className="text-center text-sm text-muted-foreground pb-8">
          CoinsBloom is independently developed. Your support directly funds development, hosting, and new features for our community.
        </p>
      </main>
    </div>
  );
};

export default Support;
