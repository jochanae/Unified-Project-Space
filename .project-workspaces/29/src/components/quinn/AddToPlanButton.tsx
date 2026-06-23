import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import { Pin, Loader2, Check } from 'lucide-react';
import { usePlan, PlanSection } from '@/hooks/usePlan';
import { cn } from '@/lib/utils';

interface AddToPlanButtonProps {
  messageContent: string;
  conversationId?: string | null;
  className?: string;
}

export function AddToPlanButton({
  messageContent,
  conversationId,
  className,
}: AddToPlanButtonProps) {
  const { sections, addItem } = usePlan();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sectionId, setSectionId] = useState<string>('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  // Extract a suggested title from the message
  const extractSuggestedTitle = (content: string): string => {
    // Look for action phrases
    const actionPhrases = [
      /(?:should|could|might want to|consider|try to|start|build|create|set up|establish)\s+([^.!?]+)/i,
      /(?:emergency fund|budget|savings|investment|retirement|401k|ira|portfolio)/i,
    ];
    
    for (const pattern of actionPhrases) {
      const match = content.match(pattern);
      if (match && match[1]) {
        // Clean up and capitalize
        let suggestion = match[1].trim();
        if (suggestion.length > 50) {
          suggestion = suggestion.substring(0, 50) + '...';
        }
        return suggestion.charAt(0).toUpperCase() + suggestion.slice(1);
      }
    }
    
    // Fallback: first sentence truncated
    const firstSentence = content.split(/[.!?]/)[0].trim();
    if (firstSentence.length > 50) {
      return firstSentence.substring(0, 50) + '...';
    }
    return firstSentence;
  };

  const handleOpen = () => {
    // Pre-fill with suggested content
    const suggestedTitle = extractSuggestedTitle(messageContent);
    setTitle(suggestedTitle);
    setDescription(messageContent.substring(0, 200));
    
    // Default to first section if available
    if (sections.length > 0 && !sectionId) {
      setSectionId(sections[0].id);
    }
    
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await addItem({
        title: title.trim(),
        description: description.trim() || undefined,
        section_id: sectionId || undefined,
        priority,
        source_type: 'quinn_suggestion',
        source_conversation_id: conversationId || undefined,
        source_message_content: messageContent.substring(0, 500),
      });
      
      setIsAdded(true);
      setIsOpen(false);
      
      // Reset after a delay
      setTimeout(() => setIsAdded(false), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAdded) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-7 text-xs gap-1 text-gain hover:text-gain',
          className
        )}
        disabled
      >
        <Check className="h-3 w-3" />
        Added to Plan
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-7 text-xs gap-1 text-chart-3 hover:text-chart-3 hover:bg-chart-3/10',
          className
        )}
        onClick={handleOpen}
      >
        <Pin className="h-3 w-3" />
        Add to My Money Plan
      </Button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-xl">
          <SheetHeader className="text-left">
            <SheetTitle>Add to My Money Plan</SheetTitle>
            <SheetDescription>
              Save this as an action item to track your progress
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plan-title">Item</Label>
              <Input
                id="plan-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What action should you take?"
                autoFocus
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-description">Description (optional)</Label>
              <Textarea
                id="plan-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add context or details..."
                rows={2}
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label>Section</Label>
                <Select value={sectionId} onValueChange={setSectionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose section" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        {section.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!title.trim() || isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Add to Plan
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
