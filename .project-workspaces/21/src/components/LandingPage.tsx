import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowRight, Download, Aperture } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import CompaniLogo from './CompaniLogo';
import LandingHero from './landing/LandingHero';
import LandingInAction from './landing/LandingInAction';
import LandingPillars from './landing/LandingPillars';
import LandingTestimonials from './landing/LandingTestimonials';
import LandingPricing from './landing/LandingPricing';
import LandingCTA from './landing/LandingCTA';
import LandingPhoneMockup from './landing/LandingPhoneMockup';
import LandingCarousel from './landing/LandingCarousel';
import LandingFooter from './landing/LandingFooter';
import LandingThinkFreely from './landing/LandingThinkFreely';
import LandingVisionMadeVisible from './landing/LandingVisionMadeVisible';
import LandingLegacyOfCraft from './landing/LandingLegacyOfCraft';

export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { canInstall, install, isInstalled } = usePWAInstall();
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [installHintOpen, setInstallHintOpen] = useState(false);

  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const showInstallButton = !isInstalled;

  const handleInstallClick = async () => {
    if (canInstall) {
      await install();
    } else {
      setInstallHintOpen(true);
    }
  };

  // Force dark mode on landing page
  useEffect(() => {
    const root = document.documentElement;
    const hadLight = root.classList.contains('light');
    root.classList.remove('light');
    root.classList.add('dark');
    return () => {
      if (hadLight) {
        root.classList.remove('dark');
        root.classList.add('light');
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden w-full" role="main">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/8 blur-[100px]" />
        <div className="absolute top-1/3 right-0 h-[400px] w-[400px] rounded-full bg-accent/6 blur-[80px]" />
        <div className="absolute bottom-1/4 left-1/3 h-[300px] w-[300px] rounded-full bg-primary/5 blur-[60px]" />
      </div>

      {/* Navigation */}
      <motion.nav
        initial={false}
        className="fixed top-0 left-0 right-0 z-50 rounded-b-2xl bg-card/60 backdrop-blur-2xl border-b border-white/[0.08] shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)]"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex h-14 items-center justify-between px-4 max-w-5xl mx-auto gap-3" style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))', paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))' }}>
          {/* Left cluster: hamburger (with Menu label) + logo */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              className="lg:hidden flex flex-col items-center justify-center gap-0.5 -my-1 px-1 rounded-md hover:bg-muted/40 transition-colors"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              <span className="text-[9px] font-medium text-muted-foreground leading-none tracking-wide">
                {mobileMenuOpen ? 'Close' : 'Menu'}
              </span>
            </button>
            <CompaniLogo size="md" />
          </div>

          <div className="hidden lg:flex items-center gap-6">
            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm text-muted-foreground hover:text-primary transition-colors">Features</button>
            <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm text-muted-foreground hover:text-primary transition-colors">Pricing</button>
            <button onClick={() => document.getElementById('testimonials')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm text-muted-foreground hover:text-primary transition-colors">Stories</button>
          </div>

          {/* Right cluster: install icon + Sign In */}
          <div className="flex items-center gap-2">
            {showInstallButton && (
              <button
                onClick={handleInstallClick}
                aria-label="Install app"
                title="Install app"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary transition-colors hover:bg-primary/20"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => navigate('/auth')}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-foreground transition-all hover:bg-secondary"
            >
              Sign In
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile menu — fixed below nav so opening doesn't reflow header */}
      <AnimatePresence mode="wait">
        {mobileMenuOpen && (
          <>
            <motion.div
              key="mobile-menu-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[49] lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              key="mobile-menu-panel"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed left-0 right-0 z-[50] lg:hidden border-t border-white/[0.06] bg-card/90 backdrop-blur-2xl px-4 py-4 space-y-2 rounded-b-2xl shadow-[0_12px_40px_-8px_rgba(0,0,0,0.6)]"
              style={{ top: 'calc(env(safe-area-inset-top, 0px) + 56px)' }}
            >
              <button onClick={() => { document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">Features</button>
              <button onClick={() => { document.getElementById('in-action')?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">Demo</button>
              <button onClick={() => { document.getElementById('testimonials')?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">Stories</button>
              <div className="flex flex-col gap-2 pt-2 border-t border-border/30">
                {canInstall && (
                  <button onClick={() => { install(); setMobileMenuOpen(false); }} className="w-full rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" />
                    Install App
                  </button>
                )}
                <button onClick={() => { navigate('/auth'); setMobileMenuOpen(false); }} className="w-full rounded-xl gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground">
                  Get Started
                </button>
                <button onClick={() => { navigate('/auth'); setMobileMenuOpen(false); }} className="w-full rounded-xl border border-border px-4 py-3 text-sm font-semibold text-foreground hover:bg-secondary">
                  Sign In
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sections */}
      <LandingHero />

      {/* Think Freely preview */}
      <LandingThinkFreely />

      {/* Companion carousel — collapsed by default */}
      <div className="relative z-10" style={{ background: 'hsl(270 40% 4%)' }}>
        <div className="flex justify-center py-6">
          <button
            onClick={() => setCarouselOpen(!carouselOpen)}
            aria-expanded={carouselOpen}
            className="group relative inline-flex flex-col items-center gap-2 rounded-full border border-primary/40 bg-background/40 backdrop-blur-xl px-9 py-4 text-center transition-all duration-500 hover:border-primary/70 hover:bg-background/60"
            style={{ boxShadow: '0 8px 40px -12px hsla(40, 60%, 55%, 0.25), inset 0 1px 0 hsla(40, 60%, 75%, 0.1)' }}
          >
            <span className="inline-flex items-center gap-2.5 text-sm font-medium tracking-wide text-foreground/90 group-hover:text-primary transition-colors relative overflow-hidden">
              <Aperture
                className={`relative z-10 w-4 h-4 text-primary/70 group-hover:text-primary transition-all duration-700 ${carouselOpen ? 'rotate-180' : 'rotate-0'} group-hover:rotate-[200deg]`}
                strokeWidth={1.5}
              />
              <span className="relative z-10">
                {carouselOpen ? 'Close the Canvas' : 'Reveal the Canvas'}
              </span>
              {/* Shimmer pass */}
              <span
                className="pointer-events-none absolute inset-0 -skew-x-12 animate-[shimmer-pass_5s_ease-in-out_infinite]"
                style={{ background: 'linear-gradient(90deg, transparent 0%, hsla(40,60%,65%,0.18) 50%, transparent 100%)', backgroundSize: '200% 100%' }}
              />
            </span>
            <span className="text-[11px] text-muted-foreground/70 max-w-[280px] leading-snug font-light italic">
              Describe a person, an energy, a feeling. We'll bring them to life.
            </span>
          </button>
        </div>
        <AnimatePresence>
          {carouselOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
              >
                <LandingCarousel />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <LandingPhoneMockup />
      <LandingPillars />
      <LandingInAction />
      <LandingVisionMadeVisible />
      <LandingTestimonials />
      <LandingPricing />
      <LandingLegacyOfCraft />
      <LandingCTA />
      <LandingFooter />

      {/* Install instructions modal (fallback when native prompt unavailable) */}
      <AnimatePresence>
        {installHintOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-background/80 backdrop-blur-sm"
            onClick={() => setInstallHintOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.6)]"
            >
              <button
                onClick={() => setInstallHintOpen(false)}
                aria-label="Close"
                className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2 mb-3">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Download className="h-4 w-4" />
                </div>
                <h3 className="text-base font-semibold text-foreground">Install Compani</h3>
              </div>
              {isIOS ? (
                <ol className="space-y-2 text-sm text-muted-foreground list-decimal pl-5">
                  <li>Tap the <span className="font-semibold text-foreground">Share</span> icon in Safari.</li>
                  <li>Scroll and choose <span className="font-semibold text-foreground">Add to Home Screen</span>.</li>
                  <li>Tap <span className="font-semibold text-foreground">Add</span> in the top-right.</li>
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Open this page in <span className="font-semibold text-foreground">Chrome</span> or <span className="font-semibold text-foreground">Edge</span>, then tap the browser menu and choose <span className="font-semibold text-foreground">Install app</span> or <span className="font-semibold text-foreground">Add to Home screen</span>.
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
