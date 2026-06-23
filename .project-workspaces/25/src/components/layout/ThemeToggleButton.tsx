import { useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { MasterHeaderIconButton } from "@/components/layout/MasterHeader";

/**
 * Sanctuary Theme Toggle — flips between Obsidian (dark) and Parchment (light).
 *
 * Cinematic "paper-roll" transition: when the user taps, a full-viewport
 * overlay sweeps across the screen at 480ms. Halfway through the sweep the
 * underlying theme actually flips, so the new sheet emerges from behind the
 * roll. The overlay is purely visual (pointer-events: none, z-index high
 * enough to sit above everything but not interfere with anything).
 *
 * Respects prefers-reduced-motion: in that case we skip the overlay and just
 * flip instantly with the existing color transition on `:root`.
 */
export function ThemeToggleButton() {
  const { theme, toggle } = useTheme();
  const [rolling, setRolling] = useState(false);

  const handleClick = () => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduce) {
      toggle();
      return;
    }

    setRolling(true);
    // Flip the theme at the midpoint of the sweep (overlay fully covers screen).
    window.setTimeout(() => toggle(), 220);
    // Clean up overlay after the sweep finishes.
    window.setTimeout(() => setRolling(false), 520);
  };

  // Direction depends on where we're going. Going TO parchment uses a warm
  // cream color sweeping in; going TO obsidian uses a deep black sweep.
  const goingTo: "parchment" | "obsidian" = theme === "obsidian" ? "parchment" : "obsidian";

  return (
    <>
      <MasterHeaderIconButton
        icon={theme === "obsidian" ? Sun : Moon}
        label={theme === "obsidian" ? "Switch to Parchment theme" : "Switch to Obsidian theme"}
        onClick={handleClick}
      />
      {rolling && (
        <div
          aria-hidden="true"
          className="theme-paper-roll pointer-events-none fixed inset-0 z-[9999]"
          data-going-to={goingTo}
        />
      )}
    </>
  );
}
