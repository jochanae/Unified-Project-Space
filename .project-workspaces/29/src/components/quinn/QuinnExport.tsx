import { useState } from 'react';
import { jsPDF } from 'jspdf';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Copy, Download, Check, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Message } from '@/hooks/useQuinnChat';

interface QuinnExportProps {
  messages: Message[];
  disabled?: boolean;
}

export function QuinnExport({ messages, disabled }: QuinnExportProps) {
  const [copied, setCopied] = useState(false);

  const formatMessagesAsText = () => {
    return messages
      .map((m) => {
        const role = m.role === 'user' ? 'You' : 'Quinn';
        const time = m.timestamp.toLocaleString();
        return `[${time}] ${role}:\n${m.content}\n`;
      })
      .join('\n---\n\n');
  };

  const handleCopyToClipboard = async () => {
    try {
      const text = formatMessagesAsText();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Conversation copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy conversation');
    }
  };

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const maxWidth = pageWidth - margin * 2;
      let yPos = 20;

      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Quinn Conversation', margin, yPos);
      yPos += 10;

      // Date
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`Exported: ${new Date().toLocaleString()}`, margin, yPos);
      yPos += 15;

      // Messages
      doc.setTextColor(0);
      
      messages.forEach((message) => {
        // Check if we need a new page
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        // Role header
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        const role = message.role === 'user' ? 'You' : 'Quinn';
        const time = message.timestamp.toLocaleTimeString();
        doc.text(`${role} • ${time}`, margin, yPos);
        yPos += 6;

        // Message content
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        // Split long text into lines
        const lines = doc.splitTextToSize(message.content, maxWidth);
        
        lines.forEach((line: string) => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(line, margin, yPos);
          yPos += 5;
        });

        yPos += 8; // Space between messages
      });

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `IntoIQ • Quinn Smart Mentor • Page ${i} of ${pageCount}`,
          pageWidth / 2,
          290,
          { align: 'center' }
        );
      }

      doc.save(`quinn-conversation-${Date.now()}.pdf`);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    }
  };

  if (messages.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          title="Export conversation"
        >
          <FileText className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCopyToClipboard}>
          {copied ? (
            <Check className="mr-2 h-4 w-4 text-green-500" />
          ) : (
            <Copy className="mr-2 h-4 w-4" />
          )}
          Copy to Clipboard
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownloadPDF}>
          <Download className="mr-2 h-4 w-4" />
          Download as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
