/**
 * IOSPushCoach
 *
 * Auto-detects iOS Safari users who haven't installed the app yet and
 * surfaces a soft coaching banner explaining that push requires Add to Home
 * Screen first. Tapping "How" opens the same instructions sheet used by
 * the Install button on the landing page.
 *
 * Hides itself when:
 *   - not iOS
 *   - already running in standalone (installed)
 *   - inside an iframe / preview context (SW can't register anyway)
 */

import { useEffect, useState } from "react";
import { Plus, Share, Smartphone, X } from "lucide-react";

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/.test(ua) || iPadOS;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isPreview(): boolean {
  if (typeof window === "undefined") return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const host = window.location.hostname;
  return host.includes("id-preview--") || host.includes("lovableproject.com");
}

export function IOSPushCoach() {
  const [show, setShow] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!isIOS()) return;
    if (isStandalone()) return;
    if (isPreview()) return;
    setShow(true);
  }, []);

  if (!show) return null;

  return (
    <>
      <div className="hairline rounded-xl bg-obsidian-elevated/40 p-4 flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/10">
          <Smartphone className="h-4 w-4 text-gold" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-sm text-gold-soft">
            One step before push works on iPhone
          </p>
          <p className="text-xs text-muted-foreground/80 mt-1 leading-relaxed">
            Apple only allows notifications from apps you've added to your Home Screen. Install
            SanctumIQ first, then re-open this page from the home-screen icon to enable push.
          </p>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="mt-3 text-[11px] uppercase tracking-[0.22em] text-gold hover:text-gold-soft transition-colors"
          >
            How to install →
          </button>
        </div>
      </div>

      {sheetOpen && <IOSInstallSheet onClose={() => setSheetOpen(false)} />}
    </>
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
              Open SanctumIQ from your home screen, return to Settings → Notifications, and tap{" "}
              <span className="font-medium text-foreground">Enable push</span>.
            </span>
          </li>
        </ol>

        <p className="mt-5 text-xs text-muted-foreground">
          This must be done in Safari. Chrome and other browsers on iOS cannot install apps or
          receive push notifications.
        </p>
      </div>
    </div>
  );
}
