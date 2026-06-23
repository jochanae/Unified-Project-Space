import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { ScrollReveal } from "@/hooks/useScrollAnimation";
import { useInstallPrompt } from "@/components/pwa/InstallPrompt";
import intoiqLogo from "@/assets/intoiq-logo.png";
import { ShareMenu } from "@/components/social/ShareMenu";
import { DonationButton } from "@/components/social/DonationButton";
import { InteractiveDemoChat } from "@/components/landing/InteractiveDemoChat";
import { FounderStorySection } from "@/components/landing/FounderStorySection";
import {
  BookOpen,
  MessageSquare,
  Calculator,
  LineChart,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Target,
  Zap,
  Play,
  Download,
  Menu,
  X,
  Quote,
  ChevronLeft,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";

// Testimonial avatar imports
import avatarMarcus from "@/assets/testimonials/marcus.jpg";
import avatarLinda from "@/assets/testimonials/linda.jpg";
import avatarJordan from "@/assets/testimonials/jordan.jpg";
import avatarPriya from "@/assets/testimonials/priya.jpg";
import avatarDerek from "@/assets/testimonials/derek.jpg";
import avatarAisha from "@/assets/testimonials/aisha.jpg";
import avatarEmma from "@/assets/testimonials/emma.jpg";
import avatarTanya from "@/assets/testimonials/tanya.jpg";
import avatarCarlos from "@/assets/testimonials/carlos.jpg";

const testimonials = [
  {
    quote: "I was always intimidated by investing. Quinn broke everything down in a way I could actually understand. Now I'm confidently managing my own Roth IRA and even started paper trading options.",
    name: "Marcus T.",
    role: "First-time investor, 28",
    avatar: avatarMarcus,
  },
  {
    quote: "At 62, I thought it was too late to learn about trading. Quinn helped me understand Social Security optimization and even guided me through setting up living benefits. I finally feel prepared.",
    name: "Linda R.",
    role: "Retired teacher, 62",
    avatar: avatarLinda,
  },
  {
    quote: "As a freelancer with irregular income, budgeting was chaos. Quinn taught me about SEP-IRAs, quarterly taxes, and building a proper emergency fund. Game changer for my financial confidence.",
    name: "Jordan K.",
    role: "Freelance designer, 34",
    avatar: avatarJordan,
  },
  {
    quote: "The paper trading feature let me practice strategies risk-free. After 3 months of learning with Quinn, I made my first real options trade and actually understood what I was doing.",
    name: "Priya S.",
    role: "Software engineer, 31",
    avatar: avatarPriya,
  },
  {
    quote: "I've tried so many finance apps but they all assumed I knew the basics. Quinn started from scratch with me—no judgment, just clear explanations. Finally feel like I belong in these conversations.",
    name: "Derek M.",
    role: "Warehouse manager, 42",
    avatar: avatarDerek,
  },
  {
    quote: "Teaching my teenager about money was hard until we found Youth Mode. Now my daughter tracks her allowance savings and even asks about compound interest. It's incredible.",
    name: "Aisha B.",
    role: "Parent & nurse, 38",
    avatar: avatarAisha,
  },
  {
    quote: "Youth Mode is so fun! I earned 50 stars last week and learned what saving actually means. Now I'm tracking my birthday money and watching it grow. My friends think it's really cool!",
    name: "Emma L.",
    role: "Youth Mode explorer, 12",
    avatar: avatarEmma,
  },
  {
    quote: "I finally see where every dollar goes. The budget tracker changed how I think about investing—I found an extra $400 a month I didn't know I had. That's going straight into my portfolio now.",
    name: "Tanya W.",
    role: "Marketing manager, 35",
    avatar: avatarTanya,
  },
  {
    quote: "Having my budget, bills, savings goals, and investments all in one app is a game-changer. No more switching between five different apps. Worth every penny of Pro.",
    name: "Carlos D.",
    role: "Small business owner, 39",
    avatar: avatarCarlos,
  },
];

const brokers = [
  { name: "Fidelity" },
  { name: "Charles Schwab" },
  { name: "E*TRADE" },
  { name: "Interactive Brokers" },
  { name: "Robinhood" },
  { name: "Webull" },
];

const features = [
  {
    icon: MessageSquare,
    title: "Smart Money Mentor",
    description: "Get personalized guidance from Quinn. Ask about trading, retirement, insurance, budgeting, or any financial topic.",
    color: "from-primary to-primary/60",
  },
  {
    icon: Target,
    title: "Living Money Plan",
    description: "Create multiple plans for different goals—your Overall Plan, Trading Plan, Learning Plan, and more. Turn Quinn's insights into action.",
    color: "from-chart-3 to-chart-3/60",
  },
  {
    icon: Sparkles,
    title: "Financial Planning",
    description: "Retirement accounts, insurance strategies, budgeting, debt payoff, and wealth building—all guided by Quinn.",
    color: "from-gold to-gold/60",
  },
  {
    icon: Calculator,
    title: "Strategy Calculator",
    description: "Analyze 11+ options strategies with instant profit/loss calculations and breakeven analysis.",
    color: "from-chart-4 to-chart-4/60",
  },
  {
    icon: BookOpen,
    title: "Trade Journal",
    description: "Log and track all your trades. Review your history and learn from every decision.",
    color: "from-gain to-gain/60",
  },
  {
    icon: LineChart,
    title: "Practice Trading",
    description: "Learn to trade with virtual money in Youth Mode. No real money, no risk.",
    color: "from-loss to-loss/60",
  },
  {
    icon: Play,
    title: "Youth Mode",
    description: "Fun, gamified financial education for young learners. Age-appropriate lessons and interactive quizzes.",
    color: "from-violet-500 to-violet-500/60",
  },
];

// Demo conversations moved to InteractiveDemoChat component

// Testimonials Carousel Component
const TESTIMONIAL_INTERVAL = 5000; // 5 seconds

function TestimonialsCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const goToNext = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    setTimeout(() => setIsAnimating(false), 500);
  }, [isAnimating]);

  const goToPrev = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    setTimeout(() => setIsAnimating(false), 500);
  }, [isAnimating]);

  const goToIndex = useCallback((index: number) => {
    if (isAnimating || index === currentIndex) return;
    setIsAnimating(true);
    setCurrentIndex(index);
    setTimeout(() => setIsAnimating(false), 500);
  }, [isAnimating, currentIndex]);

  // Auto-rotate
  useEffect(() => {
    const interval = setInterval(goToNext, TESTIMONIAL_INTERVAL);
    return () => clearInterval(interval);
  }, [goToNext]);

  const currentTestimonial = testimonials[currentIndex];

  return (
    <section className="py-16 sm:py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-muted/30" />
      <div className="px-4 sm:px-6 lg:px-8 relative">
        <ScrollReveal className="text-center mb-10 sm:mb-12">
          <Badge variant="secondary" className="mb-3 sm:mb-4 bg-chart-3/10 border-chart-3/20">
            <Quote className="h-3 w-3 mr-1 text-chart-3" />
            <span className="text-chart-3">Real Impact</span>
          </Badge>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-3 sm:mb-4">
            What users are <span className="gradient-text">saying</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-lg px-4">
            From first-time investors to retirees—Quinn meets you where you are.
          </p>
        </ScrollReveal>

        {/* Carousel Container */}
        <div className="max-w-3xl mx-auto relative">
          {/* Navigation Arrows */}
          <button
            onClick={goToPrev}
            className="absolute left-0 sm:-left-12 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg flex items-center justify-center hover:bg-background hover:border-primary/30 transition-all"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-0 sm:-right-12 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg flex items-center justify-center hover:bg-background hover:border-primary/30 transition-all"
            aria-label="Next testimonial"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Testimonial Card */}
          <div className="relative min-h-[280px] sm:min-h-[240px] flex items-center justify-center px-12 sm:px-0">
            <Card
              key={currentIndex}
              className="w-full border-border/50 bg-card/50 backdrop-blur-sm animate-fade-in"
            >
              <CardContent className="p-6 sm:p-8 text-center">
                <Quote className="h-10 w-10 text-primary/20 mx-auto mb-4" />
                <p className="text-base sm:text-lg text-foreground/90 leading-relaxed mb-6 max-w-2xl mx-auto">
                  "{currentTestimonial.quote}"
                </p>
                <div className="flex items-center justify-center gap-3">
                  <img 
                    src={currentTestimonial.avatar} 
                    alt={currentTestimonial.name}
                    className="h-12 w-12 rounded-full object-cover border-2 border-border/50"
                  />
                  <div className="text-left">
                    <p className="font-semibold">{currentTestimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{currentTestimonial.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dot Indicators */}
          <div className="flex justify-center items-center gap-2 mt-6">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => goToIndex(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  currentIndex === index
                    ? "w-6 bg-primary"
                    : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const pricingPlans = [
  {
    name: "Learner",
    price: "$0",
    description: "Get started for free",
    features: [
      "10 AI conversations/month",
      "My Money Plan (goal tracking)",
      "Strategy calculator",
      "Trade journal",
      "Paper Trading (Youth Mode)",
      "Youth Mode",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$39",
    period: "/month",
    description: "Unlock the full experience",
    features: [
      "Unlimited AI conversations",
      "Everything in Learner",
      "My Finances (budget & savings tracker)",
      "Advanced analytics",
      "Multi-broker CSV import",
      "Export reports (PDF & CSV)",
      "AI Trade Analysis",
    ],
    cta: "Go Pro",
    highlighted: true,
  },
];

export default function Landing() {
  const { canInstall, promptInstall } = useInstallPrompt();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background animated-gradient">
      {/* Navigation - Mobile First */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl rounded-b-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] border-b border-border/30">
        <div className="flex h-14 sm:h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center group">
            <img 
              src={intoiqLogo} 
              alt="IntoIQ" 
              className="h-12 sm:h-14 w-auto rounded-lg transition-transform duration-300 group-hover:scale-105"
            />
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Features
            </a>
            <a href="#demo" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Demo
            </a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Pricing
            </a>
            <a href="#our-story" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Our Story
            </a>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <ThemeToggle />
            
            {/* Auth buttons - always visible */}
            <Link to="/login">
              <Button variant="ghost" size="sm" className="hover:bg-primary/10 hover:text-primary px-2 sm:px-3 text-xs sm:text-sm">
                Log in
              </Button>
            </Link>
            <Link to="/signup" className="hidden xs:block sm:block">
              <Button size="sm" className="gap-1 glow-button px-2 sm:px-3 text-xs sm:text-sm">
                <span className="hidden sm:inline">Get Started</span>
                <span className="sm:hidden">Sign up</span>
                <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </Link>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden p-1.5"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/30 bg-card/95 backdrop-blur-xl px-4 py-4 space-y-3">
            <a 
              href="#features" 
              className="block py-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </a>
            <a 
              href="#demo" 
              className="block py-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Demo
            </a>
            <a 
              href="#pricing" 
              className="block py-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </a>
            <a 
              href="#our-story" 
              className="block py-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Our Story
            </a>
            <div className="flex flex-col gap-2 pt-2 border-t border-border/30">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full">
                  Log in
                </Button>
              </Link>
              <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full gap-1 glow-button">
                  Get Started <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section - Mobile optimized */}
      <section className="relative pt-24 sm:pt-32 pb-16 sm:pb-24 overflow-hidden">
        {/* Animated background elements - scaled for mobile */}
        <div className="absolute inset-0 overflow-hidden dark:opacity-100 opacity-40">
          <div className="absolute top-1/4 left-0 sm:left-1/4 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-primary/20 rounded-full blur-[80px] sm:blur-[100px] animate-float" />
          <div className="absolute top-1/3 right-0 sm:right-1/4 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] bg-gain/15 rounded-full blur-[60px] sm:blur-[80px] animate-float" style={{ animationDelay: "-2s" }} />
          <div className="absolute bottom-1/4 left-1/3 w-[200px] sm:w-[300px] h-[200px] sm:h-[300px] bg-chart-4/10 rounded-full blur-[50px] sm:blur-[60px] animate-float" style={{ animationDelay: "-4s" }} />
        </div>
        
        <div className="px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="animate-fade-in-down">
              <Badge variant="secondary" className="mb-4 sm:mb-6 gap-1 px-3 sm:px-4 py-1 sm:py-1.5 bg-primary/10 border-primary/20 hover:bg-primary/20 transition-colors text-xs sm:text-sm">
                <Sparkles className="h-3 w-3 text-primary" />
                <span className="text-primary">Your Smart Money Mentor</span>
              </Badge>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-4 sm:mb-6 animate-fade-in-up leading-tight" style={{ animationDelay: "100ms" }}>
              IntoIQ is your
              <br />
              <span className="gradient-text">smart money mentor.</span>
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-4 sm:mb-6 max-w-2xl mx-auto animate-fade-in-up px-2" style={{ animationDelay: "200ms" }}>
              Meet <span className="text-primary font-semibold">Quinn</span>—your always-on money mentor. From budgeting and retirement to trading and insurance, Quinn helps you build financial confidence at every stage of life.
            </p>

            {/* Micro-bridge tagline */}
            <p className="text-sm sm:text-base text-muted-foreground/80 italic mb-6 sm:mb-8 max-w-xl mx-auto animate-fade-in-up px-2" style={{ animationDelay: "250ms" }}>
              Think it through with Quinn. Turn insights into a <span className="not-italic font-semibold text-primary">Living Money Plan</span>.
            </p>

            <div className="flex flex-wrap justify-center items-center gap-3 mb-8 sm:mb-10 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
              <Badge variant="outline" className="px-3 py-1 text-xs sm:text-sm border-primary/30 bg-primary/5 text-primary">
                Trading
              </Badge>
              <Badge variant="outline" className="px-3 py-1 text-xs sm:text-sm border-gain/30 bg-gain/5 text-gain">
                Investing
              </Badge>
              <Badge variant="outline" className="px-3 py-1 text-xs sm:text-sm border-chart-3/30 bg-chart-3/5 text-chart-3">
                Retirement
              </Badge>
              <Badge variant="outline" className="px-3 py-1 text-xs sm:text-sm border-gold/30 bg-gold/5 text-gold">
                Insurance
              </Badge>
              <Badge variant="outline" className="px-3 py-1 text-xs sm:text-sm border-chart-4/30 bg-chart-4/5 text-chart-4">
                Budgeting
              </Badge>
              <ShareMenu 
                variant="outline" 
                size="sm" 
                className="h-7 text-xs border-muted-foreground/30 bg-muted/5"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-10 sm:mb-14 animate-fade-in-up px-4" style={{ animationDelay: "350ms" }}>
              <Link to="/signup" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto gap-2 h-12 sm:h-14 px-6 sm:px-8 text-base glow-button animate-pulse-glow">
                  Start Free <ChevronRight className="h-5 w-5" />
                </Button>
              </Link>
              <a href="#demo" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2 h-12 sm:h-14 px-6 sm:px-8 text-base border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300">
                  <Play className="h-5 w-5" />
                  See Demo
                </Button>
              </a>
              {canInstall && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={promptInstall}
                  className="w-full sm:w-auto gap-2 h-12 sm:h-14 px-6 sm:px-8 text-base border-primary/30 bg-primary/5 hover:border-primary hover:bg-primary/10 transition-all duration-300"
                >
                  <Download className="h-5 w-5" />
                  Install App
                </Button>
              )}
            </div>

            {/* Broker compatibility - mobile optimized */}
            <div className="flex flex-col items-center gap-3 sm:gap-4 animate-fade-in px-4" style={{ animationDelay: "450ms" }}>
              <p className="text-xs sm:text-sm text-muted-foreground">Import trades from any broker</p>
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                {brokers.map((broker, index) => (
                  <span 
                    key={broker.name} 
                    className="text-xs sm:text-sm font-medium text-foreground/80 bg-muted/40 border border-border/50 rounded-full px-3 py-1.5 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all duration-300 cursor-default"
                    style={{ animationDelay: `${500 + index * 50}ms` }}
                  >
                    {broker.name}
                  </span>
                ))}
                <span className="text-xs sm:text-sm font-medium text-primary bg-primary/10 border border-primary/30 rounded-full px-3 py-1.5 cursor-default">
                  + more
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Mobile grid */}
      <section id="features" className="py-16 sm:py-24 relative">
        <div className="absolute inset-0 bg-muted/30" />
        <div className="px-4 sm:px-6 lg:px-8 relative">
          <ScrollReveal className="text-center mb-10 sm:mb-16">
            <Badge variant="secondary" className="mb-3 sm:mb-4 bg-primary/10 border-primary/20">
              <Zap className="h-3 w-3 mr-1 text-primary" />
              <span className="text-primary">Features</span>
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-3 sm:mb-4">
              Everything you need to invest <span className="gradient-text">smarter</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-lg px-4">
              From learning the basics to analyzing complex strategies, 
              IntoIQ has the tools to support your financial journey.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <ScrollReveal key={feature.title} delay={index * 100}>
                <Card className="group hover-elevate h-full border-border bg-card backdrop-blur-sm overflow-hidden">
                  <CardContent className="p-4 sm:p-6 relative">
                    {/* Hover glow effect */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                      <div className={`absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br ${feature.color} rounded-full blur-3xl opacity-20`} />
                    </div>
                    
                    <div className={`relative mb-3 sm:mb-4 inline-flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} transition-transform duration-300 group-hover:scale-110`}>
                      <feature.icon className="h-6 w-6 sm:h-7 sm:w-7 text-white group-hover-spin" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2 group-hover:text-primary transition-colors">{feature.title}</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Conversation Section - Mobile optimized */}
      <section id="demo" className="py-16 sm:py-24 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[800px] h-[400px] sm:h-[800px] bg-primary/5 rounded-full blur-[80px] sm:blur-[100px]" />
        
        <div className="px-4 sm:px-6 lg:px-8 relative">
          <ScrollReveal className="text-center mb-10 sm:mb-16">
            <Badge variant="secondary" className="mb-3 sm:mb-4 bg-primary/10 border-primary/20">
              <MessageSquare className="h-3 w-3 mr-1 text-primary" />
              <span className="text-primary">Live Demo</span>
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-3 sm:mb-4">
              See your smart mentor <span className="gradient-text">in action</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-lg px-4">
              Click a topic to watch Quinn guide you through real conversations.
            </p>
          </ScrollReveal>

          <InteractiveDemoChat />
        </div>
      </section>

      {/* Testimonials Carousel Section */}
      <TestimonialsCarousel />

      {/* Founder Story Section */}
      <FounderStorySection />

      {/* Pricing Section - Mobile cards stack */}
      <section id="pricing" className="py-16 sm:py-24 relative">
        <div className="absolute inset-0 bg-muted/30" />
        <div className="px-4 sm:px-6 lg:px-8 relative">
          <ScrollReveal className="text-center mb-10 sm:mb-16">
            <Badge variant="secondary" className="mb-3 sm:mb-4 bg-primary/10 border-primary/20">
              <Target className="h-3 w-3 mr-1 text-primary" />
              <span className="text-primary">Pricing</span>
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-3 sm:mb-4">
              Choose your <span className="gradient-text">path</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-lg px-4">
              Start free and upgrade as you grow. No hidden fees.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <ScrollReveal key={plan.name} delay={index * 100}>
                <Card 
                  className={`relative overflow-hidden h-full transition-all duration-500 ${
                    plan.highlighted 
                      ? "card-popular md:scale-105 z-10 order-first md:order-none" 
                      : "border-border bg-card hover-elevate card-glow"
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-primary to-gain py-1.5 text-center">
                      <span className="text-xs font-semibold text-primary-foreground">Most Popular</span>
                    </div>
                  )}
                  <CardContent className={`p-6 sm:p-8 relative ${plan.highlighted ? "pt-10 sm:pt-12" : ""}`}>
                    <h3 className="text-lg sm:text-xl font-bold mb-1">{plan.name}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">{plan.description}</p>
                    
                    <div className="mb-6 sm:mb-8">
                      <span className="text-4xl sm:text-5xl font-bold">{plan.price}</span>
                      {plan.period && (
                        <span className="text-muted-foreground text-sm sm:text-base">{plan.period}</span>
                      )}
                    </div>

                    <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm">
                          <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-gain mt-0.5 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Link to="/pricing" className="block">
                      <Button 
                        className={`w-full h-10 sm:h-12 text-sm sm:text-base ${
                          plan.highlighted 
                            ? "glow-button" 
                            : "hover:bg-primary hover:text-primary-foreground"
                        }`}
                        variant={plan.highlighted ? "default" : "outline"}
                      >
                        {plan.cta}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Mobile optimized */}
      <section className="py-16 sm:py-24 relative overflow-hidden">
        <ScrollReveal>
          <div className="px-4 sm:px-6 lg:px-8">
            <Card className="border-0 bg-gradient-to-r from-primary/20 via-gain/10 to-chart-4/20 backdrop-blur-xl overflow-hidden relative max-w-4xl mx-auto">
              {/* Animated shine effect */}
              <div className="absolute inset-0 shimmer" />
              
              <CardContent className="flex flex-col items-center text-center p-8 sm:p-12 md:p-16 relative">
                <div className="mb-6 sm:mb-8 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-gain shadow-2xl shadow-primary/30 animate-float">
                  <Zap className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">Ready to level up your finances?</h2>
                <p className="text-muted-foreground mb-8 sm:mb-10 max-w-lg text-sm sm:text-lg px-4">
                  Join thousands of users growing their wealth with IntoIQ—learn, analyze, and invest with confidence.
                </p>
                <Link to="/signup" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto gap-2 h-12 sm:h-14 px-8 sm:px-10 text-base glow-button">
                    Get Started Free <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </ScrollReveal>
      </section>

      {/* Footer - Mobile stack */}
      <footer className="border-t border-border/40 py-8 sm:py-12 bg-background/50 backdrop-blur-xl">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-4 sm:gap-6 text-center md:flex-row md:justify-between md:text-left">
            <Link to="/" className="flex items-center group">
              <img 
                src={intoiqLogo} 
                alt="IntoIQ" 
                className="h-12 sm:h-14 w-auto rounded-lg transition-transform duration-300 group-hover:scale-105"
              />
            </Link>
            
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-6 sm:gap-8 text-xs sm:text-sm text-muted-foreground">
                <Link to="/blog" className="hover:text-primary transition-colors">Blog</Link>
                <Link to="/terms" className="hover:text-primary transition-colors">Terms</Link>
                <Link to="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
              </div>
              
              <div className="flex items-center gap-2 border-l border-border/50 pl-4">
                <ShareMenu variant="ghost" size="sm" />
                <DonationButton variant="subtle" />
              </div>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground">
              © 2026 IntoIQ. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
