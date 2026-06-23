import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  Bookmark,
  Bird,
  Wallet,
  ShieldCheck,
  Search as SearchIcon,
  PenLine,
  ArrowRight,
  Heart,
  ChevronDown,
  Share2,
  Copy,
  Check,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useEdgeSwipeNavigate } from "@/hooks/useEdgeSwipeNavigate";
import { ThemeToggleButton } from "@/components/layout/ThemeToggleButton";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { SelahPreview } from "@/components/landing/SelahPreview";
import { DigitalVerandaSection } from "@/components/landing/DigitalVerandaSection";
import { DeepDivePortalSection } from "@/components/landing/DeepDivePortalSection";
import { PublicBottomTabBar } from "@/components/layout/AppShell";
import { InstallAppButton } from "@/components/InstallAppButton";
import { useAuth } from "@/hooks/useAuth";
import { getPinnedWeeklyReflection } from "@/lib/landing-settings.functions";
import { cn } from "@/lib/utils";
import { getVerseOfTheDay } from "@/lib/verseOfTheDay";
import { useVersionedVerse } from "@/hooks/useVersionedVerse";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SanctumIQ — A Private Sanctuary for Ministry and Study" },
      {
        name: "description",
        content:
          "Read scripture, reflect, and prepare in a quiet space free from ads, noise, and interruption.",
      },
      { property: "og:title", content: "SanctumIQ — A Private Sanctuary for Ministry and Study" },
      {
        property: "og:description",
        content: "A calm, ad-free sanctuary for scripture, reflection, and ministry preparation.",
      },
    ],
  }),
  component: LandingPage,
});

const POST_AUTH_DESTINATION = "/reader" as const;

/* ─────────────────────────────────────────────────────────────
   ANIMATION KEYFRAMES (injected once)
   ───────────────────────────────────────────────────────────── */
const KEYFRAMES = `
  @keyframes word-rise {
    from { opacity: 0; transform: translateY(14px); filter: blur(4px); }
    to   { opacity: 1; transform: translateY(0);    filter: blur(0); }
  }
  @keyframes word-fade {
    from { opacity: 0; filter: blur(3px); }
    to   { opacity: 1; filter: blur(0); }
  }
  @keyframes glow-breathe {
    0%, 100% { opacity: 0.22; transform: scale(1); }
    50%       { opacity: 0.34; transform: scale(1.06); }
  }
  @keyframes fade-up {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes line-grow {
    from { scaleX: 0; opacity: 0; }
    to   { scaleX: 1; opacity: 1; }
  }
  @keyframes scroll-bounce {
    0%, 100% { transform: translateY(0); opacity: 0.5; }
    50%       { transform: translateY(5px); opacity: 1; }
  }
  @keyframes nav-drop {
    from { opacity: 0; transform: translateY(-28px); filter: blur(10px); }
    to   { opacity: 1; transform: translateY(0); filter: blur(0); }
  }
  @keyframes nav-item-reveal {
    from { opacity: 0; transform: translateY(-10px); filter: blur(8px); }
    to   { opacity: 1; transform: translateY(0); filter: blur(0); }
  }
  @keyframes selah-call-pulse {
    0%, 100% { transform: scale(1); opacity: 0.88; box-shadow: 0 0 0 0 color-mix(in oklab, var(--gold) 18%, transparent); }
    50% { transform: scale(1.045); opacity: 1; box-shadow: 0 0 0 10px color-mix(in oklab, var(--gold) 0%, transparent); }
  }
  .word-token {
    display: inline-block;
    opacity: 0;
    animation: word-rise 0.92s ease-out forwards;
  }
  .section-reveal {
    opacity: 0;
    animation: fade-up 1.05s ease-out forwards;
  }
  .nav-reveal {
    opacity: 0;
    filter: blur(10px);
    animation: nav-drop 1s ease-out forwards;
  }
  .nav-item-reveal {
    opacity: 0;
    filter: blur(8px);
    animation: nav-item-reveal 0.8s ease-out forwards;
  }
  @media (prefers-reduced-motion: reduce) {
    .word-token {
      animation: word-fade 0.9s ease-out forwards;
    }
    .section-reveal,
    .nav-reveal,
    .nav-item-reveal {
      filter: none;
      animation: fade-in 0.8s ease-out forwards;
    }
    .selah-call-button {
      animation: none !important;
    }
    .landing-ambient,
    .landing-scroll-cue {
      animation: none !important;
    }
  }
`;

