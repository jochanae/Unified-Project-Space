import { useState, useEffect, useCallback, useMemo } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type PwaInstallResult = "accepted" | "dismissed" | "manual" | "preview" | "unavailable" | "installed";
export type PwaInstallPlatform = "ios" | "android" | "desktop";

let deferredPrompt: BeforeInstallPromptEvent | null = null;

function isPreviewHost() {
  return (
    window.location.hostname.includes("id-preview--") ||
    window.location.hostname.includes("lovableproject.com")
  );
}

function isInIframe() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function getPlatform(): PwaInstallPlatform {
  const userAgent = navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(userAgent)) return "ios";
  if (userAgent.includes("android")) return "android";
  return "desktop";
}

function isStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function usePwaInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const platform = useMemo(() => getPlatform(), []);
  const isPreview = useMemo(() => isPreviewHost() || isInIframe(), []);
  const isIOS = platform === "ios";
  const isAndroid = platform === "android";

  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");

    const syncInstalledState = () => {
      const installed = isStandaloneMode();
      setIsInstalled(installed);
      if (installed) {
        setCanInstall(false);
      }
    };

    syncInstalledState();

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    const handleInstalled = () => {
      deferredPrompt = null;
      setCanInstall(false);
      syncInstalledState();
    };

    const handleDisplayModeChange = () => syncInstalledState();

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", handleInstalled);
    mq.addEventListener?.("change", handleDisplayModeChange);

    // If prompt was already captured before hook mounted
    if (deferredPrompt) setCanInstall(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", handleInstalled);
      mq.removeEventListener?.("change", handleDisplayModeChange);
    };
  }, []);

  const requiresManualInstall = !isInstalled && !canInstall && (isIOS || isAndroid);

  const install = useCallback(async (): Promise<PwaInstallResult> => {
    if (isInstalled) return "installed";
    if (isPreview) return "preview";
    if (isIOS) return "manual";
    if (!deferredPrompt) return requiresManualInstall ? "manual" : "unavailable";

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setCanInstall(false);
      deferredPrompt = null;
      return "accepted";
    }

    return "dismissed";
  }, [isIOS, isInstalled, isPreview, requiresManualInstall]);

  return {
    canInstall,
    isInstalled,
    install,
    isIOS,
    isAndroid,
    isPreview,
    platform,
    requiresManualInstall,
  };
}
