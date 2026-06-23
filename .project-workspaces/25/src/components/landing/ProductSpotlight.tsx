import { BookOpen, Bookmark, Coins, NotebookPen } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveLandingPreviewVerse, type LandingPreviewVerse } from "@/lib/landingPreview";

export function ProductSpotlight() {
  const [previewVerse, setPreviewVerse] = useState<LandingPreviewVerse | null>(null);
  const [isTransitioning] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadPreview() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "landing_bible_preview")
        .maybeSingle();

      const resolved = await resolveLandingPreviewVerse(data?.setting_value ?? null);
      if (active) setPreviewVerse(resolved);
    }

    void loadPreview();

    return () => {
      active = false;
    };
  }, []);

  const verse = previewVerse ?? {
    book: "Psalms",
    chapter: 46,
    verse: 10,
    reference: "Psalms 46:10",
    kjv: "Be still, and know that I am God: I will be exalted among the heathen, I will be exalted in the earth.",
    modern:
      "Be still, and know that I am God. I will be exalted among the nations. I will be exalted in the earth.",
  };
  const previewMotionClass = useMemo(
    () =>
      isTransitioning ? "animate-[fade-in_0.9s_ease-out]" : "transition-all duration-700 ease-out",
    [isTransitioning],
  );

  return (
    <section className="hairline-t flex min-h-[40rem] items-center bg-obsidian/35 md:min-h-[46rem]">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-[11px] uppercase tracking-[0.3em] text-gold">Product Spotlight</p>
          <h2 className="font-display text-3xl text-foreground md:text-4xl">
            A sanctuary built for deep work with the Word.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground md:text-lg">
            Not a dashboard full of noise—just a refined reading space, private notes, and quiet
            stewardship tools that reveal themselves with calm clarity.
          </p>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="relative overflow-hidden rounded-lg border border-gold/15 bg-obsidian-elevated/50 p-4 sm:p-6">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 18% 22%, oklch(0.74 0.115 85 / 0.14), transparent 28%), radial-gradient(circle at 82% 18%, oklch(0.87 0.09 88 / 0.08), transparent 22%)",
              }}
            />

            <div className="relative grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="overflow-hidden rounded-md border border-gold/12 bg-obsidian/70 backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-gold/12 px-4 py-3">
                  <p className="font-display text-lg text-gold-soft">Bible Reader</p>
                  <div className="flex items-center gap-1 rounded-full border border-gold/15 bg-background/40 p-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    <span className="rounded-full bg-accent px-3 py-1 text-gold-soft">KJV</span>
                    <span className="rounded-full px-3 py-1">Modern</span>
                  </div>
                </div>
                <div className={`grid gap-px bg-gold/10 md:grid-cols-2 ${previewMotionClass}`}>
                  {[
                    {
                      version: "KJV",
                      verse: verse.kjv,
                    },
                    {
                      version: "Modern",
                      verse: verse.modern,
                    },
                  ].map((column) => (
                    <div key={column.version} className="bg-obsidian/90 px-4 py-5">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-gold">
                        {column.version}
                      </p>
                      <p className="mt-4 font-display text-2xl leading-tight text-foreground">
                        {column.verse}
                      </p>
                      <p className="mt-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        {verse.reference}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4">
                <FloatingPanel
                  icon={NotebookPen}
                  title="Verse Notes"
                  body="Quietly gathered beside the passage that stirred them."
                />
                <FloatingPanel
                  icon={Bookmark}
                  title="Bookmarks"
                  body="Kept close for return visits, never lost in clutter."
                />
                <FloatingPanel
                  icon={Coins}
                  title="Steward Ledger"
                  body="A private record of giving, separate from the reading flow."
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {[
              "Parallel scripture keeps comparison immediate without breaking focus.",
              "Notes, bookmarks, and reflections remain tied to the verses that formed them.",
              "Stewardship tools stay available, but never crowd the sanctuary itself.",
            ].map((line) => (
              <div
                key={line}
                className="rounded-md border border-gold/12 bg-obsidian-elevated/35 px-5 py-4"
              >
                <div className="flex items-start gap-3">
                  <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-gold" strokeWidth={1.5} />
                  <p className="text-sm leading-relaxed text-foreground/85">{line}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FloatingPanel({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof BookOpen;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-md border border-gold/12 bg-obsidian/70 px-4 py-4 backdrop-blur-sm transition-transform duration-700 ease-out hover:-translate-y-1">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-md border border-gold/15 bg-gold/8 text-gold">
          <Icon className="h-4 w-4" strokeWidth={1.5} />
        </span>
        <div>
          <p className="font-display text-xl text-gold-soft">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
        </div>
      </div>
    </div>
  );
}
