import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";


export type LayoutMode = "centered" | "wider" | "full";

const LAYOUT_MODE_KEY = "coinsbloom_layout_mode";

export function getLayoutMode(): LayoutMode {
  if (typeof window === "undefined") return "centered";
  return (localStorage.getItem(LAYOUT_MODE_KEY) as LayoutMode) || "centered";
}

export function setLayoutMode(mode: LayoutMode) {
  localStorage.setItem(LAYOUT_MODE_KEY, mode);
  window.dispatchEvent(new CustomEvent("coinsbloom_layout_mode_changed"));
}

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  /** Use "default" (1152px) or "wide" (1400px) — overridden by user layout mode */
  size?: "default" | "wide";
}

/**
 * Responsive container that centers content and caps max-width on desktop.
 * Respects user's layout mode preference from Settings.
 */
export function ResponsiveContainer({ 
  children, 
  className, 
  size = "default" 
}: ResponsiveContainerProps) {
  const [layoutMode, setMode] = useState<LayoutMode>(getLayoutMode);

  useEffect(() => {
    const handler = () => setMode(getLayoutMode());
    window.addEventListener("coinsbloom_layout_mode_changed", handler);
    return () => window.removeEventListener("coinsbloom_layout_mode_changed", handler);
  }, []);

  return (
    <div className={cn(
      "w-full mx-auto",
      layoutMode === "full" 
        ? "" 
        : layoutMode === "wider" 
          ? "max-w-[1600px]" 
          : size === "default" ? "max-w-6xl" : "max-w-[1400px]",
      className
    )}>
      {children}
    </div>
  );
}
