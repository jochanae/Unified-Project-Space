import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, Download, Copy, Check } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { smartShare, supportsNativeShare } from "@/utils/shareUtils";

interface ShareableSummaryCardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: {
    selectedDate: Date;
    income: number;
    expenses: number;
    netCashFlow: number;
    savingsRate: number;
    budgetHealth: number;
    goalsProgress: number;
  };
}

const ShareableSummaryCard = ({ open, onOpenChange, data }: ShareableSummaryCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateImage = async (): Promise<string | null> => {
    if (!cardRef.current) return null;
    
    setIsGenerating(true);
    try {
      // Use html2canvas dynamically
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        logging: false,
      });
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error generating image:', error);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    const imageUrl = await generateImage();
    if (imageUrl) {
      const link = document.createElement('a');
      link.download = `financial-summary-${format(data.selectedDate, 'yyyy-MM')}.png`;
      link.href = imageUrl;
      link.click();
      toast.success('Summary card downloaded!');
    } else {
      toast.error('Failed to generate image');
    }
  };

  const handleCopyToClipboard = async () => {
    const imageUrl = await generateImage();
    if (imageUrl) {
      try {
        const blob = await fetch(imageUrl).then(r => r.blob());
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        setCopied(true);
        toast.success('Copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error('Failed to copy to clipboard');
      }
    }
  };

  const shareText = `📊 My Financial Summary for ${format(data.selectedDate, 'MMMM yyyy')}
💰 Income: $${data.income.toLocaleString()}
💸 Expenses: $${data.expenses.toLocaleString()}
📈 Net: $${data.netCashFlow.toLocaleString()}
💪 Savings Rate: ${data.savingsRate}%`;

  const handleNativeShare = async () => {
    const success = await smartShare({
      url: window.location.href,
      title: `Financial Summary - ${format(data.selectedDate, 'MMMM yyyy')}`,
      text: shareText,
    });
    
    if (success) {
      if (!supportsNativeShare()) {
        toast.success("Link copied to clipboard!");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Share Your Financial Summary
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Preview Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            <div 
              ref={cardRef}
              className="p-6 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
              }}
            >
              {/* Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white/10 text-white/80 text-sm mb-3">
                  <span>📊</span>
                  <span>Financial Summary</span>
                </div>
                <h3 className="text-2xl font-bold text-white">
                  {format(data.selectedDate, 'MMMM yyyy')}
                </h3>
              </div>

              {/* Main Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
                  <p className="text-white/60 text-xs uppercase tracking-wide mb-1">Income</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    ${data.income.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
                  <p className="text-white/60 text-xs uppercase tracking-wide mb-1">Expenses</p>
                  <p className="text-2xl font-bold text-rose-400">
                    ${data.expenses.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Net Cash Flow */}
              <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-xl p-4 text-center mb-4">
                <p className="text-white/60 text-xs uppercase tracking-wide mb-1">Net Cash Flow</p>
                <p className={`text-3xl font-bold ${data.netCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {data.netCashFlow >= 0 ? '+' : ''}${data.netCashFlow.toLocaleString()}
                </p>
              </div>

              {/* Secondary Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-white/60 text-[10px] uppercase tracking-wide">Savings</p>
                  <p className="text-lg font-semibold text-white">{data.savingsRate}%</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-white/60 text-[10px] uppercase tracking-wide">Budget</p>
                  <p className="text-lg font-semibold text-white">{data.budgetHealth}%</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-white/60 text-[10px] uppercase tracking-wide">Goals</p>
                  <p className="text-lg font-semibold text-white">{data.goalsProgress}%</p>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-center gap-2">
                <span className="text-white/40 text-xs">Powered by</span>
                <span className="text-white font-semibold text-sm">CoinsBloom</span>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button 
                className="flex-1" 
                onClick={handleDownload}
                disabled={isGenerating}
              >
                <Download className="w-4 h-4 mr-2" />
                {isGenerating ? 'Generating...' : 'Download Image'}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleCopyToClipboard}
                disabled={isGenerating}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleNativeShare}
            >
              <Share2 className="w-4 h-4 mr-2" />
              {supportsNativeShare() ? "Share via..." : "Copy Link"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareableSummaryCard;
