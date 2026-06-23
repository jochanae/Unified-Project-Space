import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Type, ImagePlus, Download, Grid3X3, AlignVerticalSpaceAround, Trash2, Lock, Unlock, RotateCcw, Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CanvasElement } from './LogoCanvas';
import { ShapesLibrary, ShapeItem } from './ShapesLibrary';
import { WordmarkGallery, WordmarkStyle } from './WordmarkGallery';

const FONT_OPTIONS = [
  'Instrument Serif',
  'Playfair Display',
  'Inter',
  'DM Sans',
  'Georgia',
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Courier New',
];

const FONT_STYLE_OPTIONS = [
  { label: 'Normal', value: 'normal' },
  { label: 'Bold', value: 'bold' },
  { label: 'Italic', value: 'italic' },
  { label: 'Bold Italic', value: 'bold italic' },
];

interface ToolPanelProps {
  elements: CanvasElement[];
  selectedId: string | null;
  onAddText: () => void;
  onAddWordmark: (brandName: string, style: WordmarkStyle) => void;
  onAddShape: (shape: ShapeItem) => void;
  onUploadImage: () => void;
  onDeleteSelected: () => void;
  onSelectElement: (id: string) => void;
  onUpdateElement: (id: string, attrs: Partial<CanvasElement>) => void;
  onExport: () => void;
  onSaveToProject?: () => void;
  saving?: boolean;
  showGrid: boolean;
  onToggleGrid: () => void;
  showBaseline: boolean;
  onToggleBaseline: () => void;
  canvasSize: { width: number; height: number };
  onCanvasSizeChange: (size: { width: number; height: number }) => void;
  backgroundColor: string;
  onBackgroundChange: (color: string) => void;
}

