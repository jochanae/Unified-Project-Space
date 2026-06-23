import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Filter, LayoutGrid, Eye, EyeOff, Settings2, Trash2, 
  Pin, Trophy, Edit3, Home, Zap, X, CheckCircle2, Layers, Grid, Target, MoreHorizontal, Camera
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { VISION_CATEGORIES, getCategoryConfig, getCategoryColors, type VisionCategory } from '@/lib/visionCategories';
import type { VisionBoardItem } from './AddVisionSheet';

interface FloatingPosition {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  zIndex: number;
  vx: number;
  vy: number;
}

interface FloatingPosition {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  zIndex: number;
  vx: number;
  vy: number;
}

interface FloatingVisionBoardProps {
  items: VisionBoardItem[];
  onAddItem: () => void;
  onUpdateItem: (id: string, updates: Partial<VisionBoardItem>) => void;
  onDeleteItem: (id: string) => void;
  onOpenDetail: (item: VisionBoardItem) => void;
  onPositionsChange?: (positions: Map<string, FloatingPosition>) => void;
  isLoading?: boolean;
  isKidsMode?: boolean;
}

export function FloatingVisionBoard({
  items,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onOpenDetail,
  onPositionsChange,
  isLoading = false,
  isKidsMode = false,
}: FloatingVisionBoardProps) {
  const [positions, setPositions] = useState<Map<string, FloatingPosition>>(new Map());
  const [pinnedItems, setPinnedItems] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [showMiniMap, setShowMiniMap] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'floating' | 'grid' | 'focus'>('floating');
  const [isManageMode, setIsManageMode] = useState(false);
  const [selectedForManage, setSelectedForManage] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [contextMenuItem, setContextMenuItem] = useState<VisionBoardItem | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number>();
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Size configurations
  const getSizeWidth = useCallback((size: string) => {
    const isMobile = window.innerWidth < 768;
    switch (size) {
      case 'small': return isMobile ? 140 : 160;
      case 'large': return isMobile ? 240 : 280;
      default: return isMobile ? 180 : 200;
    }
  }, []);

  const getSizeHeight = useCallback((size: string) => {
    const isMobile = window.innerWidth < 768;
    switch (size) {
      case 'small': return isMobile ? 140 : 160;
      case 'large': return isMobile ? 240 : 280;
      default: return isMobile ? 180 : 200;
    }
  }, []);

  // Initialize positions for new items - NO OVERLAP
  useEffect(() => {
    const newPositions = new Map(positions);
    const newPinned = new Set(pinnedItems);
    
    items.forEach((item, index) => {
      if (!newPositions.has(item.id)) {
        const canvasWidth = window.innerWidth - 100;
        const itemWidth = getSizeWidth(item.size);
        const itemHeight = getSizeHeight(item.size);
        const spacing = 30;
        
        // Calculate grid position to avoid overlap
        const cols = Math.max(1, Math.floor(canvasWidth / (itemWidth + spacing)));
        const col = index % cols;
        const row = Math.floor(index / cols);
        
        const x = (col * (itemWidth + spacing)) + spacing + 20;
        const y = (row * (itemHeight + spacing)) + 20;
        
        newPositions.set(item.id, {
          x: Math.min(x, canvasWidth - itemWidth),
          y,
          rotation: (Math.random() - 0.5) * 6,
          scale: 1,
          zIndex: 10 + index,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
        });
      }
      
      if (item.isPinned) {
        newPinned.add(item.id);
      }
    });
    
    setPositions(newPositions);
    setPinnedItems(newPinned);
    onPositionsChange?.(newPositions);
  }, [items, getSizeWidth, getSizeHeight, onPositionsChange]);

  // Floating animation loop
  useEffect(() => {
    if (viewMode !== 'floating') return;

    const animate = () => {
      setPositions(prev => {
        const newPositions = new Map(prev);
        const canvasWidth = window.innerWidth - 150;
        const canvasHeight = window.innerHeight * 2;
        
        newPositions.forEach((pos, id) => {
          if (pinnedItems.has(id) || hoveredItem === id) return;
          
          const item = items.find(i => i.id === id);
          if (!item) return;
          
          const itemWidth = getSizeWidth(item.size);
          const itemHeight = getSizeHeight(item.size);
          
          // Apply velocity
          let newX = pos.x + pos.vx;
          let newY = pos.y + pos.vy;
          let newVx = pos.vx;
          let newVy = pos.vy;
          
          // Bounce off edges
          if (newX < 20 || newX > canvasWidth - itemWidth) {
            newVx = -newVx * 0.8;
            newX = Math.max(20, Math.min(newX, canvasWidth - itemWidth));
          }
          if (newY < 20 || newY > canvasHeight - itemHeight) {
            newVy = -newVy * 0.8;
            newY = Math.max(20, Math.min(newY, canvasHeight - itemHeight));
          }
          
          // Add slight random drift
          newVx += (Math.random() - 0.5) * 0.02;
          newVy += (Math.random() - 0.5) * 0.02;
          
          // Apply friction
          newVx *= 0.995;
          newVy *= 0.995;
          
          // Limit velocity
          const maxVel = 1;
          newVx = Math.max(-maxVel, Math.min(maxVel, newVx));
          newVy = Math.max(-maxVel, Math.min(maxVel, newVy));
          
          newPositions.set(id, {
            ...pos,
            x: newX,
            y: newY,
            vx: newVx,
            vy: newVy,
            scale: 0.95 + Math.sin(Date.now() * 0.001 + id.length) * 0.05,
          });
        });
        
        return newPositions;
      });
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [viewMode, pinnedItems, hoveredItem, items, getSizeWidth, getSizeHeight]);

  // Filter items by category
  const filteredItems = useMemo(() => {
    if (selectedCategory === 'all') return items;
    return items.filter(item => item.category === selectedCategory);
  }, [items, selectedCategory]);

  // Toggle pin
  const togglePin = useCallback((id: string) => {
    setPinnedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
        onUpdateItem(id, { isPinned: false });
      } else {
        newSet.add(id);
        onUpdateItem(id, { isPinned: true });
      }
      return newSet;
    });
  }, [onUpdateItem]);

  // Bring item to front
  const bringToFront = useCallback((id: string) => {
    setPositions(prev => {
      const newPositions = new Map(prev);
      const maxZ = Math.max(...Array.from(newPositions.values()).map(p => p.zIndex));
      const current = newPositions.get(id);
      if (current) {
        newPositions.set(id, { ...current, zIndex: Math.min(maxZ + 1, 40) });
      }
      return newPositions;
    });
  }, []);

  // Handle manage mode selection
  const toggleManageSelection = useCallback((id: string) => {
    setSelectedForManage(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Bulk delete
  const handleBulkDelete = useCallback(() => {
    selectedForManage.forEach(id => onDeleteItem(id));
    setSelectedForManage(new Set());
    setIsManageMode(false);
    setShowDeleteConfirm(false);
  }, [selectedForManage, onDeleteItem]);

  // Long press handlers for context menu
  const handleTouchStart = useCallback((item: VisionBoardItem) => {
    longPressTimerRef.current = setTimeout(() => {
      setContextMenuItem(item);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, item: VisionBoardItem) => {
    e.preventDefault();
    setContextMenuItem(item);
  }, []);

  return (
    <>
      {/* Category Filter Bar - Fixed at top */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-24 z-30 bg-white/10 backdrop-blur-md border-b border-white/20 py-2 px-4"
      >
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col gap-2">
            {/* Categories Row */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              <Badge
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                className={cn(
                  "px-3 py-1 shrink-0 cursor-pointer transition-all",
                  selectedCategory === 'all' 
                    ? "bg-white/30 text-white" 
                    : "bg-white/10 border-white/30 text-white/80 hover:bg-white/20"
                )}
                onClick={() => setSelectedCategory('all')}
              >
                All
              </Badge>
              {VISION_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = selectedCategory === cat.value;
                return (
                  <Badge
                    key={cat.value}
                    variant={isActive ? 'default' : 'outline'}
                    className={cn(
                      "px-3 py-1 shrink-0 cursor-pointer flex items-center gap-1 transition-all",
                      isActive 
                        ? "text-white border-0" 
                        : "bg-white/10 border-white/30 text-white/80 hover:bg-white/20"
                    )}
                    style={{
                      backgroundColor: isActive ? cat.color : undefined,
                    }}
                    onClick={() => setSelectedCategory(isActive ? 'all' : cat.value)}
                  >
                    <Icon className="h-3 w-3" />
                    <span className="text-xs font-medium">{cat.label}</span>
                  </Badge>
                );
              })}
            </div>
            
            {/* View Mode Toggle Row */}
            <div className="flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              <Button
                size="sm"
                variant={viewMode === 'floating' ? 'default' : 'outline'}
                onClick={() => setViewMode('floating')}
                className={cn(
                  "h-7 px-3 text-xs shrink-0",
                  viewMode === 'floating' 
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0" 
                    : "bg-white/80 text-gray-800 border-gray-300 hover:bg-white"
                )}
              >
                <Layers className="h-3 w-3 mr-1" />
                Float
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                onClick={() => setViewMode('grid')}
                className={cn(
                  "h-7 px-3 text-xs shrink-0",
                  viewMode === 'grid' 
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0" 
                    : "bg-white/80 text-gray-800 border-gray-300 hover:bg-white"
                )}
              >
                <Grid className="h-3 w-3 mr-1" />
                Grid
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'focus' ? 'default' : 'outline'}
                onClick={() => setViewMode('focus')}
                className={cn(
                  "h-7 px-3 text-xs shrink-0",
                  viewMode === 'focus' 
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0" 
                    : "bg-white/80 text-gray-800 border-gray-300 hover:bg-white"
                )}
              >
                <Target className="h-3 w-3 mr-1" />
                Focus
              </Button>
              <Button
                size="sm"
                onClick={onAddItem}
                className="h-7 px-3 text-xs shrink-0 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0"
              >
                <Camera className="h-3 w-3 mr-1" />
                📷 Snap Vision
              </Button>
              <Button
                size="sm"
                variant={isManageMode ? 'default' : 'outline'}
                onClick={() => {
                  setIsManageMode(!isManageMode);
                  setSelectedForManage(new Set());
                }}
                className={cn(
                  "h-7 px-3 text-xs shrink-0",
                  isManageMode 
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0" 
                    : "bg-white/80 text-gray-800 border-gray-300 hover:bg-white"
                )}
              >
                <MoreHorizontal className="h-3 w-3 mr-1" />
                Manage
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Canvas Container */}
      <div
        ref={containerRef}
        className="relative w-full"
        style={{ minHeight: '150vh' }}
      >
        {/* Manage Mode Toolbar */}
        <AnimatePresence>
          {isManageMode && selectedForManage.size > 0 && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-background/95 backdrop-blur-md rounded-full shadow-2xl border border-border px-6 py-3 flex items-center gap-4"
            >
              <span className="text-sm font-medium">
                {selectedForManage.size} selected
              </span>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                className="rounded-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedForManage(new Set());
                  setIsManageMode(false);
                }}
                className="rounded-full"
              >
                Cancel
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {filteredItems.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center text-center px-8 py-20"
          >
            <div className="w-24 h-24 mb-6 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
              <LayoutGrid className="h-12 w-12 text-purple-400" />
            </div>
            <h3 className="text-2xl font-bold mb-2 text-white">
              Create Your Vision Board
            </h3>
            <p className="text-white/70 mb-6 max-w-md">
              Add your first vision to start manifesting your dreams
            </p>
            <Button
              onClick={onAddItem}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Vision
            </Button>
          </motion.div>
        )}

        {/* Vision Cards */}
        <AnimatePresence>
          {filteredItems.map((item) => {
            const position = positions.get(item.id);
            if (!position) return null;

            const categoryConfig = getCategoryConfig(item.category as VisionCategory);
            const itemWidth = getSizeWidth(item.size);
            const itemHeight = getSizeHeight(item.size);
            const isPinned = pinnedItems.has(item.id);
            const isHovered = hoveredItem === item.id;
            const isSelectedForManage = selectedForManage.has(item.id);

            return (
              <motion.div
                key={item.id}
                className={cn(
                  "absolute cursor-pointer transition-shadow duration-200",
                  isHovered && "shadow-2xl",
                  isManageMode && isSelectedForManage && "ring-4 ring-purple-500"
                )}
                style={{
                  left: viewMode === 'grid' ? undefined : position.x,
                  top: viewMode === 'grid' ? undefined : position.y,
                  width: itemWidth,
                  height: itemHeight,
                  zIndex: isHovered ? 50 : position.zIndex,
                  position: viewMode === 'grid' ? 'relative' : 'absolute',
                }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                  opacity: 1, 
                  scale: isHovered ? 1.05 : position.scale,
                  rotate: viewMode === 'grid' ? 0 : position.rotation,
                }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.05 }}
                onHoverStart={() => setHoveredItem(item.id)}
                onHoverEnd={() => setHoveredItem(null)}
                onTouchStart={() => handleTouchStart(item)}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                onContextMenu={(e) => handleContextMenu(e, item)}
                onClick={() => {
                  handleTouchEnd();
                  if (isManageMode) {
                    toggleManageSelection(item.id);
                  } else {
                    bringToFront(item.id);
                    onOpenDetail(item);
                  }
                }}
              >
                <Card 
                  className={cn(
                    "w-full h-full overflow-hidden border-2 transition-all duration-200",
                    isPinned && "ring-2 ring-yellow-400"
                  )}
                  style={{
                    borderColor: categoryConfig?.color || 'rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  {/* Image or Affirmation */}
                  {item.imageUrl ? (
                    <div className="w-full h-2/3 overflow-hidden">
                      <img 
                        src={item.imageUrl} 
                        alt={item.imageAlt || item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : item.affirmation ? (
                    <div 
                      className="w-full h-2/3 flex items-center justify-center p-3"
                      style={{
                        background: `linear-gradient(135deg, ${categoryConfig?.color || '#8b5cf6'}22, ${categoryConfig?.color || '#ec4899'}33)`,
                      }}
                    >
                      <p className="text-xs italic text-white/90 text-center line-clamp-4 font-medium">
                        "{item.affirmation}"
                      </p>
                    </div>
                  ) : null}
                  
                  {/* Content */}
                  <CardContent className="p-2">
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="text-xs font-semibold text-white line-clamp-2 flex-1">
                        {item.title}
                      </h4>
                      {isPinned && (
                        <Pin className="h-3 w-3 text-yellow-400 shrink-0" />
                      )}
                    </div>
                    
                    {/* Category Badge */}
                    {categoryConfig && (
                      <Badge
                        className="mt-1 text-[10px] px-1.5 py-0"
                        style={{ 
                          backgroundColor: categoryConfig.color,
                          color: 'white'
                        }}
                      >
                        {categoryConfig.label}
                      </Badge>
                    )}
                  </CardContent>
                  
                  {/* Manage Mode Checkbox */}
                  {isManageMode && (
                    <div className="absolute top-2 right-2">
                      <div className={cn(
                        "w-7 h-7 rounded-full border-3 flex items-center justify-center shadow-lg transition-all",
                        isSelectedForManage 
                          ? "bg-purple-500 border-purple-500 scale-110" 
                          : "bg-white border-purple-400 hover:border-purple-500 hover:scale-105"
                      )}>
                        {isSelectedForManage ? (
                          <CheckCircle2 className="h-5 w-5 text-white" />
                        ) : (
                          <div className="w-3 h-3 rounded-full bg-purple-300/50" />
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Floating Add Button - Right Side */}
      <motion.div
        className="fixed right-4 bottom-32 md:bottom-24 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Button
          onClick={onAddItem}
          className="w-14 h-14 rounded-full shadow-2xl p-0 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          <Plus className="h-6 w-6 text-white" />
        </Button>
      </motion.div>

      {/* Mini Map moved to VisionBoard.tsx at bottom near Quick Actions */}

      {/* Long Press Context Menu */}
      <AlertDialog open={!!contextMenuItem} onOpenChange={() => setContextMenuItem(null)}>
        <AlertDialogContent className="w-[90%] max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Vision Actions</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (contextMenuItem) {
                  onOpenDetail(contextMenuItem);
                  setContextMenuItem(null);
                }
              }}
              className="w-full justify-start"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (contextMenuItem) {
                  togglePin(contextMenuItem.id);
                  setContextMenuItem(null);
                }
              }}
              className="w-full justify-start"
            >
              <Pin className="h-4 w-4 mr-2" />
              {contextMenuItem && pinnedItems.has(contextMenuItem.id) ? 'Unpin' : 'Pin'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (contextMenuItem) {
                  onDeleteItem(contextMenuItem.id);
                  setContextMenuItem(null);
                }
              }}
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedForManage.size} vision(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. These visions will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
