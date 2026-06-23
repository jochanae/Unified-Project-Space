import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Crown, Sparkles, ChevronDown, ChevronUp, Zap, Camera,
  Layers, Grid, Target, MoreHorizontal, ZoomIn, ZoomOut, RotateCcw, Eye 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AddVisionSheet, type VisionBoardItem } from '@/components/vision-board/AddVisionSheet';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { VisionTemplateSelector } from '@/components/vision-board/VisionTemplateSelector';
import { CompletionCelebration } from '@/components/vision-board/CompletionCelebration';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { FloatingVisionBoard } from '@/components/vision-board/FloatingVisionBoard';
import { DailyAffirmation } from '@/components/vision-board/DailyAffirmation';
import { 
  VisionCategory, VISION_CATEGORIES, getCategoryConfig, getCategoryColors 
} from '@/lib/visionCategories';
import { type VisionTemplate } from '@/lib/visionTemplates';
import { cn } from '@/lib/utils';

interface FloatingPosition {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  zIndex: number;
  vx: number;
  vy: number;
}

export default function VisionBoard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<VisionBoardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(true);
  const [isContentReady, setIsContentReady] = useState(false);
  const loadingStartTime = useRef(Date.now());
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<VisionBoardItem | null>(null);
  const [templateData, setTemplateData] = useState<Partial<VisionBoardItem> | null>(null);
  
  // Celebration state
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebratedItemTitle, setCelebratedItemTitle] = useState<string>('');
  
  // Position tracking for mini map
  const [itemPositions, setItemPositions] = useState<Map<string, FloatingPosition>>(new Map());
  
  // Zoom state
  const [zoom, setZoom] = useState(100);
  
  const handlePositionsChange = useCallback((positions: Map<string, FloatingPosition>) => {
    setItemPositions(positions);
  }, []);
  
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  const handleZoomReset = () => setZoom(100);
  
  // Memoize star positions to prevent flickering
  const starfieldStars = useMemo(() => {
    return Array.from({ length: 100 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      width: Math.random() * 3 + 1,
      height: Math.random() * 3 + 1,
      animationDelay: Math.random() * 3,
      animationDuration: Math.random() * 2 + 2,
    }));
  }, []);

  useEffect(() => {
    if (user) fetchItems();
  }, [user]);

  // Loading overlay timing
  useEffect(() => {
    if (!isLoading && user) {
      const elapsed = Date.now() - loadingStartTime.current;
      const minimumDisplayTime = 1200;
      const remainingTime = Math.max(0, minimumDisplayTime - elapsed);
      
      const timer = setTimeout(() => {
        setShowLoadingOverlay(false);
        setTimeout(() => setIsContentReady(true), 100);
      }, remainingTime);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, user]);

  const fetchItems = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('vision_board_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedItems: VisionBoardItem[] = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        imageUrl: item.image_url,
        imageAlt: item.image_alt,
        category: item.category || 'other',
        status: item.status || 'active',
        priority: item.priority || 0,
        targetAmount: item.target_amount ? Number(item.target_amount) : undefined,
        currentAmount: item.current_amount ? Number(item.current_amount) : 0,
        targetDate: item.target_date,
        isPinned: item.is_pinned || false,
        isCompleted: item.is_completed || false,
        completedAt: item.completed_at,
        positionX: item.position_x || Math.random() * 500 + 50,
        positionY: item.position_y || Math.random() * 800 + 150,
        size: item.size || 'medium',
        tags: item.tags || [],
        affirmation: item.affirmation,
        audioUrl: item.audio_url,
        notes: item.notes,
        hideDetails: item.hide_details || false,
      }));

      setItems(mappedItems);
    } catch (error: any) {
      toast.error('Failed to load vision board');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveItem = async (itemData: Partial<VisionBoardItem>) => {
    if (!user) {
      toast.error('Please sign in to save visions');
      return;
    }
    
    try {
      const isNewlyCompleted = itemData.isCompleted && selectedItem && !selectedItem.isCompleted;
      
      const dbData: any = {
        user_id: user.id,
        title: itemData.title || 'Untitled Vision',
        description: itemData.description || null,
        image_url: itemData.imageUrl || null,
        image_alt: itemData.imageAlt || null,
        category: itemData.category || 'other',
        status: itemData.status || 'active',
        priority: itemData.priority ?? 0,
        target_amount: itemData.targetAmount || null,
        current_amount: itemData.currentAmount ?? 0,
        target_date: itemData.targetDate || null,
        is_pinned: itemData.isPinned ?? false,
        is_completed: itemData.isCompleted ?? false,
        completed_at: itemData.isCompleted ? new Date().toISOString() : null,
        position_x: itemData.positionX ?? Math.random() * 500 + 50,
        position_y: itemData.positionY ?? Math.random() * 800 + 150,
        size: itemData.size || 'medium',
        tags: itemData.tags || [],
        affirmation: itemData.affirmation || null,
        audio_url: itemData.audioUrl || null,
        notes: itemData.notes || null,
        hide_details: itemData.hideDetails ?? false,
      };

      if (selectedItem?.id) {
        const { error } = await supabase
          .from('vision_board_items')
          .update(dbData)
          .eq('id', selectedItem.id);
        
        if (error) throw error;
        toast.success('Vision updated!');
        
        if (isNewlyCompleted) {
          setCelebratedItemTitle(itemData.title || 'Your Vision');
          setShowCelebration(true);
        }
      } else {
        const { error } = await supabase
          .from('vision_board_items')
          .insert([dbData]);
        
        if (error) throw error;
        toast.success('Vision created!');
      }
      
      setIsModalOpen(false);
      setSelectedItem(null);
      setTemplateData(null);
      await fetchItems();
    } catch (error: any) {
      console.error('Failed to save vision:', error);
      toast.error(error.message || 'Failed to save vision');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!user) return;
    try {
      await supabase.from('vision_board_items').delete().eq('id', id);
      setItems(prev => prev.filter(item => item.id !== id));
      toast.success('Vision removed');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleUpdateItem = useCallback(async (id: string, updates: Partial<VisionBoardItem>) => {
    if (!user) return;
    
    try {
      const dbUpdates: any = {};
      if (updates.isPinned !== undefined) dbUpdates.is_pinned = updates.isPinned;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      
      await supabase.from('vision_board_items').update(dbUpdates).eq('id', id);
      setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    } catch (error) {
      console.error('Failed to update:', error);
    }
  }, [user]);

  const handleSelectTemplate = (template: VisionTemplate) => {
    setTemplateData({
      title: template.title,
      description: template.description,
      category: template.category,
      affirmation: template.affirmation,
      tags: template.tags,
      targetAmount: template.suggestedAmount,
    });
    setSelectedItem(null);
    setIsTemplateOpen(false);
    setIsModalOpen(true);
  };

  const handleEditItem = (item: VisionBoardItem) => {
    setSelectedItem(item);
    setTemplateData(null);
    setIsModalOpen(true);
  };

  const handleCreateVision = () => {
    setSelectedItem(null);
    setTemplateData(null);
    setIsModalOpen(true);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Sign in to view your Vision Board</h2>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
      </div>
    );
  }

  const rawName = user?.email?.split('@')[0] || 'Your';
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

  return (
    <motion.div 
      className="min-h-screen w-full relative overflow-x-hidden overflow-y-auto"
      style={{ minHeight: '100vh', height: 'auto' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Helmet>
        <title>{displayName}'s Vision Board - CoinsBloom</title>
        <meta name="description" content="Create your personal vision board with CoinsBloom. Visualize goals, track progress, and manifest your financial dreams." />
        <meta name="robots" content="noindex" />
      </Helmet>

      {/* Full-Screen Loading Overlay */}
      <AnimatePresence>
        {showLoadingOverlay && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="fixed top-0 left-0 right-0 w-full h-[100dvh] flex flex-col items-center justify-center z-[9999] overflow-hidden bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900"
          >
            <LoadingSpinner 
              size="lg" 
              colorScheme="emerald"
              text="Loading your visions..."
            />
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-4 text-white/60 text-sm"
            >
              Preparing your dream board
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vision Board Background - Infinite Canvas */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900"
        style={{ minHeight: 'max(300vh, 5000px)' }}
      >
        {/* Starfield */}
        <div className="absolute inset-0">
          {starfieldStars.map((star) => (
            <div
              key={star.id}
              className={cn(
                "absolute bg-white rounded-full transition-opacity duration-500",
                isContentReady && "animate-pulse"
              )}
              style={{
                left: `${star.left}%`,
                top: `${star.top}%`,
                width: `${star.width}px`,
                height: `${star.height}px`,
                opacity: isContentReady ? 1 : 0.3,
                animationDelay: `${star.animationDelay}s`,
                animationDuration: `${star.animationDuration}s`,
              }}
            />
          ))}
        </div>
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/20 to-indigo-900/40" />
      </div>

      {/* Header */}
      <DashboardHeader />

      {/* Personalized Title Header - Reduced top padding */}
      <div id="vision-board-top" className="relative z-10 pt-2 pb-4">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-full px-6 py-3 border border-white/20 shadow-lg"
          >
            <BookOpen className="h-5 w-5 text-pink-300" />
            <h1 className="text-lg md:text-xl font-serif font-bold bg-gradient-to-r from-pink-200 via-purple-200 to-blue-200 bg-clip-text text-transparent flex items-center gap-2">
              {displayName}'s Vision Board
              <span className="inline-flex items-center gap-1 text-sm font-medium text-yellow-300">
                <Crown className="h-3.5 w-3.5" />
                <span>Unlimited</span>
              </span>
            </h1>
            <Sparkles className="h-5 w-5 text-yellow-300" />
          </motion.div>
          
          {/* Daily Affirmation */}
          <DailyAffirmation />
        </div>
      </div>

      {/* Jump Down Button - Left Side, aligned with pink + button */}
      <motion.div
        className="fixed left-4 top-[260px] md:top-[240px] z-40"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <Button
          onClick={() => {
            const element = document.getElementById('quick-actions-footer');
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }}
          size="sm"
          className="bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl shadow-xl flex flex-col items-center gap-1 py-3 px-4 border border-blue-400/30"
        >
          <ChevronDown className="h-5 w-5 animate-bounce" />
          <span className="text-xs font-bold">Jump</span>
        </Button>
      </motion.div>

      {/* Floating Vision Board Component - Contains the canvas, category filters, and cards */}
      <FloatingVisionBoard
        items={items}
        onAddItem={handleCreateVision}
        onUpdateItem={handleUpdateItem}
        onDeleteItem={handleDeleteItem}
        onOpenDetail={handleEditItem}
        onPositionsChange={handlePositionsChange}
        isLoading={isLoading}
      />
      
      {/* Zoom Controls - Fixed left side */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1 }}
        className="fixed left-4 top-[300px] z-40 flex flex-col gap-2 bg-white/10 backdrop-blur-xl rounded-2xl p-2 border border-white/20 shadow-xl"
      >
        <Button
          size="icon"
          variant="ghost"
          onClick={handleZoomIn}
          disabled={zoom >= 200}
          className="w-10 h-10 rounded-xl text-white hover:bg-white/20 disabled:opacity-30"
        >
          <ZoomIn className="h-5 w-5" />
        </Button>
        
        <div className="text-center text-xs font-medium text-white/80 py-1">
          {zoom}%
        </div>
        
        <Button
          size="icon"
          variant="ghost"
          onClick={handleZoomOut}
          disabled={zoom <= 50}
          className="w-10 h-10 rounded-xl text-white hover:bg-white/20 disabled:opacity-30"
        >
          <ZoomOut className="h-5 w-5" />
        </Button>
        
        <div className="w-full h-px bg-white/20 my-1" />
        
        <Button
          size="icon"
          variant="ghost"
          onClick={handleZoomReset}
          disabled={zoom === 100}
          className="w-10 h-10 rounded-xl text-white hover:bg-white/20 disabled:opacity-30"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </motion.div>

      {/* Quick Actions Footer - At the very bottom of infinite canvas */}
      <div 
        id="quick-actions-footer" 
        className="relative z-40 px-4 pb-24 md:pb-8"
        style={{ marginTop: '2000vh' }}
      >
        <div className="container mx-auto max-w-7xl relative">
          {/* Decorative Gradient Orbs */}
          <div className="absolute -left-16 -top-12 w-32 h-32 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full blur-3xl opacity-60 pointer-events-none" />
          <div className="absolute -right-16 -top-12 w-32 h-32 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full blur-3xl opacity-60 pointer-events-none" />
          
          <Card className="bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl relative z-10">
            <CardContent className="p-4">
              <div className="space-y-4">
                {/* Quick Actions Row */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="h-4 w-4 text-yellow-400" />
                    <h3 className="text-sm font-semibold text-white">Quick Actions</h3>
                  </div>
                  <div className="flex justify-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCreateVision}
                      className="flex flex-col items-center justify-center h-14 gap-1 bg-white/10 hover:bg-white/20 border-white/30 text-white hover:border-green-300 transition-all p-2"
                    >
                      <Camera className="h-4 w-4 text-green-300" />
                      <span className="text-xs">📷 Add Photo</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const topElement = document.getElementById('vision-board-top');
                        if (topElement) {
                          topElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        } else {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                      className="flex flex-col items-center justify-center h-14 gap-1 bg-white/10 hover:bg-white/20 border-white/30 text-white hover:border-blue-300 transition-all p-2"
                    >
                      <ChevronUp className="h-4 w-4 text-blue-300 animate-bounce" />
                      <span className="text-xs">⬆️ Jump Up</span>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Mini Map - At the bottom near Quick Actions */}
          <div className="mt-6 flex justify-end">
            <Card className="bg-white/15 backdrop-blur-xl border border-white/20 shadow-2xl w-64 overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-white/70" />
                    <span className="text-xs font-medium text-white/80">Vision Overview</span>
                    <span className="text-xs text-white/50">{zoom}%</span>
                  </div>
                </div>
                
                <div 
                  className="relative bg-white/5 rounded-lg overflow-hidden border border-cyan-400/30"
                  style={{ width: 220, height: 120 }}
                >
                  {/* Viewport indicator */}
                  <div 
                    className="absolute border-2 border-cyan-400 rounded pointer-events-none"
                    style={{
                      width: '40%',
                      height: '40%',
                      left: '30%',
                      top: '30%',
                    }}
                  />

                  {/* Item dots with actual positions */}
                  {items.map((item) => {
                    const pos = itemPositions.get(item.id);
                    const categoryColors: Record<string, string> = {
                      'financial': '#22c55e',
                      'personal': '#ec4899', 
                      'career': '#3b82f6',
                      'family': '#f43f5e',
                      'health': '#10b981',
                      'travel': '#06b6d4',
                      'education': '#8b5cf6',
                      'spiritual': '#f59e0b',
                    };
                    const color = categoryColors[item.category || 'personal'] || '#8b5cf6';
                    
                    // Use actual positions if available, otherwise fallback to grid
                    const canvasWidth = window.innerWidth;
                    const canvasHeight = window.innerHeight * 3;
                    const minimapWidth = 220;
                    const minimapHeight = 120;
                    
                    let dotX: number;
                    let dotY: number;
                    
                    if (pos) {
                      dotX = (pos.x / canvasWidth) * minimapWidth;
                      dotY = (pos.y / canvasHeight) * minimapHeight;
                    } else {
                      // Fallback grid positioning
                      const idx = items.indexOf(item);
                      dotX = 15 + (idx % 8) * 25;
                      dotY = 15 + Math.floor(idx / 8) * 25;
                    }
                    
                    return (
                      <div
                        key={item.id}
                        className="absolute w-2.5 h-2.5 rounded-full transition-all duration-300"
                        style={{
                          left: `${Math.min(Math.max(dotX, 4), minimapWidth - 8)}px`,
                          top: `${Math.min(Math.max(dotY, 4), minimapHeight - 8)}px`,
                          backgroundColor: color,
                          boxShadow: `0 0 6px ${color}`,
                        }}
                        title={item.title}
                      />
                    );
                  })}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomReset}
                  className="w-full mt-2 bg-white/10 hover:bg-white/20 text-white/80 text-xs h-8 rounded-lg"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset View
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddVisionSheet
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedItem(null); setTemplateData(null); }}
        item={selectedItem}
        initialData={templateData}
        onSave={handleSaveItem}
        onDelete={selectedItem ? handleDeleteItem : undefined}
      />

      <VisionTemplateSelector
        isOpen={isTemplateOpen}
        onClose={() => setIsTemplateOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />

      <CompletionCelebration
        isOpen={showCelebration}
        onClose={() => setShowCelebration(false)}
        itemTitle={celebratedItemTitle}
      />
    </motion.div>
  );
}
