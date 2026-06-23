import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, ZoomOut, RotateCcw, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ZoomControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  className?: string;
}

export function ZoomControls({ scale, onZoomIn, onZoomOut, onReset, className }: ZoomControlsProps) {
  const zoomPercent = Math.round(scale * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "fixed top-48 left-4 z-30 flex flex-col gap-2 bg-white/10 backdrop-blur-xl rounded-2xl p-2 border border-white/20 shadow-xl",
        className
      )}
    >
      <Button
        size="icon"
        variant="ghost"
        onClick={onZoomIn}
        disabled={scale >= 2}
        className="w-10 h-10 rounded-xl text-white hover:bg-white/20 disabled:opacity-30"
      >
        <ZoomIn className="h-5 w-5" />
      </Button>
      
      <div className="text-center text-xs font-medium text-white/80 py-1">
        {zoomPercent}%
      </div>
      
      <Button
        size="icon"
        variant="ghost"
        onClick={onZoomOut}
        disabled={scale <= 0.5}
        className="w-10 h-10 rounded-xl text-white hover:bg-white/20 disabled:opacity-30"
      >
        <ZoomOut className="h-5 w-5" />
      </Button>
      
      <div className="w-full h-px bg-white/20 my-1" />
      
      <Button
        size="icon"
        variant="ghost"
        onClick={onReset}
        disabled={scale === 1}
        className="w-10 h-10 rounded-xl text-white hover:bg-white/20 disabled:opacity-30"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
    </motion.div>
  );
}
