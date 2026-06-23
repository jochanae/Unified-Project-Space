import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, Plus, Loader2, Link as LinkIcon, Youtube } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { extractYouTubeVideoId } from '@/lib/youtubeUtils';
import { YouTubePlanPreview } from './YouTubePlanPreview';

interface AddPlanItemSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionId?: string;
  sectionName?: string;
  defaultValues?: {
    title?: string;
    description?: string;
  };
  onSubmit: (item: {
    title: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high';
    target_date?: string;
    notes?: string;
  }) => void;
}

export function AddPlanItemSheet({
  open,
  onOpenChange,
  sectionId,
  sectionName,
  defaultValues,
  onSubmit,
}: AddPlanItemSheetProps) {
  const [title, setTitle] = useState(defaultValues?.title || '');
  const [description, setDescription] = useState(defaultValues?.description || '');
  const [resourceUrl, setResourceUrl] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [targetDate, setTargetDate] = useState<Date | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Reset form when opened
  useEffect(() => {
    if (open) {
      setTitle(defaultValues?.title || '');
      setDescription(defaultValues?.description || '');
      setResourceUrl('');
      setPriority('medium');
      setTargetDate(undefined);
      setShowUrlInput(false);
    }
  }, [open, defaultValues]);

  // Auto-detect YouTube URL in title or description
  const detectedVideoId = extractYouTubeVideoId(resourceUrl) || 
                          extractYouTubeVideoId(title) || 
                          extractYouTubeVideoId(description);
  
  const isYouTubeUrl = !!detectedVideoId;

  // Auto-show URL input if YouTube link pasted in title
  useEffect(() => {
    if (extractYouTubeVideoId(title)) {
      setResourceUrl(title);
      setTitle('');
      setShowUrlInput(true);
    }
  }, [title]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !resourceUrl.trim()) return;

    setIsSubmitting(true);
    try {
      // If we have a resource URL, store it in notes with a special format
      const notes = resourceUrl.trim() ? `📎 Resource: ${resourceUrl.trim()}` : undefined;
      
      await onSubmit({
        title: title.trim() || (isYouTubeUrl ? 'Watch: YouTube Video' : 'Saved Resource'),
        description: description.trim() || undefined,
        priority,
        target_date: targetDate?.toISOString().split('T')[0],
        notes,
      });
      
      // Reset form
      setTitle('');
      setDescription('');
      setResourceUrl('');
      setPriority('medium');
      setTargetDate(undefined);
      setShowUrlInput(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-xl overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Add to My Money Plan</SheetTitle>
          <SheetDescription>
            {sectionName ? `Adding to: ${sectionName}` : 'Create a new action item or save a resource'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* URL Input Section */}
          {showUrlInput ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="url" className="flex items-center gap-2">
                  {isYouTubeUrl ? (
                    <Youtube className="h-4 w-4 text-red-500" />
                  ) : (
                    <LinkIcon className="h-4 w-4" />
                  )}
                  Resource URL
                </Label>
                <Input
                  id="url"
                  value={resourceUrl}
                  onChange={(e) => setResourceUrl(e.target.value)}
                  placeholder="Paste a YouTube link or any URL..."
                  autoFocus
                />
              </div>
              
              {/* YouTube Preview */}
              {isYouTubeUrl && (
                <YouTubePlanPreview 
                  url={resourceUrl} 
                  onRemove={() => setResourceUrl('')}
                  className="max-w-sm"
                />
              )}
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowUrlInput(true)}
              className="gap-2 text-muted-foreground"
            >
              <LinkIcon className="h-4 w-4" />
              Add a link (YouTube, article, etc.)
            </Button>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">What do you want to accomplish?</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isYouTubeUrl ? "e.g., Learn about options strategies" : "e.g., Build emergency fund (3-6 months)"}
              autoFocus={!showUrlInput}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any details or context..."
              rows={2}
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 space-y-2">
              <Label>Target Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !targetDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {targetDate ? format(targetDate, 'MMM d, yyyy') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={targetDate}
                    onSelect={setTargetDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={(!title.trim() && !resourceUrl.trim()) || isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add to Plan
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
