import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, Target, Loader2, Download } from 'lucide-react';
import { useTrades } from '@/hooks/useTrades';
import { usePlan } from '@/hooks/usePlan';
import { downloadTradeTemplate, downloadPlanTemplate } from '@/lib/templateDownloads';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedPlanRow {
  section: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  targetDate: string;
  notes: string;
}

function parsePlanCSV(text: string): ParsedPlanRow[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const rows: ParsedPlanRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    // Handle quoted CSV fields
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());

    if (fields.length >= 2 && fields[1]) {
      rows.push({
        section: fields[0] || 'General',
        title: fields[1],
        description: fields[2] || '',
        priority: (fields[3] || 'medium').toLowerCase(),
        status: (fields[4] || 'not_started').toLowerCase(),
        targetDate: fields[5] || '',
        notes: fields[6] || '',
      });
    }
  }
  return rows;
}

export function ImportModal({ open, onOpenChange }: ImportModalProps) {
  const { importTrades } = useTrades();
  const { user } = useAuth();
  const { sections, activePlanId, addSection, addItem } = usePlan();
  const [isImporting, setIsImporting] = useState(false);
  const [importType, setImportType] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (type: string) => {
    setImportType(type);
    fileInputRef.current?.click();
  };

  const importPlanFromCSV = async (file: File) => {
    const text = await file.text();
    const rows = parsePlanCSV(text);

    if (rows.length === 0) {
      toast.error('No valid plan items found in CSV');
      return;
    }

    if (!user?.id || !activePlanId) {
      toast.error('Please create a plan first before importing');
      return;
    }

    // Group rows by section name
    const sectionMap = new Map<string, ParsedPlanRow[]>();
    for (const row of rows) {
      const key = row.section;
      if (!sectionMap.has(key)) sectionMap.set(key, []);
      sectionMap.get(key)!.push(row);
    }

    let importedCount = 0;

    for (const [sectionName, sectionRows] of sectionMap) {
      // Find existing section or create new one
      let sectionId = sections.find(
        s => s.name.toLowerCase() === sectionName.toLowerCase()
      )?.id;

      if (!sectionId) {
        try {
          const newSection = await addSection({ name: sectionName });
          sectionId = newSection.id;
        } catch {
          toast.error(`Failed to create section "${sectionName}"`);
          continue;
        }
      }

      // Add items to section
      for (const row of sectionRows) {
        const validPriority = ['low', 'medium', 'high'].includes(row.priority)
          ? (row.priority as 'low' | 'medium' | 'high')
          : 'medium';

        const validStatus = ['not_started', 'in_progress', 'completed'].includes(row.status)
          ? row.status
          : 'not_started';

        try {
          await addItem({
            title: row.title,
            description: row.description || undefined,
            section_id: sectionId,
            priority: validPriority,
            source_type: 'imported',
            target_date: row.targetDate || undefined,
            notes: row.notes || undefined,
          });
          importedCount++;
        } catch {
          console.error(`Failed to import item: ${row.title}`);
        }
      }
    }

    toast.success(`Imported ${importedCount} plan item${importedCount !== 1 ? 's' : ''}`);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      if (importType === 'trades') {
        await importTrades(file);
      } else if (importType === 'plan') {
        await importPlanFromCSV(file);
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Import failed');
    } finally {
      setIsImporting(false);
      setImportType(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const importOptions = [
    {
      id: 'trades',
      icon: <FileSpreadsheet className="h-5 w-5" />,
      title: 'Trade Journal (CSV)',
      description: 'Import trades from a CSV file or broker export',
      color: 'text-primary',
    },
    {
      id: 'plan',
      icon: <Target className="h-5 w-5" />,
      title: 'Financial Plan (CSV)',
      description: 'Import plan items from a CSV template',
      color: 'text-gain',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          Import Data
        </DialogTitle>
        <DialogDescription>
          Choose what you'd like to import
        </DialogDescription>

        <div className="space-y-3 mt-2">
          {importOptions.map((option) => (
            <div key={option.id} className="space-y-1">
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-3 px-4"
                disabled={isImporting}
                onClick={() => handleFileSelect(option.id)}
              >
                <div className="flex items-center gap-3 w-full">
                  <span className={option.color}>{option.icon}</span>
                  <div className="text-left flex-1">
                    <div className="font-medium">{option.title}</div>
                    <div className="text-xs text-muted-foreground">{option.description}</div>
                  </div>
                  {isImporting && importType === option.id && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                </div>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="ml-8 h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  if (option.id === 'trades') downloadTradeTemplate();
                  else if (option.id === 'plan') downloadPlanTemplate();
                }}
              >
                <Download className="h-3 w-3 mr-1" />
                Download CSV template
              </Button>
            </div>
          ))}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />
      </DialogContent>
    </Dialog>
  );
}
