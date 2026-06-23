import { useEffect } from "react";
import { toast } from "sonner";

const STORAGE_KEY = "sanctumiq:ios-standalone-welcomed";

/**
 * Detects when the app is launched in iOS standalone mode (after "Add to Home Screen")
 * and shows a one-time friendly welcome toast confirming the install.
 *
 * Only fires on iOS (iPhone/iPad) running in standalone, and only once per device.
 */
export function IosStandaloneWelcome() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const ua = window.navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/i.test(ua);
    if (!isIos) return;

    const isStandalone =
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;
    if (!isStandalone) return;

    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // localStorage blocked — still show once this session
    }

    // Small delay so the toast lands after the app has visually settled.
    const t = window.setTimeout(() => {
      toast.success("Welcome to your sanctuary", {
        description:
          "SanctumIQ is now installed on your home screen. Tap the icon any time for a quiet, full-screen space.",
        duration: 6000,
      });
    }, 900);

    return () => window.clearTimeout(t);
  }, []);

  return null;
}
