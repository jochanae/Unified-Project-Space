import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — SanctumIQ" },
      {
        name: "description",
        content:
          "Is SanctumIQ really free? What does Architect unlock? Privacy, mobile, and the Poem Scroll exporter — answered.",
      },
      { property: "og:title", content: "FAQ — SanctumIQ" },
      {
        property: "og:description",
        content:
          "Is SanctumIQ really free? What does Architect unlock? Privacy, mobile, and the Poem Scroll exporter — answered.",
      },
    ],
  }),
  component: FaqPage,
});

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "Is SanctumIQ really free?",
    a: (
      <>
        Yes. <span className="text-gold-soft">Sanctuary</span> includes the Parallel Bible Reader
        (KJV + ASV), verse highlighting, bookmarks, the Vault, Selah AI reflections, verse-linked
        notes with stylus capture, and the Poem Scroll PDF exporter — Heart Cry, Psalm, and Proverb
        templates with mobile share and print-ready quality. No credit card. No expiration. No ads,
        no tracking.
      </>
    ),
  },
  {
    q: "What does Architect unlock?",
    a: (
      <>
        <span className="text-gold-soft">Architect</span> unlocks the tools to build and proclaim —
        Sermon Composer with streaming AI, the Scriptural Blueprint planner, the service & program
        builder, and AI-powered content workflows.{" "}
        <span className="text-gold-soft">Church Partner</span> extends Architect with up to 5 staff
        seats and shared workflows for your whole team.{" "}
        <Link to="/pricing" className="text-gold-soft underline underline-offset-2">
          See plans
        </Link>
        .
      </>
    ),
  },
  {
    q: "Is my data private?",
    a: (
      <>
        Yes. SanctumIQ is ad-free and designed as a private workspace. Your notes, highlights, and
        ledger entries are protected by row-level security and tied to your account alone. AI
        requests (Selah, Sermon Composer) are sent to model providers solely to return your response
        — they are not used for training. See the{" "}
        <Link to="/privacy" className="text-gold-soft underline underline-offset-2">
          Privacy
        </Link>{" "}
        page for the full policy.
      </>
    ),
  },
  {
    q: "Can I use this on mobile?",
    a: (
      <>
        Yes. SanctumIQ is fully optimized for phone and tablet, with native share sheets for Poem
        Scroll PDFs, offline support for reading, and a dedicated iOS preview card so Safari can
        hand the file straight to Mail, Messages, or any installed app. Manage or cancel a
        subscription anytime from{" "}
        <Link to="/account/billing" className="text-gold-soft underline underline-offset-2">
          Account → Billing
        </Link>
        .
      </>
    ),
  },
];

function FaqPage() {
  return (
    <div className="min-h-screen bg-obsidian text-foreground">
      <header
        className="hairline-b bg-obsidian/85 backdrop-blur-md rounded-b-2xl overflow-hidden"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="/sanctum-seal.svg" alt="" aria-hidden="true" className="h-6 w-6 opacity-90" />
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

      <div className="mx-auto max-w-2xl px-6 py-20 md:py-24">
        <div className="text-center mb-12">
          <p className="text-[11px] uppercase tracking-[0.3em] text-gold mb-4">
            Questions & Answers
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-foreground mb-4">
            Frequently asked.
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Pricing, privacy, the Poem Scroll exporter, and how SanctumIQ behaves on your phone.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-3">
          {FAQS.map((item, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="group border-0 rounded-xl border border-gold/15 bg-obsidian-elevated/30 backdrop-blur-md shadow-[0_1px_0_0_color-mix(in_oklab,var(--gold)_8%,transparent)_inset] transition-all duration-300 data-[state=open]:border-gold/40 data-[state=open]:bg-obsidian-elevated/50 data-[state=open]:shadow-[0_0_0_1px_color-mix(in_oklab,var(--gold)_22%,transparent),0_8px_32px_-12px_color-mix(in_oklab,var(--gold)_28%,transparent)]"
            >
              <AccordionTrigger className="text-left text-foreground hover:text-gold-soft hover:no-underline px-5 md:px-6 py-5 data-[state=open]:text-gold-soft">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground/90 leading-relaxed px-5 md:px-6 pb-5">
                <div className="border-t border-gold/15 pt-4">{item.a}</div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-10 text-center text-xs text-muted-foreground/60">
          Still curious?{" "}
          <Link
            to="/contact"
            className="text-gold/70 hover:text-gold-soft underline underline-offset-2 transition-colors"
          >
            Reach out
          </Link>{" "}
          — every message gets a reply.
        </div>
      </div>
    </div>
  );
}
