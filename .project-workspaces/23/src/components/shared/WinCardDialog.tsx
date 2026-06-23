import { useState } from 'react';
import { Share2, Download, Loader2, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { generateWinCard, shareWinCard, downloadWinCard, type WinCardInput, type WinCardResult } from '@/lib/win-card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface WinCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  input: WinCardInput;
}

/**
 * Cinematic preview + share dialog for milestone win cards.
 * Generates the PNG on open and offers share/download actions.
 */
export function WinCardDialog({ open, onOpenChange, input }: WinCardDialogProps) {
  const [result, setResult] = useState<WinCardResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Lazy-generate on first open
  if (open && !result && !loading) {
    setLoading(true);
    generateWinCard(input)
      .then((r) => setResult(r))
      .catch((e) => {
        console.error('Win card generation failed:', e);
        toast.error('Could not generate card');
      })
      .finally(() => setLoading(false));
  }

  const handleShare = async () => {
    if (!result) return;
    const outcome = await shareWinCard(result, `${input.headline} · Built with IntoIQ`);
    if (outcome === 'shared') toast.success('Shared');
    else toast.success('Card downloaded');
  };

  const handleDownload = () => {
    if (!result) return;
    downloadWinCard(result);
    toast.success('Card downloaded');
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      // reset on close so reopening regenerates with fresh date
      setResult(null);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Share your win
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className={cn(
              'aspect-square w-full rounded-xl overflow-hidden bg-card/40 border border-border/40 flex items-center justify-center',
            )}
          >
            {loading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
            {result && (
              <img
                src={result.dataUrl}
                alt={input.headline}
                className="w-full h-full object-contain"
              />
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            1080×1080 PNG — perfect for Instagram, LinkedIn, or X.
          </p>

          <div className="flex gap-2">
            <Button onClick={handleShare} disabled={!result} className="flex-1 gap-2">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button onClick={handleDownload} disabled={!result} variant="outline" className="flex-1 gap-2">
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button onClick={() => handleClose(false)} variant="ghost" size="icon">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
