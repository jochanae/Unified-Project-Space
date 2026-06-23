import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Smile, RefreshCw, Loader2, ImageIcon, Wand2 } from 'lucide-react';
import { CompanionMediaItem } from '@/hooks/useCompanionMedia';
import { toast } from 'sonner';

const STICKER_EXPRESSIONS = [
  { emoji: '😊', label: 'Happy', prompt: 'beaming with joy, big smile' },
  { emoji: '🥰', label: 'Love', prompt: 'heart eyes, blushing with love' },
  { emoji: '😢', label: 'Sad', prompt: 'tearful, looking sad but hopeful' },
  { emoji: '🤗', label: 'Hug', prompt: 'arms open wide for a warm hug' },
  { emoji: '😤', label: 'Fired up', prompt: 'determined, pumping fist with energy' },
  { emoji: '😴', label: 'Sleepy', prompt: 'drowsy, yawning cutely' },
  { emoji: '🎉', label: 'Celebrate', prompt: 'celebrating with confetti, excited' },
  { emoji: '💪', label: 'Strong', prompt: 'flexing muscles, looking confident' },
];

export { STICKER_EXPRESSIONS };

interface StickerGalleryProps {
  stickers: CompanionMediaItem[];
  companionName: string;
  companionAppearanceDesc?: string;
  userId: string;
  onGenerate: (expression: string) => Promise<string | null>;
  onDelete: (id: string) => void;
}

export default function StickerGallery({
  stickers,
  companionName,
  companionAppearanceDesc,
  userId,
  onGenerate,
  onDelete,
}: StickerGalleryProps) {
  const [generating, setGenerating] = useState<string | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 });

  const handleGenerate = useCallback(async (expression: string) => {
    setGenerating(expression);
    try {
      const url = await onGenerate(expression);
      if (url) {
        toast.success('Sticker created! ✨');
      } else {
        toast.error('Could not generate sticker — try again');
      }
    } catch {
      toast.error('Generation failed');
    } finally {
      setGenerating(null);
    }
  }, [onGenerate]);

  const handleBatchGenerate = useCallback(async () => {
    const missing = STICKER_EXPRESSIONS.filter(
      (expr) => !stickers.find((s) => s.prompt === expr.prompt)
    );
    if (missing.length === 0) {
      toast('All stickers already generated! ✨');
      return;
    }

    setBatchRunning(true);
    setBatchProgress({ done: 0, total: missing.length });

    let successes = 0;
    for (const expr of missing) {
      setGenerating(expr.prompt);
      try {
        const url = await onGenerate(expr.prompt);
        if (url) successes++;
      } catch {
        // continue with next
      }
      setBatchProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    setGenerating(null);
    setBatchRunning(false);
    toast.success(`Generated ${successes} of ${missing.length} stickers ✨`);
  }, [stickers, onGenerate]);

  const getStickerForExpression = (prompt: string) => {
    return stickers.find((s) => s.prompt === prompt);
  };

  const missingCount = STICKER_EXPRESSIONS.filter(
    (expr) => !stickers.find((s) => s.prompt === expr.prompt)
  ).length;

  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Smile className="h-3.5 w-3.5" /> Sticker Pack
      </h3>
      <div className="rounded-2xl border border-border/40 bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted-foreground">
            {companionAppearanceDesc
              ? `${companionName}'s personal sticker pack`
              : `Set a companion appearance for best results.`}
          </p>
          {missingCount > 0 && (
            <button
              onClick={handleBatchGenerate}
              disabled={batchRunning}
              className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              {batchRunning ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {batchProgress.done}/{batchProgress.total}
                </>
              ) : (
                <>
                  <Wand2 className="h-3 w-3" />
                  Generate all ({missingCount})
                </>
              )}
            </button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2.5">
          {STICKER_EXPRESSIONS.map((expr) => {
            const cached = getStickerForExpression(expr.prompt);
            const isGenerating = generating === expr.prompt;

            return (
              <div key={expr.label} className="flex flex-col items-center gap-1">
                <div className="relative h-16 w-16 rounded-xl border border-border/40 bg-secondary/30 overflow-hidden">
                  {cached ? (
                    <>
                      <img
                        src={cached.imageUrl}
                        alt={expr.label}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      <button
                        onClick={() => {
                          onDelete(cached.id);
                          handleGenerate(expr.prompt);
                        }}
                        disabled={batchRunning}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity"
                      >
                        <RefreshCw className="h-4 w-4 text-white" />
                      </button>
                    </>
                  ) : isGenerating ? (
                    <div className="flex h-full w-full items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : (
                    <button
                      onClick={() => handleGenerate(expr.prompt)}
                      disabled={batchRunning}
                      className="flex h-full w-full flex-col items-center justify-center gap-0.5 hover:bg-secondary/60 transition-colors"
                    >
                      <span className="text-lg">{expr.emoji}</span>
                      <ImageIcon className="h-3 w-3 text-muted-foreground/50" />
                    </button>
                  )}
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {expr.label}{cached && cached.usageCount > 0 ? ` · ${cached.usageCount}×` : ''}
                </span>
              </div>
            );
          })}
        </div>

        {stickers.length > 0 && (
          <p className="mt-3 text-[10px] text-muted-foreground text-center">
            {stickers.length} of {STICKER_EXPRESSIONS.length} stickers generated · Hover to regenerate
          </p>
        )}
      </div>
    </section>
  );
}
