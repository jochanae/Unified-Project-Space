import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TradeInput } from '@/hooks/useTrades';
import { SymbolSearchInput } from '@/components/paper-trading/SymbolSearchInput';
import { Loader2, ImagePlus, X, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

const TRADE_TAGS = [
  'Breakout', 'Earnings', 'Momentum', 'Reversal', 'Scalp', 'Swing',
  'News', 'Technical', 'Fundamental', 'Gap Play', 'Dividend', 'Sector Rotation',
];

const EMOTIONS = [
  { value: 'confident', label: '😎 Confident', color: 'bg-gain/10 text-gain border-gain/30' },
  { value: 'neutral', label: '😐 Neutral', color: 'bg-muted text-muted-foreground border-border' },
  { value: 'fearful', label: '😰 Fearful', color: 'bg-chart-4/10 text-chart-4 border-chart-4/30' },
  { value: 'fomo', label: '🤯 FOMO', color: 'bg-loss/10 text-loss border-loss/30' },
  { value: 'revenge', label: '😤 Revenge', color: 'bg-destructive/10 text-destructive border-destructive/30' },
  { value: 'disciplined', label: '🎯 Disciplined', color: 'bg-primary/10 text-primary border-primary/30' },
];

interface TradeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (trade: TradeInput) => Promise<unknown>;
  onUploadScreenshot?: (file: File) => Promise<string | null>;
  initialData?: Partial<TradeInput>;
  mode?: 'add' | 'edit' | 'close';
}

export function TradeForm({
  open,
  onOpenChange,
  onSubmit,
  onUploadScreenshot,
  initialData,
  mode = 'add',
}: TradeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<TradeInput>({
    symbol: initialData?.symbol || '',
    trade_type: initialData?.trade_type || 'long',
    entry_price: initialData?.entry_price || 0,
    exit_price: initialData?.exit_price || null,
    quantity: initialData?.quantity || 1,
    entry_date: initialData?.entry_date || new Date().toISOString().split('T')[0],
    exit_date: initialData?.exit_date || null,
    notes: initialData?.notes || '',
    status: initialData?.status || 'open',
    trade_mode: initialData?.trade_mode || 'real',
    asset_class: initialData?.asset_class || 'equity',
    tags: initialData?.tags || [],
    emotion: initialData?.emotion || null,
    screenshot_url: initialData?.screenshot_url || null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const submitData = { ...formData };
    if (mode === 'close') {
      submitData.status = 'closed';
    }
    
    await onSubmit(submitData);
    setIsSubmitting(false);
    onOpenChange(false);
    
    setFormData({
      symbol: '',
      trade_type: 'long',
      entry_price: 0,
      exit_price: null,
      quantity: 1,
      entry_date: new Date().toISOString().split('T')[0],
      exit_date: null,
      notes: '',
      status: 'open',
      trade_mode: 'real',
      asset_class: 'equity',
      tags: [],
      emotion: null,
      screenshot_url: null,
    });
  };

  const toggleTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...(prev.tags || []), tag],
    }));
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadScreenshot) return;
    
    setIsUploading(true);
    const url = await onUploadScreenshot(file);
    if (url) {
      setFormData(prev => ({ ...prev, screenshot_url: url }));
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const title = mode === 'add' ? 'Add New Trade' : mode === 'edit' ? 'Edit Trade' : 'Close Trade';
  const description = mode === 'close' 
    ? 'Enter the exit details to close this trade'
    : 'Enter the details of your trade';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode !== 'close' && (
            <>
              {/* Trade Mode & Asset Class */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Trade Mode</Label>
                  <Select
                    value={formData.trade_mode}
                    onValueChange={(value: 'real' | 'paper') => setFormData(prev => ({ ...prev, trade_mode: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="real">💰 Real Trade</SelectItem>
                      <SelectItem value="paper">📝 Paper Trade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Asset Class</Label>
                  <Select
                    value={formData.asset_class}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, asset_class: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equity">📈 Stocks</SelectItem>
                      <SelectItem value="options">⚡ Options</SelectItem>
                      <SelectItem value="forex">💱 Forex</SelectItem>
                      <SelectItem value="crypto">₿ Crypto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Symbol Search & Type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="symbol">Symbol</Label>
                  <SymbolSearchInput
                    value={formData.symbol}
                    onChange={(symbol) => setFormData(prev => ({ ...prev, symbol }))}
                    assetClassFilter={formData.asset_class === 'equity' ? 'all' : formData.asset_class}
                    placeholder="Search symbol..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trade_type">Type</Label>
                  <Select
                    value={formData.trade_type}
                    onValueChange={(value: 'long' | 'short') => setFormData(prev => ({ ...prev, trade_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="long">Long</SelectItem>
                      <SelectItem value="short">Short</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Price & Quantity */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="entry_price">Entry Price</Label>
                  <Input
                    id="entry_price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.entry_price || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, entry_price: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="1"
                    value={formData.quantity || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 1 }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="entry_date">Entry Date</Label>
                <Input
                  id="entry_date"
                  type="date"
                  value={formData.entry_date?.split('T')[0] || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, entry_date: e.target.value }))}
                  required
                />
              </div>
            </>
          )}

          {(mode === 'edit' || mode === 'close') && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="exit_price">Exit Price</Label>
                <Input
                  id="exit_price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.exit_price || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, exit_price: parseFloat(e.target.value) || null }))}
                  required={mode === 'close'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exit_date">Exit Date</Label>
                <Input
                  id="exit_date"
                  type="date"
                  value={formData.exit_date?.split('T')[0] || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, exit_date: e.target.value || null }))}
                  required={mode === 'close'}
                />
              </div>
            </div>
          )}

          {/* Emotion */}
          <div className="space-y-2">
            <Label>How are you feeling about this trade?</Label>
            <div className="flex flex-wrap gap-2">
              {EMOTIONS.map(em => (
                <Badge
                  key={em.value}
                  variant="outline"
                  className={cn(
                    'cursor-pointer transition-all text-xs',
                    formData.emotion === em.value
                      ? em.color + ' ring-1 ring-offset-1'
                      : 'hover:bg-accent'
                  )}
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    emotion: prev.emotion === em.value ? null : em.value,
                  }))}
                >
                  {em.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              Tags
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {TRADE_TAGS.map(tag => (
                <Badge
                  key={tag}
                  variant="outline"
                  className={cn(
                    'cursor-pointer transition-all text-xs',
                    formData.tags?.includes(tag)
                      ? 'bg-primary/10 text-primary border-primary/30'
                      : 'hover:bg-accent'
                  )}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Screenshot */}
          <div className="space-y-2">
            <Label>Chart Screenshot</Label>
            {formData.screenshot_url ? (
              <div className="relative rounded-lg border overflow-hidden">
                <img 
                  src={formData.screenshot_url} 
                  alt="Trade screenshot" 
                  className="w-full h-32 object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={() => setFormData(prev => ({ ...prev, screenshot_url: null }))}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshotUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-20 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || !onUploadScreenshot}
                >
                  {isUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <ImagePlus className="h-5 w-5 mr-2 text-muted-foreground" />
                  )}
                  <span className="text-muted-foreground">
                    {isUploading ? 'Uploading...' : 'Attach chart screenshot'}
                  </span>
                </Button>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Trade notes, strategy, lessons learned..."
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'add' ? 'Add Trade' : mode === 'edit' ? 'Save Changes' : 'Close Trade'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
