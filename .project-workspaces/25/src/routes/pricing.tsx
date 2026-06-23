import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Heart, ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Plans — SanctumIQ" },
      {
        name: "description",
        content:
          "Build, study, and proclaim — without distraction. Free is free forever; Scribe and Sanctuary unlock the full generative workspace.",
      },
      { property: "og:title", content: "Plans — SanctumIQ" },
      {
        property: "og:description",
        content:
          "Build, study, and proclaim — without distraction. Free is free forever; Scribe and Sanctuary unlock the full generative workspace.",
      },
    ],
  }),
  component: PricingPage,
});

/* ─────────────────────────────────────────────────────────────
   STRIPE PAYMENT LINKS
   Replace the base URLs with your real Stripe payment links.
   The userId is appended as client_reference_id so the webhook
   knows which Supabase user to assign the role to.
   ───────────────────────────────────────────────────────────── */
const STRIPE_BASE_LINKS = {
  minister_monthly: "https://buy.stripe.com/3cI6oH2Bu0Y80sC0H2gUM00",
  minister_annual: "https://buy.stripe.com/14A6oHdg8bCMdfoexSgUM02",
  church_partner_monthly: "https://buy.stripe.com/9B6dR98ZSayIdfo61mgUM03",
  church_partner_annual: "https://buy.stripe.com/4gM6oHgsk5eofnwblGgUM04",
} as const;

/** One-time, pay-what-you-want free-will offering. Customer chooses amount on Stripe. */
const SOW_A_SEED_LINK = "https://buy.stripe.com/cNi14n7VO22c7V475qgUM05";

function buildStripeLink(base: string, userId: string | undefined): string {
  if (!userId) return "/auth?redirect=/pricing";
  return `${base}?client_reference_id=${userId}`;
}

type Interval = "monthly" | "annual";

