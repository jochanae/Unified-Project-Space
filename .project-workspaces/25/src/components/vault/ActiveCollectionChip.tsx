import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { FolderHeart, Check, ChevronRight, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";
import { useActiveCollection } from "@/hooks/useActiveCollection";
import { cn } from "@/lib/utils";

/**
 * ActiveCollectionChip — small "Saving to: <Collection>" chip rendered just
 * under the reader header. Tap to switch the Active Collection (which is the
 * destination for long-press → Vault saves). Hidden until the user is signed
 * in and has at least one collection.
 */
export function ActiveCollectionChip({ className }: { className?: string }) {
  const { user } = useAuth();
  const { collections, active, setActive, loading } = useActiveCollection(user?.id);
  const [open, setOpen] = useState(false);

  if (!user || loading) return null;
  if (collections.length === 0) {
    // No collections yet — quiet, single CTA.
    return (
      <Link
        to="/vault"
        className={cn(
          "mx-auto flex items-center gap-1.5 rounded-full border border-gold/14 bg-obsidian-elevated/40 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70 backdrop-blur-xl transition-colors hover:border-gold/28 hover:text-gold-soft",
          className,
        )}
      >
        <Plus className="h-3 w-3" />
        Start a Study
      </Link>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={
            active
              ? `Saving to ${active.title} — tap to switch`
              : "Pick an Active Study for long-press saves"
          }
          className={cn(
            "mx-auto inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.22em] backdrop-blur-xl transition-colors",
            active
              ? "border-gold/22 bg-gold/8 text-gold-soft hover:bg-gold/12"
              : "border-gold/14 bg-obsidian-elevated/40 text-muted-foreground/75 hover:border-gold/24 hover:text-gold-soft",
            className,
          )}
        >
          <FolderHeart className={cn("h-3 w-3 shrink-0", active ? "text-gold" : "text-gold/50")} />
          <span className="truncate normal-case tracking-normal text-[11px]">
            {active ? (
              <>
                <span className="text-muted-foreground/70">Saving to · </span>
                <span className="font-medium">{active.title}</span>
              </>
            ) : (
              "Pick an Active Study"
            )}
          </span>
          <ChevronRight className="h-3 w-3 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        sideOffset={8}
        className="w-72 border-gold/18 bg-obsidian/96 p-2 backdrop-blur-2xl"
      >
        <p className="px-2 pb-2 pt-1 text-[10px] uppercase tracking-[0.24em] text-gold/70">
          Active Study
        </p>
        <div className="max-h-64 space-y-0.5 overflow-y-auto">
          {collections.map((c) => {
            const isActive = active?.id === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setActive(c.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                  isActive ? "bg-gold/10 text-gold-soft" : "text-foreground/85 hover:bg-white/5",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display">{c.title}</p>
                  {c.master_thought && (
                    <p className="mt-0.5 line-clamp-2 text-[11px] italic leading-snug text-muted-foreground/70">
                      "{c.master_thought}"
                    </p>
                  )}
                </div>
                {isActive && <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-gold" />}
              </button>
            );
          })}
        </div>
        <div className="mt-1 flex items-center justify-between border-t border-gold/10 pt-2">
          <button
            type="button"
            onClick={() => {
              setActive(null);
              setOpen(false);
            }}
            className="px-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70 hover:text-foreground"
          >
            Clear
          </button>
          <Link
            to="/vault"
            onClick={() => setOpen(false)}
            className="px-2 text-[10px] uppercase tracking-[0.22em] text-gold-soft hover:text-gold"
          >
            Open Vault →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
