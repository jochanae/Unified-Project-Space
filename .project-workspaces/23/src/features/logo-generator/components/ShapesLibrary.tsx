import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Shapes } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ShapeItem {
  label: string;
  char: string;
  category: string;
}

const SHAPE_LIBRARY: ShapeItem[] = [
  // Geometric
  { label: 'Circle', char: '●', category: 'Geometric' },
  { label: 'Ring', char: '◯', category: 'Geometric' },
  { label: 'Square', char: '■', category: 'Geometric' },
  { label: 'Diamond', char: '◆', category: 'Geometric' },
  { label: 'Triangle Up', char: '▲', category: 'Geometric' },
  { label: 'Triangle Down', char: '▼', category: 'Geometric' },
  { label: 'Triangle Right', char: '▶', category: 'Geometric' },
  { label: 'Hexagon', char: '⬡', category: 'Geometric' },
  { label: 'Pentagon', char: '⬠', category: 'Geometric' },
  { label: 'Star', char: '★', category: 'Geometric' },
  { label: 'Star Outline', char: '☆', category: 'Geometric' },

  // Lines & Dividers
  { label: 'Horizontal Line', char: '―', category: 'Lines' },
  { label: 'Vertical Line', char: '│', category: 'Lines' },
  { label: 'Slash', char: '╱', category: 'Lines' },
  { label: 'Cross', char: '✕', category: 'Lines' },
  { label: 'Plus', char: '＋', category: 'Lines' },

  // Arrows & Pointers
  { label: 'Arrow Right', char: '→', category: 'Arrows' },
  { label: 'Arrow Left', char: '←', category: 'Arrows' },
  { label: 'Arrow Up', char: '↑', category: 'Arrows' },
  { label: 'Chevron Up', char: '⌃', category: 'Arrows' },
  { label: 'Chevron Right', char: '›', category: 'Arrows' },
  { label: 'Double Chevron', char: '»', category: 'Arrows' },

  // Decorative
  { label: 'Sparkle', char: '✦', category: 'Decorative' },
  { label: 'Spark 4', char: '✧', category: 'Decorative' },
  { label: 'Asterisk', char: '✱', category: 'Decorative' },
  { label: 'Flower', char: '✿', category: 'Decorative' },
  { label: 'Snowflake', char: '❄', category: 'Decorative' },
  { label: 'Heart', char: '♥', category: 'Decorative' },
  { label: 'Infinity', char: '∞', category: 'Decorative' },
  { label: 'Sun', char: '☀', category: 'Decorative' },
  { label: 'Moon', char: '☽', category: 'Decorative' },
  { label: 'Lightning', char: '⚡', category: 'Decorative' },
  { label: 'Crown', char: '♛', category: 'Decorative' },
  { label: 'Music', char: '♪', category: 'Decorative' },

  // Brackets & Frames
  { label: 'Left Bracket', char: '【', category: 'Frames' },
  { label: 'Right Bracket', char: '】', category: 'Frames' },
  { label: 'Left Paren', char: '（', category: 'Frames' },
  { label: 'Right Paren', char: '）', category: 'Frames' },
  { label: 'Left Angle', char: '〈', category: 'Frames' },
  { label: 'Right Angle', char: '〉', category: 'Frames' },
];

const CATEGORIES = [...new Set(SHAPE_LIBRARY.map(s => s.category))];

interface ShapesLibraryProps {
  onSelect: (shape: ShapeItem) => void;
  variant?: 'button' | 'compact';
}

export function ShapesLibrary({ onSelect, variant = 'button' }: ShapesLibraryProps) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);

  const filteredShapes = SHAPE_LIBRARY.filter(s => s.category === activeCategory);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {variant === 'compact' ? (
          <Button size="sm" variant="outline" className="h-8 gap-1 text-[11px] shrink-0">
            <Shapes className="h-3.5 w-3.5" /> Shapes
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="gap-1.5">
            <Shapes className="h-3.5 w-3.5" /> Shapes
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-2 border-b border-border/20">
          <p className="text-xs font-medium text-foreground/80">Elements Library</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Click to add to canvas</p>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 p-2 overflow-x-auto scrollbar-none border-b border-border/10">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'shrink-0 rounded-md px-2 py-1 text-[10px] font-medium transition-colors',
                activeCategory === cat
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Shape grid */}
        <div className="grid grid-cols-6 gap-1 p-2 max-h-48 overflow-y-auto">
          {filteredShapes.map(shape => (
            <button
              key={shape.label}
              onClick={() => {
                onSelect(shape);
                setOpen(false);
              }}
              title={shape.label}
              className="flex items-center justify-center h-10 w-full rounded-md border border-border/20 bg-muted/20 text-lg hover:bg-primary/10 hover:border-primary/30 transition-colors"
            >
              {shape.char}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
