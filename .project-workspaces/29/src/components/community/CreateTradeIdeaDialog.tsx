import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useCommunity } from "@/hooks/useCommunity";
import { ImageUpload } from "./ImageUpload";

interface CreateTradeIdeaDialogProps {
  children?: React.ReactNode;
}

export function CreateTradeIdeaDialog({ children }: CreateTradeIdeaDialogProps) {
  const [open, setOpen] = useState(false);
  const { createTradeIdea } = useCommunity();
  
  const [symbol, setSymbol] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tradeDirection, setTradeDirection] = useState<"long" | "short" | "neutral">("long");
  const [assetClass, setAssetClass] = useState("stocks");
  const [entryPrice, setEntryPrice] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [chartImageUrl, setChartImageUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createTradeIdea.mutateAsync({
      symbol: symbol.toUpperCase(),
      title,
      content,
      trade_direction: tradeDirection,
      asset_class: assetClass,
      entry_price: entryPrice ? parseFloat(entryPrice) : null,
      target_price: targetPrice ? parseFloat(targetPrice) : null,
      stop_loss: stopLoss ? parseFloat(stopLoss) : null,
      chart_image_url: chartImageUrl,
      outcome: null,
      user_id: "",
    });

    // Reset form
    setSymbol("");
    setTitle("");
    setContent("");
    setTradeDirection("long");
    setAssetClass("stocks");
    setEntryPrice("");
    setTargetPrice("");
    setStopLoss("");
    setChartImageUrl(null);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Share Trade Idea
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share a Trade Idea</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input
                id="symbol"
                placeholder="AAPL"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                required
                className="uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="asset-class">Asset Class</Label>
              <Select value={assetClass} onValueChange={setAssetClass}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stocks">Stocks</SelectItem>
                  <SelectItem value="options">Options</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                  <SelectItem value="forex">Forex</SelectItem>
                  <SelectItem value="futures">Futures</SelectItem>
                  <SelectItem value="etfs">ETFs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Bullish breakout setup on AAPL"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Direction *</Label>
            <RadioGroup
              value={tradeDirection}
              onValueChange={(v) => setTradeDirection(v as typeof tradeDirection)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="long" id="long" />
                <Label htmlFor="long" className="flex items-center gap-1 cursor-pointer text-green-500">
                  <TrendingUp className="h-4 w-4" /> Long
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="short" id="short" />
                <Label htmlFor="short" className="flex items-center gap-1 cursor-pointer text-red-500">
                  <TrendingDown className="h-4 w-4" /> Short
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="neutral" id="neutral" />
                <Label htmlFor="neutral" className="flex items-center gap-1 cursor-pointer text-yellow-500">
                  <Minus className="h-4 w-4" /> Neutral
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Analysis *</Label>
            <Textarea
              id="content"
              placeholder="Describe your trade setup, reasoning, and thesis..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={4}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="entry">Entry Price</Label>
              <Input
                id="entry"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target">Target Price</Label>
              <Input
                id="target"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stop">Stop Loss</Label>
              <Input
                id="stop"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Chart Image</Label>
            <ImageUpload value={chartImageUrl} onChange={setChartImageUrl} />
            <p className="text-xs text-muted-foreground">
              Attach a screenshot of your chart setup (max 5MB)
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTradeIdea.isPending}>
              {createTradeIdea.isPending ? "Sharing..." : "Share Idea"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
