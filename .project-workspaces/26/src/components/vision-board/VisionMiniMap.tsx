import { motion } from 'framer-motion';
import { Eye, EyeOff, Home, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getCategoryColors, type VisionCategory } from '@/lib/visionCategories';
import type { VisionBoardItem } from './AddVisionSheet';

interface FloatingPosition {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  zIndex: number;
}

interface VisionMiniMapProps {
  items: VisionBoardItem[];
  positions: Map<string, FloatingPosition>;
  isVisible: boolean;
  onToggle: () => void;
  onResetView: () => void;
  canvasWidth: number;
  canvasHeight: number;
}

export function VisionMiniMap({
  items,
  positions,
  isVisible,
  onToggle,
  onResetView,
  canvasWidth,
  canvasHeight,
}: VisionMiniMapProps) {
  if (!isVisible) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex justify-center"
      >
        <Button
          onClick={onToggle}
          variant="ghost"
          className="bg-white/15 hover:bg-white/25 text-white backdrop-blur-md rounded-full w-12 h-12 p-0 border border-white/20"
        >
          <Eye className="h-5 w-5" />
        </Button>
      </motion.div>
    );
  }

  const minimapWidth = 180;
  const minimapHeight = 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="flex justify-center"
    >
      <Card className="bg-white/15 backdrop-blur-xl border-white/20 shadow-2xl">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-white/70" />
              <span className="text-xs font-medium text-white/80">Overview</span>
              <span className="text-xs text-white/50">100%</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-white/60 hover:text-white hover:bg-white/10"
              onClick={onToggle}
            >
              <EyeOff className="h-3 w-3" />
            </Button>
          </div>
          
          <div 
            className="relative bg-white/5 rounded-lg overflow-hidden border border-cyan-400/30"
            style={{ 
              width: minimapWidth, 
              height: minimapHeight,
            }}
          >
            {/* Viewport indicator */}
            <div 
              className="absolute border-2 border-cyan-400 rounded"
              style={{
                width: '40%',
                height: '40%',
                left: '30%',
                top: '30%',
              }}
            />

            {/* Item dots */}
            {items.map((item) => {
              const pos = positions.get(item.id);
              if (!pos) return null;
              
              const dotX = (pos.x / canvasWidth) * minimapWidth;
              const dotY = (pos.y / canvasHeight) * minimapHeight;
              
              const categoryColors = getCategoryColors((item.category as VisionCategory) || 'other');
              
              return (
                <div
                  key={item.id}
                  className="absolute w-2 h-2 rounded-full transition-all duration-200"
                  style={{
                    left: `${Math.min(Math.max(dotX, 4), minimapWidth - 4)}px`,
                    top: `${Math.min(Math.max(dotY, 4), minimapHeight - 4)}px`,
                    backgroundColor: categoryColors.color,
                    boxShadow: `0 0 6px ${categoryColors.color}`,
                  }}
                  title={item.title}
                />
              );
            })}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onResetView}
            className="w-full mt-2 bg-white/10 hover:bg-white/20 text-white/80 text-xs h-8 rounded-lg"
          >
            <Home className="h-3 w-3 mr-1" />
            Reset View
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
