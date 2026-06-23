import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Share2, Download, Mail, Loader2, Check, Copy, Lock, FileSpreadsheet } from 'lucide-react';
import { PlanSectionWithItems } from '@/hooks/usePlan';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { getLogoBase64 } from '@/lib/logoBase64';
import { downloadPlanTemplate } from '@/lib/templateDownloads';

interface PlanShareMenuProps {
  sectionsWithItems: PlanSectionWithItems[];
  stats: {
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
  };
}

export function PlanShareMenu({ sectionsWithItems, stats }: PlanShareMenuProps) {
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  const { checkAccess } = useFeatureAccess();
  const canExport = checkAccess('planExport');

  const generatePlanText = (): string => {
    const lines: string[] = [];
    lines.push('═══════════════════════════════════════');
    lines.push('           MY FINANCIAL PLAN');
    lines.push('           Powered by IntoIQ');
    lines.push('═══════════════════════════════════════');
    lines.push('');
    lines.push(`Progress: ${stats.completed}/${stats.total} completed`);
    lines.push(`In Progress: ${stats.inProgress} | Not Started: ${stats.notStarted}`);
    lines.push('');

    sectionsWithItems.forEach((section) => {
      if (section.items.length === 0) return;
      
      lines.push('───────────────────────────────────────');
      lines.push(`📌 ${section.name.toUpperCase()}`);
      lines.push('───────────────────────────────────────');
      
      section.items.forEach((item) => {
        const statusIcon = item.status === 'completed' ? '✅' : item.status === 'in_progress' ? '🔄' : '⬜';
        lines.push(`${statusIcon} ${item.title}`);
        if (item.description) {
          lines.push(`   ${item.description.substring(0, 100)}${item.description.length > 100 ? '...' : ''}`);
        }
      });
      lines.push('');
    });

    lines.push('───────────────────────────────────────');
    lines.push(`Generated on ${new Date().toLocaleDateString()}`);
    lines.push('https://intoiq.lovable.app');
    
    return lines.join('\n');
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Logo
      const logoBase64 = await getLogoBase64();
      let headerY = 25;
      if (logoBase64) {
        const logoWidth = 36;
        const logoHeight = 12;
        doc.addImage(logoBase64, 'PNG', (pageWidth - logoWidth) / 2, 10, logoWidth, logoHeight);
        headerY = 30;
      }
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(20, 184, 166);
      doc.text('My Financial Plan', pageWidth / 2, headerY, { align: 'center' });
      
      // Stats bar
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Progress: ${stats.completed}/${stats.total} completed`, 20, headerY + 15);
      doc.text(`In Progress: ${stats.inProgress} | Not Started: ${stats.notStarted}`, 20, headerY + 22);
      
      let yPosition = headerY + 35;
      
      sectionsWithItems.forEach((section) => {
        if (section.items.length === 0) return;
        
        if (yPosition > 260) {
          doc.addPage();
          yPosition = 25;
        }
        
        doc.setFontSize(14);
        doc.setTextColor(20, 184, 166);
        doc.text(section.name, 20, yPosition);
        yPosition += 8;
        
        doc.setFontSize(11);
        section.items.forEach((item) => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 25;
          }
          
          const statusIcon = item.status === 'completed' ? '[✓]' : item.status === 'in_progress' ? '[~]' : '[ ]';
          doc.setTextColor(item.status === 'completed' ? 34 : 0, item.status === 'completed' ? 197 : 0, item.status === 'completed' ? 94 : 0);
          doc.text(`${statusIcon} ${item.title}`, 25, yPosition);
          yPosition += 6;
          
          if (item.description) {
            doc.setFontSize(9);
            doc.setTextColor(128, 128, 128);
            const desc = item.description.substring(0, 80) + (item.description.length > 80 ? '...' : '');
            doc.text(desc, 32, yPosition);
            yPosition += 5;
            doc.setFontSize(11);
          }
        });
        
        yPosition += 8;
      });
      
      // Footer
      doc.setFontSize(9);
      doc.setTextColor(128, 128, 128);
      doc.text(`Generated on ${new Date().toLocaleDateString()} • intoiq.lovable.app`, pageWidth / 2, 285, { align: 'center' });
      
      doc.save('my-financial-plan.pdf');
      toast.success('Plan downloaded as PDF');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleCopyLink = async () => {
    const shareText = generatePlanText();
    
    try {
      await navigator.clipboard.writeText(shareText);
      setLinkCopied(true);
      toast.success('Plan copied to clipboard');
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleEmailPlan = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSending(true);
    
    const planText = generatePlanText();
    const subject = encodeURIComponent('My Financial Plan from IntoIQ');
    const body = encodeURIComponent(planText);
    
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
    
    setIsSending(false);
    setIsEmailDialogOpen(false);
    setEmail('');
    toast.success('Opening email client...');
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem 
            onClick={() => canExport ? handleDownloadPDF() : setShowUpgradeModal(true)} 
            className="gap-2 cursor-pointer"
            disabled={isGeneratingPDF}
          >
            {isGeneratingPDF ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download as PDF
            {!canExport && <Lock className="h-3 w-3 ml-auto text-muted-foreground" />}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => downloadPlanTemplate()}
            className="gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Download CSV Template
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => canExport ? handleCopyLink() : setShowUpgradeModal(true)} 
            className="gap-2 cursor-pointer"
          >
            {linkCopied ? (
              <>
                <Check className="h-4 w-4 text-gain" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy as Text
                {!canExport && <Lock className="h-3 w-3 ml-auto text-muted-foreground" />}
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => canExport ? setIsEmailDialogOpen(true) : setShowUpgradeModal(true)} 
            className="gap-2 cursor-pointer"
          >
            <Mail className="h-4 w-4" />
            Email Plan
            {!canExport && <Lock className="h-3 w-3 ml-auto text-muted-foreground" />}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Email Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Email Your Plan
            </DialogTitle>
            <DialogDescription>
              Send your financial plan to yourself or someone else
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEmailPlan} disabled={isSending} className="gap-2">
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Send Plan
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        feature="Plan Export & Sharing"
        requiredTier="pro"
        description="Upgrade to Pro to download, copy, and share your financial plan with others."
      />
    </>
  );
}
