/**
 * DailyWordProvider
 *
 * Global controller for the Daily Word sheet. Mounted once at the root so any
 * MasterHeader instance (across all routes) can open it without per-page wiring.
 *
 * Navigation: "Open in Reader" routes to /reader with bookIndex/chapter/verse
 * passed via search params, which the reader route already understands.
 */

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { DailyWordSheet } from "./DailyWordSheet";

type DailyWordContextValue = {
  open: () => void;
  close: () => void;
  isOpen: boolean;
};

const DailyWordContext = createContext<DailyWordContextValue | null>(null);

export function DailyWordProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const handleNavigateToVerse = useCallback(
    (bookIndex: number, chapter: number, verse?: number) => {
      void navigate({
        to: "/reader",
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          book: bookIndex,
          chapter,
          ...(verse !== undefined ? { verse } : {}),
        }),
      });
    },
    [navigate],
  );

  return (
    <DailyWordContext.Provider value={{ open, close, isOpen }}>
      {children}
      {isOpen && <DailyWordSheet onClose={close} onNavigateToVerse={handleNavigateToVerse} />}
    </DailyWordContext.Provider>
  );
}

/** Returns { open, close, isOpen }. Safe no-op outside provider. */
export function useDailyWord(): DailyWordContextValue {
  const ctx = useContext(DailyWordContext);
  if (!ctx) {
    return { open: () => {}, close: () => {}, isOpen: false };
  }
  return ctx;
}
