import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Pin, Trophy, Trash2, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { getCategoryConfig, type VisionCategory } from '@/lib/visionCategories';
import type { VisionBoardItem } from './AddVisionSheet';

interface FloatingPosition {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  zIndex: number;
}

interface FloatingVisionCardProps {
  item: VisionBoardItem;
  position: FloatingPosition;
  isPinned: boolean;
  isHighlighted?: boolean;
  isDimmed?: boolean;
  isNearGroup?: boolean;
  nearGroupColor?: string;
  onOpenDetail: () => void;
  onDelete: (id: string) => void;
  onTogglePin: () => void;
  onPositionChange?: (id: string, x: number, y: number) => void;
  onDragStart?: (id: string) => void;
  onDragEnd?: (id: string, x: number, y: number) => void;
  getSizeWidth: (size: string) => number;
  getSizeHeight: (size: string) => number;
}

export function FloatingVisionCard({
  item,
  position,
  isPinned,
  isHighlighted = false,
  isDimmed = false,
  isNearGroup = false,
  nearGroupColor,
  onOpenDetail,
  onDelete,
  onTogglePin,
  onPositionChange,
  onDragStart,
  onDragEnd,
  getSizeWidth,
  getSizeHeight,
}: FloatingVisionCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

  const progress = item.targetAmount ? 
    (Number(item.currentAmount) / Number(item.targetAmount)) * 100 : 0;
  const isCompleted = item.isCompleted || item.status === 'achieved' || progress >= 100;

  const categoryConfig = getCategoryConfig((item.category as VisionCategory) || 'other');
  const CategoryIcon = categoryConfig.icon;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    
    longPressTimerRef.current = setTimeout(() => {
      setShowContextMenu(true);
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartPos.current = null;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPos.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartPos.current.y);
    
    if (deltaX > 10 || deltaY > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowContextMenu(true);
  }, []);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* Context Menu Dialog */}
      <AlertDialog open={showContextMenu} onOpenChange={setShowContextMenu}>
        <AlertDialogContent className="w-[90%] max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Vision Actions</AlertDialogTitle>
            <AlertDialogDescription>
              Choose an action for "{item.title}"
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowContextMenu(false);
                setShowDeleteConfirm(true);
              }}
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowContextMenu(false);
                onOpenDetail();
              }}
              className="w-full justify-start"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="w-[90%] max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this vision?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove "{item.title}" from your vision board.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(item.id);
                setShowDeleteConfirm(false);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <motion.div
        initial={{ opacity: 0, scale: 0.3, rotate: position.rotation + 10, y: position.y + 100 }}
        animate={{ 
          opacity: 1, 
          scale: isHighlighted ? 1.15 : position.scale,
          x: position.x, 
          y: isHighlighted ? position.y - 50 : position.y,
          rotate: isHighlighted ? 0 : position.rotation,
        }}
        exit={{ opacity: 0, scale: 0.3, y: position.y + 100 }}
        transition={isHighlighted ? {
          type: 'spring',
          damping: 12,
          stiffness: 100,
          mass: 0.8,
        } : { 
          type: 'spring',
          damping: 18,
          stiffness: 150,
        }}
        drag
        dragMomentum={false}
        dragElastic={0.1}
        onDragStart={() => {
          setIsDragging(true);
          dragStartPos.current = { x: position.x, y: position.y };
          onDragStart?.(item.id);
        }}
        onDragEnd={(_, info) => {
          setIsDragging(false);
          if (dragStartPos.current) {
            const newX = dragStartPos.current.x + info.offset.x;
            const newY = dragStartPos.current.y + info.offset.y;
            onPositionChange?.(item.id, Math.max(0, newX), Math.max(0, newY));
            onDragEnd?.(item.id, Math.max(0, newX), Math.max(0, newY));
          }
          dragStartPos.current = null;
        }}
        className={cn(
          "absolute select-none touch-manipulation transform-gpu will-change-transform transition-all duration-500",
          isHighlighted && "z-50",
          isDragging ? "cursor-grabbing z-[200]" : "cursor-grab",
          isDimmed && "opacity-20 pointer-events-none",
          isNearGroup && isDragging && "ring-4 ring-offset-2 ring-offset-transparent"
        )}
        style={{
          width: getSizeWidth(item.size),
          height: getSizeHeight(item.size),
          zIndex: isDragging ? 200 : isHighlighted ? 100 : position.zIndex,
          filter: isHighlighted 
            ? 'drop-shadow(0 20px 40px rgba(0, 200, 255, 0.4))' 
            : isDimmed 
              ? 'grayscale(0.8) blur(1px)'
              : undefined,
          ...(isNearGroup && isDragging && nearGroupColor ? { '--tw-ring-color': nearGroupColor } as any : {}),
        }}
        whileHover={{ 
          scale: position.scale * 1.1,
          rotate: 0,
          zIndex: 50,
          transition: { type: 'spring', damping: 15, stiffness: 200 }
        }}
        whileTap={{ scale: isDragging ? 1.05 : position.scale * 0.95 }}
        onClick={(e) => {
          // Only open detail if not dragging
          if (!isDragging) {
            onOpenDetail();
          }
        }}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
      >
        {/* Card Content - Clean floating photo style */}
        <div 
          className={cn(
            "relative w-full h-full rounded-2xl overflow-hidden transition-all duration-300 group",
            isHighlighted && "ring-4 ring-white/50"
          )}
          style={{
            boxShadow: isHighlighted 
              ? '0 25px 50px -12px rgba(255, 255, 255, 0.3)'
              : '0 20px 40px -12px rgba(0, 0, 0, 0.6), 0 8px 16px -8px rgba(0, 0, 0, 0.4)',
          }}
        >
          {/* Image or Placeholder - clean full-bleed image */}
          {item.imageUrl && !imageError ? (
            <>
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 animate-pulse" />
              )}
              <img
                src={item.imageUrl}
                alt={item.imageAlt || item.title}
                className={cn(
                  "w-full h-full object-cover transition-all duration-300",
                  imageLoaded ? "opacity-100" : "opacity-0",
                  "group-hover:scale-105"
                )}
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-600/60 via-indigo-600/60 to-blue-600/60 flex items-center justify-center">
              <div className="text-center p-4">
                <CategoryIcon className="h-10 w-10 text-white/70 mx-auto mb-2" />
                <span className="text-white/90 text-sm font-medium line-clamp-2">
                  {item.title}
                </span>
              </div>
            </div>
          )}

          {/* Subtle hover overlay with title - only shows on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end">
            <div className="p-3 w-full">
              <span className="text-white text-sm font-medium line-clamp-2 drop-shadow-lg">
                {item.title}
              </span>
            </div>
          </div>

          {/* Minimal completion checkmark - top right corner, only if completed */}
          {isCompleted && (
            <div className="absolute top-2 right-2 z-10">
              <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                <Trophy className="w-3 h-3 text-white" />
              </div>
            </div>
          )}

          {/* Minimal pinned indicator - only if pinned */}
          {isPinned && !isCompleted && (
            <div className="absolute top-2 right-2 z-10">
              <div className="w-6 h-6 bg-white/80 rounded-full flex items-center justify-center shadow-lg">
                <Pin className="w-3 h-3 text-purple-600" />
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
