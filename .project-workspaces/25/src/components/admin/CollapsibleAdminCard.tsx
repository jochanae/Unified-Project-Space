/**
 * CollapsibleAdminCard — Card wrapper for the Admin Hub with a chevron toggle.
 *
 * Renders the Sanctuary card chrome (border, gold title) and toggles the
 * content with a chevron in the top-right corner. Persists open/closed state
 * to localStorage so each admin keeps their layout between visits.
 */

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type CollapsibleAdminCardProps = {
  /** Stable id used for persisting open state. */
  id: string;
  title: ReactNode;
  description?: ReactNode;
  /** Optional content rendered inside CardHeader (right of title), e.g. search inputs. */
  headerActions?: ReactNode;
  /** Default open state when no persisted value exists. */
  defaultOpen?: boolean;
  /** Optional className passed to CardContent. */
  contentClassName?: string;
  children: ReactNode;
};

const STORAGE_PREFIX = "sanctum:admin-card:";

export function CollapsibleAdminCard({
  id,
  title,
  description,
  headerActions,
  defaultOpen = true,
  contentClassName,
  children,
}: CollapsibleAdminCardProps) {
  const storageKey = `${STORAGE_PREFIX}${id}`;
  const [open, setOpen] = useState<boolean>(defaultOpen);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw === "1") setOpen(true);
      else if (raw === "0") setOpen(false);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  // Persist on change.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey, open ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [open, storageKey]);

  const panelId = `${id}-panel`;

  return (
    <Card className="border-border/80 bg-card/70 shadow-none backdrop-blur-sm">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            aria-expanded={open}
            aria-controls={panelId}
            className="group flex min-w-0 flex-1 items-start gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/60 rounded-md"
          >
            <ChevronDown
              className={cn(
                "mt-1.5 h-4 w-4 shrink-0 text-gold-soft/80 transition-transform duration-200",
                !open && "-rotate-90",
              )}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <CardTitle className="font-display text-3xl text-gold-soft">{title}</CardTitle>
              {description ? <CardDescription>{description}</CardDescription> : null}
            </div>
          </button>
          {headerActions ? (
            <div className="w-full md:w-auto md:shrink-0" onClick={(e) => e.stopPropagation()}>
              {headerActions}
            </div>
          ) : null}
        </div>
      </CardHeader>
      {open ? (
        <CardContent id={panelId} className={contentClassName}>
          {children}
        </CardContent>
      ) : null}
    </Card>
  );
}
