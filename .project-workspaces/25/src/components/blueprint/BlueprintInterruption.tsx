/**
 * BlueprintInterruption — "Sanctum Interruption" error state for the Blueprint.
 * Preserves the card silhouette (grid + gold hairline) so the failure feels
 * intentional rather than broken. Pairs with `useBlueprint().retry()`.
 */

import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BlueprintInterruption({
  reference,
  message,
  onRetry,
  retrying = false,
  className,
}: {
  reference: string;
  message?: string | null;
  onRetry: () => void;
  retrying?: boolean;
  className?: string;
}) {
  return (
    <article
      role="alert"
      aria-live="polite"
      className={cn(
        "blueprint-card relative overflow-hidden rounded-2xl",
        "bg-card/80 backdrop-blur-md border border-gold/20",
        "shadow-[0_8px_32px_-12px_color-mix(in_oklab,var(--foreground)_24%,transparent)]",
        className,
      )}
    >
      <div
        aria-hidden
        className="blueprint-grid absolute inset-0 pointer-events-none opacity-60"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, var(--gold) 0 1px, transparent 1px 32px),
            repeating-linear-gradient(90deg, var(--gold) 0 1px, transparent 1px 32px)
          `,
        }}
      />
      <div className="relative z-10 flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <p className="mt-4 text-[10px] uppercase tracking-[0.28em] text-gold/70">
          Sanctum Interruption
        </p>
        <h3 className="mt-1 font-display text-lg text-foreground">
          The Blueprint couldn't be drafted
        </h3>
        <p className="mt-2 text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
          For {reference}
        </p>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {message ||
            "The research engine was momentarily unavailable. Try again — the passage and your place are preserved."}
        </p>
        <Button
          onClick={onRetry}
          disabled={retrying}
          size="sm"
          className={cn(
            "mt-6 bg-gold/15 text-gold border border-gold/40 hover:bg-gold/25 hover:text-gold-soft",
            "shadow-[0_2px_8px_-2px_color-mix(in_oklab,var(--gold)_40%,transparent)]",
          )}
        >
          <RotateCw className={cn("h-3.5 w-3.5", retrying && "animate-spin")} />
          {retrying ? "Retrying…" : "Retry Blueprint"}
        </Button>
      </div>
    </article>
  );
}