/* ─────────────────────────────────────────────────────────────
   PAGE
   ───────────────────────────────────────────────────────────── */
function LandingPage() {
  // Edge-swipe LEFT (from right edge) → Reader. Public-page navigation gesture.
  useEdgeSwipeNavigate({ onSwipeLeftTo: "/reader" });
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      <PublicNav />
      <main>
        <VerseSplash />
        <ScrollReveal className="min-h-[34rem]" initiallyVisible>
          <Tagline />
        </ScrollReveal>
        <ScrollReveal delay={200} className="min-h-[40rem] md:min-h-[42rem]">
          <QuietSupportSection />
        </ScrollReveal>
        <ScrollReveal delay={300} className="min-h-[40rem] md:min-h-[44rem]">
          <DigitalVerandaSection />
        </ScrollReveal>
        <ScrollReveal delay={400} className="min-h-[36rem] md:min-h-[40rem]">
          <PartnerModelSection />
        </ScrollReveal>
        <ScrollReveal delay={500} className="min-h-[36rem] md:min-h-[42rem]">
          <SelahPreview />
        </ScrollReveal>
        <ScrollReveal delay={600} className="min-h-[36rem] md:min-h-[40rem]">
          <DeepDivePortalSection />
        </ScrollReveal>
      </main>
      <InstallSanctuarySection />
      <ShareSanctuarySection />
      <PublicFooter />
      {/* Bottom padding so footer isn't clipped by mobile nav */}
      <div className="h-24 md:hidden" aria-hidden />
      <PublicBottomTabBar currentPath="/" />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   NAVIGATION
   ───────────────────────────────────────────────────────────── */
function PublicNav() {
  const { user } = useAuth();
  // Always link directly — no loading guard. Auth redirect is handled by the target route.
  // Reader is public — always go straight there, no sign-in wall

  return (
    <header
      className="nav-reveal sticky top-0 z-40 hairline-b bg-background/85 backdrop-blur-md rounded-b-2xl"
      style={{
        animationDelay: "1s",
        animationFillMode: "both",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <div className="mx-auto flex min-h-14 max-w-6xl items-center justify-between px-4 sm:min-h-[3.5rem] sm:px-6">
        <Link
          to="/"
          className="nav-item-reveal flex min-w-0 flex-shrink-0 items-center gap-2.5"
          style={{ animationDelay: "1.1s", animationFillMode: "both" }}
          aria-current="page"
        >
          <img
            src="/sanctum-seal.svg"
            alt=""
            aria-hidden="true"
            className="h-7 w-7 sm:h-8 sm:w-8 shrink-0"
          />
          <span className="font-display text-xl tracking-wide text-gold-soft sm:text-2xl">
            Sanctum<span className="text-gold">IQ</span>
          </span>
        </Link>

        <nav
          className="nav-item-reveal flex items-center gap-2 sm:gap-3"
          style={{ animationDelay: "1.2s", animationFillMode: "both" }}
        >
          <Link
            to="/pricing"
            className="hidden sm:inline-flex items-center justify-center rounded-md px-3 py-2 text-sm text-gold-soft/80 transition-colors hover:text-gold-soft"
          >
            Plans
          </Link>
          <a
            href="https://buy.stripe.com/cNi14n7VO22c7V475qgUM05"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Sow a Seed — one-time free-will offering"
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm text-gold-soft/85 transition-colors hover:text-gold"
          >
            <Heart className="h-4 w-4 text-gold" strokeWidth={1.75} fill="currentColor" />
            <span className="hidden xs:inline sm:inline">Sow a Seed</span>
          </a>
          <div className="relative">
            <Link
              to="/reader"
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-gold/40 bg-transparent px-5 py-2 text-sm font-medium text-gold transition-colors hover:bg-gold/10 hover:border-gold/60"
            >
              Enter Sanctuary
            </Link>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-full -translate-x-1/2 mt-3 whitespace-nowrap font-display text-[11px] uppercase tracking-[0.18em] text-gold-soft/70"
            >
              Freely Given
            </span>
          </div>
        </nav>
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────────────────────────
   VERSE SPLASH — THE ARRIVAL MOMENT
   ───────────────────────────────────────────────────────────── */
function VerseSplash() {
  const dailyVerse = getVerseOfTheDay();
  const [featuredRef, setFeaturedRef] = useState(dailyVerse.ref);
  const [featuredKjvText, setFeaturedKjvText] = useState(dailyVerse.text);

  // Resolve the verse text in the user's preferred version
  const { text: featuredText, version: featuredVersion } = useVersionedVerse(
    featuredRef,
    featuredKjvText,
  );

  useEffect(() => {
    let active = true;

    async function loadFeaturedVerse() {
      const fallback = getVerseOfTheDay();
      try {
        const pinned = await getPinnedWeeklyReflection();
        if (active) {
          setFeaturedRef(pinned.ref);
          setFeaturedKjvText(pinned.text);
        }
      } catch {
        if (active) {
          setFeaturedRef(fallback.ref);
          setFeaturedKjvText(fallback.text);
        }
      }
    }

    void loadFeaturedVerse();
    return () => {
      active = false;
    };
  }, []);

  // Build a compatible shape for the rest of the component
  const featuredVerse = { ref: featuredRef, text: featuredText, version: featuredVersion };

  const words = featuredVerse.text.split(" ");
  const BASE_DELAY = 0.3; // seconds before first word
  const WORD_STAGGER = 0.13;
  const lastWordEnd = BASE_DELAY + words.length * WORD_STAGGER + 0.7;

  return (
    <section className="relative flex min-h-[92svh] flex-col items-center justify-center px-6 text-center overflow-hidden">
      {/* Ambient gold glow removed — solid themed background only. */}

      {/* Eyebrow chip */}
      <div
        className="section-reveal mb-10"
        style={{ animationDelay: `${BASE_DELAY - 0.1}s`, animationFillMode: "both" }}
      >
        <span
          className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/8 px-4 py-1.5 text-[11px] uppercase tracking-[0.28em] text-gold"
          style={{ background: "oklch(0.74 0.115 85 / 0.08)" }}
        >
          <span
            className="inline-block h-1 w-1 rounded-full bg-gold"
            style={{ animation: `glow-breathe 2.5s ease-in-out infinite` }}
          />
          The Reflection
        </span>
      </div>

      {/* Verse text — word-by-word entrance */}
      <blockquote className="relative z-10 mx-auto max-w-3xl">
        <p
          className="font-display text-4xl leading-[1.18] text-foreground sm:text-5xl md:text-6xl lg:text-7xl"
          aria-label={featuredVerse.text}
        >
          {words.map((word, i) => (
            <span
              key={i}
              className="word-token"
              style={{
                animationDelay: `${BASE_DELAY + i * WORD_STAGGER}s`,
                marginRight: "0.28em",
              }}
            >
              {word}
            </span>
          ))}
        </p>

        {/* Verse reference — appears after last word */}
        <footer
          className="section-reveal mt-8"
          style={{
            animationDelay: `${lastWordEnd}s`,
            animationFillMode: "both",
          }}
        >
          <cite className="not-italic font-display italic text-lg text-gold-soft md:text-xl">
            — {featuredVerse.ref}
            <span className="ml-2 font-sans text-sm not-italic text-muted-foreground/70 tracking-wider">
              {featuredVerse.version}
            </span>
          </cite>
        </footer>
      </blockquote>

      {/* Hairline divider that grows in */}
      <div
        className="section-reveal mt-16 w-16 border-t border-gold/30"
        style={{ animationDelay: `${lastWordEnd + 0.15}s`, animationFillMode: "both" }}
      />

      {/* Scroll cue */}
      <div
        className="section-reveal absolute bottom-8 flex flex-col items-center gap-2"
        style={{ animationDelay: `${lastWordEnd + 0.5}s`, animationFillMode: "both" }}
      >
        <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/50">
          Discover
        </span>
        <ChevronDown
          className="landing-scroll-cue h-4 w-4 text-gold/50"
          style={{ animation: "scroll-bounce 2s ease-in-out infinite" }}
        />
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   TAGLINE + CTA
   ───────────────────────────────────────────────────────────── */
function Tagline() {
  return (
    <section
      id="reader-entry"
      className="hairline-t scroll-mt-16 flex min-h-[34rem] items-center pb-24 pt-24 md:min-h-[38rem] md:scroll-mt-20 md:pb-32 md:pt-32"
    >
      <div className="mx-auto max-w-3xl px-6 text-center">
        <p className="text-[11px] uppercase tracking-[0.4em] text-gold mb-6">A Place to Be Still</p>
        <h1 className="font-display text-5xl md:text-6xl lg:text-7xl leading-[1.04] text-foreground">
          A Private Sanctuary
          <br />
          <span className="font-display italic text-gold-soft">for Ministry and Study</span>
        </h1>
        <p className="mt-8 mx-auto max-w-xl text-base md:text-lg text-muted-foreground leading-relaxed">
          Read scripture, reflect, and prepare in a quiet space built for focus — free from ads,
          noise, and interruption. Forever.
        </p>

        <p className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-[11px] uppercase tracking-[0.28em] text-muted-foreground/55">
          <span>No ads</span>
          <span className="text-gold/25">·</span>
          <span>No tracking</span>
          <span className="text-gold/25">·</span>
          <span>No background processes</span>
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-2">
          <Link
            to="/reader"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-gold px-6 py-3 text-sm font-medium text-obsidian hover:bg-gold-soft transition-colors w-full sm:w-auto"
          >
            Enter the Sanctuary
            <ArrowRight className="h-4 w-4" />
          </Link>
          <span className="text-xs text-gold/60 tracking-wide">Open to all.</span>
        </div>

        <p className="mt-8 mx-auto max-w-md text-center text-xs italic text-foreground/60 leading-relaxed">
          Scripture access is a gift; paid tools support our donation model.
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   QUIET SUPPORT
   ───────────────────────────────────────────────────────────── */
function QuietSupportSection() {
  const animationFrameRef = useRef<number | null>(null);
  const cancelScrollRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
      cancelScrollRef.current?.();
    };
  }, []);

  const jumpToSelah = () => {
    const target = document.getElementById("meet-selah");
    if (!target) return;

    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    cancelScrollRef.current?.();

    const startY = window.scrollY;
    const targetY = target.getBoundingClientRect().top + window.scrollY;
    const distance = targetY - startY;
    const duration = 1100;
    const startTime = performance.now();
    let isCancelled = false;

    const cancelAnimation = () => {
      isCancelled = true;
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      window.removeEventListener("wheel", cancelAnimation);
      window.removeEventListener("touchstart", cancelAnimation);
      window.removeEventListener("touchmove", cancelAnimation);
      cancelScrollRef.current = null;
    };

    cancelScrollRef.current = cancelAnimation;
    window.addEventListener("wheel", cancelAnimation, { passive: true });
    window.addEventListener("touchstart", cancelAnimation, { passive: true });
    window.addEventListener("touchmove", cancelAnimation, { passive: true });

    const easeInOutCubic = (progress: number) =>
      progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    const animateScroll = (currentTime: number) => {
      if (isCancelled) return;

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      window.scrollTo({ top: startY + distance * easeInOutCubic(progress) });

      if (progress < 1) {
        animationFrameRef.current = window.requestAnimationFrame(animateScroll);
      } else {
        cancelAnimation();
      }
    };

    animationFrameRef.current = window.requestAnimationFrame(animateScroll);
  };

  const items = [
    {
      icon: BookOpen,
      title: "Bible Reader",
      body: "A focused reading space with parallel scripture, fast navigation, and no visual clutter pulling you away from the text.",
    },
    {
      icon: Bird,
      title: "Selah, Your Companion",
      body: "Selah offers gentle reflection and intelligent study support. From identifying cross-references to organizing sermon sparks, she provides quiet guidance tailored to your ministry.",
    },
    {
      icon: ShieldCheck,
      title: "Steward Ledger",
      body: "Private stewardship records stay protected and close at hand, helping you track giving without overtaking the rest of your study flow.",
    },
  ];

  return (
    <SectionShell eyebrow="A Steady Hand" title="Quiet Support">
      <p className="mx-auto max-w-2xl text-center text-base md:text-lg text-muted-foreground leading-relaxed mb-14">
        Sanctum includes supportive tools designed to help you search, reflect, and organize — never
        to interrupt or overwhelm.
      </p>
      <div className="space-y-20 md:grid md:grid-cols-3 md:gap-14 md:space-y-0">
        {items.map((it, index) => (
          <ScrollReveal
            key={it.title}
            delay={index * 180}
            className="h-full min-h-[82svh] md:min-h-[38rem]"
          >
            <article className="flex min-h-[82svh] flex-col justify-center gap-7 py-16 md:min-h-[38rem] md:px-2 md:py-20">
              <div className="relative flex h-12 w-12 items-center justify-center">
                <span
                  aria-hidden="true"
                  className="absolute h-14 w-14 rounded-full bg-gold/10 blur-2xl"
                  style={{ animation: `glow-breathe 5.2s ease-in-out ${index * 0.12}s infinite` }}
                />
                <span
                  aria-hidden="true"
                  className="absolute h-9 w-9 rounded-full bg-gold/6 blur-md"
                  style={{
                    animation: `glow-breathe 5.2s ease-in-out ${index * 0.12 + 0.08}s infinite`,
                  }}
                />
                {it.title === "Selah, Your Companion" ? (
                  <button
                    type="button"
                    onClick={jumpToSelah}
                    aria-label="Jump to Meet Selah"
                    className="selah-call-button relative flex h-12 w-12 items-center justify-center rounded-md bg-gold/8 text-gold transition-transform duration-300 ease-in-out hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold"
                    style={{
                      background: "oklch(0.74 0.115 85 / 0.08)",
                      animation: "selah-call-pulse 2.8s ease-in-out infinite",
                    }}
                  >
                    <it.icon className="h-5 w-5" strokeWidth={1.5} />
                  </button>
                ) : (
                  <span
                    className="relative flex h-12 w-12 items-center justify-center rounded-md bg-gold/8"
                    style={{ background: "oklch(0.74 0.115 85 / 0.08)" }}
                  >
                    <it.icon className="h-5 w-5 text-gold" strokeWidth={1.5} />
                  </span>
                )}
              </div>
              <div className="space-y-4">
                <h3 className="font-display text-3xl text-foreground md:text-4xl">{it.title}</h3>
                <p className="max-w-sm text-base leading-relaxed text-muted-foreground md:text-lg">
                  {it.body}
                </p>
              </div>
            </article>
          </ScrollReveal>
        ))}
      </div>
    </SectionShell>
  );
}

const SHARE_URL = "https://sanctumiq.app";
const SHARE_TEXT = "A quiet, ad-free sanctuary for scripture, reflection, and ministry.";

function ShareSanctuarySection() {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(SHARE_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }, []);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "SanctumIQ", text: SHARE_TEXT, url: SHARE_URL });
      } catch {
        // user cancelled
      }
    } else {
      handleCopy();
    }
  }, [handleCopy]);

  return (
    <section className="hairline-t bg-obsidian-elevated/20">
      <div className="mx-auto max-w-xl px-6 py-14 text-center">
        <Share2 className="mx-auto mb-4 h-6 w-6 text-gold/70" strokeWidth={1.5} />
        <h2 className="font-display text-2xl text-gold-soft mb-2">
          Know someone who needs a quiet place?
        </h2>
        <p className="text-sm text-muted-foreground/80 leading-relaxed mb-6">
          Share SanctumIQ with a friend, pastor, or study group.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleShare}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-gold px-5 py-2.5 text-sm font-medium text-obsidian hover:bg-gold-soft transition-colors min-h-11 min-w-[44px]"
            aria-label="Share SanctumIQ"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
          <button
            onClick={handleCopy}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-gold/30 px-5 py-2.5 text-sm font-medium text-gold-soft hover:bg-gold/8 transition-colors min-h-11 min-w-[44px]"
            aria-label="Copy link to SanctumIQ"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   MINISTRY PARTNER MODEL
   ───────────────────────────────────────────────────────────── */
