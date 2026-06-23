import { useEffect, useState } from "react";
import { Check, Copy, Info, QrCode, RefreshCw, Share2 } from "lucide-react";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

interface ShareBoardButtonProps {
  handle: string;
  displayName?: string | null;
}

export function ShareBoardButton({ handle, displayName }: ShareBoardButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [previewBust, setPreviewBust] = useState(0);

  const url =
    typeof window !== "undefined" ? `${window.location.origin}/@${handle}` : `/@${handle}`;
  const shareTitle = displayName ? `${displayName} on SanctumIQ` : `@${handle} on SanctumIQ`;

  useEffect(() => {
    if (!open || qrDataUrl) return;
    QRCode.toDataURL(url, {
      width: 512,
      margin: 1,
      color: { dark: "#0a0a0a", light: "#ffffff" },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [open, qrDataUrl, url]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const nativeShare = async () => {
    if (typeof navigator === "undefined" || !navigator.share) {
      copy();
      return;
    }
    try {
      await navigator.share({ title: shareTitle, url });
    } catch {
      // user cancelled — silent
    }
  };

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `sanctumiq-${handle}.png`;
    a.click();
  };

  // Internal-first refresh: re-warm our OG endpoint so the next crawl gets fresh bytes.
  // External validators are exposed only as fallback if the user reports it still stale.
  const ogUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/public/og/${handle}`;
  const refreshPreview = async () => {
    setRefreshing(true);
    setShowFallback(false);
    try {
      // Bypass any local/CDN cache so the worker re-renders and emits a fresh ETag.
      await fetch(`${ogUrl}?t=${Date.now()}`, { cache: "no-store" });
      setPreviewBust((n) => n + 1);
      toast.success("Preview refreshed", {
        description: "Social platforms may still cache the old image for a few minutes.",
      });
      // Surface the external-debugger fallback after a short beat.
      setTimeout(() => setShowFallback(true), 600);
    } catch {
      toast.error("Couldn't refresh preview");
      setShowFallback(true);
    } finally {
      setRefreshing(false);
    }
  };

  const xValidator = `https://cards-dev.twitter.com/validator?url=${encodeURIComponent(url)}`;
  const liInspector = `https://www.linkedin.com/post-inspector/inspect/${encodeURIComponent(url)}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full hairline bg-obsidian-elevated/50 px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-gold-soft hover:bg-gold/10 hover:text-gold transition-colors"
        aria-label="Share board"
      >
        <Share2 className="h-3.5 w-3.5" />
        Share
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm bg-obsidian border-gold/20">
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-foreground">
              Share this sanctuary
            </DialogTitle>
          </DialogHeader>

          <div className="mt-2 space-y-4">
            <div className="hairline rounded-lg bg-obsidian-elevated/40 p-3 flex items-center gap-2">
              <span className="flex-1 truncate text-xs text-muted-foreground/90 font-mono">
                {url.replace(/^https?:\/\//, "")}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={copy}
                className="h-7 px-2 text-gold-soft hover:text-gold hover:bg-gold/10"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>

            <div className="flex flex-col items-center gap-3 py-2">
              <div className="rounded-lg bg-white p-3">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt={`QR code for @${handle}`} className="h-44 w-44 block" />
                ) : (
                  <div className="h-44 w-44 flex items-center justify-center text-muted-foreground/40">
                    <QrCode className="h-8 w-8" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={downloadQr}
                disabled={!qrDataUrl}
                className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70 hover:text-gold transition-colors disabled:opacity-40"
              >
                Download QR
              </button>
            </div>

            {/* Social preview thumbnail + refresh control */}
            <div className="hairline rounded-lg bg-obsidian-elevated/40 p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/80">
                    Social preview
                  </span>
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label="About preview delays"
                          className="text-muted-foreground/60 hover:text-gold-soft transition-colors"
                        >
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="max-w-[220px] text-[11px] leading-relaxed normal-case tracking-normal"
                      >
                        Social media previews may take a moment to update after changes.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={refreshPreview}
                  disabled={refreshing}
                  className="h-7 px-2 text-[10px] uppercase tracking-[0.2em] text-gold-soft hover:text-gold hover:bg-gold/10"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${refreshing ? "animate-spin" : ""}`} />
                  Refresh preview
                </Button>
              </div>
              <div className="rounded-md overflow-hidden hairline bg-obsidian">
                <img
                  key={previewBust}
                  src={`${ogUrl}${previewBust ? `?v=${previewBust}` : ""}`}
                  alt={`Social card for @${handle}`}
                  className="w-full block"
                  loading="lazy"
                />
              </div>
              {showFallback && (
                <p className="text-[10px] leading-relaxed text-muted-foreground/70">
                  Still not updated? Try external debuggers:{" "}
                  <a
                    href={xValidator}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gold-soft hover:text-gold underline-offset-2 hover:underline"
                  >
                    X Card Validator
                  </a>{" "}
                  ·{" "}
                  <a
                    href={liInspector}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gold-soft hover:text-gold underline-offset-2 hover:underline"
                  >
                    LinkedIn Post Inspector
                  </a>
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                variant="outline"
                onClick={copy}
                className="hairline bg-transparent text-gold-soft hover:bg-gold/10 hover:text-gold border-gold/20"
              >
                {copied ? "Copied" : "Copy link"}
              </Button>
              <Button onClick={nativeShare} className="bg-gold/90 text-obsidian hover:bg-gold">
                Share…
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
