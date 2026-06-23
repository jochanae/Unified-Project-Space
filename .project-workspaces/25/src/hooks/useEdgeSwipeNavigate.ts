import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

type Options = {
  /** Route to navigate to when user swipes left (finger moves right→left). */
  onSwipeLeftTo?: string;
  /** Route to navigate to when user swipes right (finger moves left→right). */
  onSwipeRightTo?: string;
  /**
   * Distance from screen edge (px) where the touch must START.
   * Default 64. Larger than the iOS/Android system back-gesture zone (~20px)
   * so users who start their swipe just inside the OS zone still trigger us.
   */
  edgeWidth?: number;
  /** Minimum horizontal distance (px) to count as a swipe. Default 60. */
  minDistance?: number;
  /** Max vertical drift (px) before the gesture is rejected. Default 80. */
  maxVerticalDrift?: number;
  /** Disable the gesture entirely. */
  disabled?: boolean;
};

/**
 * iOS-style edge-swipe navigation between two public surfaces.
 *
 * - Swipe LEFT  (finger drags from RIGHT edge toward the left)  → onSwipeLeftTo
 * - Swipe RIGHT (finger drags from LEFT  edge toward the right) → onSwipeRightTo
 *
 * Notes:
 * - Listens on `document` (not window) so it works even when scroll containers
 *   capture events at higher layers.
 * - Uses capture-phase to win against in-page horizontal scrollers.
 * - Edge-only start prevents conflicts with carousels and inline sliders.
 * - The OS reserves the outermost ~20px for browser back/forward; we extend
 *   our zone well past that so a user starting at ~30–60px in still triggers.
 */
export function useEdgeSwipeNavigate({
  onSwipeLeftTo,
  onSwipeRightTo,
  edgeWidth = 64,
  minDistance = 60,
  maxVerticalDrift = 80,
  disabled = false,
}: Options) {
  const navigate = useNavigate();

  useEffect(() => {
    if (disabled) return;
    if (typeof window === "undefined") return;
    if (!("ontouchstart" in window) && !(navigator.maxTouchPoints > 0)) return;

    let startX = 0;
    let startY = 0;
    let armed: "left-edge" | "right-edge" | null = null;
    let fired = false;

    const onTouchStart = (e: TouchEvent) => {
      fired = false;
      if (e.touches.length !== 1) {
        armed = null;
        return;
      }
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      const w = window.innerWidth;
      if (startX <= edgeWidth && onSwipeRightTo) {
        armed = "left-edge";
      } else if (startX >= w - edgeWidth && onSwipeLeftTo) {
        armed = "right-edge";
      } else {
        armed = null;
      }
    };

    const tryFire = (clientX: number, clientY: number) => {
      if (!armed || fired) return;
      const dx = clientX - startX;
      const dy = Math.abs(clientY - startY);
      if (dy > maxVerticalDrift) {
        armed = null;
        return;
      }
      if (armed === "left-edge" && dx >= minDistance && onSwipeRightTo) {
        fired = true;
        navigate({ to: onSwipeRightTo });
      } else if (armed === "right-edge" && -dx >= minDistance && onSwipeLeftTo) {
        fired = true;
        navigate({ to: onSwipeLeftTo });
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!armed || fired) return;
      const t = e.touches[0];
      tryFire(t.clientX, t.clientY);
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!armed || fired) {
        armed = null;
        return;
      }
      const t = e.changedTouches[0];
      tryFire(t.clientX, t.clientY);
      armed = null;
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true, capture: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true, capture: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true, capture: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart, {
        capture: true,
      } as EventListenerOptions);
      document.removeEventListener("touchmove", onTouchMove, {
        capture: true,
      } as EventListenerOptions);
      document.removeEventListener("touchend", onTouchEnd, {
        capture: true,
      } as EventListenerOptions);
    };
  }, [navigate, onSwipeLeftTo, onSwipeRightTo, edgeWidth, minDistance, maxVerticalDrift, disabled]);
}
