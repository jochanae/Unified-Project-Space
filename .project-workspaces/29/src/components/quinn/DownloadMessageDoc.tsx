import { jsPDF } from 'jspdf';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface DownloadMessageDocProps {
  content: string;
}

/**
 * Strips markdown formatting for clean PDF output.
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, '')        // headings
    .replace(/\*\*(.+?)\*\*/g, '$1')  // bold
    .replace(/\*(.+?)\*/g, '$1')      // italic
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/`(.+?)`/g, '$1')        // inline code
    .replace(/^\s*[-*+]\s+/gm, '  - ') // bullets
    .replace(/^\s*\d+\.\s+/gm, (m) => `  ${m.trim()} `) // numbered lists
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/\|/g, ' ')              // table pipes
    .replace(/---+/g, '')             // hr
    .replace(/\n{3,}/g, '\n\n');      // collapse blank lines
}

export function DownloadMessageDoc({ content }: DownloadMessageDocProps) {
  const handleDownload = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 25;
      const maxWidth = pageWidth - margin * 2;
      let yPos = 30;

      const cleanText = stripMarkdown(content);

      // Body text
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30);

      const lines = doc.splitTextToSize(cleanText, maxWidth);

      lines.forEach((line: string) => {
        if (yPos > 275) {
          doc.addPage();
          yPos = 25;
        }
        doc.text(line, margin, yPos);
        yPos += 5.5;
      });

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(160);
        doc.text(
          `Drafted with Quinn - IntoIQ Smart Mentor`,
          pageWidth / 2,
          290,
          { align: 'center' }
        );
      }

      doc.save(`quinn-document-${Date.now()}.pdf`);
      toast.success('Document downloaded!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate document');
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-7 text-xs gap-1.5 border-border/50 hover:bg-muted/50"
      onClick={handleDownload}
    >
      <Download className="h-3 w-3" />
      Download as document
    </Button>
  );
}
