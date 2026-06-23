import { useEffect, useRef, useState } from "react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { toast } from "sonner";
import { PwaInstallGuideDialog, type InstallGuideMode } from "./PwaInstallGuideDialog";

const INSTALL_TOAST_DISMISSED_KEY = "intoiq_pwa_install_toast_dismissed_v2";
const INSTALL_TOAST_DELAY = 8_000;

export function PwaInstallBanner() {
  const { canInstall, isInstalled, install, isIOS, isAndroid, isPreview, requiresManualInstall } = usePwaInstall();
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideMode, setGuideMode] = useState<InstallGuideMode>(isIOS ? "ios" : isAndroid ? "android" : "manual");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownRef = useRef(false);

  const dismissInstallToast = (id?: string | number) => {
    localStorage.setItem(INSTALL_TOAST_DISMISSED_KEY, "1");
    if (id !== undefined) {
      toast.dismiss(id);
    }
  };

  const openGuide = (mode: InstallGuideMode) => {
    setGuideMode(mode);
    setGuideOpen(true);
  };

  const handleInstallClick = async () => {
    const result = await install();

    if (result === "accepted") {
      localStorage.setItem(INSTALL_TOAST_DISMISSED_KEY, "1");
      toast.success("IntoIQ is ready to install", {
        description: "Finish the browser prompt to add it to your home screen.",
      });
      return;
    }

    if (result === "dismissed") {
      toast("Install dismissed", {
        description: "You can trigger it again anytime from the footer or Settings.",
      });
      return;
    }

    if (result === "preview") {
      openGuide("preview");
      return;
    }

    openGuide(isIOS ? "ios" : isAndroid ? "android" : "manual");
  };

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (shownRef.current || isInstalled) return;
    if (localStorage.getItem(INSTALL_TOAST_DISMISSED_KEY)) return;

    const shouldOfferInstall = canInstall || requiresManualInstall || isPreview;
    if (!shouldOfferInstall) return;

    timerRef.current = setTimeout(() => {
      shownRef.current = true;

      toast.custom((id) => (
        <div className="glass flex w-[min(92vw,26rem)] items-start gap-3 rounded-2xl border border-primary/25 p-4 shadow-[0_18px_60px_hsl(var(--background)/0.45),0_0_24px_hsl(var(--primary)/0.16),inset_0_1px_0_hsl(var(--foreground)/0.12)]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12">
            <Download className="h-5 w-5 text-primary" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Take IntoIQ to your home screen</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isPreview
                ? "Open the live site on your phone to install IntoIQ as a full-screen app."
                : "Save IntoIQ like an app for faster launch, cleaner focus, and a premium mobile feel."}
            </p>

            <div className="mt-3 flex items-center gap-2">
              <Button size="sm" className="glow-button shrink-0" onClick={() => {
                toast.dismiss(id);
                void handleInstallClick();
              }}>
                {canInstall && !isPreview ? "Install now" : "Show steps"}
              </Button>

              <button
                type="button"
                onClick={() => dismissInstallToast(id)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                aria-label="Dismiss install prompt"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ));
    }, INSTALL_TOAST_DELAY);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [canInstall, isInstalled, isPreview, requiresManualInstall]);

  return (
    <PwaInstallGuideDialog mode={guideMode} open={guideOpen} onOpenChange={setGuideOpen} />
  );
}
