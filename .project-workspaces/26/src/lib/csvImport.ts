import { z } from "zod";

export interface CSVColumn {
  header: string;
  sample: string[];
}

export interface FieldMapping {
  csvColumn: string;
  dbField: string;
  required: boolean;
}

export interface ImportConfig {
  tableName: string;
  displayName: string;
  fields: {
    name: string;
    label: string;
    required: boolean;
    type: "string" | "number" | "date" | "boolean";
    defaultValue?: any;
    hint?: string;
    example?: string;
  }[];
  duplicateCheckFields?: string[];
}

// Configuration for each importable entity
export const IMPORT_CONFIGS: Record<string, ImportConfig> = {
  transactions: {
    tableName: "transactions",
    displayName: "Transactions",
    fields: [
      { name: "description", label: "Description", required: true, type: "string", hint: "What the transaction was for (e.g., Grocery shopping)", example: "Walmart groceries" },
      { name: "amount", label: "Amount", required: true, type: "number", hint: "Dollar amount without $ sign", example: "125.50" },
      { name: "type", label: "Type", required: true, type: "string", hint: "Must be 'income' or 'expense'", example: "expense" },
      { name: "category", label: "Category", required: false, type: "string", defaultValue: "other", hint: "e.g., groceries, utilities, salary", example: "groceries" },
      { name: "transaction_date", label: "Date", required: true, type: "date", hint: "Format: YYYY-MM-DD or MM/DD/YYYY", example: "2024-12-20" },
      { name: "notes", label: "Notes", required: false, type: "string", hint: "Any additional notes", example: "Weekly grocery run" },
    ],
    duplicateCheckFields: ["description", "amount", "transaction_date"],
  },
  accounts: {
    tableName: "accounts",
    displayName: "Accounts",
    fields: [
      { name: "name", label: "Account Name", required: true, type: "string", hint: "Name for this account", example: "Main Checking" },
      { name: "institution", label: "Institution", required: false, type: "string", hint: "Bank or company name", example: "Chase Bank" },
      { name: "account_type", label: "Account Type", required: true, type: "string", defaultValue: "checking", hint: "cash, checking, savings, credit, or investment", example: "checking" },
      { name: "category", label: "Category", required: true, type: "string", defaultValue: "asset", hint: "Must be 'asset' or 'liability'", example: "asset" },
      { name: "balance", label: "Balance", required: true, type: "number", defaultValue: 0, hint: "Current balance without $ sign", example: "5000.00" },
      { name: "account_number_masked", label: "Last 4 Digits", required: false, type: "string", hint: "Last 4 digits of account number", example: "4321" },
    ],
    duplicateCheckFields: ["name", "institution"],
  },
  debts: {
    tableName: "debts",
    displayName: "Debts",
    fields: [
      { name: "name", label: "Debt Name", required: true, type: "string", hint: "Name for this debt", example: "Chase Visa" },
      { name: "creditor", label: "Creditor", required: false, type: "string", hint: "Who you owe", example: "Chase Bank" },
      { name: "debt_type", label: "Debt Type", required: true, type: "string", defaultValue: "credit_card", hint: "credit_card, loan, mortgage, medical, or other", example: "credit_card" },
      { name: "current_balance", label: "Current Balance", required: true, type: "number", hint: "Amount currently owed without $ sign", example: "2500.00" },
      { name: "original_balance", label: "Original Balance", required: false, type: "number", hint: "Original loan/debt amount", example: "5000.00" },
      { name: "interest_rate", label: "Interest Rate (%)", required: false, type: "number", defaultValue: 0, hint: "Annual rate as number (e.g., 19.99)", example: "19.99" },
      { name: "minimum_payment", label: "Minimum Payment", required: false, type: "number", defaultValue: 0, hint: "Minimum monthly payment", example: "75.00" },
      { name: "due_day", label: "Due Day", required: false, type: "number", hint: "Day of month payment is due (1-31)", example: "15" },
    ],
    duplicateCheckFields: ["name", "creditor"],
  },
  bills: {
    tableName: "bills",
    displayName: "Bills",
    fields: [
      { name: "name", label: "Bill Name", required: true, type: "string", hint: "Name of the bill", example: "Electric Bill" },
      { name: "amount", label: "Amount", required: true, type: "number", hint: "Bill amount without $ sign", example: "150.00" },
      { name: "due_date", label: "Due Date", required: true, type: "date", hint: "Format: YYYY-MM-DD or MM/DD/YYYY", example: "2024-12-25" },
      { name: "category", label: "Category", required: false, type: "string", defaultValue: "utilities", hint: "utilities, rent, insurance, subscription, etc.", example: "utilities" },
      { name: "frequency", label: "Frequency", required: false, type: "string", defaultValue: "monthly", hint: "monthly, weekly, biweekly, quarterly, yearly", example: "monthly" },
      { name: "is_recurring", label: "Is Recurring", required: false, type: "boolean", defaultValue: true, hint: "true or false", example: "true" },
      { name: "notes", label: "Notes", required: false, type: "string", hint: "Any additional notes", example: "Auto-pay enabled" },
    ],
    duplicateCheckFields: ["name", "amount"],
  },
};

