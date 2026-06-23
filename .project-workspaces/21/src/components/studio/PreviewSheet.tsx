import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import type { StudioSection } from '@/lib/studioData';

interface PreviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOptions: Record<string, string>;
  companionName: string;
  isCreationMode: boolean;
  studioPath: StudioSection[];
  onGenerate: () => void;
  onEnlarge: (catKey: string, itemId: string) => void;
}

export default function PreviewSheet({
  open,
  onOpenChange,
  selectedOptions,
  companionName,
  isCreationMode,
  studioPath,
  onGenerate,
  onEnlarge,
}: PreviewSheetProps) {
  // Build a lookup of section items to find images by name
  const findItemImage = (sectionId: string, itemName: string): string | undefined => {
    const section = studioPath.find(s => s.id === sectionId);
    if (!section) return undefined;
    const allItems = section.clusters ? section.clusters.flatMap(c => c.items) : section.items || [];
    const item = allItems.find(i => i.name === itemName);
    return item?.img;
  };

  const entries = Object.entries(selectedOptions).filter(([, v]) => v && v !== '__skip__');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl bg-card border-border/30 max-h-[85vh] overflow-y-auto px-5 pb-8">
        <SheetHeader className="text-left mb-4">
          <SheetTitle className="font-display text-lg">Your Companion ✨</SheetTitle>
          <SheetDescription className="text-xs">
            Review your selections — tap any item to swap it out
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5">
          {studioPath.map((section) => {
            const value = selectedOptions[section.id];
            if (!value || value === '__skip__') return null;

            // Handle comma-separated multi-select
            const names = value.includes(', ') ? value.split(', ') : [value];

            return (
              <div key={section.id}>
                <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2">{section.title}</p>
                <div className="flex gap-2 flex-wrap">
                  {names.map(name => {
                    const img = findItemImage(section.id, name);
                    return (
                      <button
                        key={name}
                        onClick={() => onEnlarge(section.id, name)}
                        className="flex items-center gap-3 group"
                      >
                        <div className="h-[72px] w-[56px] rounded-xl overflow-hidden border-2 border-primary shrink-0">
                          {img ? (
                            <img src={img} alt={name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full bg-secondary flex items-center justify-center text-sm">✨</div>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground capitalize group-hover:text-foreground transition-colors">
                          {name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 space-y-2">
          <Button
            onClick={() => { onGenerate(); onOpenChange(false); }}
            className="w-full rounded-[28px] h-14 text-[11px] uppercase font-bold gold-shimmer relative overflow-hidden"
            style={{
              background: 'linear-gradient(90deg, rgba(212,175,55,0.2), rgba(212,175,55,0.4), rgba(212,175,55,0.2))',
              border: '1px solid rgba(212,175,55,0.5)',
              letterSpacing: '0.5em',
              color: '#fff',
              boxShadow: '0 0 20px rgba(212,175,55,0.15)',
              backdropFilter: 'blur(24px)',
            }}
          >
            <Sparkles className="h-4 w-4 mr-3" style={{ filter: 'drop-shadow(0 0 6px rgba(212,175,55,0.6))' }} />
            {isCreationMode ? `Generate ${companionName || 'Your Friend'}` : 'Save & Generate'}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full rounded-2xl h-10 text-xs"
          >
            Keep editing
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
