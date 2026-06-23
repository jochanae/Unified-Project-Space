import { Link } from "@tanstack/react-router";
import { ArrowRight, Quote, Play, Share2 } from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   THE DIGITAL VERANDA — Board pillar (landing page)
   ───────────────────────────────────────────────────────────── */
export function DigitalVerandaSection() {
  return (
    <section className="hairline-t flex min-h-[44rem] items-center bg-obsidian">
      <div className="mx-auto w-full max-w-6xl px-6 py-24 md:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-14 lg:gap-20 items-center">
          {/* Left: copy */}
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-gold mb-5">
              The Third Pillar — Share
            </p>
            <h2 className="font-display text-4xl md:text-5xl text-foreground leading-[1.1] mb-6">
              Beyond Study.
              <br />
              <span className="font-display italic text-gold-soft">Your Digital Veranda.</span>
            </h2>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
              A cinematic, ad-free space to share the scriptures, poetry, and media that anchor your
              soul. One quiet link — your name, your anchor, your work — for those you serve.
            </p>

            <ul className="space-y-3 mb-10">
              {[
                { label: "Free", text: "One public board to share what anchors you." },
                {
                  label: "Scribe",
                  text: "Unlimited items, video & audio, Obsidian & Gold themes.",
                },
              ].map(({ label, text }) => (
                <li key={label} className="flex items-start gap-4 border-b border-gold/12 py-3">
                  <span className="font-display text-xs uppercase tracking-[0.25em] text-gold w-16 shrink-0 pt-0.5">
                    {label}
                  </span>
                  <span className="text-sm text-foreground/85 leading-relaxed">{text}</span>
                </li>
              ))}
            </ul>

            <Link
              to="/auth"
              search={{ redirect: "/account/board", mode: "signup" }}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-gold/50 bg-gold/5 px-7 py-3.5 font-display text-sm tracking-[0.18em] text-gold uppercase transition-colors hover:bg-gold/15"
            >
              Curate Your Sanctuary
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-3 text-[11px] uppercase tracking-[0.25em] text-muted-foreground/60">
              Sign in → lands you on Your Board
            </p>
          </div>

          {/* Right: editorial board mockup */}
          <BoardMockup />
        </div>
      </div>
    </section>
  );
}

function BoardMockup() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="absolute -inset-8 rounded-[2rem] bg-gold/8 blur-3xl"
        style={{ animation: "glow-breathe 6s ease-in-out infinite" }}
      />
      {/* Phone frame */}
      <div className="relative rounded-[2rem] border border-gold/25 bg-obsidian/80 p-3 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] backdrop-blur">
        <div className="rounded-[1.5rem] border border-white/5 bg-obsidian p-6 overflow-hidden">
          {/* Identity */}
          <div className="text-center space-y-2 pb-5">
            <div className="mx-auto h-12 w-12 rounded-full border border-gold/40 bg-gold/10 flex items-center justify-center">
              <span className="font-display text-gold text-lg">A</span>
            </div>
            <p className="font-display text-foreground text-base">@aaron</p>
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Minister · Poet
            </p>
          </div>

          {/* Anchor scripture */}
          <div className="border-y border-gold/15 py-4 my-4 text-center">
            <p className="font-display italic text-gold-soft text-sm leading-relaxed">
              "Be still, and know that I am God."
            </p>
            <p className="text-[10px] uppercase tracking-[0.25em] text-gold mt-2">Psalm 46:10</p>
          </div>

          {/* Diamond divider */}
          <div className="flex items-center justify-center gap-2 py-2" aria-hidden>
            <span className="h-px w-8 bg-gold/30" />
            <span className="inline-block h-1.5 w-1.5 rotate-45 bg-gold" />
            <span className="h-px w-8 bg-gold/30" />
          </div>

          {/* Poem */}
          <div className="py-4 space-y-2">
            <div className="flex items-center gap-2">
              <Quote className="h-3 w-3 text-gold" strokeWidth={1.5} />
              <span className="text-[10px] uppercase tracking-[0.25em] text-gold">Poem</span>
            </div>
            <p className="font-display text-foreground/90 text-sm italic leading-relaxed">
              In the hush before dawn,
              <br />
              the Word is already speaking.
            </p>
          </div>

          {/* Diamond divider */}
          <div className="flex items-center justify-center gap-2 py-2" aria-hidden>
            <span className="h-px w-8 bg-gold/30" />
            <span className="inline-block h-1.5 w-1.5 rotate-45 bg-gold" />
            <span className="h-px w-8 bg-gold/30" />
          </div>

          {/* Video tile */}
          <div className="py-4">
            <div className="aspect-video rounded-md border border-gold/20 bg-gradient-to-br from-obsidian to-gold/10 flex items-center justify-center">
              <Play className="h-6 w-6 text-gold" fill="currentColor" />
            </div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-gold mt-2 text-center">
              Sunday Sermon
            </p>
          </div>
        </div>
      </div>

      {/* Share badge */}
      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full border border-gold/40 bg-obsidian px-4 py-1.5">
        <Share2 className="h-3 w-3 text-gold" strokeWidth={1.5} />
        <span className="text-[10px] uppercase tracking-[0.25em] text-gold">
          sanctumiq.app/@aaron
        </span>
      </div>
    </div>
  );
}