export function ToolPanel({
  elements,
  selectedId,
  onAddText,
  onAddWordmark,
  onAddShape,
  onUploadImage,
  onDeleteSelected,
  onSelectElement,
  onUpdateElement,
  onExport,
  onSaveToProject,
  saving,
  showGrid,
  onToggleGrid,
  showBaseline,
  onToggleBaseline,
  canvasSize,
  onCanvasSizeChange,
  backgroundColor,
  onBackgroundChange,
}: ToolPanelProps) {
  const selected = selectedId ? elements.find(el => el.id === selectedId) : null;
  const [gradientEnabled, setGradientEnabled] = useState(!!selected?.fillLinearGradient);
  const [gradColor1, setGradColor1] = useState(selected?.fillLinearGradient?.colors[0] || '#14b8a6');
  const [gradColor2, setGradColor2] = useState(selected?.fillLinearGradient?.colors[1] || '#d4af37');

  const applyGradient = (enabled: boolean, c1: string, c2: string) => {
    if (!selectedId) return;
    if (enabled) {
      onUpdateElement(selectedId, {
        fillLinearGradient: { colors: [c1, c2], direction: 'vertical' },
        fill: undefined,
      });
    } else {
      onUpdateElement(selectedId, {
        fillLinearGradient: undefined,
        fill: '#ffffff',
      });
    }
  };

  return (
    <div className="w-72 shrink-0 flex flex-col gap-4 p-4 rounded-xl bg-card/40 backdrop-blur-xl border border-border/20 overflow-y-auto max-h-[80vh]">
      {/* Title */}
      <h2 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">Logo Tools</h2>

      {/* Add Elements */}
      <div className="grid grid-cols-2 gap-2">
        <WordmarkGallery onSelect={onAddWordmark} />
        <Button size="sm" variant="outline" onClick={onAddText} className="flex-1 gap-1.5">
          <Type className="h-3.5 w-3.5" /> Text
        </Button>
        <ShapesLibrary onSelect={onAddShape} />
        <Button size="sm" variant="outline" onClick={onUploadImage} className="gap-1.5">
          <ImagePlus className="h-3.5 w-3.5" /> Image
        </Button>
      </div>

      {/* Layers */}
      {elements.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border/20">
          <h3 className="text-xs font-medium text-muted-foreground uppercase">Layers</h3>
          <div className="flex flex-col gap-1.5">
            {elements.map((el, index) => {
              const label = el.type === 'text'
                ? (el.text?.trim() || `Text ${index + 1}`)
                : `Image ${index + 1}`;

              return (
                <button
                  key={el.id}
                  onClick={() => onSelectElement(el.id)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition-colors',
                    selectedId === el.id
                      ? 'border-primary/40 bg-primary/10 text-foreground'
                      : 'border-border/20 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                  )}
                >
                  <span className="truncate pr-2">{label}</span>
                  <span className="shrink-0 text-[10px] uppercase opacity-70">{el.type}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Canvas Settings */}
      <div className="space-y-3 pt-2 border-t border-border/20">
        <h3 className="text-xs font-medium text-muted-foreground uppercase">Canvas</h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px]">Width</Label>
            <Input
              type="number"
              value={canvasSize.width}
              onChange={e => onCanvasSizeChange({ ...canvasSize, width: +e.target.value })}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Height</Label>
            <Input
              type="number"
              value={canvasSize.height}
              onChange={e => onCanvasSizeChange({ ...canvasSize, height: +e.target.value })}
              className="h-7 text-xs"
            />
          </div>
        </div>
        <div>
          <Label className="text-[10px]">Background</Label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="color"
              value={backgroundColor}
              onChange={e => onBackgroundChange(e.target.value)}
              className="w-7 h-7 rounded cursor-pointer border-0"
            />
            <Input
              value={backgroundColor}
              onChange={e => onBackgroundChange(e.target.value)}
              className="h-7 text-xs flex-1"
              placeholder="#000000"
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-[10px]">Grid</Label>
          <Switch checked={showGrid} onCheckedChange={onToggleGrid} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-[10px]">Baseline Guide</Label>
          <Switch checked={showBaseline} onCheckedChange={onToggleBaseline} />
        </div>
      </div>

      {/* Selected Element Properties */}
      {selected && (
        <div className="space-y-3 pt-2 border-t border-border/20">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium text-muted-foreground uppercase">
              {selected.type === 'text' ? 'Text Properties' : 'Image Properties'}
            </h3>
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => onUpdateElement(selected.id, { locked: !selected.locked })}
                title={selected.locked ? 'Unlock' : 'Lock'}
              >
                {selected.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-destructive"
                onClick={onDeleteSelected}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Position */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px]">X</Label>
              <Input
                type="number"
                value={Math.round(selected.x)}
                onChange={e => onUpdateElement(selected.id, { x: +e.target.value })}
                className="h-7 text-xs"
              />
            </div>
            <div>
              <Label className="text-[10px]">Y</Label>
              <Input
                type="number"
                value={Math.round(selected.y)}
                onChange={e => onUpdateElement(selected.id, { y: +e.target.value })}
                className="h-7 text-xs"
              />
            </div>
          </div>

          {selected.type === 'text' && (
            <>
              {/* Text content */}
              <div>
                <Label className="text-[10px]">Text</Label>
                <Input
                  value={selected.text || ''}
                  onChange={e => onUpdateElement(selected.id, { text: e.target.value })}
                  className="h-7 text-xs"
                />
              </div>

              {/* Font */}
              <div>
                <Label className="text-[10px]">Font</Label>
                <Select
                  value={selected.fontFamily || 'Instrument Serif'}
                  onValueChange={v => onUpdateElement(selected.id, { fontFamily: v })}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map(f => (
                      <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Font Style */}
              <div>
                <Label className="text-[10px]">Style</Label>
                <Select
                  value={selected.fontStyle || 'normal'}
                  onValueChange={v => onUpdateElement(selected.id, { fontStyle: v })}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_STYLE_OPTIONS.map(s => (
                      <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Font Size */}
              <div>
                <Label className="text-[10px]">Size: {selected.fontSize || 40}px</Label>
                <Slider
                  value={[selected.fontSize || 40]}
                  onValueChange={([v]) => onUpdateElement(selected.id, { fontSize: v })}
                  min={8}
                  max={200}
                  step={1}
                  className="mt-1"
                />
              </div>

              {/* Letter Spacing */}
              <div>
                <Label className="text-[10px]">Letter Spacing: {selected.letterSpacing || 0}px</Label>
                <Slider
                  value={[selected.letterSpacing || 0]}
                  onValueChange={([v]) => onUpdateElement(selected.id, { letterSpacing: v })}
                  min={-10}
                  max={30}
                  step={0.5}
                  className="mt-1"
                />
              </div>

              {/* Color */}
              <div>
                <Label className="text-[10px]">Color</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={selected.fill || '#ffffff'}
                    onChange={e => {
                      setGradientEnabled(false);
                      onUpdateElement(selected.id, { fill: e.target.value, fillLinearGradient: undefined });
                    }}
                    className="w-7 h-7 rounded cursor-pointer border-0"
                  />
                  <Input
                    value={selected.fill || '#ffffff'}
                    onChange={e => onUpdateElement(selected.id, { fill: e.target.value })}
                    className="h-7 text-xs flex-1"
                  />
                </div>
              </div>

              {/* Gradient */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px]">Gradient Fill</Label>
                  <Switch
                    checked={gradientEnabled}
                    onCheckedChange={(v) => {
                      setGradientEnabled(v);
                      applyGradient(v, gradColor1, gradColor2);
                    }}
                  />
                </div>
                {gradientEnabled && (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="text-[10px]">Start</Label>
                      <input
                        type="color"
                        value={gradColor1}
                        onChange={e => { setGradColor1(e.target.value); applyGradient(true, e.target.value, gradColor2); }}
                        className="w-full h-6 rounded cursor-pointer border-0"
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-[10px]">End</Label>
                      <input
                        type="color"
                        value={gradColor2}
                        onChange={e => { setGradColor2(e.target.value); applyGradient(true, gradColor1, e.target.value); }}
                        className="w-full h-6 rounded cursor-pointer border-0"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Baseline Group */}
              <div>
                <Label className="text-[10px]">Baseline Group</Label>
                <Input
                  value={selected.baselineGroup || ''}
                  onChange={e => onUpdateElement(selected.id, { baselineGroup: e.target.value || undefined })}
                  className="h-7 text-xs"
                  placeholder="e.g. main"
                />
              </div>
            </>
          )}

          {selected.type === 'image' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Width</Label>
                <Input
                  type="number"
                  value={Math.round(selected.width || 100)}
                  onChange={e => onUpdateElement(selected.id, { width: +e.target.value })}
                  className="h-7 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px]">Height</Label>
                <Input
                  type="number"
                  value={Math.round(selected.height || 100)}
                  onChange={e => onUpdateElement(selected.id, { height: +e.target.value })}
                  className="h-7 text-xs"
                />
              </div>
            </div>
          )}

          {/* Rotation */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-[10px]">Rotation: {Math.round(selected.rotation || 0)}°</Label>
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5"
                onClick={() => onUpdateElement(selected.id, { rotation: 0 })}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>
            <Slider
              value={[selected.rotation || 0]}
              onValueChange={([v]) => onUpdateElement(selected.id, { rotation: v })}
              min={-180}
              max={180}
              step={1}
              className="mt-1"
            />
          </div>
        </div>
      )}

      {/* Export */}
      <div className="pt-2 border-t border-border/20 mt-auto space-y-2">
        <Button onClick={onExport} className="w-full gap-2">
          <Download className="h-4 w-4" /> Export PNG
        </Button>
        {onSaveToProject && (
          <Button onClick={onSaveToProject} variant="outline" className="w-full gap-2" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving…' : 'Save to Project'}
          </Button>
        )}
      </div>
    </div>
  );
}
