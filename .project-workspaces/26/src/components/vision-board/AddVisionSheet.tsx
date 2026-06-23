import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Upload, ChevronDown, ChevronUp, ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { VISION_CATEGORIES, getCategoryConfig, type VisionCategory } from '@/lib/visionCategories';
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
  hideDetails?: boolean;
}

interface AddVisionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  item?: VisionBoardItem | null;
  initialData?: Partial<VisionBoardItem> | null;
  onSave: (item: Partial<VisionBoardItem>) => void;
  onDelete?: (id: string) => void;
  isKidsMode?: boolean;
}

export function AddVisionSheet({
  isOpen,
  onClose,
  item,
  initialData,
  onSave,
  onDelete,
  isKidsMode = false,
}: AddVisionSheetProps) {
  const isEditing = !!item?.id;
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  
  const [formData, setFormData] = useState<Partial<VisionBoardItem>>({
    title: '',
    description: '',
    imageUrl: '',
    imageAlt: '',
    category: 'other',
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
    hideDetails: false,
  });

  const [newTag, setNewTag] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { captureFromCamera, selectFromGallery, isUploading, uploadProgress } = useImageUpload();

  useEffect(() => {
    if (item) {
      setFormData({
        ...item,
        targetDate: item.targetDate ? new Date(item.targetDate).toISOString().split('T')[0] : '',
      });
      setImagePreview(item.imageUrl || null);
      setShowMoreDetails(false);
    } else if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        imageUrl: '',
        imageAlt: '',
        category: initialData.category || 'other',
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
        hideDetails: false,
      });
      setImagePreview(null);
      setShowMoreDetails(false);
    } else {
      setFormData({
        title: '',
        description: '',
        imageUrl: '',
        imageAlt: '',
        category: 'other',
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
        hideDetails: false,
      });
      setImagePreview(null);
      setShowMoreDetails(false);
    }
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

  const categoryConfig = getCategoryConfig(formData.category as VisionCategory);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
        side="bottom" 
        className="h-[85vh] rounded-t-3xl px-0 py-0 border-t-0"
      >
        {/* Sheet Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-4">
          <h2 className="text-xl font-bold text-foreground">
            {isEditing ? 'Edit Vision' : 'Add Vision'}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-muted-foreground"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content - Scrollable */}
        <form onSubmit={handleSubmit} className="flex flex-col h-[calc(100%-120px)]">
          <div className="flex-1 overflow-y-auto px-6 space-y-5">
            
            {/* Image Upload Section - Primary Focus */}
            <div className="flex flex-col items-center gap-4">
              {imagePreview ? (
                <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-border">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={() => setImagePreview(null)}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => {
                      setImagePreview(null);
                      setFormData(prev => ({ ...prev, imageUrl: '' }));
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/30">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                </div>
              )}
              
              {isUploading ? (
                <div className="w-full max-w-xs space-y-2">
                  <div className="flex items-center justify-center gap-2 text-primary">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Uploading...</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              ) : (
                <div className="flex gap-3 w-full">
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
                    className="flex-1 h-12 rounded-xl border-primary/50 text-primary hover:bg-primary/5"
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
                    className="flex-1 h-12 rounded-xl border-primary/50 text-primary hover:bg-primary/5"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </div>
              )}
            </div>

            {/* Affirmation - Prominent placement */}
            <div className="space-y-2">
              <Label htmlFor="affirmation-main">Affirmation (optional)</Label>
              <Textarea
                id="affirmation-main"
                value={formData.affirmation || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, affirmation: e.target.value }))}
                placeholder="I am attracting abundance..."
                rows={2}
                className="rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                💡 You can create an affirmation-only card without a photo!
              </p>
            </div>

            {/* Title Input */}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="What's your vision?"
                className="h-12 rounded-xl"
              />
            </div>

            {/* Category Selector */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as VisionCategory }))}
              >
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
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

            {/* Size Selection */}
            <div className="space-y-2">
              <Label>Size</Label>
              <div className="flex gap-2">
                {['small', 'medium', 'large'].map((size) => (
                  <Button
                    key={size}
                    type="button"
                    variant={formData.size === size ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, size }))}
                    className="flex-1 capitalize rounded-lg"
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </div>

            {/* Hide Details Toggle */}
            <div className="flex items-center justify-between py-2">
              <div>
                <Label>Hide Details on Card</Label>
                <p className="text-xs text-muted-foreground">
                  Show only the image until tapped
                </p>
              </div>
              <Switch
                checked={formData.hideDetails}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hideDetails: checked }))}
              />
            </div>

            {/* Expandable More Details Section */}
            <div className="border-t border-border pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowMoreDetails(!showMoreDetails)}
                className="w-full flex items-center justify-between py-3 px-0 h-auto hover:bg-transparent"
              >
                <span className="text-sm font-medium text-muted-foreground">
                  {showMoreDetails ? 'Hide Details' : 'More Details'}
                </span>
                {showMoreDetails ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>

              <AnimatePresence>
                {showMoreDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden space-y-4 pt-2"
                  >
                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe your vision..."
                        rows={2}
                        className="rounded-xl"
                      />
                    </div>

                    {/* Target Amount */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="targetAmount">Target Amount</Label>
                        <Input
                          id="targetAmount"
                          type="number"
                          value={formData.targetAmount || ''}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            targetAmount: e.target.value ? parseFloat(e.target.value) : undefined 
                          }))}
                          placeholder="$0"
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currentAmount">Saved</Label>
                        <Input
                          id="currentAmount"
                          type="number"
                          value={formData.currentAmount || ''}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            currentAmount: e.target.value ? parseFloat(e.target.value) : 0 
                          }))}
                          placeholder="$0"
                          className="rounded-xl"
                        />
                      </div>
                    </div>

                    {/* Target Date */}
                    <div className="space-y-2">
                      <Label htmlFor="targetDate">Target Date</Label>
                      <Input
                        id="targetDate"
                        type="date"
                        value={formData.targetDate || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, targetDate: e.target.value }))}
                        className="rounded-xl"
                      />
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                      <Label>Tags</Label>
                      <div className="flex gap-2">
                        <Input
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="Add a tag..."
                          className="rounded-xl"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTag();
                            }
                          }}
                        />
                        <Button type="button" onClick={handleAddTag} variant="outline" className="rounded-xl">
                          Add
                        </Button>
                      </div>
                      {formData.tags && formData.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {formData.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="cursor-pointer"
                              onClick={() => handleRemoveTag(tag)}
                            >
                              {tag} ×
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Affirmation */}
                    <div className="space-y-2">
                      <Label htmlFor="affirmation">Affirmation</Label>
                      <Textarea
                        id="affirmation"
                        value={formData.affirmation || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, affirmation: e.target.value }))}
                        placeholder="I am attracting..."
                        rows={2}
                        className="rounded-xl"
                      />
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Additional notes..."
                        rows={2}
                        className="rounded-xl"
                      />
                    </div>

                    {/* Pin Toggle */}
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <Label>Pin to top</Label>
                        <p className="text-xs text-muted-foreground">
                          Pinned items stay in place
                        </p>
                      </div>
                      <Switch
                        checked={formData.isPinned}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPinned: checked }))}
                      />
                    </div>

                    {/* Image URL Input */}
                    <div className="space-y-2">
                      <Label htmlFor="imageUrl" className="text-xs text-muted-foreground">
                        Or paste image URL
                      </Label>
                      <Input
                        id="imageUrl"
                        value={formData.imageUrl || ''}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, imageUrl: e.target.value }));
                          setImagePreview(e.target.value);
                        }}
                        placeholder="https://example.com/image.jpg"
                        className="rounded-xl"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Footer Buttons - Fixed at bottom */}
          <div className="flex gap-3 px-6 py-4 border-t border-border bg-background">
            {isEditing && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => item?.id && onDelete(item.id)}
                className="flex-1 h-12 rounded-xl"
              >
                Delete
              </Button>
            )}
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className={cn(
                "h-12 rounded-xl border-primary text-primary hover:bg-primary/5",
                isEditing ? "flex-1" : "flex-1"
              )}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-pink-500 to-primary hover:from-pink-600 hover:to-primary/90 text-white font-semibold"
            >
              Save
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
