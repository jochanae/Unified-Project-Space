import { cn } from '@/lib/utils';
import { STUDIO_IMAGES } from '@/lib/studioImages';
import { Eye } from 'lucide-react';

interface SelectedStripProps {
  selectedOptions: Record<string, string>;
  onPreview: () => void;
  onEnlarge: (catKey: string, itemId: string) => void;
}

const CAT_LABELS: Record<string, string> = {
  face: 'Style',
  hair: 'Hair',
  outfit: 'Outfit',
  accessories: 'Acc',
  background: 'BG',
};

export default function SelectedStrip({ selectedOptions, onPreview, onEnlarge }: SelectedStripProps) {
  const entries = Object.entries(selectedOptions).filter(([, v]) => v);

  return (
    <div className="border-t border-border/30 bg-card/80 backdrop-blur-xl px-4 py-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0">
          Selected
        </span>

        <div className="flex gap-1.5 flex-1 overflow-x-auto no-scrollbar">
          {entries.length === 0 ? (
            <span className="text-xs text-muted-foreground/50 italic">Nothing yet</span>
          ) : (
            entries.map(([catKey, itemId]) => {
              const img = STUDIO_IMAGES[itemId];
              return (
                <button
                  key={catKey}
                  onClick={() => onEnlarge(catKey, itemId)}
                  className="shrink-0 h-9 w-9 rounded-lg overflow-hidden border-2 border-primary transition-transform active:scale-90"
                >
                  {img ? (
                    <img src={img} alt={itemId} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-secondary flex items-center justify-center text-[10px]">
                      {CAT_LABELS[catKey]?.[0] || '?'}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        <button
          onClick={onPreview}
          className="shrink-0 flex items-center gap-1 rounded-lg border border-primary/40 bg-card px-2.5 py-1.5 text-[11px] font-bold text-primary transition-colors hover:bg-primary/10"
        >
          <Eye className="h-3 w-3" />
          Preview
        </button>
      </div>
    </div>
  );
}
