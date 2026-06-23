import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Layers, Eye, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AssetRenderer } from './AssetRenderer';
import type { BrandKit, TemplateId } from '../types';
import { TEMPLATES } from '../types';

interface Props {
  brand: BrandKit;
  brandName: string;
}

const SAMPLE_COPY = {
  headline: 'The signal that moves the room.',
  subhead: 'A campaign-ready preview of how your brand performs across every surface.',
  cta: 'Start now',
  url: 'intoiq.app',
};

/** Generative Mood-Boarding — preview every template under one brand environment. */
export function MoodGalleryButton({ brand, brandName }: Props) {
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState<TemplateId | null>(null);

  const config = useMemo(
    () => ({
      ...SAMPLE_COPY,
      brand: { ...brand, brand_name: brand.brand_name || brandName },
    }),
    [brand, brandName],
  );

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Eye className="h-3.5 w-3.5 mr-1.5" />
        Mood Gallery
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-gold" />
              Brand Mood Gallery
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-muted-foreground">
            How <span className="font-semibold text-foreground">{brand.brand_name || brandName || 'your brand'}</span> looks
            across every campaign surface — before you ship a single asset. Tap any tile to zoom.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-2">
            {TEMPLATES.map((t) => (
              <div key={t.id} className="rounded-2xl border border-border/40 bg-muted/10 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-xs font-semibold">{t.name}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {t.width}×{t.height}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => setZoomed(t.id)} title="Zoom">
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <ScaledPreview templateId={t.id} config={config} maxWidth={280} />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Zoom overlay */}
      <Dialog open={!!zoomed} onOpenChange={(o) => !o && setZoomed(null)}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{TEMPLATES.find((t) => t.id === zoomed)?.name}</span>
              <Button size="icon" variant="ghost" onClick={() => setZoomed(null)}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          {zoomed && <ScaledPreview templateId={zoomed} config={config} maxWidth={520} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ScaledPreview({
  templateId,
  config,
  maxWidth,
}: {
  templateId: TemplateId;
  config: Parameters<typeof AssetRenderer>[0]['config'];
  maxWidth: number;
}) {
  const meta = TEMPLATES.find((t) => t.id === templateId);
  if (!meta) return null;
  const scale = maxWidth / meta.width;
  const scaledHeight = meta.height * scale;

  return (
    <div
      className={cn('relative overflow-hidden rounded-xl border border-border/40 bg-black/20 mx-auto')}
      style={{ width: maxWidth, height: scaledHeight }}
    >
      <div
        style={{
          width: meta.width,
          height: meta.height,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <AssetRenderer templateId={templateId} config={config} />
      </div>
    </div>
  );
}
