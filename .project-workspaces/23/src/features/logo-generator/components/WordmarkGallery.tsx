import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Type, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WordmarkStyle {
  id: string;
  name: string;
  fontFamily: string;
  fontStyle: string;
  fontSize: number;
  letterSpacing: number;
  fill?: string;
  gradient?: { colors: [string, string]; direction: 'vertical' };
  description: string;
}

const WORDMARK_STYLES: WordmarkStyle[] = [
  {
    id: 'lux-serif',
    name: 'Lux Serif',
    fontFamily: 'Playfair Display',
    fontStyle: 'normal',
    fontSize: 72,
    letterSpacing: 4,
    fill: '#ffffff',
    description: 'Timeless elegance',
  },
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontSize: 64,
    letterSpacing: 8,
    fill: '#e2e2e2',
    description: 'Clean & contemporary',
  },
  {
    id: 'bold-tech',
    name: 'Bold Tech',
    fontFamily: 'DM Sans',
    fontStyle: 'bold',
    fontSize: 78,
    letterSpacing: 2,
    gradient: { colors: ['#2dd4a8', '#3b82f6'], direction: 'vertical' },
    description: 'Powerful & forward',
  },
  {
    id: 'cinematic-script',
    name: 'Cinematic Script',
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    fontSize: 68,
    letterSpacing: 3,
    gradient: { colors: ['#c9a84c', '#f0d78c'], direction: 'vertical' },
    description: 'Premium storytelling',
  },
  {
    id: 'editorial',
    name: 'Editorial',
    fontFamily: 'Instrument Serif',
    fontStyle: 'normal',
    fontSize: 80,
    letterSpacing: 6,
    fill: '#ffffff',
    description: 'Magazine-grade authority',
  },
];

interface WordmarkGalleryProps {
  onSelect: (brandName: string, style: WordmarkStyle) => void;
}

export function WordmarkGallery({ onSelect }: WordmarkGalleryProps) {
  const [brandName, setBrandName] = useState('');
  const [open, setOpen] = useState(false);

  const displayName = brandName.trim() || 'Brand';

  const handleSelect = (style: WordmarkStyle) => {
    if (!brandName.trim()) return;
    onSelect(brandName.trim(), style);
    setOpen(false);
    setBrandName('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Type className="h-3.5 w-3.5" /> Wordmark
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        className="w-80 p-0 bg-card/95 backdrop-blur-xl border-border/30"
      >
        <div className="p-3 border-b border-border/20">
          <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Your Brand Name
          </Label>
          <div className="flex gap-2 mt-1.5">
            <Input
              value={brandName}
              onChange={e => setBrandName(e.target.value)}
              placeholder="e.g. Acme Studio"
              className="h-8 text-sm"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter' && brandName.trim()) {
                  handleSelect(WORDMARK_STYLES[0]);
                }
              }}
            />
          </div>
        </div>

        <div className="p-2 space-y-1 max-h-72 overflow-y-auto">
          <p className="text-[10px] text-muted-foreground px-1 pb-1 uppercase tracking-wider">
            Pick a style
          </p>
          {WORDMARK_STYLES.map(style => (
            <button
              key={style.id}
              onClick={() => handleSelect(style)}
              disabled={!brandName.trim()}
              className={cn(
                'w-full rounded-lg border border-border/20 p-3 text-left transition-all',
                'hover:border-primary/40 hover:bg-primary/5',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50',
              )}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {style.name}
                </span>
                <span className="text-[9px] text-muted-foreground/60">{style.description}</span>
              </div>
              <div
                className="truncate"
                style={{
                  fontFamily: style.fontFamily,
                  fontStyle: style.fontStyle?.includes('italic') ? 'italic' : 'normal',
                  fontWeight: style.fontStyle?.includes('bold') ? 700 : 400,
                  fontSize: '24px',
                  letterSpacing: `${style.letterSpacing * 0.5}px`,
                  color: style.fill || '#ffffff',
                  ...(style.gradient
                    ? {
                        background: `linear-gradient(180deg, ${style.gradient.colors[0]}, ${style.gradient.colors[1]})`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }
                    : {}),
                }}
              >
                {displayName}
              </div>
            </button>
          ))}
        </div>

        <div className="p-2 border-t border-border/20">
          <p className="text-[9px] text-muted-foreground/60 text-center flex items-center justify-center gap-1">
            <Sparkles className="h-3 w-3" /> Type your name, pick a style, edit on canvas
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
