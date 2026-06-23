import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { BloomDemoSection } from "@/components/landing/BloomDemoSection";
import { HowQuinnThinksSection } from "@/components/landing/HowQuinnThinksSection";
import { CoreFeaturesSection } from "@/components/landing/CoreFeaturesSection";
import { FamilyFeaturesSection } from "@/components/landing/FamilyFeaturesSection";
import { UserJourneysSection } from "@/components/landing/UserJourneysSection";
import { OurStorySection } from "@/components/landing/OurStorySection";
import { PricingSection } from "@/components/landing/PricingSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";
import { LoadingSpinner } from "@/components/ui/loading-spinner";


import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Redirect authenticated users to dashboard with smooth transition
  useEffect(() => {
    if (user) {
      setIsRedirecting(true);
      const timer = setTimeout(() => navigate("/dashboard"), 800);
      return () => clearTimeout(timer);
    }
  }, [user, navigate]);

  // Show branded loading screen while redirecting
  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center loading-screen-bg">
        <LoadingSpinner size="lg" text="Preparing your dashboard…" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative bg-gradient-to-br from-blue-50/80 via-purple-50/60 to-pink-50/80 dark:from-slate-950 dark:via-purple-950/20 dark:to-slate-950">
      <Helmet>
        <title>CoinsBloom - Personal Finance Made Simple | Budget, Save & Grow</title>
        <meta name="description" content="A smart financial platform that helps you track budgets, set savings goals, and build healthy money habits—with tools for everyone, from individuals to families." />
        <link rel="canonical" href="https://coinsbloom.com" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "CoinsBloom",
          "url": "https://coinsbloom.com",
          "logo": "https://coinsbloom.com/favicon.png",
          "description": "Smart financial management platform for individuals and families.",
          "sameAs": ["https://twitter.com/CoinsBloom"]
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {"@type": "Question", "name": "What is CoinsBloom?", "acceptedAnswer": {"@type": "Answer", "text": "CoinsBloom is a smart financial platform that helps you track budgets, set savings goals, and build healthy money habits—with tools for everyone, from individuals to families."}},
            {"@type": "Question", "name": "How is Bloom different from ChatGPT or other AI assistants?", "acceptedAnswer": {"@type": "Answer", "text": "Most AI resets every conversation. Bloom builds Strategic Memory — a living model of your income, debts, goals, and decisions that persists across sessions. It's a Financial Architect that remembers context and engineers your next move based on the full picture of your financial world."}},
            {"@type": "Question", "name": "What is the Mental Shredder mode?", "acceptedAnswer": {"@type": "Answer", "text": "The Mental Shredder is Bloom's zero-trace privacy mode. When activated, your conversation is never recorded to your Strategic Memory or Blueprint Ledger — perfect for sensitive scenarios you want to think through without leaving a trail."}},
            {"@type": "Question", "name": "Can I export my financial blueprints as PDFs?", "acceptedAnswer": {"@type": "Answer", "text": "Yes. Premium members can export Strategic Blueprints — full PDF reports of debt payoff plans, savings strategies, and scenario analyses Bloom builds with you."}},
            {"@type": "Question", "name": "Is KidsBloom really free?", "acceptedAnswer": {"@type": "Answer", "text": "Yes! KidsBloom is 100% free forever. We believe every child deserves access to financial education, regardless of their family's subscription status."}},
            {"@type": "Question", "name": "How does the family budgeting work?", "acceptedAnswer": {"@type": "Answer", "text": "Our budgeting tools allow you to create shared family budgets, track spending by category, set allowances for kids, and monitor savings goals together as a family."}},
            {"@type": "Question", "name": "Can I try CoinsBloom before subscribing?", "acceptedAnswer": {"@type": "Answer", "text": "Absolutely! Start with our free tier which includes basic budgeting features and full access to KidsBloom. Upgrade anytime to unlock premium features."}},
            {"@type": "Question", "name": "Is my financial data secure?", "acceptedAnswer": {"@type": "Answer", "text": "Your security is our top priority. We use bank-level encryption and never share your data with third parties. Your financial information stays private and protected."}}
          ]
        })}</script>
      </Helmet>
      
      <Navbar />
      <main className="flex-grow relative z-10">
        <HeroSection />
        <BloomDemoSection />
        <HowQuinnThinksSection />
        <section id="features">
          <CoreFeaturesSection />
        </section>
        <section id="families">
          <FamilyFeaturesSection />
        </section>
        <UserJourneysSection />
        <OurStorySection />
        <section id="pricing">
          <PricingSection />
        </section>
        <TestimonialsSection />
        <section id="faq">
          <FAQSection />
        </section>
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
