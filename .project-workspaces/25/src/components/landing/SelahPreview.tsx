import { useEffect, useMemo, useState } from "react";

import { Loader2, Send, Sparkles } from "lucide-react";

import { useSelah } from "@/hooks/useSelah";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const SELAH_KEYFRAMES = `
  @keyframes selah-gold-breathe {
    0%, 100% { opacity: 0.4; transform: scale(1); box-shadow: 0 0 0 0 color-mix(in oklab, var(--gold) 12%, transparent); }
    50% { opacity: 0.9; transform: scale(1.015); box-shadow: 0 0 42px 0 color-mix(in oklab, var(--gold) 24%, transparent); }
  }
  @keyframes selah-dot-wave {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.38; }
    30% { transform: translateY(-4px); opacity: 1; }
  }
  @keyframes selah-word-bloom {
    0% { opacity: 0; filter: blur(8px); transform: translateY(10px); }
    100% { opacity: 1; filter: blur(0); transform: translateY(0); }
  }
  @keyframes selah-char-wave {
    0% { transform: translateY(2px); }
    45% { transform: translateY(-2px); }
    100% { transform: translateY(0); }
  }
  @keyframes selah-reflection-exit {
    0% { opacity: 1; filter: blur(0); transform: translateY(0); }
    100% { opacity: 0; filter: blur(6px); transform: translateY(8px); }
  }
`;

export function SelahPreview() {
  const [feeling, setFeeling] = useState("");
  const [renderedReflection, setRenderedReflection] = useState("");
  const [isExiting, setIsExiting] = useState(false);
  const { previewFeeling, reflection, status, reset } = useSelah();
  const reflectionWords = useMemo(
    () => renderedReflection.split(" ").filter(Boolean),
    [renderedReflection],
  );

  useEffect(() => {
    if (reflection) {
      setRenderedReflection(reflection);
      setIsExiting(false);
      return;
    }

    if (!renderedReflection) {
      setIsExiting(false);
      return;
    }

    setIsExiting(true);
    const timeout = window.setTimeout(() => {
      setRenderedReflection("");
      setIsExiting(false);
    }, 420);

    return () => window.clearTimeout(timeout);
  }, [reflection, renderedReflection]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextFeeling = feeling.trim();
    if (!nextFeeling) return;
    await previewFeeling(nextFeeling);
  };

  const handleChange = (value: string) => {
    setFeeling(value);
    if (status !== "idle") reset();
  };

  return (
    <section
      id="meet-selah"
      className="hairline-t scroll-mt-20 flex min-h-[36rem] items-center bg-obsidian/30 md:min-h-[42rem]"
    >
      <style dangerouslySetInnerHTML={{ __html: SELAH_KEYFRAMES }} />
      <div className="mx-auto max-w-4xl px-6 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-[11px] uppercase tracking-[0.3em] text-gold">Meet Selah</p>
          <h2 className="font-display text-3xl text-foreground md:text-4xl">
            A glimpse of the quiet within.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground md:text-lg">
            Name what you&apos;re carrying, then receive a brief reflection in the same gentle tone
            that waits inside.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mx-auto mt-10 max-w-2xl space-y-4">
          <div className="space-y-3">
            <Label
              htmlFor="selah-feeling"
              className="text-xs uppercase tracking-[0.24em] text-gold-soft"
            >
              Seek a word with Selah.
            </Label>
            <div className="relative flex items-end gap-2 rounded-md border border-gold/20 bg-obsidian-elevated/50 px-3 py-2 focus-within:border-gold/40">
              <Textarea
                id="selah-feeling"
                value={feeling}
                onChange={(event) => handleChange(event.target.value)}
                placeholder="peaceful, weary, grateful, uncertain..."
                rows={3}
                className="min-h-24 flex-1 resize-none border-0 bg-transparent px-1 py-1 text-sm text-foreground placeholder:text-muted-foreground/60 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <button
                type="submit"
                disabled={!feeling.trim() || status === "loading"}
                aria-label="Receive reflection"
                className={cn(
                  "relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gold/90 text-obsidian transition-colors hover:bg-gold disabled:cursor-not-allowed disabled:opacity-30",
                )}
              >
                {status === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" strokeWidth={2} />
                )}
              </button>
            </div>
            <p className="text-center text-[10px] uppercase tracking-[0.28em] text-muted-foreground/55">
              Selah · Enter to send · short reflection · no account required
            </p>
          </div>
        </form>

        <div className="mx-auto mt-8 max-w-2xl">
          <div
            className={cn(
              "hairline relative min-h-32 overflow-hidden rounded-lg bg-obsidian-elevated/45 px-5 py-5 transition-all duration-700",
              status === "loading" && "border-gold/25",
            )}
          >
            {status === "loading" && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-lg"
                style={{
                  background:
                    "radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--gold) 16%, transparent), transparent 62%)",
                  animation: "selah-gold-breathe 2.8s ease-in-out infinite",
                }}
              />
            )}

            {status === "loading" ? (
              <div className="relative flex min-h-20 flex-col justify-center gap-4">
                <p className="text-base leading-relaxed text-gold-soft/85">
                  A quiet word is taking shape…
                </p>
                <div
                  className="flex items-center gap-2 text-gold-soft/80"
                  aria-label="Selah is reflecting"
                >
                  {[0, 1, 2].map((dot) => (
                    <span
                      key={dot}
                      className="h-2 w-2 rounded-full bg-current"
                      style={{
                        animation: `selah-dot-wave 1.35s ease-in-out ${dot * 0.18}s infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : status === "error" ? (
              <p className="text-base leading-relaxed text-muted-foreground">
                Reflection is unavailable right now. Try again in a moment.
              </p>
            ) : renderedReflection ? (
              <p
                className="font-display text-2xl leading-relaxed text-gold-soft"
                aria-label={renderedReflection}
                style={
                  isExiting
                    ? { animation: "selah-reflection-exit 0.42s ease-out forwards" }
                    : undefined
                }
              >
                {reflectionWords.map((word, wordIndex) => (
                  <span
                    key={`${word}-${wordIndex}`}
                    className="inline-block"
                    style={{
                      animation: isExiting
                        ? undefined
                        : `selah-word-bloom 0.82s cubic-bezier(0.22, 1, 0.36, 1) forwards`,
                      animationDelay: `${wordIndex * 0.16}s`,
                      opacity: isExiting ? 1 : 0,
                      marginRight: "0.34em",
                    }}
                  >
                    {Array.from(word).map((character, charIndex) => (
                      <span
                        key={`${character}-${wordIndex}-${charIndex}`}
                        className="inline-block"
                        style={{
                          animation: isExiting
                            ? undefined
                            : `selah-char-wave 0.9s ease-out forwards`,
                          animationDelay: `${wordIndex * 0.16 + charIndex * 0.025}s`,
                        }}
                      >
                        {character}
                      </span>
                    ))}
                  </span>
                ))}
              </p>
            ) : (
              <div className="flex min-h-20 flex-col justify-center gap-3 text-muted-foreground/55">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/15 bg-gold/5 text-gold-soft/60">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <p className="text-base leading-relaxed">Your reflection will bloom here...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
