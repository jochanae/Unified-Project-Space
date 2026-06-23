import { useEffect, useState } from "react";
import { Download, Share, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * In-app install button.
 *
 * - Android / Chrome / Edge / desktop Chrome: captures `beforeinstallprompt`
 *   and triggers the native install dialog on click.
 * - iOS Safari (no native API): opens a small instructions sheet
 *   ("Share → Add to Home Screen").
 * - If already installed (running standalone) → renders nothing.
 */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function detectIsIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  // iPad on iOS 13+ reports as Macintosh; check touch points to disambiguate.
  const iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/.test(ua) || iPadOS;
}

function detectIsStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

interface InstallAppButtonProps {
  className?: string;
  variant?: "primary" | "ghost";
  /** Override label. Defaults to "Install app". */
  label?: string;
}

export function InstallAppButton({
  className,
  variant = "primary",
  label = "Install app",
}: InstallAppButtonProps) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSSheet, setShowIOSSheet] = useState(false);
  const [showDesktopSheet, setShowDesktopSheet] = useState(false);

  useEffect(() => {
    setIsStandalone(detectIsStandalone());
    setIsIOS(detectIsIOS());

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstallEvent(null);
      setIsStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Already installed → render nothing.
  if (isStandalone) return null;

  const handleClick = async () => {
    if (installEvent) {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === "accepted") {
        setInstallEvent(null);
      }
      return;
    }
    if (isIOS) {
      setShowIOSSheet(true);
      return;
    }
    // Desktop / Android without a captured beforeinstallprompt → show
    // browser-specific instructions so the CTA is never a dead end.
    setShowDesktopSheet(true);
  };

  const baseClasses =
    "inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-medium transition-colors";
  const variantClasses =
    variant === "primary"
      ? "bg-gold text-obsidian hover:bg-gold-soft"
      : "border border-gold/30 bg-transparent text-gold hover:bg-gold/10 hover:border-gold/50";

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={cn(baseClasses, variantClasses, className)}
      >
        <Download className="h-4 w-4" />
        {label}
      </button>

      {showIOSSheet && <IOSInstallSheet onClose={() => setShowIOSSheet(false)} />}
      {showDesktopSheet && <DesktopInstallSheet onClose={() => setShowDesktopSheet(false)} />}
    </>
  );
}

function DesktopInstallSheet({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-obsidian/70 backdrop-blur-sm md:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Install instructions"
    >
      <div
        className="w-full rounded-t-2xl border border-gold/18 bg-[rgba(20,20,20,0.92)] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl md:m-4 md:max-w-md md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-gold">Install on desktop</p>
            <h2 className="mt-2 font-display text-xl text-gold-soft">Add SanctumIQ as an app</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <ol className="space-y-4 text-sm text-foreground/85">
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gold/30 text-[11px] text-gold">
              1
            </span>
            <span className="flex-1">
              In <span className="font-medium text-foreground">Chrome or Edge</span>, look for the
              install icon{" "}
              <Download className="inline h-3.5 w-3.5 align-text-bottom text-gold-soft" /> at the
              right edge of the address bar.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gold/30 text-[11px] text-gold">
              2
            </span>
            <span className="flex-1">
              Or open the browser menu (⋮) and choose{" "}
              <span className="font-medium text-foreground">Install SanctumIQ…</span> /{" "}
              <span className="font-medium text-foreground">Apps → Install this site</span>.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gold/30 text-[11px] text-gold">
              3
            </span>
            <span className="flex-1">
              Confirm <span className="font-medium text-foreground">Install</span>. SanctumIQ opens
              in its own window, free of browser chrome.
            </span>
          </li>
        </ol>

        <p className="mt-5 text-xs text-muted-foreground">
          Safari and Firefox on desktop don't currently support installing web apps. Use Chrome,
          Edge, Brave, or Arc.
        </p>
      </div>
    </div>
  );
}

function IOSInstallSheet({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-obsidian/70 backdrop-blur-sm md:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Install instructions"
    >
      <div
        className="w-full rounded-t-2xl border border-gold/18 bg-[rgba(20,20,20,0.92)] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl md:m-4 md:max-w-md md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-gold">Install on iPhone</p>
            <h2 className="mt-2 font-display text-xl text-gold-soft">Add to Home Screen</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <ol className="space-y-4 text-sm text-foreground/85">
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gold/30 text-[11px] text-gold">
              1
            </span>
            <span className="flex-1">
              Tap the <span className="font-medium text-foreground">Share</span> button{" "}
              <Share className="inline h-4 w-4 align-text-bottom text-gold-soft" /> at the bottom of
              Safari.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gold/30 text-[11px] text-gold">
              2
            </span>
            <span className="flex-1">
              Scroll and choose{" "}
              <span className="font-medium text-foreground">
                Add to Home Screen <Plus className="inline h-3.5 w-3.5 align-text-bottom" />
              </span>
              .
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gold/30 text-[11px] text-gold">
              3
            </span>
            <span className="flex-1">
              Tap <span className="font-medium text-foreground">Add</span>. SanctumIQ will open
              fullscreen from your home screen.
            </span>
          </li>
        </ol>

        <p className="mt-5 text-xs text-muted-foreground">
          This must be done in Safari. Chrome and other browsers on iOS cannot install apps.
        </p>
      </div>
    </div>
  );
}

export default InstallAppButton;
