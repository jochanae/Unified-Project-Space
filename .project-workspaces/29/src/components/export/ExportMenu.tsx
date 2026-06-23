import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Download, FileText, FileSpreadsheet, Loader2, Crown } from 'lucide-react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { toast } from 'sonner';

interface ExportMenuProps {
  onExportCSV: () => void;
  onExportPDF: () => void;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function ExportMenu({
  onExportCSV,
  onExportPDF,
  disabled = false,
  variant = 'outline',
  size = 'sm',
}: ExportMenuProps) {
  const { checkAccess } = useFeatureAccess();
  const [isExporting, setIsExporting] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  
  const hasAccess = checkAccess('exportReports');

  const handleExport = async (exportFn: () => void, format: string) => {
    if (!hasAccess) {
      setShowUpgrade(true);
      return;
    }

    setIsExporting(true);
    try {
      exportFn();
      toast.success(`${format} export completed`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export ${format}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={variant} size={size} disabled={disabled || isExporting}>
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export
            {!hasAccess && <Crown className="h-3 w-3 ml-1.5 text-amber-500" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Export Format
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleExport(onExportCSV, 'CSV')}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export as CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport(onExportPDF, 'PDF')}>
            <FileText className="h-4 w-4 mr-2" />
            Export as PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <UpgradeModal
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        feature="Export Reports"
        requiredTier="pro"
        description="Export your trade journal and analytics as PDF or CSV files with the Pro plan."
      />
    </>
  );
}
