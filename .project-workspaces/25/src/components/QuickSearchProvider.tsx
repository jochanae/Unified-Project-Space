import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { QuickSearchPalette } from "@/components/QuickSearchPalette";

type Ctx = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

const QuickSearchContext = createContext<Ctx | null>(null);

/**
 * Mounts the global QuickSearch palette and binds Cmd/Ctrl+K and "/" to open it.
 * Any descendant can call useQuickSearch() to open it programmatically.
 */
export function QuickSearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl+K from anywhere
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((v) => !v);
        return;
      }
      // "/" when not typing in a field
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const target = event.target as HTMLElement | null;
        const tag = target?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <QuickSearchContext.Provider value={{ open, setOpen, toggle }}>
      {children}
      <QuickSearchPalette open={open} onOpenChange={setOpen} />
    </QuickSearchContext.Provider>
  );
}

export function useQuickSearch(): Ctx {
  const ctx = useContext(QuickSearchContext);
  if (!ctx) throw new Error("useQuickSearch must be used inside <QuickSearchProvider>");
  return ctx;
}
