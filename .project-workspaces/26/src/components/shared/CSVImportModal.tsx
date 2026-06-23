import { useState, useRef, useCallback } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  X,
  Loader2,
  Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  IMPORT_CONFIGS,
  parseCSV,
  getColumnSamples,
  autoDetectMappings,
  transformRows,
  validateRecord,
  checkDuplicate,
  type CSVColumn,
  type FieldMapping,
  type ImportConfig,
} from "@/lib/csvImport";

interface CSVImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importType: "transactions" | "accounts" | "debts" | "bills";
  existingRecords?: Record<string, any>[];
  onSuccess?: () => void;
}

type Step = "upload" | "mapping" | "preview" | "importing" | "complete";

export function CSVImportModal({
  open,
  onOpenChange,
  importType,
  existingRecords = [],
  onSuccess,
}: CSVImportModalProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const config = IMPORT_CONFIGS[importType];

  const [step, setStep] = useState<Step>("upload");
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [columns, setColumns] = useState<CSVColumn[]>([]);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [previewData, setPreviewData] = useState<Record<string, any>[]>([]);
  const [validationResults, setValidationResults] = useState<{ valid: boolean; errors: string[] }[]>([]);
  const [duplicates, setDuplicates] = useState<boolean[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState({ success: 0, failed: 0, skipped: 0 });

  const resetState = () => {
    setStep("upload");
    setCsvData(null);
    setColumns([]);
    setMappings([]);
    setPreviewData([]);
    setValidationResults([]);
    setDuplicates([]);
    setImportProgress(0);
    setImportResults({ success: 0, failed: 0, skipped: 0 });
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please select a CSV file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);

      if (parsed.headers.length === 0) {
        toast.error("Could not parse CSV file");
        return;
      }

      setCsvData(parsed);
      setColumns(getColumnSamples(parsed.headers, parsed.rows));
      setMappings(autoDetectMappings(parsed.headers, config));
      setStep("mapping");
    };
    reader.readAsText(file);

    // Reset input
    e.target.value = "";
  }, [config]);

  const handleMappingChange = (dbField: string, csvColumn: string) => {
    setMappings(prev =>
      prev.map(m => (m.dbField === dbField ? { ...m, csvColumn } : m))
    );
  };

  const handlePreview = () => {
    if (!csvData) return;

    const transformed = transformRows(csvData.rows, csvData.headers, mappings, config);
    const validations = transformed.map(record => validateRecord(record, config));
    const duplicateChecks = config.duplicateCheckFields
      ? transformed.map(record => checkDuplicate(record, existingRecords, config.duplicateCheckFields!))
      : transformed.map(() => false);

    setPreviewData(transformed);
    setValidationResults(validations);
    setDuplicates(duplicateChecks);
    setStep("preview");
  };

  const handleImport = async () => {
    if (!user) return;

    setStep("importing");
    let success = 0;
    let failed = 0;
    let skipped = 0;

    const recordsToImport = previewData.filter((_, idx) => 
      validationResults[idx].valid && !duplicates[idx]
    );

    for (let i = 0; i < recordsToImport.length; i++) {
      const record = recordsToImport[i];
      
      try {
        const { error } = await supabase
          .from(config.tableName as any)
          .insert({
            ...record,
            user_id: user.id,
            is_manual: importType === "accounts" ? true : undefined,
            status: importType === "debts" ? "active" : importType === "bills" ? "pending" : undefined,
          });

        if (error) {
          console.error("Insert error:", error);
          failed++;
        } else {
          success++;
        }
      } catch (err) {
        console.error("Import error:", err);
        failed++;
      }

      setImportProgress(((i + 1) / recordsToImport.length) * 100);
    }

    skipped = previewData.length - recordsToImport.length;
    setImportResults({ success, failed, skipped });
    setStep("complete");
  };

  const downloadTemplate = () => {
    // Row 1: Column headers
    const headers = config.fields.map(f => `"${f.label}"`).join(",");
    
    // Row 2: Instructions/hints for each column
    const hintsRow = config.fields.map(f => {
      const hint = f.hint || "";
      const reqText = f.required ? "(Required) " : "(Optional) ";
      return `"${reqText}${hint}"`;
    }).join(",");
    
    // Row 3: Example data
    const exampleRow = config.fields.map(f => {
      if (f.example) return `"${f.example}"`;
      switch (f.type) {
        case "number": return "0";
        case "date": return new Date().toISOString().split("T")[0];
        case "boolean": return "true";
        default: return `"Sample ${f.label}"`;
      }
    }).join(",");

    // Instructions at the top (commented format that won't interfere with parsing)
    const instructions = `"=== DELETE THIS ROW BEFORE IMPORTING ===",,,,,,
"Instructions: Row 2 shows what each column expects. Row 3 is example data. Delete rows 1-3 before importing your actual data.",,,,,,`;

    const csv = `${headers}\n${hintsRow}\n${exampleRow}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${importType}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = validationResults.filter(r => r.valid).length;
  const duplicateCount = duplicates.filter(Boolean).length;
  const importableCount = previewData.filter((_, idx) => 
    validationResults[idx]?.valid && !duplicates[idx]
  ).length;

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) resetState(); onOpenChange(o); }}>
      <DrawerContent className="max-h-[85vh] flex flex-col">
        <DrawerHeader className="border-b pb-4">
          <DrawerTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import {config.displayName}
          </DrawerTitle>
          <DrawerDescription>
            {step === "upload" && "Upload a CSV file to import data"}
            {step === "mapping" && "Map your CSV columns to database fields"}
            {step === "preview" && "Review and confirm your import"}
            {step === "importing" && "Importing your data..."}
            {step === "complete" && "Import complete"}
          </DrawerDescription>
        </DrawerHeader>

        <ScrollArea className="flex-1 p-4 min-h-0 overflow-y-auto">
          {/* Step 1: Upload */}
          {step === "upload" && (
            <div className="space-y-4">
              {/* Template download - prominent at top */}
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Need the right format?
                </h4>
                <p className="text-sm text-blue-600 dark:text-blue-300 mb-3">
                  Download our template with the correct column headers.
                </p>
                <Button variant="outline" size="sm" onClick={downloadTemplate} className="bg-white dark:bg-blue-900">
                  <Download className="h-4 w-4 mr-2" />
                  Download {config.displayName} Template
                </Button>
              </div>

              {/* Fields guide with hints */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-3">
                <h4 className="font-medium text-sm">Column Guide:</h4>
                <div className="space-y-2">
                  {config.fields.map(f => (
                    <div key={f.name} className="flex items-start gap-2">
                      <Badge variant={f.required ? "destructive" : "secondary"} className="text-xs shrink-0 mt-0.5">
                        {f.required ? "Required" : "Optional"}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm">{f.label}</span>
                        {f.hint && (
                          <p className="text-xs text-muted-foreground">{f.hint}</p>
                        )}
                        {f.example && (
                          <p className="text-xs text-muted-foreground italic">Example: {f.example}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upload area */}
              <div
                className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium">Click to upload CSV file</p>
                <p className="text-sm text-muted-foreground mt-1">
                  or drag and drop
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          )}

          {/* Step 2: Mapping */}
          {step === "mapping" && csvData && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">
                  Found {csvData.rows.length} rows and {csvData.headers.length} columns
                </span>
              </div>

              <div className="space-y-3">
                {mappings.map((mapping) => {
                  const field = config.fields.find(f => f.name === mapping.dbField);
                  const column = columns.find(c => c.header === mapping.csvColumn);

                  return (
                    <div key={mapping.dbField} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Label className="font-medium">{field?.label}</Label>
                          {mapping.required && (
                            <Badge variant="destructive" className="text-xs">Required</Badge>
                          )}
                        </div>
                        {column && column.sample.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Sample: {column.sample.slice(0, 2).join(", ")}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <Select
                        value={mapping.csvColumn}
                        onValueChange={(v) => handleMappingChange(mapping.dbField, v)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__skip__">
                            <span className="text-muted-foreground">— Skip —</span>
                          </SelectItem>
                          {csvData.headers.map(header => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === "preview" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{validCount}</p>
                  <p className="text-xs text-muted-foreground">Valid</p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-yellow-600">{duplicateCount}</p>
                  <p className="text-xs text-muted-foreground">Duplicates</p>
                </div>
                <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-red-600">{previewData.length - validCount}</p>
                  <p className="text-xs text-muted-foreground">Errors</p>
                </div>
              </div>

              <div className="bg-primary/10 rounded-lg p-3 text-center">
                <p className="text-lg font-semibold">{importableCount} records will be imported</p>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {previewData.slice(0, 10).map((record, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      !validationResults[idx]?.valid
                        ? "border-red-200 bg-red-50 dark:bg-red-950/20"
                        : duplicates[idx]
                        ? "border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20"
                        : "border-green-200 bg-green-50 dark:bg-green-950/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {record.name || record.description || `Record ${idx + 1}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {record.amount !== undefined && `$${record.amount}`}
                          {record.balance !== undefined && `$${record.balance}`}
                          {record.current_balance !== undefined && `$${record.current_balance}`}
                        </p>
                      </div>
                      {!validationResults[idx]?.valid && (
                        <Badge variant="destructive" className="flex-shrink-0">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Error
                        </Badge>
                      )}
                      {duplicates[idx] && validationResults[idx]?.valid && (
                        <Badge variant="secondary" className="flex-shrink-0 bg-yellow-100 text-yellow-800">
                          Duplicate
                        </Badge>
                      )}
                      {validationResults[idx]?.valid && !duplicates[idx] && (
                        <Badge variant="secondary" className="flex-shrink-0 bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Ready
                        </Badge>
                      )}
                    </div>
                    {validationResults[idx]?.errors?.length > 0 && (
                      <p className="text-xs text-red-600 mt-1">
                        {validationResults[idx].errors.join(", ")}
                      </p>
                    )}
                  </div>
                ))}
                {previewData.length > 10 && (
                  <p className="text-center text-sm text-muted-foreground py-2">
                    ...and {previewData.length - 10} more records
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Importing */}
          {step === "importing" && (
            <div className="py-8 space-y-6">
              <div className="flex justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              <Progress value={importProgress} className="w-full" />
              <p className="text-center text-muted-foreground">
                Importing... {Math.round(importProgress)}%
              </p>
            </div>
          )}

          {/* Step 5: Complete */}
          {step === "complete" && (
            <div className="py-8 space-y-6">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>

              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Import Complete!</h3>
                <p className="text-muted-foreground">
                  Your data has been imported successfully.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{importResults.success}</p>
                  <p className="text-xs text-muted-foreground">Imported</p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-yellow-600">{importResults.skipped}</p>
                  <p className="text-xs text-muted-foreground">Skipped</p>
                </div>
                <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-red-600">{importResults.failed}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Footer Actions */}
        <div className="border-t p-4 flex gap-3">
          {step === "upload" && (
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}

          {step === "mapping" && (
            <>
              <Button variant="outline" className="flex-1" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button className="flex-1" onClick={handlePreview}>
                Preview Import
              </Button>
            </>
          )}

          {step === "preview" && (
            <>
              <Button variant="outline" className="flex-1" onClick={() => setStep("mapping")}>
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={handleImport}
                disabled={importableCount === 0}
              >
                Import {importableCount} Records
              </Button>
            </>
          )}

          {step === "complete" && (
            <Button
              className="flex-1"
              onClick={() => {
                onSuccess?.();
                onOpenChange(false);
              }}
            >
              Done
            </Button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
