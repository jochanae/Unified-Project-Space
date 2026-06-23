import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, EyeOff, Home } from 'lucide-react';
import { DriftingVisionCard } from './DriftingVisionCard';
import { VisionBoardBackground } from './VisionBoardBackground';
import { ZoomControls } from './ZoomControls';
import { useZoomPan } from '@/hooks/useZoomPan';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getCategoryColors, type VisionCategory } from '@/lib/visionCategories';
import type { VisionBoardItem } from './AddVisionSheet';

interface FloatingCanvasProps {
  items: VisionBoardItem[];
  allItems: VisionBoardItem[]; // All items for minimap
  onItemClick: (item: VisionBoardItem) => void;
  onPositionChange: (id: string, x: number, y: number) => void;
  isNightMode: boolean;
  selectedCategory: VisionCategory | null;
}

export function FloatingCanvas({
  items,
  allItems,
  onItemClick,
  onPositionChange,
  isNightMode,
  selectedCategory,
}: FloatingCanvasProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Canvas dimensions - large infinite canvas
  const canvasWidth = typeof window !== 'undefined' ? Math.max(window.innerWidth * 2, 2000) : 2000;
  const canvasHeight = typeof window !== 'undefined' ? Math.max(window.innerHeight * 3, 3000) : 3000;

  const { 
    containerRef: zoomRef, 
    scale, 
    transform, 
    zoomIn, 
    zoomOut, 
    resetZoom 
  } = useZoomPan({
    minZoom: 0.3,
    maxZoom: 2,
    initialZoom: 1,
  });

  // Build positions with category-based clustering
  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number; rotation: number; scale: number; zIndex: number; isFiltered: boolean }>();
    
    // When a category is selected, filtered items cluster near the top
    const filteredItems = selectedCategory 
      ? items.filter(item => item.category === selectedCategory)
      : items;
    
    const unfilteredItems = selectedCategory
      ? allItems.filter(item => item.category !== selectedCategory)
      : [];

    // Position filtered items in the upper area (clustered)
    filteredItems.forEach((item, index) => {
      const isFiltered = selectedCategory !== null;
      
      // When filtering, position items in a loose cluster at the top
      let targetX = item.positionX;
      let targetY = item.positionY;
      
      if (isFiltered) {
        // Cluster filtered items in upper portion
        const cols = Math.ceil(Math.sqrt(filteredItems.length));
        const row = Math.floor(index / cols);
        const col = index % cols;
        const spacing = 220;
        const offsetX = (canvasWidth - cols * spacing) / 2;
        targetX = offsetX + col * spacing + (Math.random() - 0.5) * 60;
        targetY = 150 + row * spacing + (Math.random() - 0.5) * 40;
      }
      
      map.set(item.id, {
        x: targetX,
        y: targetY,
        rotation: 0,
        scale: 1,
        zIndex: 20 + index,
        isFiltered: true,
      });
    });

    // Position unfiltered items lower and dimmed
    unfilteredItems.forEach((item, index) => {
      map.set(item.id, {
        x: item.positionX,
        y: Math.max(item.positionY, 600) + 200,
        rotation: 0,
        scale: 0.8,
        zIndex: 5 + index,
        isFiltered: false,
      });
    });

    return map;
  }, [items, allItems, selectedCategory, canvasWidth]);

  // Pause all animations when any card is hovered
  const handleHover = useCallback((id: string | null) => {
    setHoveredId(id);
  }, []);

  // Toggle pause state
  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  const minimapWidth = 140;
  const minimapHeight = 80;

  // Items to render - show filtered first, then faded unfiltered
  const renderItems = useMemo(() => {
    if (!selectedCategory) return items;
    
    const filtered = items.filter(item => item.category === selectedCategory);
    const unfiltered = allItems.filter(item => item.category !== selectedCategory);
    
    return [...filtered, ...unfiltered];
  }, [items, allItems, selectedCategory]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Background */}
      <VisionBoardBackground isNightMode={isNightMode} height={`${canvasHeight}px`} />

      {/* Zoomable/Pannable Container */}
      <div
        ref={zoomRef}
        className="absolute inset-0 overflow-auto"
        style={{ cursor: 'grab' }}
      >
        {/* Canvas Content */}
        <div
          ref={containerRef}
          className="relative"
          style={{
            width: canvasWidth,
            height: canvasHeight,
            transform,
            transformOrigin: '0 0',
          }}
        >
          <AnimatePresence mode="popLayout">
            {renderItems.map((item) => {
              const pos = positions.get(item.id);
              const isFiltered = pos?.isFiltered ?? true;
              const isMatchingCategory = !selectedCategory || item.category === selectedCategory;
              
              return (
                <DriftingVisionCard
                  key={item.id}
                  item={item}
                  isHovered={hoveredId === item.id}
                  isPaused={isPaused || hoveredId !== null}
                  onHover={handleHover}
                  onClick={() => onItemClick(item)}
                  onPositionChange={onPositionChange}
                  canvasWidth={canvasWidth}
                  canvasHeight={canvasHeight}
                  targetPosition={pos ? { x: pos.x, y: pos.y } : undefined}
                  isFiltered={isMatchingCategory}
                  dimmed={!isMatchingCategory}
                />
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Controls Overlay */}
      <div className="absolute bottom-4 right-4 z-40 flex flex-col gap-2">
        <ZoomControls
          scale={scale}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onReset={resetZoom}
        />
      </div>

      {/* Pause Button */}
      <button
        onClick={togglePause}
        className="absolute bottom-4 left-4 z-40 px-4 py-2 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 text-white text-sm font-medium hover:bg-black/50 transition-colors"
      >
        {isPaused ? '▶ Resume' : '⏸ Pause'}
      </button>

      {/* Inline Mini Map */}
      {showMiniMap && allItems.length > 0 && (
        <div className="absolute top-4 right-4 z-40">
          <Card className="bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-white/70" />
                  <span className="text-xs font-medium text-white/80">Overview</span>
                  <span className="text-xs text-white/50">{Math.round(scale * 100)}%</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-white/60 hover:text-white hover:bg-white/10"
                  onClick={() => setShowMiniMap(false)}
                >
                  <EyeOff className="h-3 w-3" />
                </Button>
              </div>
              
              <div 
                className="relative bg-indigo-900/50 rounded-lg overflow-hidden border border-cyan-400/30"
                style={{ width: minimapWidth, height: minimapHeight }}
              >
                {/* Item dots */}
                {allItems.map((item) => {
                  const dotX = (item.positionX / canvasWidth) * minimapWidth;
                  const dotY = (item.positionY / canvasHeight) * minimapHeight;
                  const categoryColors = getCategoryColors(item.category as VisionCategory || 'other');
                  const isActive = !selectedCategory || item.category === selectedCategory;
                  
                  return (
                    <motion.div
                      key={item.id}
                      className="absolute rounded-full transition-all duration-300"
                      animate={{
                        opacity: isActive ? 1 : 0.3,
                        scale: isActive ? 1 : 0.7,
                      }}
                      style={{
                        left: `${Math.min(Math.max(dotX, 2), minimapWidth - 4)}px`,
                        top: `${Math.min(Math.max(dotY, 2), minimapHeight - 4)}px`,
                        width: 8,
                        height: 8,
                        backgroundColor: categoryColors.color,
                        boxShadow: isActive ? `0 0 8px ${categoryColors.color}` : 'none',
                      }}
                      title={item.title}
                    />
                  );
                })}

                {/* Viewport indicator */}
                <div 
                  className="absolute border-2 border-cyan-400/60 rounded pointer-events-none"
                  style={{
                    width: minimapWidth / scale / 2,
                    height: minimapHeight / scale / 2,
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={resetZoom}
                className="w-full mt-2 bg-white/10 hover:bg-white/20 text-white/80 text-xs h-7 rounded-lg"
              >
                <Home className="h-3 w-3 mr-1" />
                Reset View
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Toggle Mini Map (when hidden) */}
      {!showMiniMap && (
        <Button
          onClick={() => setShowMiniMap(true)}
          variant="ghost"
          className="absolute top-4 right-4 z-40 bg-black/40 backdrop-blur-sm rounded-full w-10 h-10 p-0 text-white hover:bg-black/50"
        >
          <Eye className="h-4 w-4" />
        </Button>
      )}

      {/* Empty State */}
      {items.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <div className="text-center text-white/70">
            <p className="text-lg font-medium mb-2">Your vision board is empty</p>
            <p className="text-sm">Snap your first vision to get started!</p>
          </div>
        </div>
      )}
    </div>
  );
}
