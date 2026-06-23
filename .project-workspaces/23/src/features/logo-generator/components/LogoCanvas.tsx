import { useState, useRef, useCallback, useEffect } from 'react';
import { Stage, Layer, Text, Image as KonvaImage, Transformer, Rect } from 'react-konva';
import Konva from 'konva';
import { cn } from '@/lib/utils';

export interface CanvasElement {
  id: string;
  type: 'text' | 'image';
  x: number;
  y: number;
  // Text props
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;
  fill?: string;
  fillLinearGradient?: { colors: string[]; direction: 'vertical' | 'horizontal' };
  letterSpacing?: number;
  // Image props
  imageUrl?: string;
  width?: number;
  height?: number;
  // Shared
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  draggable?: boolean;
  locked?: boolean;
  baselineGroup?: string; // elements in the same group share a baseline
}

interface LogoCanvasProps {
  elements: CanvasElement[];
  onElementsChange: (elements: CanvasElement[]) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  canvasSize: { width: number; height: number };
  backgroundColor: string;
  showGrid: boolean;
  showBaseline: boolean;
  referenceImageUrl?: string | null;
  referenceOpacity?: number;
}

/** Load an HTMLImageElement from a URL */
function useImage(url?: string): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!url) { setImg(null); return; }
    const image = new window.Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => setImg(image);
    image.src = url;
  }, [url]);
  return img;
}

/** Single image element on the canvas */
function CanvasImageElement({ el, isSelected, onSelect, onChange }: {
  el: CanvasElement;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (attrs: Partial<CanvasElement>) => void;
}) {
  const img = useImage(el.imageUrl);
  const shapeRef = useRef<Konva.Image>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  if (!img) return null;

  return (
    <>
      <KonvaImage
        ref={shapeRef}
        image={img}
        x={el.x}
        y={el.y}
        width={el.width || img.naturalWidth}
        height={el.height || img.naturalHeight}
        rotation={el.rotation || 0}
        scaleX={el.scaleX || 1}
        scaleY={el.scaleY || 1}
        draggable={!el.locked}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          onChange({ x: e.target.x(), y: e.target.y() });
        }}
        onTransformEnd={() => {
          const node = shapeRef.current!;
          onChange({
            x: node.x(),
            y: node.y(),
            rotation: node.rotation(),
            scaleX: node.scaleX(),
            scaleY: node.scaleY(),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) return oldBox;
            return newBox;
          }}
        />
      )}
    </>
  );
}

/** Single text element on the canvas */
function CanvasTextElement({ el, isSelected, onSelect, onChange }: {
  el: CanvasElement;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (attrs: Partial<CanvasElement>) => void;
}) {
  const shapeRef = useRef<Konva.Text>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  // Build fill props
  const fillProps: Record<string, unknown> = {};
  const isValidColor = (c: string) => /^#[0-9a-fA-F]{3,8}$/.test(c) || /^(rgb|hsl)/.test(c) || /^[a-zA-Z]{3,}$/.test(c);
  if (el.fillLinearGradient && Array.isArray(el.fillLinearGradient.colors) && el.fillLinearGradient.colors.length >= 2 && el.fillLinearGradient.colors.every(isValidColor)) {
    const colors = el.fillLinearGradient.colors;
    const isVert = el.fillLinearGradient.direction === 'vertical';
    fillProps.fillLinearGradientStartPoint = { x: 0, y: 0 };
    fillProps.fillLinearGradientEndPoint = isVert
      ? { x: 0, y: el.fontSize || 40 }
      : { x: (el.text?.length || 2) * (el.fontSize || 40) * 0.6, y: 0 };
    fillProps.fillLinearGradientColorStops = [0, colors[0], 1, colors[1]];
  } else {
    fillProps.fill = el.fill || '#ffffff';
  }

  return (
    <>
      <Text
        ref={shapeRef}
        text={el.text || ''}
        x={el.x}
        y={el.y}
        fontSize={el.fontSize || 40}
        fontFamily={el.fontFamily || 'Instrument Serif'}
        fontStyle={el.fontStyle || 'normal'}
        letterSpacing={el.letterSpacing || 0}
        rotation={el.rotation || 0}
        scaleX={el.scaleX || 1}
        scaleY={el.scaleY || 1}
        draggable={!el.locked}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          onChange({ x: e.target.x(), y: e.target.y() });
        }}
        onTransformEnd={() => {
          const node = shapeRef.current!;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          // Apply scale to font size and reset scale
          onChange({
            x: node.x(),
            y: node.y(),
            rotation: node.rotation(),
            fontSize: Math.round((el.fontSize || 40) * scaleY),
            scaleX: 1,
            scaleY: 1,
          });
        }}
        {...fillProps}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 10 || newBox.height < 10) return oldBox;
            return newBox;
          }}
        />
      )}
    </>
  );
}

