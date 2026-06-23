// Version-chip launcher for the Deep Dive panel. Sits below the standard
// ChatGPT/Perplexity buttons in the verse Quantum Menu and lets the reader
// hand off the same passage in a different translation — without changing
// what the original Deep Dive buttons do.
//
// Architecture:
//  - The provider toggle (ChatGPT | Perplexity) is prominent and persisted via
//    `useDeepDiveProviderPref`, so Perplexity is never hidden behind a silent
//    default.
//  - Tapping a chip builds a version-specific prompt (or a side-by-side
//    comparison prompt for "Compare All") and opens the chosen provider via
//    the existing `openDeepDiveLink` flow. Cost to us: $0 — same external
//    link-out pattern as the standard Deep Dive buttons.
//  - A collapsible "Preview prompt" disclosure shows the exact text we will
//    send for the last-tapped (or last-hovered) chip, with a one-tap copy
//    button. Builds trust without cluttering the default view.

import { useMemo, useState } from "react";
import { Check, ChevronDown, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEEP_DIVE_VERSION_CHIPS,
  buildDeepDiveCompareAllPrompt,
  buildDeepDiveLink,
  buildDeepDiveVersionPrompt,
  type DeepDiveContext,
  type DeepDiveProvider,
  type DeepDiveVersionChip,
} from "@/lib/deepDive";
import { openDeepDiveLink } from "@/lib/openDeepDiveLink";
import { useDeepDiveProviderPref } from "@/lib/deepDiveProviderPref";

const COMPARE_LABEL = "Compare all";

type ChipSpec = {
  label: string;
  build: () => string;
};

export function DeepDiveVersionChips({
  reference,
  passageContext,
}: {
  reference: string;
  passageContext: DeepDiveContext;
}) {
  const [provider, setProvider] = useDeepDiveProviderPref();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const chips = useMemo<ChipSpec[]>(
    () => [
      ...DEEP_DIVE_VERSION_CHIPS.map((version) => ({
        label: version as string,
        build: () =>
          buildDeepDiveVersionPrompt(reference, passageContext, version as DeepDiveVersionChip),
      })),
      {
        label: COMPARE_LABEL,
        build: () => buildDeepDiveCompareAllPrompt(reference, passageContext),
      },
    ],
    [reference, passageContext],
  );

  const activeChip = chips.find((c) => c.label === activeLabel) ?? chips[0];
  const activePrompt = activeChip.build();

  const launch = (chip: ChipSpec) => {
    setActiveLabel(chip.label);
    setCopied(false);
    const link = buildDeepDiveLink(provider, chip.build());
    void openDeepDiveLink(link, { reference });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activePrompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard unavailable — silently noop; the prompt is still visible.
    }
  };

  return (
    <div className="mt-3 border-t border-gold/12 pt-3">
      <p className="text-[10px] uppercase tracking-[0.24em] text-gold/70">
        Explore other translations
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        Tap a version to open this passage in your chosen tool.
      </p>

      <ProviderToggle provider={provider} onChange={setProvider} />

      <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {chips.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => launch(chip)}
            onPointerEnter={() => setActiveLabel(chip.label)}
            onFocus={() => setActiveLabel(chip.label)}
            aria-label={`Open ${reference} in ${chip.label} via ${provider}`}
            className={cn(
              "inline-flex h-8 shrink-0 items-center justify-center rounded-full border px-3 text-[10px] uppercase tracking-[0.18em] transition-colors",
              activeLabel === chip.label
                ? "border-gold/40 bg-gold/14 text-gold-soft"
                : "border-gold/20 bg-background/24 text-gold-soft hover:bg-gold/12",
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setPreviewOpen((v) => !v)}
        aria-expanded={previewOpen}
        className="mt-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-gold-soft"
      >
        Preview prompt
        <ChevronDown
          className={cn("h-3 w-3 transition-transform", previewOpen && "rotate-180")}
          aria-hidden
        />
      </button>

      {previewOpen ? (
        <div className="mt-2 rounded-md border border-gold/15 bg-background/40 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase tracking-[0.22em] text-gold/70">
              {activeChip.label}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copy prompt to clipboard"
              className="inline-flex items-center gap-1 rounded-full border border-gold/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-gold-soft transition-colors hover:bg-gold/12"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-1.5 whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground">
            {activePrompt}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ProviderToggle({
  provider,
  onChange,
}: {
  provider: DeepDiveProvider;
  onChange: (next: DeepDiveProvider) => void;
}) {
  const options: DeepDiveProvider[] = ["ChatGPT", "Perplexity"];
  return (
    <div
      role="radiogroup"
      aria-label="Deep Dive destination"
      className="mt-2 inline-flex w-full items-center justify-center rounded-full border border-gold/20 bg-background/30 p-0.5"
    >
      {options.map((option) => {
        const active = provider === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option)}
            className={cn(
              "flex-1 rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] transition-colors",
              active
                ? "bg-gold/18 text-gold-soft shadow-[0_0_0_1px_hsl(var(--gold)/0.25)]"
                : "text-muted-foreground hover:text-gold-soft",
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