function PartnerModelSection() {
  return (
    <section className="hairline-t flex min-h-[38rem] items-center bg-background">
      <div className="mx-auto max-w-5xl px-6 py-24 md:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          {/* Left: principle */}
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-gold mb-5">
              The Patronage Model
            </p>
            <h2 className="font-display text-4xl md:text-5xl text-foreground leading-[1.1] mb-6">
              One partner keeps it free for{" "}
              <span className="font-display italic text-gold-soft">many others.</span>
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-8">
              SanctumIQ will never carry ads or sell data. Ministry Partners — those who can — carry
              the cost so those who can't still have a quiet place to meet the Word.
            </p>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-gold px-6 py-3 text-sm font-medium text-obsidian transition-colors hover:bg-gold-soft"
            >
              View plans
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Right: promise pillars */}
          <ul className="grid grid-cols-1 gap-3">
            {[
              { icon: Heart, text: "No ads — ever" },
              { icon: ShieldCheck, text: "No data selling — ever" },
              { icon: BookOpen, text: "Free tier remains free — permanently" },
              { icon: Heart, text: "Partner support funds free access for others" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-4 border-b border-gold/12 px-1 py-4">
                <Icon className="h-4 w-4 text-gold shrink-0" strokeWidth={1.5} />
                <span className="text-sm text-foreground/85">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   PUBLIC FOOTER
   ───────────────────────────────────────────────────────────── */
function InstallSanctuarySection() {
  return (
    <section className="hairline-t">
      <div className="mx-auto max-w-3xl px-6 py-16 md:py-20 text-center">
        <p className="text-[11px] uppercase tracking-[0.3em] text-gold mb-3">Carry the Sanctuary</p>
        <h2 className="font-display text-3xl md:text-4xl text-foreground">Install SanctumIQ</h2>
        <p className="mt-4 mx-auto max-w-lg text-sm md:text-base text-muted-foreground leading-relaxed">
          Add it to your home screen for a quiet, fullscreen reading and reflection space — no
          browser chrome, no distractions.
        </p>
        <div className="mt-8 flex justify-center">
          <InstallAppButton />
        </div>
        <p className="mt-4 text-[11px] uppercase tracking-[0.24em] text-muted-foreground/55">
          Works on iPhone, iPad, Android &amp; desktop
        </p>
      </div>
    </section>
  );
}

function PublicFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="hairline-t rounded-t-2xl overflow-hidden">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
          <div className="flex flex-col items-center gap-3 text-center md:flex-row md:items-center md:gap-3 md:text-left">
            <img
              src="/sanctum-seal.svg"
              alt=""
              aria-hidden="true"
              className="h-10 w-10 shrink-0 opacity-90"
            />
            <div>
              <p className="font-display text-2xl text-gold-soft">
                Sanctum<span className="text-gold">IQ</span>
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground/60 italic">
                A sanctuary first. Quiet by design.
              </p>
            </div>
          </div>

          <nav
            aria-label="Footer navigation"
            className="flex flex-col items-center gap-4 text-[11px] uppercase tracking-[0.2em] md:items-end"
          >
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-gold/12 pt-4 text-muted-foreground md:justify-end">
              {[
                { to: "/about", label: "About" },
                { to: "/pricing", label: "Plans" },
                { to: "/privacy", label: "Privacy" },
                { to: "/terms", label: "Terms" },
                { to: "/contact", label: "Contact" },
              ].map(({ to, label }) => (
                <Link key={to} to={to} className="hover:text-gold-soft transition-colors">
                  {label}
                </Link>
              ))}
            </div>
          </nav>
        </div>

        <div className="mt-10 hairline-t pt-6 text-center">
          <p className="text-[11px] text-muted-foreground/50">
            © {year} <span className="text-gold-soft/70">Into Innovations, LLC</span>. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────────────────────────
   SHARED SECTION SHELL
   ───────────────────────────────────────────────────────────── */
function SectionShell({
  eyebrow,
  title,
  children,
  tone = "base",
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  tone?: "base" | "elevated";
}) {
  return (
    <section className={cn("hairline-t", tone === "elevated" && "bg-obsidian-elevated/20")}>
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="text-center mb-14">
          <p className="text-[11px] uppercase tracking-[0.3em] text-gold mb-3">{eyebrow}</p>
          <h2 className="font-display text-3xl md:text-4xl text-foreground">{title}</h2>
        </div>
        {children}
      </div>
    </section>
  );
}
