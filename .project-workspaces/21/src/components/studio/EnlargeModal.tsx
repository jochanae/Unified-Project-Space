import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { STUDIO_IMAGES } from '@/lib/studioImages';

interface EnlargeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string | null;
  catKey: string | null;
  onSwap: () => void;
  onKeep: () => void;
}

const CAT_LABELS: Record<string, string> = {
  face: 'Art Style',
  hair: 'Hair Style',
  outfit: 'Outfit',
  accessories: 'Accessories',
  background: 'Background',
};

export default function EnlargeModal({ open, onOpenChange, itemId, catKey, onSwap, onKeep }: EnlargeModalProps) {
  if (!itemId || !catKey) return null;
  const img = STUDIO_IMAGES[itemId];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[320px] p-0 overflow-hidden rounded-3xl border-border/30 bg-card">
        {img ? (
          <img src={img} alt={itemId} className="w-full h-[280px] object-cover" />
        ) : (
          <div className="w-full h-[280px] bg-secondary flex items-center justify-center text-4xl">✨</div>
        )}
        <div className="p-4">
          <h3 className="text-lg font-bold text-foreground capitalize">{itemId.replace(/-/g, ' ')}</h3>
          <p className="text-[11px] font-semibold text-primary uppercase tracking-wider mb-4">
            {CAT_LABELS[catKey] || catKey}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => { onSwap(); onOpenChange(false); }}
              className="flex-1 rounded-xl text-xs"
            >
              ← Swap it out
            </Button>
            <Button
              onClick={() => { onKeep(); onOpenChange(false); }}
              className="flex-1 rounded-xl text-xs"
            >
              Keep this ✓
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