export function LogoCanvas({
  elements,
  onElementsChange,
  selectedId,
  onSelect,
  canvasSize,
  backgroundColor,
  showGrid,
  showBaseline,
  referenceImageUrl,
  referenceOpacity = 0.5,
}: LogoCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const refImg = useImage(referenceImageUrl || undefined);

  const handleChange = useCallback((id: string, attrs: Partial<CanvasElement>) => {
    onElementsChange(
      elements.map(el => el.id === id ? { ...el, ...attrs } : el)
    );
  }, [elements, onElementsChange]);

  // Deselect on empty click
  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (e.target === e.target.getStage()) {
      onSelect(null);
    }
  };

  // Find baseline Y for groups
  const baselineGroups = new Map<string, number>();
  elements.forEach(el => {
    if (el.baselineGroup) {
      const bottom = el.y + (el.fontSize || el.height || 40);
      const current = baselineGroups.get(el.baselineGroup) || 0;
      if (bottom > current) baselineGroups.set(el.baselineGroup, bottom);
    }
  });

  return (
    <div className="relative border border-border/30 rounded-xl overflow-hidden" style={{ width: canvasSize.width, height: canvasSize.height }}>
      <Stage
        ref={stageRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onClick={handleStageClick}
        onTap={handleStageClick}
      >
        <Layer>
          {/* Background */}
          <Rect
            x={0}
            y={0}
            width={canvasSize.width}
            height={canvasSize.height}
            fill={backgroundColor}
          />

          {/* Reference / trace image — excluded from export via naming */}
          {refImg && (
            <KonvaImage
              image={refImg}
              x={0}
              y={0}
              width={canvasSize.width}
              height={canvasSize.height}
              opacity={referenceOpacity}
              listening={false}
              name="__reference__"
            />
          )}

          {/* Grid */}
          {showGrid && Array.from({ length: Math.floor(canvasSize.width / 32) }).map((_, i) => (
            <Rect key={`gv-${i}`} x={i * 32} y={0} width={1} height={canvasSize.height} fill="rgba(255,255,255,0.05)" />
          ))}
          {showGrid && Array.from({ length: Math.floor(canvasSize.height / 32) }).map((_, i) => (
            <Rect key={`gh-${i}`} x={0} y={i * 32} width={canvasSize.width} height={1} fill="rgba(255,255,255,0.05)" />
          ))}

          {/* Baseline guides */}
          {showBaseline && Array.from(baselineGroups.entries()).map(([group, y]) => (
            <Rect key={`bl-${group}`} x={0} y={y} width={canvasSize.width} height={1} fill="rgba(20,184,166,0.4)" />
          ))}

          {/* Elements */}
          {elements.map(el => {
            if (el.type === 'image') {
              return (
                <CanvasImageElement
                  key={el.id}
                  el={el}
                  isSelected={selectedId === el.id}
                  onSelect={() => onSelect(el.id)}
                  onChange={(attrs) => handleChange(el.id, attrs)}
                />
              );
            }
            return (
              <CanvasTextElement
                key={el.id}
                el={el}
                isSelected={selectedId === el.id}
                onSelect={() => onSelect(el.id)}
                onChange={(attrs) => handleChange(el.id, attrs)}
              />
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}

/** Export the stage as a transparent PNG data URL */
export function exportCanvasAsPng(stageRef: Konva.Stage, pixelRatio = 2): string {
  return stageRef.toDataURL({ pixelRatio, mimeType: 'image/png' });
}
