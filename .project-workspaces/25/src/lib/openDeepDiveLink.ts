import { toast } from "sonner";
import type { DeepDiveLink } from "@/lib/deepDive";
import { emitDeepDiveLaunched } from "@/lib/deepDiveReturnBus";

/**
 * Open a Deep Dive provider link.
 *
 * Strategy:
 *  1. If the provider needs a clipboard handoff (e.g. Gemini), copy the
 *     prompt and open the web URL in a new tab.
 *  2. On mobile (iOS/Android), attempt the native app URI scheme first via
 *     a hidden iframe. If the OS doesn't intercept it within ~600ms, fall
 *     back to the web URL in a new tab.
 *  3. On desktop, open the web URL directly in a new tab.
 *
 * Always announces the launch on the return-bus so the reader can show a
 * "Return to reading" banner. Pass `meta.reference` to label the banner.
 */
export async function openDeepDiveLink(
  link: DeepDiveLink,
  meta?: { reference?: string },
): Promise<void> {
  const announce = () =>
    emitDeepDiveLaunched({ provider: link.label, reference: meta?.reference ?? "" });

  if (link.requiresClipboardHandoff) {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(link.prompt);
      }
      toast.success(`Prompt copied — paste into ${link.label}`, {
        description: `${link.label} doesn't accept prefilled prompts from links.`,
      });
    } catch {
      toast.message(`Opening ${link.label}`, {
        description: "Couldn't copy the prompt automatically — copy it manually if needed.",
      });
    }
    if (typeof window !== "undefined") {
      window.open(link.href, "_blank", "noopener,noreferrer");
    }
    announce();
    return;
  }

  if (typeof window === "undefined") return;

  if (isMobileUserAgent() && link.nativeHref) {
    tryNativeThenWeb(link);
    announce();
    return;
  }

  window.open(link.href, "_blank", "noopener,noreferrer");
  announce();
}

function isMobileUserAgent(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

/**
 * Attempt the native URI scheme via a hidden iframe. If the page is still
 * visible after a short delay, assume the app isn't installed and open the
 * web fallback in a new tab.
 */
function tryNativeThenWeb(link: DeepDiveLink): void {
  const start = Date.now();
  let fellBack = false;

  const fallback = () => {
    if (fellBack) return;
    // If we got backgrounded quickly, the OS likely opened the app — skip web.
    if (document.hidden || Date.now() - start > 1500) return;
    fellBack = true;
    window.open(link.href, "_blank", "noopener,noreferrer");
  };

  const onVisibility = () => {
    if (document.hidden) fellBack = true;
  };
  document.addEventListener("visibilitychange", onVisibility, { once: true });

  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = link.nativeHref;
  document.body.appendChild(iframe);

  window.setTimeout(() => {
    fallback();
    document.removeEventListener("visibilitychange", onVisibility);
    iframe.remove();
  }, 600);
}
