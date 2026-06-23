import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, X, Type, Palette, Maximize2, RotateCw, FlipVertical2 } from 'lucide-react';
import type { CanvasElement } from './LogoCanvas';

const FONTS = ['Instrument Serif', 'Playfair Display', 'Inter', 'DM Sans', 'Georgia', 'Arial', 'Helvetica'];

interface MobileQuickEditProps {
  element: CanvasElement;
  onUpdate: (id: string, attrs: Partial<CanvasElement>) => void;
  onDelete: () => void;
  onClose: () => void;
}

type Tab = 'text' | 'style' | 'size';

export function MobileQuickEdit({ element, onUpdate, onDelete, onClose }: MobileQuickEditProps) {
  const [tab, setTab] = useState<Tab>(element.type === 'text' ? 'text' : 'size');

  useEffect(() => {
    setTab(element.type === 'text' ? 'text' : 'size');
  }, [element.id, element.type]);

  return (
    <div
      className="w-full rounded-2xl border border-border/30 p-3 space-y-2 animate-in slide-in-from-bottom-4 duration-200 shadow-lg"
      style={{
        backgroundColor: 'hsl(var(--background) / 0.95)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div className="flex items-center justify-between gap-2 rounded-xl bg-primary/10 px-2.5 py-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground">Selected {element.type}</p>
          <p className="text-[10px] text-muted-foreground truncate">
            {element.type === 'text' ? (element.text || 'Empty text') : 'Edit or remove this layer'}
          </p>
        </div>
        <Button size="sm" variant="destructive" className="h-8 gap-1.5 px-3 shrink-0" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 justify-between">
        <div className="flex gap-1">
          {element.type === 'text' && (
            <Button
              size="sm"
              variant={tab === 'text' ? 'default' : 'ghost'}
              className="h-7 text-[11px] gap-1 px-2"
              onClick={() => setTab('text')}
            >
              <Type className="h-3 w-3" /> Text
            </Button>
          )}
          <Button
            size="sm"
            variant={tab === 'style' ? 'default' : 'ghost'}
            className="h-7 text-[11px] gap-1 px-2"
            onClick={() => setTab('style')}
          >
            <Palette className="h-3 w-3" /> Style
          </Button>
          <Button
            size="sm"
            variant={tab === 'size' ? 'default' : 'ghost'}
            className="h-7 text-[11px] gap-1 px-2"
            onClick={() => setTab('size')}
          >
            <Maximize2 className="h-3 w-3" /> Size
          </Button>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Text tab */}
      {tab === 'text' && element.type === 'text' && (
        <div className="space-y-2">
          <Input
            value={element.text || ''}
            onChange={e => onUpdate(element.id, { text: e.target.value })}
            className="h-9 text-sm"
            placeholder="Enter text…"
            autoFocus
          />
          <Select
            value={element.fontFamily || 'Inter'}
            onValueChange={v => onUpdate(element.id, { fontFamily: v })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONTS.map(f => (
                <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Style tab */}
      {tab === 'style' && element.type === 'text' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-10 shrink-0">Color</span>
            <input
              type="color"
              value={element.fill || '#ffffff'}
              onChange={e => onUpdate(element.id, { fill: e.target.value })}
              className="w-8 h-8 rounded cursor-pointer border-0 shrink-0"
            />
            <Input
              value={element.fill || '#ffffff'}
              onChange={e => onUpdate(element.id, { fill: e.target.value })}
              className="h-8 text-xs flex-1"
            />
          </div>
          <div className="flex gap-1">
            {['normal', 'bold', 'italic', 'bold italic'].map(style => (
              <Button
                key={style}
                size="sm"
                variant={element.fontStyle === style ? 'default' : 'outline'}
                className="h-7 text-[10px] flex-1 px-1"
                onClick={() => onUpdate(element.id, { fontStyle: style })}
              >
                {style === 'normal' ? 'Regular' : style === 'bold' ? 'Bold' : style === 'italic' ? 'Italic' : 'B+I'}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Size tab */}
      {tab === 'size' && (
        <div className="space-y-2">
          {element.type === 'text' && (
            <div>
              <span className="text-[10px] text-muted-foreground">Font Size: {element.fontSize || 40}px</span>
              <Slider
                value={[element.fontSize || 40]}
                onValueChange={([v]) => onUpdate(element.id, { fontSize: v })}
                min={8}
                max={200}
                step={1}
              />
            </div>
          )}
          {element.type === 'image' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-muted-foreground">Width</span>
                <Input
                  type="number"
                  value={Math.round(element.width || 100)}
                  onChange={e => onUpdate(element.id, { width: +e.target.value })}
                  className="h-7 text-xs"
                />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground">Height</span>
                <Input
                  type="number"
                  value={Math.round(element.height || 100)}
                  onChange={e => onUpdate(element.id, { height: +e.target.value })}
                  className="h-7 text-xs"
                />
              </div>
            </div>
          )}
          {element.type === 'text' && (
            <div>
              <span className="text-[10px] text-muted-foreground">Spacing: {element.letterSpacing || 0}</span>
              <Slider
                value={[element.letterSpacing || 0]}
                onValueChange={([v]) => onUpdate(element.id, { letterSpacing: v })}
                min={-10}
                max={30}
                step={0.5}
              />
            </div>
          )}
          {/* Rotation — available for all element types */}
          <div>
            <span className="text-[10px] text-muted-foreground">Rotation: {Math.round(element.rotation || 0)}°</span>
            <div className="flex items-center gap-2">
              <Slider
                value={[element.rotation || 0]}
                onValueChange={([v]) => onUpdate(element.id, { rotation: v })}
                min={0}
                max={360}
                step={1}
                className="flex-1"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[10px] gap-1 px-2 shrink-0"
                onClick={() => onUpdate(element.id, { rotation: ((element.rotation || 0) + 180) % 360 })}
              >
                <FlipVertical2 className="h-3 w-3" /> Flip
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[10px] gap-1 px-2 shrink-0"
                onClick={() => onUpdate(element.id, { rotation: ((element.rotation || 0) + 90) % 360 })}
              >
                <RotateCw className="h-3 w-3" /> 90°
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}