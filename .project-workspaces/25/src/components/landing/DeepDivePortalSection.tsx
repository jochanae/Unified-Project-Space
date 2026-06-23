import { Compass, ArrowUpRight, Languages, BookOpen, Sparkles } from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   DEEP DIVE — "Beyond the Page"
   Honest framing of the Deep Dive handoff. Static mockup only —
   no live demo. Sits between Selah (reflection) and Board (share).
   ───────────────────────────────────────────────────────────── */
export function DeepDivePortalSection() {
  return (
    <section className="hairline-t flex min-h-[40rem] items-center bg-obsidian">
      <div className="mx-auto w-full max-w-6xl px-6 py-24 md:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.05fr] gap-14 lg:gap-20 items-center">
          {/* Left: copy */}
          <div>
            <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-gold mb-5">
              <Compass className="h-3.5 w-3.5" strokeWidth={1.25} />
              Deep Dive
            </p>
            <h2 className="font-display text-4xl md:text-5xl text-foreground leading-[1.1] mb-6">
              Beyond the Page.
              <br />
              <span className="font-display italic text-gold-soft">
                Every Translation. Every Tongue.
              </span>
            </h2>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
              Read in the Sanctuary. Research anywhere. Tap any verse to compare wording across
              major translations, surface original Greek and Hebrew, or ask your own question —
              handed off to the research tool of your choice with the passage already in context.
            </p>

            <ul className="space-y-3 mb-8">
              {[
                {
                  icon: Languages,
                  label: "Compare",
                  text: "Side-by-side wording across major translations.",
                },
                {
                  icon: BookOpen,
                  label: "Origin",
                  text: "Original Greek, Hebrew, and historical context.",
                },
                {
                  icon: Sparkles,
                  label: "Inquire",
                  text: "Your own question — passage attached automatically.",
                },
              ].map(({ icon: Icon, label, text }) => (
                <li key={label} className="flex items-start gap-4 border-b border-gold/12 py-3">
                  <Icon className="h-4 w-4 text-gold mt-0.5 shrink-0" strokeWidth={1.25} />
                  <span className="font-display text-xs uppercase tracking-[0.25em] text-gold w-20 shrink-0 pt-0.5">
                    {label}
                  </span>
                  <span className="text-sm text-foreground/85 leading-relaxed">{text}</span>
                </li>
              ))}
            </ul>

            <p className="font-display italic text-xs text-muted-foreground/70 leading-relaxed max-w-md">
              Deep Dive opens your preferred research tool. Selah brings you back when you're ready.
            </p>
          </div>

          {/* Right: static menu mockup */}
          <DeepDiveMenuMockup />
        </div>
      </div>
    </section>
  );
}

function DeepDiveMenuMockup() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="absolute -inset-8 rounded-[2rem] bg-gold/8 blur-3xl"
        style={{ animation: "glow-breathe 6s ease-in-out infinite" }}
      />

      {/* Menu card */}
      <div className="relative rounded-2xl border border-gold/25 bg-obsidian/90 p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] backdrop-blur">
        {/* Verse context */}
        <div className="border-b border-gold/15 pb-4 mb-5">
          <p className="text-[10px] uppercase tracking-[0.28em] text-gold mb-2">John 1:1</p>
          <p className="font-display italic text-foreground/90 text-sm leading-relaxed">
            "In the beginning was the Word, and the Word was with God, and the Word was God."
          </p>
        </div>

        {/* Translation chips */}
        <div className="mb-5">
          <p className="text-[10px] uppercase tracking-[0.24em] text-gold/70 mb-2.5">Compare in</p>
          <div className="flex flex-wrap gap-1.5">
            {["NIV", "ESV", "NKJV", "NLT", "MSG", "AMP"].map((v) => (
              <span
                key={v}
                className="rounded-md border border-gold/25 bg-gold/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-gold-soft"
              >
                {v}
              </span>
            ))}
          </div>
        </div>

        {/* Seek Wisdom row */}
        <div className="mb-5 rounded-md border border-gold/18 bg-background/30 p-3">
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.24em] text-gold/70 mb-2">
            <Sparkles className="h-3 w-3" strokeWidth={1.25} />
            Seek Wisdom
          </p>
          <p className="text-xs text-muted-foreground italic leading-relaxed">
            What does the Greek <span className="text-foreground/80 not-italic">"Logos"</span> mean
            here…
          </p>
        </div>

        {/* Provider buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-gold/25 bg-gold/5 px-3 text-[10px] uppercase tracking-[0.2em] text-gold-soft"
          >
            ChatGPT
            <ArrowUpRight className="h-3 w-3" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            disabled
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-gold/25 bg-gold/5 px-3 text-[10px] uppercase tracking-[0.2em] text-gold-soft"
          >
            Perplexity
            <ArrowUpRight className="h-3 w-3" strokeWidth={1.5} />
          </button>
        </div>

        {/* Footer note */}
        <p className="mt-4 pt-3 border-t border-gold/12 text-center text-[10px] uppercase tracking-[0.22em] text-muted-foreground/55">
          Powered by Selah
        </p>
      </div>
    </div>
  );
}