function PricingPage() {
  const [interval, setInterval] = useState<Interval>("monthly");
  const { user } = useAuth();
  const uid = user?.id;

  return (
    <div className="min-h-screen bg-obsidian text-foreground">
      <header
        className="hairline-b bg-obsidian/85 backdrop-blur-md rounded-b-2xl overflow-hidden"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/sanctum-seal.svg"
              alt=""
              aria-hidden="true"
              className="h-6 w-6 opacity-90"
              style={{ filter: "drop-shadow(0 0 4px rgba(201,168,76,0.25))" }}
            />
            <span className="font-display text-2xl tracking-wide text-gold-soft">
              Sanctum<span className="text-gold">IQ</span>
            </span>
          </Link>
          <Link
            to="/"
            className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-gold-soft transition-colors"
          >
            ← Home
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-[11px] uppercase tracking-[0.3em] text-gold mb-4">
            Choose your level of stewardship
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-foreground mb-4">
            Build, study, and proclaim — without distraction.
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
            SanctumIQ is your private, ad-free scripture workspace for reflection, creation, and
            ministry. Free is truly free, forever.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <button
            onClick={() => setInterval("monthly")}
            className={cn(
              "text-sm px-4 py-2 rounded-md transition-colors",
              interval === "monthly"
                ? "bg-gold/15 text-gold-soft"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setInterval("annual")}
            className={cn(
              "relative text-sm px-4 py-2 rounded-md transition-colors",
              interval === "annual"
                ? "bg-gold/15 text-gold-soft"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Annual
            <span className="absolute -top-2.5 -right-1 text-[9px] uppercase tracking-wider text-obsidian bg-gold rounded-full px-1.5 py-0.5 font-medium">
              2 mo free
            </span>
          </button>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
          {/* Free */}
          <PlanCard
            eyebrow="Enter. Reflect. Capture."
            name="Free"
            price="$0"
            priceSub="forever, no asterisk"
            description="Your private, ad-free scripture sanctuary for reading, reflection, and creative expression."
            features={[
              "Parallel Bible Reader (KJV + ASV)",
              "Verse highlighting, bookmarks, and Vault",
              "Selah AI reflections",
              "Verse-linked notes + stylus capture",
              "Poem Scroll PDF — Heart Cry, Psalm, Proverb (mobile share + print-ready)",
              "Deep Dive handoff (Perplexity, ChatGPT)",
              "Public Board — 1 board, up to 5 anchors",
              "No ads, no tracking, no background processes",
            ]}
            cta="Get Started Free"
            ctaHref={user ? "/reader" : "/auth"}
            ctaExternal={false}
            featured={false}
          />

          {/* Scribe */}
          <PlanCard
            eyebrow="Design. Build. Proclaim."
            name="Scribe"
            price={interval === "monthly" ? "$9.99" : "$8.25"}
            priceSub={interval === "monthly" ? "per month" : "per month, billed $99/yr"}
            description="For those called to build messages, structure insight, and bring the Word to life."
            features={[
              "Everything in Free",
              "Sermon Composer (streaming AI)",
              "Scriptural Blueprint planner",
              "Service & program builder",
              "Auto-generated print-ready program PDFs",
              "AI flyer & invitation design",
              "Unlimited Board anchors + every theme + video & audio",
              "Priority support",
            ]}
            cta="Start Building"
            subCta="Create your first message in minutes"
            ctaHref={buildStripeLink(
              interval === "monthly"
                ? STRIPE_BASE_LINKS.minister_monthly
                : STRIPE_BASE_LINKS.minister_annual,
              uid,
            )}
            ctaExternal={!!uid}
            featured
          />

          {/* Sanctuary */}
          <PlanCard
            eyebrow="Lead. Equip. Multiply."
            name="Sanctuary"
            price={interval === "monthly" ? "$24.99" : "$20.75"}
            priceSub={interval === "monthly" ? "per month" : "per month, billed $249/yr"}
            description="Scale your ministry or organization with shared access, structure, and coordination."
            features={[
              "Everything in Scribe",
              "Up to 5 staff seats — equip your whole team",
              "Coordinate workflows across your ministry",
              "Sanctuary badge — visible patron of the free tier",
              "Your subscription funds free access for others",
              "Early access + dedicated support channel",
            ]}
            cta="Start Team Plan"
            ctaHref={buildStripeLink(
              interval === "monthly"
                ? STRIPE_BASE_LINKS.church_partner_monthly
                : STRIPE_BASE_LINKS.church_partner_annual,
              uid,
            )}
            ctaExternal={!!uid}
            featured={false}
            patronage
          />
        </div>

        {/* What's Free vs Paid — clarity divider */}
        <div className="mt-10 mx-auto max-w-2xl text-center">
          <p className="text-sm text-muted-foreground/85 leading-relaxed">
            <span className="text-gold-soft">Free</span> gives you everything you need for personal
            study. <span className="text-gold-soft">Scribe</span> unlocks the tools to build and
            share.
          </p>
        </div>

        {/* Sow a Seed — one-time free-will offering (5th option) */}
        <div className="mt-6">
          <div className="hairline rounded-xl bg-gradient-to-br from-gold/[0.06] to-transparent px-6 py-7 md:px-10 md:py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="flex items-start gap-4 min-w-0">
              <div className="shrink-0 grid place-items-center h-11 w-11 rounded-full bg-gold/10 ring-1 ring-gold/30">
                <Heart className="h-5 w-5 text-gold" strokeWidth={1.75} fill="currentColor" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.25em] text-gold mb-1">Patronage</p>
                <h3 className="font-display text-2xl text-foreground leading-tight">Sow a Seed</h3>
                <p className="text-sm text-muted-foreground/85 leading-relaxed mt-1.5 max-w-xl">
                  A one-time, free-will offering — give whatever the Spirit places on your heart.
                  Every seed helps keep the Sanctuary tier free for those who can't give.
                </p>
              </div>
            </div>
            <a
              href={SOW_A_SEED_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center justify-center gap-2 rounded-md border border-gold/50 bg-gold/5 px-5 py-2.5 text-sm font-medium text-gold transition-colors hover:bg-gold/15 hover:border-gold"
            >
              <Heart className="h-4 w-4" strokeWidth={2} fill="currentColor" />
              Sow a Seed
            </a>
          </div>
        </div>

        {/* Patronage statement */}
        <div className="mt-14 mx-auto max-w-2xl text-center">
          <div className="hairline rounded-xl bg-obsidian-elevated/30 px-6 py-8 md:px-10">
            <Heart className="h-5 w-5 text-gold mx-auto mb-4" strokeWidth={1.5} />
            <p className="font-display italic text-xl md:text-2xl text-gold-soft leading-snug mb-3">
              One Sanctuary patron helps provide access for many others.
            </p>
            <p className="text-sm text-muted-foreground/80 leading-relaxed">
              SanctumIQ will never carry ads or sell data. The Free tier is permanent. Paid
              subscribers carry the cost so the Word stays accessible to anyone who needs a quiet
              place to meet it.
            </p>
          </div>
        </div>

        {/* Closing CTA */}
        <div className="mt-14 mx-auto max-w-2xl text-center">
          <p className="font-display italic text-2xl md:text-3xl text-gold-soft leading-snug mb-2">
            Start in the Free tier.
          </p>
          <p className="text-sm text-muted-foreground/85 leading-relaxed mb-6">
            Upgrade when you&rsquo;re ready to build.
          </p>
          <Link
            to={user ? "/reader" : "/auth"}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-gold px-6 py-3 text-sm font-medium text-obsidian hover:bg-gold-soft transition-colors"
          >
            Enter SanctumIQ
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* FAQ — most common question */}
        <div className="mt-10 text-center">
          <p className="text-xs text-muted-foreground/60">
            Questions?{" "}
            <Link
              to="/faq"
              className="text-gold/70 hover:text-gold-soft underline underline-offset-2 transition-colors"
            >
              Read the FAQ
            </Link>{" "}
            or{" "}
            <Link
              to="/contact"
              className="text-gold/70 hover:text-gold-soft underline underline-offset-2 transition-colors"
            >
              reach out
            </Link>{" "}
            — we answer every message.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PLAN CARD
   ───────────────────────────────────────────────────────────── */
function PlanCard({
  eyebrow,
  name,
  price,
  priceSub,
  description,
  features,
  cta,
  subCta,
  ctaHref,
  ctaExternal,
  featured,
  patronage,
}: {
  eyebrow: string;
  name: string;
  price: string;
  priceSub: string;
  description: string;
  features: string[];
  cta: string;
  subCta?: string;
  ctaHref: string;
  ctaExternal: boolean;
  featured: boolean;
  patronage?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-xl p-7 md:p-8 transition-colors",
        featured
          ? "border border-gold/50 bg-gradient-to-b from-gold/8 to-transparent"
          : "hairline bg-obsidian-elevated/30",
      )}
      style={
        featured
          ? { background: "linear-gradient(to bottom, oklch(0.74 0.115 85 / 0.08), transparent)" }
          : undefined
      }
    >
      {/* Featured badge */}
      {featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium text-obsidian">
            <Sparkles className="h-3 w-3" />
            Most Popular
          </span>
        </div>
      )}

      {/* Eyebrow */}
      <p className="text-[10px] uppercase tracking-[0.25em] text-gold/70 mb-3">{eyebrow}</p>

      {/* Name */}
      <h2 className="font-display text-2xl text-gold-soft mb-1">{name}</h2>

      {/* Price */}
      <div className="mb-2">
        <span className="font-display text-4xl text-foreground">{price}</span>
      </div>
      <p className="text-xs text-muted-foreground/60 mb-4">{priceSub}</p>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed mb-6 pb-6 hairline-b">
        {description}
      </p>

      {/* Features */}
      <ul className="space-y-3 flex-1 mb-8">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-3 text-sm text-foreground/85">
            <Check
              className={cn(
                "h-4 w-4 mt-0.5 flex-shrink-0",
                featured ? "text-gold" : "text-gold/60",
              )}
              strokeWidth={2}
            />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      {ctaExternal ? (
        <a
          href={ctaHref}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 text-sm font-medium transition-colors",
            featured
              ? "bg-gold text-obsidian hover:bg-gold-soft"
              : patronage
                ? "border border-gold/50 text-gold-soft hover:bg-gold/10"
                : "border border-gold/30 text-gold-soft hover:bg-gold/8",
          )}
        >
          {cta}
          <ArrowRight className="h-4 w-4" />
        </a>
      ) : (
        <Link
          to={ctaHref as "/reader" | "/auth"}
          className="inline-flex items-center justify-center rounded-md border border-gold/30 px-6 py-3 text-sm text-gold-soft hover:bg-gold/8 transition-colors"
        >
          {cta}
        </Link>
      )}
      {subCta && (
        <p className="mt-2.5 text-center text-[11px] text-muted-foreground/70 italic">{subCta}</p>
      )}
    </div>
  );
}
