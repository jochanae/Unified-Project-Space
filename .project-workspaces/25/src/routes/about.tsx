import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Feather, Shield, Sparkles, PenLine, Share2 } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — SanctumIQ" },
      {
        name: "description",
        content:
          "A digital sanctuary for Scripture and reflection. Three quiet layers — Sanctuary, Workspace, Board — built by Into Innovations.",
      },
      { property: "og:title", content: "About — SanctumIQ" },
      {
        property: "og:description",
        content:
          "Sanctuary, Workspace, Board. A quiet, ad-free, zero-trace home for the Word — handcrafted by Into Innovations.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-obsidian text-foreground">
      {/* Header */}
      <header className="hairline-b bg-obsidian/85 backdrop-blur-md rounded-b-2xl overflow-hidden">
        <div
          className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
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

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(201,168,76,0.10), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl px-6 py-24 md:py-32 text-center">
          <p className="text-[11px] uppercase tracking-[0.32em] text-gold mb-5">The Story</p>
          <h1 className="font-display text-4xl md:text-6xl text-foreground leading-[1.05] mb-6">
            A sanctuary,
            <br />
            <span className="italic text-gold-soft">not a platform.</span>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
            In a world of constant noise and scrolling, where is your quiet place? SanctumIQ is a
            digital architecture for the soul — where the Word meets your world, in total privacy.
          </p>
        </div>
      </section>

      {/* Three Pillars — the narrative */}
      <section className="mx-auto max-w-5xl px-6 pb-20 md:pb-28">
        <div className="text-center mb-12">
          <p className="text-[11px] uppercase tracking-[0.3em] text-gold mb-3">
            Three quiet layers
          </p>
          <h2 className="font-display text-3xl md:text-4xl text-foreground">
            Read. Build. Share — on your terms.
          </h2>
          <p className="mt-4 text-sm md:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Each layer has its own purpose, and never bleeds into the next. Your Sanctuary stays
            private even when you publish a Board.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: BookOpen,
              eyebrow: "Layer 1",
              title: "The Sanctuary",
              tag: "Private read",
              body: "KJV and ASV bundled offline. Quantum verse column, audio narration, Daily Word, Selah, the Altar, and a reverent Service Mode for live worship.",
            },
            {
              icon: PenLine,
              eyebrow: "Layer 2",
              title: "The Workspace",
              tag: "Private create",
              body: "Sermon Composer with AI co-author lenses, plan generator, poems with deep-dive commentary, ink notes, and stewardship ledger — all yours.",
            },
            {
              icon: Share2,
              eyebrow: "Layer 3",
              title: "The Board",
              tag: "Public, opt-in",
              body: "One quiet link at /your-handle. Six premium themes, six item types, one share-worthy standard. Not a feed — a standard.",
            },
          ].map(({ icon: Icon, eyebrow, title, tag, body }) => (
            <div
              key={title}
              className="hairline rounded-2xl bg-obsidian-elevated/40 backdrop-blur-sm p-6 transition-colors hover:bg-obsidian-elevated/60 flex flex-col"
            >
              <div
                className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  background: "rgba(201,168,76,0.10)",
                  boxShadow: "inset 0 0 0 1px rgba(201,168,76,0.30)",
                }}
              >
                <Icon className="h-5 w-5 text-gold" strokeWidth={1.5} />
              </div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-gold/80 mb-2">
                {eyebrow} · {tag}
              </p>
              <h3 className="font-display text-xl text-foreground mb-3">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Zero-Trace Pledge */}
      <section className="hairline-t hairline-b bg-obsidian-elevated/20">
        <div className="mx-auto max-w-3xl px-6 py-20 md:py-24 text-center">
          <p className="text-[11px] uppercase tracking-[0.3em] text-gold mb-5">The pledge</p>
          <h2 className="font-display text-3xl md:text-4xl text-foreground leading-[1.15] mb-6">
            We don't watch you read.
            <br />
            <span className="italic text-gold-soft">We don't sell your prayers.</span>
          </h2>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
            The Altar is between you and the Truth. Nothing is stored server-side unless you choose
            to keep it. No ads. No tracking pixels. No attention economy.
          </p>

          <div className="mt-10 grid gap-5 sm:grid-cols-3 text-left">
            {[
              {
                icon: Shield,
                title: "Zero-trace by default",
                body: "What you lay down, stays down.",
              },
              {
                icon: Feather,
                title: "Quiet by design",
                body: "Obsidian canvas, gold hairlines, no noise.",
              },
              {
                icon: Sparkles,
                title: "Yours to own",
                body: "Export, delete, and walk away anytime.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="hairline rounded-xl bg-obsidian/40 p-5">
                <div
                  className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-gold/25"
                  style={{ background: "rgba(201,168,76,0.08)" }}
                >
                  <Icon className="h-4 w-4 text-gold" strokeWidth={1.5} />
                </div>
                <h3 className="font-display text-base text-gold-soft mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="mx-auto max-w-2xl px-6 py-20 md:py-28 text-center">
        <p className="text-[11px] uppercase tracking-[0.32em] text-gold mb-5">Our Mission</p>
        <h2 className="font-display text-3xl md:text-5xl text-foreground leading-[1.1] mb-8">
          To build a sanctuary for the Word —
          <br />
          <span className="italic text-gold-soft">where quiet is kept, not manufactured.</span>
        </h2>
        <div className="space-y-5 text-base md:text-lg text-muted-foreground leading-relaxed">
          <p>
            SanctumIQ exists to give Scripture the space it deserves. We design for presence, not
            performance. We protect the quiet where understanding grows, and resist distraction by
            design.
          </p>
          <p className="font-display text-gold-soft text-lg md:text-xl leading-[1.6]">
            Read in private.
            <br />
            Build in peace.
            <br />
            Share when it carries meaning.
          </p>
        </div>
        <div className="hairline-t mt-12 pt-6 mx-auto max-w-xs">
          <p className="text-[11px] uppercase tracking-[0.32em] text-gold">
            — Crafted by Into Innovations, LLC
          </p>
        </div>
      </section>

      {/* The Builders / CTA */}
      <section className="mx-auto max-w-2xl px-6 pb-24 md:pb-32 text-center">
        <div className="hairline-t pt-12">
          <p className="text-[11px] uppercase tracking-[0.3em] text-gold mb-4">The Builders</p>
          <h2 className="font-display text-2xl md:text-3xl text-foreground mb-5">
            Into Innovations, LLC
          </h2>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-8">
            A small studio in the State of Georgia, building tools we wished existed. SanctumIQ is
            our most personal work — and we read every message that comes through.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/reader"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-gold px-6 py-3 text-sm font-medium text-obsidian hover:bg-gold-soft transition-colors"
            >
              Enter the Sanctuary
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-gold/40 bg-obsidian/40 px-6 py-3 text-sm uppercase tracking-[0.2em] text-gold-soft hover:bg-gold/10 transition-colors"
            >
              Reach Us
            </Link>
          </div>
        </div>
      </section>

      {/* Footer line */}
      <footer className="mx-auto max-w-3xl px-6 pb-10 text-center">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground/60">
          © {new Date().getFullYear()} Into Innovations, LLC
        </p>
      </footer>
    </div>
  );
}