// Parse CSV text into structured data
export const parseCSV = (csvText: string): { headers: string[]; rows: string[][] } => {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 1) return { headers: [], rows: [] };

  // Handle quoted values with commas inside
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ""));
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^"|"$/g, ""));
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine).filter(row => row.some(cell => cell.trim()));

  return { headers, rows };
};

// Get sample values for each column
export const getColumnSamples = (headers: string[], rows: string[][]): CSVColumn[] => {
  return headers.map((header, idx) => ({
    header,
    sample: rows.slice(0, 3).map(row => row[idx] || "").filter(Boolean),
  }));
};

// Validate and transform a single value based on field type
export const transformValue = (
  value: string,
  type: "string" | "number" | "date" | "boolean",
  defaultValue?: any
): any => {
  const trimmed = value?.trim() || "";
  
  if (!trimmed && defaultValue !== undefined) {
    return defaultValue;
  }

  switch (type) {
    case "number":
      const num = parseFloat(trimmed.replace(/[$,]/g, ""));
      return isNaN(num) ? (defaultValue ?? 0) : num;
    
    case "date":
      if (!trimmed) return defaultValue ?? new Date().toISOString().split("T")[0];
      // Try multiple date formats
      const datePatterns = [
        /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
        /^(\d{2})\/(\d{2})\/(\d{4})$/, // MM/DD/YYYY
        /^(\d{2})-(\d{2})-(\d{4})$/, // MM-DD-YYYY
      ];
      for (const pattern of datePatterns) {
        const match = trimmed.match(pattern);
        if (match) {
          if (pattern === datePatterns[0]) {
            return trimmed;
          }
          return `${match[3]}-${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}`;
        }
      }
      // Try parsing as date
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split("T")[0];
      }
      return defaultValue ?? new Date().toISOString().split("T")[0];
    
    case "boolean":
      const lower = trimmed.toLowerCase();
      return ["true", "yes", "1", "y"].includes(lower);
    
    default:
      return trimmed || defaultValue || "";
  }
};

// Transform rows based on field mappings
export const transformRows = (
  rows: string[][],
  headers: string[],
  mappings: FieldMapping[],
  config: ImportConfig
): Record<string, any>[] => {
  return rows.map(row => {
    const record: Record<string, any> = {};
    
    mappings.forEach(mapping => {
      if (!mapping.csvColumn || mapping.csvColumn === "__skip__") return;
      
      const csvIndex = headers.indexOf(mapping.csvColumn);
      const fieldConfig = config.fields.find(f => f.name === mapping.dbField);
      
      if (csvIndex !== -1 && fieldConfig) {
        record[mapping.dbField] = transformValue(
          row[csvIndex],
          fieldConfig.type,
          fieldConfig.defaultValue
        );
      }
    });

    // Add default values for unmapped required fields
    config.fields.forEach(field => {
      if (!(field.name in record) && field.defaultValue !== undefined) {
        record[field.name] = field.defaultValue;
      }
    });

    return record;
  });
};

// Validate a record against the config
export const validateRecord = (
  record: Record<string, any>,
  config: ImportConfig
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  config.fields.forEach(field => {
    if (field.required) {
      const value = record[field.name];
      if (value === undefined || value === null || value === "") {
        errors.push(`${field.label} is required`);
      }
    }

    // Type-specific validation
    if (field.type === "number" && record[field.name] !== undefined) {
      if (typeof record[field.name] !== "number" || isNaN(record[field.name])) {
        errors.push(`${field.label} must be a valid number`);
      }
    }
  });

  return { valid: errors.length === 0, errors };
};

// Check for duplicates
export const checkDuplicate = (
  record: Record<string, any>,
  existingRecords: Record<string, any>[],
  checkFields: string[]
): boolean => {
  return existingRecords.some(existing =>
    checkFields.every(field => {
      const newVal = String(record[field] || "").toLowerCase().trim();
      const existingVal = String(existing[field] || "").toLowerCase().trim();
      return newVal === existingVal;
    })
  );
};

// Auto-detect field mappings based on header names
export const autoDetectMappings = (
  headers: string[],
  config: ImportConfig
): FieldMapping[] => {
  const mappings: FieldMapping[] = [];
  
  config.fields.forEach(field => {
    const fieldNameLower = field.name.toLowerCase().replace(/_/g, "");
    const labelLower = field.label.toLowerCase().replace(/[^a-z0-9]/g, "");
    
    // Find best matching header with more flexible matching
    const matchedHeader = headers.find(header => {
      const headerLower = header.toLowerCase().replace(/[^a-z0-9]/g, "");
      return (
        headerLower === fieldNameLower ||
        headerLower === labelLower ||
        headerLower === field.name.toLowerCase() ||
        headerLower === field.label.toLowerCase() ||
        headerLower.includes(fieldNameLower) ||
        fieldNameLower.includes(headerLower) ||
        headerLower.includes(labelLower) ||
        labelLower.includes(headerLower)
      );
    });

    mappings.push({
      csvColumn: matchedHeader || "__skip__",
      dbField: field.name,
      required: field.required,
    });
  });

  return mappings;
};
