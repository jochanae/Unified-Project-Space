import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { Button } from '@/components/ui/button';
import { ArrowRight, ChevronRight, Sparkles, Play, Radar, Rocket, TrendingUp } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/scroll-reveal';
import { ParticleMesh } from '@/components/ui/particle-mesh';
import { TryItDemo } from '@/components/shared/TryItDemo';
import { AppFooter } from '@/components/shared/AppFooter';
import { LogoCapsule } from '@/components/shared/LogoCapsule';
import { IntelligenceJourney } from '@/components/landing/IntelligenceJourney';
import { KineticHero } from '@/components/landing/KineticHero';
import { SuccessFeed } from '@/components/landing/SuccessFeed';
import { AnonymousPreviewOverlay } from '@/components/landing/AnonymousPreviewOverlay';
import { ThreeDepthsOfControl } from '@/components/landing/ThreeDepthsOfControl';
import { AuthorsEdge } from '@/components/landing/AuthorsEdge';
import { SignalAudit } from '@/components/landing/SignalAudit';
import { AutomatedFunnelPreview } from '@/components/landing/AutomatedFunnelPreview';
import { EngineeredForDepth } from '@/components/landing/EngineeredForDepth';
import { cn } from '@/lib/utils';

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [previewOpen, setPreviewOpen] = useState(false);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && session) {
      navigate('/dashboard', { replace: true });
    }
  }, [session, loading, navigate]);

  return (
    <div className="min-h-screen animated-gradient text-foreground relative scroll-smooth overflow-x-hidden">
      <Helmet>
        <title>IntoIQ — AI Marketing Suite for Modern Brands</title>
        <meta name="description" content="IntoIQ is an AI marketing suite — landing pages, email, CRM, social campaigns, brand voice, and analytics in one connected engine, orchestrated by MarQ AI." />
        <link rel="canonical" href="https://intoiq.app/" />

        {/* OpenGraph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://intoiq.app/" />
        <meta property="og:site_name" content="IntoIQ" />
        <meta property="og:title" content="IntoIQ — AI Marketing Suite for Modern Brands" />
        <meta property="og:description" content="One connected engine: landing pages, email, CRM, social, brand voice, and analytics — orchestrated by MarQ AI." />
        <meta property="og:image" content="https://intoiq.app/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="IntoIQ — AI Marketing Suite for Modern Brands" />
        <meta name="twitter:description" content="Landing pages, email, CRM, social, and analytics — one connected engine powered by MarQ AI." />
        <meta name="twitter:image" content="https://intoiq.app/og-image.png" />

        {/* JSON-LD: SoftwareApplication with tier offers */}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "IntoIQ",
          "url": "https://intoiq.app",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web, Android, iOS",
          "description": "AI marketing suite combining landing pages, email marketing, CRM, social campaigns, brand voice, and analytics in one connected engine.",
          "image": "https://intoiq.app/og-image.png",
          "author": { "@type": "Organization", "name": "Into Innovations", "url": "https://intoiq.app" },
          "offers": {
            "@type": "AggregateOffer",
            "lowPrice": "0",
            "highPrice": "79",
            "priceCurrency": "USD",
            "offerCount": 3,
            "offers": [
              { "@type": "Offer", "name": "Signal", "price": "0", "priceCurrency": "USD", "description": "MarQ AI core, Signal Lab, Logo Generator" },
              { "@type": "Offer", "name": "Identity", "price": "39", "priceCurrency": "USD", "description": "Publish pages, CRM, email sequences, social campaigns, commerce" },
              { "@type": "Offer", "name": "Innovation", "price": "79", "priceCurrency": "USD", "description": "A/B testing, custom domains, predictive analytics, real-time collaboration" }
            ]
          },
          "featureList": [
            "MarQ AI Strategic Cockpit",
            "Landing Page & Funnel Builder",
            "Email Marketing & Sequences",
            "CRM with Lead Scoring",
            "Social Campaigns & 7-Day Strategy Maps",
            "Brand Voice Cloning & Brand Vault",
            "Predictive Analytics & A/B Testing",
            "Signal Lab message + competitor audits",
            "Real-time collaboration with field locking",
            "Real-time analytics & conversion intelligence"
          ]
        })}</script>

        {/* JSON-LD: FAQ for AI extraction */}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "What is IntoIQ?",
              "acceptedAnswer": { "@type": "Answer", "text": "IntoIQ is an AI marketing suite that unifies landing pages, email marketing, CRM, social campaigns, brand voice, and analytics in one connected engine. MarQ AI orchestrates every channel so each tool amplifies the others." }
            },
            {
              "@type": "Question",
              "name": "How much does IntoIQ cost?",
              "acceptedAnswer": { "@type": "Answer", "text": "IntoIQ has three tiers: Signal (free), Identity ($39/mo), and Innovation ($79/mo). Each unlocks deeper publishing, CRM, email, social, analytics, and collaboration features." }
            },
            {
              "@type": "Question",
              "name": "Who is MarQ?",
              "acceptedAnswer": { "@type": "Answer", "text": "MarQ is IntoIQ's AI conversion expert and intelligent execution engine — a strategic cockpit assistant with adjustable Tactical-to-Graceful tone, automated morning briefings, and cross-channel orchestration across the suite." }
            },
            {
              "@type": "Question",
              "name": "What makes IntoIQ different from other marketing platforms?",
              "acceptedAnswer": { "@type": "Answer", "text": "IntoIQ is a single connected engine, not a stack of disconnected tools. MarQ AI links landing pages to social campaigns, email performance to repurposed content, and CRM signals to amplification loops — so every channel learns from the others in real time." }
            }
          ]
        })}</script>
      </Helmet>
      <ParticleMesh />

      {/* Nav */}
      <nav
        className="flex items-center justify-between px-5 sm:px-6 lg:px-12 py-4 sm:py-5 relative z-20"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 1rem)' }}
      >
        <LogoCapsule size="md" />
        <div className="flex items-center gap-1 sm:gap-3">
          <Button variant="ghost" size="sm" onClick={() => scrollTo('control')} className="hidden sm:inline-flex text-muted-foreground hover:text-foreground">
            How It Works
          </Button>
          <Button variant="ghost" size="sm" onClick={() => scrollTo('proof')} className="hidden sm:inline-flex text-muted-foreground hover:text-foreground">
            Results
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/pricing')} className="hidden sm:inline-flex text-muted-foreground hover:text-foreground">
            Pricing
          </Button>
          <Button size="sm" onClick={() => navigate('/login')} className="glow-button animate-pulse-glow">
            Get Started <ArrowRight className="h-4 w-4" />
          </Button>
          <span className="hidden sm:inline text-muted-foreground text-xs">
            or{' '}
            <button onClick={() => navigate('/login?mode=signin')} className="text-primary hover:underline font-medium">
              Sign in
            </button>
          </span>
        </div>
      </nav>

      {/* Hero — Centered, "Autonomous Revenue Engine" */}
      <section className="relative px-5 md:px-6 lg:px-12 pt-12 md:pt-20 pb-16 md:pb-24 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none animate-float" />
        <div className="absolute bottom-0 right-10 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[100px] pointer-events-none animate-float" style={{ animationDelay: '3s' }} />

        <div className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center">
          <ScrollReveal>
            <span className="inline-flex items-center glass rounded-full px-4 py-1.5 text-[10px] md:text-xs text-primary font-medium tracking-[0.22em] uppercase mb-6">
              <Sparkles className="w-3 h-3 mr-2" />
              The Strategic Cockpit
            </span>

            <h1 className="text-[28px] md:text-6xl xl:text-7xl font-serif leading-[1.08] mb-6 max-w-4xl mx-auto [text-wrap:balance]">
              Stop building funnels.{' '}
              <span className="gradient-text italic">Start steering your system.</span>
            </h1>

            <p className="text-muted-foreground text-[15px] md:text-lg leading-relaxed max-w-2xl mx-auto mb-3 [text-wrap:balance]">
              MarQ provides the map.{' '}
              <span className="text-foreground font-medium">You own the steering wheel.</span>
            </p>
            <p className="text-muted-foreground/80 text-[13px] md:text-base leading-relaxed max-w-2xl mx-auto mb-8 [text-wrap:balance]">
              From 7-day deep dives to high-conversion lead engines — deployed by MarQ, refined by you.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full max-w-md sm:max-w-none mx-auto">
              <Button
                size="lg"
                onClick={() => setPreviewOpen(true)}
                className="glow-button animate-pulse-glow w-full sm:w-auto h-12 sm:h-14 px-8 sm:px-10 text-sm sm:text-base font-semibold tracking-wide"
              >
                Take the Wheel <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => scrollTo('control')}
                className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base border-border/50 hover:bg-accent"
              >
                <Play className="mr-2 h-4 w-4 fill-current" />
                See the Three Depths
              </Button>
            </div>

            <p className="text-[10px] sm:text-xs text-muted-foreground/60 mt-6 uppercase tracking-[0.22em] font-medium">
              Vibe <span className="text-primary/60 mx-1">→</span> Structure <span className="text-primary/60 mx-1">→</span> Logic · One workspace, three depths
            </p>

            {/* Kinetic Hero — CSS/SVG cinematic preview */}
            <div className="mt-10 sm:mt-14 w-full">
              <KineticHero />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Signal Audit — free lead magnet, streams a mini blueprint */}
      <SignalAudit />

      {/* Automated Funnel Preview — Lead → Kinetic Video */}
      <AutomatedFunnelPreview />

      {/* Try It — Interactive Demo */}
      <section id="try-it" className="relative px-5 sm:px-6 lg:px-12 py-8 sm:py-14 scroll-mt-20">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent" />
        <div className="max-w-5xl mx-auto relative z-10">
          <ScrollReveal>
            <div className="text-center mb-10 sm:mb-14">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif">
                Type Your Vision.{' '}
                <span className="gradient-text italic">Watch It Build.</span>
              </h2>
              <p className="text-muted-foreground mt-3 max-w-lg mx-auto text-sm sm:text-base">
                Enter any business goal and see how IntoIQ transforms it into a strategic funnel — in seconds.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <TryItDemo />
          </ScrollReveal>
        </div>
      </section>

      {/* Three Depths of Control — The Digital Lens */}
      <ThreeDepthsOfControl />

      {/* Intelligence Journey — Closed-Loop 4 systems */}
      <IntelligenceJourney />

      {/* The Author's Edge — vertical-specific proof */}
      <AuthorsEdge />

      {/* Success Feed — Feature-validated proof */}
      <section id="proof" className="scroll-mt-20">
        <SuccessFeed />
      </section>

      {/* Command Center Preview */}
      <section className="relative px-5 sm:px-6 lg:px-12 py-16 sm:py-20">
        <div className="max-w-4xl mx-auto relative z-10">
          <ScrollReveal>
            <div className="text-center mb-8 sm:mb-10">
              <span className="inline-flex items-center glass rounded-full px-4 py-1.5 text-xs sm:text-sm text-primary font-medium tracking-widest uppercase mb-4">
                Your Workspace
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif">
                Step Into Your{' '}
                <span className="gradient-text italic">Command Center</span>
              </h2>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <div className="glass rounded-2xl p-6 sm:p-8 lg:p-12 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3" />
              <div className="relative space-y-6 opacity-40 blur-[2px]">
                <div className="flex gap-4">
                  <div className="w-48 h-full glass rounded-xl p-4 space-y-3 hidden sm:block">
                    <div className="h-3 w-20 bg-muted-foreground/20 rounded" />
                    <div className="h-8 w-full bg-muted/50 rounded-lg" />
                    <div className="h-8 w-full bg-primary/20 rounded-lg" />
                    <div className="h-8 w-full bg-muted/50 rounded-lg" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="h-10 w-48 sm:w-64 bg-muted-foreground/10 rounded-lg" />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="h-20 sm:h-24 glass rounded-xl" />
                      <div className="h-20 sm:h-24 glass rounded-xl" />
                      <div className="h-20 sm:h-24 glass rounded-xl" />
                      <div className="h-20 sm:h-24 glass rounded-xl" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                <div className="glass rounded-2xl px-6 sm:px-8 py-5 sm:py-6 text-center animate-pulse-glow">
                  <p className="text-base sm:text-lg font-serif mb-3">Ready to build something powerful?</p>
                  <Button onClick={() => navigate('/login')} className="glow-button">
                    Enter Command Center <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="relative px-5 sm:px-6 lg:px-12 py-16 sm:py-20">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent" />
        <div className="max-w-5xl mx-auto relative z-10">
          <ScrollReveal>
            <div className="text-center mb-10 sm:mb-14">
              <span className="inline-flex items-center glass rounded-full px-4 py-1.5 text-xs sm:text-sm text-primary font-medium tracking-widest uppercase mb-4">
                Signal → Identity → Innovation
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif">
                Choose Your{' '}
                <span className="gradient-text italic">Stage</span>
              </h2>
              <p className="text-muted-foreground mt-3 max-w-lg mx-auto text-sm sm:text-base">
                From clarity to scale — each tier unlocks the next level of your business.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                icon: Radar,
                name: 'Signal',
                subtitle: 'Architect',
                tagline: 'Clarify your message',
                price: 'Free',
                highlights: ['MarQ AI intelligence', 'Signal flow & funnel mapping', 'Logo Generator & templates'],
              },
              {
                icon: Rocket,
                name: 'Identity',
                subtitle: 'Operator',
                tagline: 'Make it unmistakably yours',
                price: '$39/mo',
                highlights: ['Style Signal & Identity Lock', 'Publish funnels & capture leads', 'CRM, email sequences & commerce'],
                popular: true,
              },
              {
                icon: TrendingUp,
                name: 'Innovation',
                subtitle: 'Growth',
                tagline: 'Scale your system',
                price: '$79/mo',
                highlights: ['A/B testing & experiments', 'Custom domains & social images', 'Advanced analytics & code export'],
              },
            ].map((tier, i) => (
              <ScrollReveal key={i} delay={i * 150}>
                <div className={cn(
                  'glass rounded-2xl p-5 sm:p-6 text-center relative transition-all duration-300 h-full flex flex-col',
                  tier.popular
                    ? 'border-2 border-primary/40 shadow-[0_0_40px_hsl(var(--primary)/0.12)]'
                    : 'border border-border/30',
                )}>
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <span className="inline-flex items-center gap-1 bg-background text-primary text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-primary/40 shadow-[0_0_20px_hsl(var(--primary)/0.25)] whitespace-nowrap">
                        ⭐ Most Popular
                      </span>
                    </div>
                  )}
                  <div className={cn(
                    'h-10 w-10 rounded-xl mx-auto flex items-center justify-center mb-3',
                    tier.popular ? 'bg-primary/15 border border-primary/25' : 'bg-muted',
                  )}>
                    <tier.icon className={cn('h-5 w-5', tier.popular ? 'text-primary' : 'text-muted-foreground')} />
                  </div>
                  <h3 className="text-lg font-serif mb-0.5">{tier.name}</h3>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium mb-1">({tier.subtitle})</span>
                  <p className="text-xs text-muted-foreground italic mb-3">{tier.tagline}</p>
                  <p className="text-xl font-bold mb-4">{tier.price}</p>
                  <ul className="space-y-1.5 text-sm text-muted-foreground flex-1 mb-4">
                    {tier.highlights.map((h, j) => (
                      <li key={j} className="flex items-center gap-2 justify-center text-xs">
                        <span className="text-primary">✓</span> {h}
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal delay={500}>
            <div className="text-center mt-8">
              <Button variant="outline" onClick={() => navigate('/pricing')} className="gap-2">
                Compare All Features <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Engineered for Depth — anchor the value just before final CTA */}
      <EngineeredForDepth />

      {/* Footer CTA */}
      <section className="px-5 sm:px-6 lg:px-12 py-16 sm:py-20">
        <ScrollReveal>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif mb-4">
              Intelligence Applied.{' '}
              <span className="gradient-text italic">One Funnel at a Time.</span>
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg mb-8 max-w-xl mx-auto">
              Stop overthinking your launch. IntoIQ takes you from "I have an idea" to "It's live" faster than you thought possible.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Button size="lg" onClick={() => navigate('/login')} className="glow-button h-11 sm:h-12 px-8 sm:px-10 text-sm sm:text-base">
                Start Your First Funnel <ArrowRight className="h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/pricing')} className="h-11 sm:h-12 px-8 sm:px-10 text-sm sm:text-base border-border/50">
                See Pricing
              </Button>
            </div>
          </div>
        </ScrollReveal>
      </section>

      <AppFooter variant="marketing" />

      <AnonymousPreviewOverlay open={previewOpen} onClose={() => setPreviewOpen(false)} />
    </div>
  );
}
