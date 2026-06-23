import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Trash2, Image as ImageIcon, Target, Calendar, Tag, Sparkles, Volume2, Upload, Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { VISION_CATEGORIES, getCategoryConfig, getSuggestedTags, type VisionCategory } from '@/lib/visionCategories';
import { useImageUpload } from '@/hooks/useImageUpload';

export interface VisionBoardItem {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  imageAlt?: string;
  category: VisionCategory;
  status: string;
  priority: number;
  targetAmount?: number;
  currentAmount?: number;
  targetDate?: string;
  isPinned: boolean;
  isCompleted: boolean;
  completedAt?: string;
  positionX: number;
  positionY: number;
  size: string;
  tags?: string[];
  affirmation?: string;
  audioUrl?: string;
  notes?: string;
}

interface VisionBoardItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: VisionBoardItem | null;
  initialData?: Partial<VisionBoardItem> | null;
  onSave: (item: Partial<VisionBoardItem>) => void;
  onDelete?: (id: string) => void;
  isKidsMode?: boolean;
}

export function VisionBoardItemModal({
  isOpen,
  onClose,
  item,
  initialData,
  onSave,
  onDelete,
  isKidsMode = false,
}: VisionBoardItemModalProps) {
  const isEditing = !!item?.id;
  
  const [formData, setFormData] = useState<Partial<VisionBoardItem>>({
    title: '',
    description: '',
    imageUrl: '',
    imageAlt: '',
    category: 'personal',
    status: 'active',
    priority: 0,
    targetAmount: undefined,
    currentAmount: 0,
    targetDate: '',
    isPinned: false,
    isCompleted: false,
    size: 'medium',
    tags: [],
    affirmation: '',
    audioUrl: '',
    notes: '',
  });

  const [newTag, setNewTag] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const { captureFromCamera, selectFromGallery, isUploading, uploadProgress } = useImageUpload();

  useEffect(() => {
    if (item) {
      setFormData({
        ...item,
        targetDate: item.targetDate ? new Date(item.targetDate).toISOString().split('T')[0] : '',
      });
      setImagePreview(item.imageUrl || null);
    } else if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        imageUrl: '',
        imageAlt: '',
        category: initialData.category || 'personal',
        status: 'active',
        priority: 0,
        targetAmount: initialData.targetAmount,
        currentAmount: 0,
        targetDate: '',
        isPinned: false,
        isCompleted: false,
        size: 'medium',
        tags: initialData.tags || [],
        affirmation: initialData.affirmation || '',
        audioUrl: '',
        notes: '',
      });
      setImagePreview(null);
    } else {
      setFormData({
        title: '',
        description: '',
        imageUrl: '',
        imageAlt: '',
        category: 'personal',
        status: 'active',
        priority: 0,
        targetAmount: undefined,
        currentAmount: 0,
        targetDate: '',
        isPinned: false,
        isCompleted: false,
        size: 'medium',
        tags: [],
        affirmation: '',
        audioUrl: '',
        notes: '',
      });
      setImagePreview(null);
    }
    setActiveTab('basic');
  }, [item, initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      targetDate: formData.targetDate || undefined,
    });
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || [],
    }));
  };

  const handleImageUrlChange = (url: string) => {
    setFormData(prev => ({ ...prev, imageUrl: url }));
    setImagePreview(url);
  };

  const suggestedTags = getSuggestedTags(formData.category as VisionCategory);
  const categoryConfig = getCategoryConfig(formData.category as VisionCategory);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={cn(
            "w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl",
            "bg-background border border-border"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div 
            className="relative px-6 py-4 border-b border-border"
            style={{ background: categoryConfig.gradient }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <categoryConfig.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {isKidsMode 
                      ? (isEditing ? '✨ Edit Your Dream' : '🌟 Add a New Dream!')
                      : (isEditing ? 'Edit Vision' : 'Create New Vision')
                    }
                  </h2>
                  <p className="text-sm text-white/80">
                    {isKidsMode ? 'Make your dreams come true!' : 'Define your goals and aspirations'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-180px)]">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-6 pt-4 border-b border-border">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="basic" className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    <span className="hidden sm:inline">Basic</span>
                  </TabsTrigger>
                  <TabsTrigger value="details" className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    <span className="hidden sm:inline">Details</span>
                  </TabsTrigger>
                  <TabsTrigger value="media" className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Media</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6">
                <TabsContent value="basic" className="mt-0 space-y-4">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title">
                      {isKidsMode ? '🎯 What\'s your dream?' : 'Title'} *
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder={isKidsMode ? "I want to..." : "Enter your vision title"}
                      required
                      className="text-lg"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">
                      {isKidsMode ? '📝 Tell me more!' : 'Description'}
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder={isKidsMode ? "Why do you want this?" : "Describe your vision in detail..."}
                      rows={3}
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <Label htmlFor="category">
                      {isKidsMode ? '🎨 What kind of dream?' : 'Category'}
                    </Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as VisionCategory }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {VISION_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            <div className="flex items-center gap-2">
                              <cat.icon className="h-4 w-4" style={{ color: cat.color }} />
                              <span>{cat.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Size */}
                  <div className="space-y-2">
                    <Label>Card Size</Label>
                    <div className="flex gap-2">
                      {['small', 'medium', 'large'].map((size) => (
                        <Button
                          key={size}
                          type="button"
                          variant={formData.size === size ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setFormData(prev => ({ ...prev, size }))}
                          className="capitalize"
                        >
                          {size}
                        </Button>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="details" className="mt-0 space-y-4">
                  {/* Target Amount */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="targetAmount">
                        {isKidsMode ? '💰 How much do you need?' : 'Target Amount'}
                      </Label>
                      <Input
                        id="targetAmount"
                        type="number"
                        value={formData.targetAmount || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          targetAmount: e.target.value ? parseFloat(e.target.value) : undefined 
                        }))}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currentAmount">
                        {isKidsMode ? '🐷 Saved so far' : 'Current Amount'}
                      </Label>
                      <Input
                        id="currentAmount"
                        type="number"
                        value={formData.currentAmount || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          currentAmount: e.target.value ? parseFloat(e.target.value) : 0 
                        }))}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  {/* Target Date */}
                  <div className="space-y-2">
                    <Label htmlFor="targetDate">
                      {isKidsMode ? '📅 When do you want it?' : 'Target Date'}
                    </Label>
                    <Input
                      id="targetDate"
                      type="date"
                      value={formData.targetDate || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, targetDate: e.target.value }))}
                    />
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <Label>{isKidsMode ? '🏷️ Tags' : 'Tags'}</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Add a tag..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag();
                          }
                        }}
                      />
                      <Button type="button" onClick={handleAddTag} size="icon" variant="outline">
                        <Tag className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Current Tags */}
                    {formData.tags && formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => handleRemoveTag(tag)}
                          >
                            {tag} ×
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Suggested Tags */}
                    {suggestedTags.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground mb-1">Suggested:</p>
                        <div className="flex flex-wrap gap-1">
                          {suggestedTags
                            .filter(tag => !formData.tags?.includes(tag))
                            .slice(0, 5)
                            .map((tag) => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className="cursor-pointer hover:bg-primary hover:text-primary-foreground text-xs"
                                onClick={() => setFormData(prev => ({
                                  ...prev,
                                  tags: [...(prev.tags || []), tag],
                                }))}
                              >
                                + {tag}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Affirmation */}
                  <div className="space-y-2">
                    <Label htmlFor="affirmation">
                      {isKidsMode ? '✨ Your magic words' : 'Affirmation'}
                    </Label>
                    <Textarea
                      id="affirmation"
                      value={formData.affirmation || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, affirmation: e.target.value }))}
                      placeholder={isKidsMode ? "I believe I can..." : "I am attracting..."}
                      rows={2}
                    />
                  </div>

                  {/* Pinned Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>{isKidsMode ? '📌 Pin this dream' : 'Pin to top'}</Label>
                      <p className="text-xs text-muted-foreground">
                        Pinned items stay in place
                      </p>
                    </div>
                    <Switch
                      checked={formData.isPinned}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPinned: checked }))}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="media" className="mt-0 space-y-4">
                  {/* Snap Photo or Browse Gallery Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Camera className="h-4 w-4 text-muted-foreground" />
                      <Label>Snap Photo or Browse Gallery</Label>
                    </div>
                    
                    {/* Image Preview or Upload Area */}
                    {imagePreview ? (
                      <div className="relative rounded-xl overflow-hidden border-2 border-border">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-48 object-cover"
                          onError={() => setImagePreview(null)}
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            setImagePreview(null);
                            setFormData(prev => ({ ...prev, imageUrl: '' }));
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-purple-300 dark:border-purple-600 rounded-xl p-6 flex flex-col items-center gap-4 bg-muted/30">
                        <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                        
                        {isUploading ? (
                          <div className="w-full max-w-xs space-y-2">
                            <div className="flex items-center justify-center gap-2 text-purple-600">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm">Uploading...</span>
                            </div>
                            <Progress value={uploadProgress} className="h-2" />
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 w-full max-w-xs">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={async () => {
                                const url = await captureFromCamera();
                                if (url) {
                                  setFormData(prev => ({ ...prev, imageUrl: url }));
                                  setImagePreview(url);
                                }
                              }}
                              className="w-full border-purple-400 text-purple-600 hover:bg-purple-50 dark:border-purple-500 dark:text-purple-400 dark:hover:bg-purple-950"
                            >
                              <Camera className="h-4 w-4 mr-2" />
                              Camera
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={async () => {
                                const url = await selectFromGallery();
                                if (url) {
                                  setFormData(prev => ({ ...prev, imageUrl: url }));
                                  setImagePreview(url);
                                }
                              }}
                              className="w-full border-purple-400 text-purple-600 hover:bg-purple-50 dark:border-purple-500 dark:text-purple-400 dark:hover:bg-purple-950"
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Upload
                            </Button>
                          </div>
                        )}
                        
                        <p className="text-sm text-muted-foreground text-center">
                          Take a photo or choose from gallery
                        </p>
                      </div>
                    )}

                    {/* URL Input (collapsed under advanced) */}
                    <div className="pt-2">
                      <Label htmlFor="imageUrl" className="text-xs text-muted-foreground">
                        Or paste image URL
                      </Label>
                      <Input
                        id="imageUrl"
                        value={formData.imageUrl || ''}
                        onChange={(e) => handleImageUrlChange(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Image Alt Text */}
                  <div className="space-y-2">
                    <Label htmlFor="imageAlt">Image Description (Alt Text)</Label>
                    <Input
                      id="imageAlt"
                      value={formData.imageAlt || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, imageAlt: e.target.value }))}
                      placeholder="Describe the image..."
                    />
                  </div>

                  {/* Audio URL */}
                  <div className="space-y-2">
                    <Label htmlFor="audioUrl">
                      {isKidsMode ? '🎵 Add a song' : 'Audio/Music URL'}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="audioUrl"
                        value={formData.audioUrl || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, audioUrl: e.target.value }))}
                        placeholder="https://example.com/audio.mp3"
                      />
                      <Button type="button" size="icon" variant="outline">
                        <Volume2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="notes">
                      {isKidsMode ? '📓 Secret notes' : 'Additional Notes'}
                    </Label>
                    <Textarea
                      id="notes"
                      value={formData.notes || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder={isKidsMode ? "Write your secret plans here..." : "Any additional notes..."}
                      rows={3}
                    />
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </form>

          {/* Footer - matching reference design */}
          <div className="flex items-center gap-3 px-6 py-4 border-t border-border bg-muted/30">
            {isEditing && onDelete && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (item?.id) {
                    onDelete(item.id);
                  }
                }}
                className="mr-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
            <div className={cn("flex gap-3", !isEditing && "w-full")}>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="flex-1 h-12 rounded-xl border-purple-400 text-purple-600 hover:bg-purple-50 dark:border-purple-500 dark:text-purple-400"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold"
              >
                {isEditing ? 'Save' : 'Save'}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
