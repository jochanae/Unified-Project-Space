import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ShareToCommunityButtonProps {
  messageContent: string;
  className?: string;
}

const ASSET_CLASSES = [
  { value: 'stocks', label: 'Stocks' },
  { value: 'options', label: 'Options' },
  { value: 'futures', label: 'Futures' },
  { value: 'forex', label: 'Forex' },
  { value: 'crypto', label: 'Crypto' },
];

const DIRECTIONS = [
  { value: 'bullish', label: 'Bullish 🟢' },
  { value: 'bearish', label: 'Bearish 🔴' },
  { value: 'neutral', label: 'Neutral ⚪' },
];

export function ShareToCommunityButton({ messageContent, className }: ShareToCommunityButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [symbol, setSymbol] = useState('');
  const [assetClass, setAssetClass] = useState('stocks');
  const [direction, setDirection] = useState('bullish');
  const [content, setContent] = useState('');

  // Initialize form with Quinn's insight
  const handleOpen = () => {
    // Extract potential symbol from message (e.g., $AAPL, AAPL)
    const symbolMatch = messageContent.match(/\$?([A-Z]{1,5})\b/);
    if (symbolMatch) {
      setSymbol(symbolMatch[1]);
    }
    
    // Pre-fill content with a reference to Quinn's insight
    setContent(
      `Quinn shared this insight with me:\n\n"${messageContent.slice(0, 500)}${messageContent.length > 500 ? '...' : ''}"\n\nWhat do you all think?`
    );
    
    setIsOpen(true);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please sign in to share to community');
      return;
    }

    if (!title.trim() || !symbol.trim() || !content.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('trade_ideas').insert({
        user_id: user.id,
        title: title.trim(),
        symbol: symbol.toUpperCase().trim(),
        asset_class: assetClass,
        trade_direction: direction,
        content: content.trim(),
        status: 'active',
      });

      if (error) throw error;

      toast.success('Trade idea shared to community!');
      setIsOpen(false);
      
      // Reset form
      setTitle('');
      setSymbol('');
      setContent('');
      
      // Navigate to community
      navigate('/community?tab=ideas');
    } catch (error: any) {
      console.error('Error sharing to community:', error);
      toast.error('Failed to share to community');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpen}
        className={className}
      >
        <Users className="h-3.5 w-3.5 mr-1.5" />
        Share to Community
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-chart-3" />
              Share Quinn's Insight
            </DialogTitle>
            <DialogDescription>
              Turn this insight into a trade idea for the community to discuss
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., AAPL breakout opportunity"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="symbol">Symbol *</Label>
                <Input
                  id="symbol"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g., AAPL"
                  maxLength={10}
                />
              </div>

              <div className="space-y-2">
                <Label>Asset Class</Label>
                <Select value={assetClass} onValueChange={setAssetClass}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_CLASSES.map((ac) => (
                      <SelectItem key={ac.value} value={ac.value}>
                        {ac.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Direction</Label>
              <Select value={direction} onValueChange={setDirection}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIRECTIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Your Thoughts *</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share your analysis and invite discussion..."
                rows={5}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              Share to Community
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
