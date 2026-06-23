/**
 * SearchHintsPopover — inline operator cheatsheet next to a search input.
 *
 * Renders a small "?" trigger that opens a popover listing supported tokens
 * (book:, status:, "exact phrase", etc.) with click-to-insert examples.
 */

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type SearchHint = {
  token: string; // e.g. 'book:John'
  description: string; // short explanation
};

type Props = {
  hints: SearchHint[];
  onInsert?: (token: string) => void;
  className?: string;
  label?: string; // e.g. "Notes search operators"
};

export function SearchHintsPopover({
  hints,
  onInsert,
  className,
  label = "Search operators",
}: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            "inline-flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground/60 hover:text-gold-soft transition-colors",
            className,
          )}
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-72 p-3 bg-obsidian-elevated/95 backdrop-blur-md hairline text-xs"
      >
        <div className="text-[10px] uppercase tracking-[0.22em] text-gold mb-2">{label}</div>
        <ul className="space-y-1.5">
          {hints.map((h) => (
            <li key={h.token} className="flex items-start gap-2">
              <button
                type="button"
                onClick={() => {
                  onInsert?.(h.token);
                  setOpen(false);
                }}
                className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-obsidian/60 hairline text-gold-soft hover:text-gold hover:border-gold/40 transition-colors shrink-0"
                title="Insert into search"
              >
                {h.token}
              </button>
              <span className="text-muted-foreground leading-snug pt-0.5">{h.description}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 pt-2 border-t border-border/30 text-[10px] text-muted-foreground/70 leading-snug">
          Combine tokens with spaces. Plain words match anywhere.
        </div>
      </PopoverContent>
    </Popover>
  );
}
