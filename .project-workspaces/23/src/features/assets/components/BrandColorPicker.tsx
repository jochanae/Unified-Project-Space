import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Palette, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export interface BrandColors {
  primary: string;
  accent: string;
  background: string;
  text: string;
}

const PRESETS: { name: string; colors: BrandColors }[] = [
  { name: 'Ember', colors: { primary: '#c8521a', accent: '#e8a87c', background: '#faf8f5', text: '#1a1a1a' } },
  { name: 'Ocean', colors: { primary: '#1a4a6e', accent: '#5cbdb9', background: '#f0f7fa', text: '#0c2340' } },
  { name: 'Noir', colors: { primary: '#c9a84c', accent: '#f0d78c', background: '#0d0d0d', text: '#f5f5f5' } },
  { name: 'Forest', colors: { primary: '#2d5a3d', accent: '#a0c49d', background: '#f5f0e8', text: '#1a3c2a' } },
  { name: 'Coral', colors: { primary: '#ff6b6b', accent: '#ee5a70', background: '#fff5f5', text: '#2d2d2d' } },
  { name: 'Midnight', colors: { primary: '#4f46e5', accent: '#818cf8', background: '#0a0a1a', text: '#e8ecf1' } },
];

const STORAGE_KEY = 'brand_colors_';

export function BrandColorPicker({ projectId, onChange }: { projectId: string; onChange?: (colors: BrandColors) => void }) {
  const [colors, setColors] = useState<BrandColors>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + projectId);
      return saved ? JSON.parse(saved) : PRESETS[0].colors;
    } catch { return PRESETS[0].colors; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + projectId, JSON.stringify(colors));
    onChange?.(colors);
  }, [colors, projectId, onChange]);

  const updateColor = (key: keyof BrandColors, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }));
  };

  const applyPreset = (preset: BrandColors) => {
    setColors(preset);
    toast.success('Preset applied');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Palette className="h-4 w-4" /> Brand Colors
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Presets */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Quick Presets</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(p => (
              <button
                key={p.name}
                onClick={() => applyPreset(p.colors)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border hover:border-primary/50 transition-colors text-xs"
              >
                <div className="flex gap-0.5">
                  {Object.values(p.colors).map((c, i) => (
                    <div key={i} className="w-3 h-3 rounded-full border border-border/50" style={{ backgroundColor: c }} />
                  ))}
                </div>
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Pickers */}
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(colors) as (keyof BrandColors)[]).map(key => (
            <div key={key}>
              <label className="text-xs text-muted-foreground capitalize mb-1 block">{key}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={colors[key]}
                  onChange={e => updateColor(key, e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                />
                <Input
                  value={colors[key]}
                  onChange={e => updateColor(key, e.target.value)}
                  className="text-xs h-8 font-mono"
                  placeholder="#000000"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Preview */}
        <div className="rounded-lg overflow-hidden border border-border">
          <div className="p-4" style={{ backgroundColor: colors.background }}>
            <h3 className="text-sm font-bold mb-1" style={{ color: colors.text }}>Preview Heading</h3>
            <p className="text-xs mb-2" style={{ color: colors.text, opacity: 0.7 }}>Body text preview with your brand colors.</p>
            <div className="flex gap-2">
              <span className="px-3 py-1 rounded-md text-xs text-white font-medium" style={{ backgroundColor: colors.primary }}>Primary</span>
              <span className="px-3 py-1 rounded-md text-xs font-medium" style={{ backgroundColor: colors.accent, color: colors.text }}>Accent</span>
            </div>
          </div>
        </div>

        <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => applyPreset(PRESETS[0].colors)}>
          <RotateCcw className="h-3 w-3 mr-1" /> Reset to Default
        </Button>
      </CardContent>
    </Card>
  );
}
