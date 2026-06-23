/**
 * Share utility that uses native share on mobile and clipboard fallback on desktop
 */
export interface ShareOptions {
  url: string;
  title?: string;
  text?: string;
}

export async function smartShare(options: ShareOptions): Promise<boolean> {
  const { url, title, text } = options;
  
  // Check if Web Share API is available (typically on mobile in secure context)
  if (typeof navigator.share === "function" && window.isSecureContext) {
    try {
      await navigator.share({
        title: title || document.title,
        text: text,
        url: url,
      });
      return true;
    } catch (error) {
      // User cancelled or share failed - fall back to clipboard
      if ((error as Error).name === "AbortError") {
        return false; // User cancelled, don't show any message
      }
      // Fall through to clipboard
    }
  }
  
  // Fallback to clipboard
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    return false;
  }
}

/**
 * Check if the device supports native sharing
 */
export function supportsNativeShare(): boolean {
  return typeof navigator.share === "function";
}
