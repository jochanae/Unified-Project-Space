import { supabase } from "@/integrations/supabase/client";

export interface VoiceCommandResult {
  success: boolean;
  action?: string;
  target?: string;
  type?: string;
  amount?: number;
  description?: string;
  category?: string;
  merchant?: string;
  date?: string;
  recurring?: boolean;
  response?: string;
  confidence?: number;
  needsClarification?: boolean;
  clarificationQuestion?: string;
  bloomBurstId?: string | number;
  isBloomBurstTransaction?: boolean;
}

interface CommandContext {
  currentPath: string;
  userPreferences?: any;
  previousCommands?: string[];
  currentDate?: Date;
}

// Command patterns for different actions
const COMMAND_PATTERNS = {
  navigation: [
    { pattern: /go to (.+)/i, extract: (match: RegExpMatchArray) => ({ target: match[1] }) },
    { pattern: /show me (.+)/i, extract: (match: RegExpMatchArray) => ({ target: match[1] }) },
    { pattern: /open (.+)/i, extract: (match: RegExpMatchArray) => ({ target: match[1] }) },
    { pattern: /navigate to (.+)/i, extract: (match: RegExpMatchArray) => ({ target: match[1] }) },
    { pattern: /take me to (.+)/i, extract: (match: RegExpMatchArray) => ({ target: match[1] }) },
  ],
  transaction: [
    { pattern: /(?:add|record|log) (?:\$)?(\d+(?:\.\d{2})?) (?:expense|spent) (?:for|on) (.+)/i, 
      extract: (match: RegExpMatchArray) => ({ amount: parseFloat(match[1]), description: match[2], type: 'expense' }) },
    { pattern: /(?:i|I) (?:spent|paid) (?:\$)?(\d+(?:\.\d{2})?) (?:for|on|at) (.+)/i,
      extract: (match: RegExpMatchArray) => ({ amount: parseFloat(match[1]), description: match[2], type: 'expense' }) },
    { pattern: /(?:add|record|log) (?:\$)?(\d+(?:\.\d{2})?) (?:income|received) (?:from|for) (.+)/i,
      extract: (match: RegExpMatchArray) => ({ amount: parseFloat(match[1]), description: match[2], type: 'income' }) },
    { pattern: /(?:i|I) (?:received|earned|got) (?:\$)?(\d+(?:\.\d{2})?) (?:from|for) (.+)/i,
      extract: (match: RegExpMatchArray) => ({ amount: parseFloat(match[1]), description: match[2], type: 'income' }) },
    { pattern: /transfer (?:\$)?(\d+(?:\.\d{2})?) (?:to|from) (.+)/i,
      extract: (match: RegExpMatchArray) => ({ amount: parseFloat(match[1]), description: match[2], type: 'transfer' }) },
  ],
  query: [
    { pattern: /what(?:'s| is) my (.+)/i, extract: (match: RegExpMatchArray) => ({ query: match[1] }) },
    { pattern: /how much (.+)/i, extract: (match: RegExpMatchArray) => ({ query: match[1] }) },
    { pattern: /show (?:me )?my (.+)/i, extract: (match: RegExpMatchArray) => ({ query: match[1] }) },
    { pattern: /(?:tell|give) me (?:about )?my (.+)/i, extract: (match: RegExpMatchArray) => ({ query: match[1] }) },
  ],
  budget: [
    { pattern: /set (?:a )?budget (?:of )?(?:\$)?(\d+(?:\.\d{2})?) (?:for|on) (.+)/i,
      extract: (match: RegExpMatchArray) => ({ amount: parseFloat(match[1]), category: match[2] }) },
    { pattern: /create (?:a )?budget (?:of )?(?:\$)?(\d+(?:\.\d{2})?) (?:for|on) (.+)/i,
      extract: (match: RegExpMatchArray) => ({ amount: parseFloat(match[1]), category: match[2] }) },
  ],
  bill: [
    { pattern: /pay (?:my|the) (.+) bill/i, extract: (match: RegExpMatchArray) => ({ bill: match[1] }) },
    { pattern: /mark (.+) (?:bill )?(?:as )?paid/i, extract: (match: RegExpMatchArray) => ({ bill: match[1] }) },
    { pattern: /schedule payment (?:for|of) (.+)/i, extract: (match: RegExpMatchArray) => ({ bill: match[1] }) },
  ],
  savings: [
    { pattern: /create (?:a )?(?:savings )?goal (?:for|of) (.+)/i, 
      extract: (match: RegExpMatchArray) => ({ goal: match[1], amount: undefined as number | undefined }) },
    { pattern: /save (?:\$)?(\d+(?:\.\d{2})?) (?:for|towards) (.+)/i,
      extract: (match: RegExpMatchArray) => ({ amount: parseFloat(match[1]) as number | undefined, goal: match[2] }) },
  ],
  bloomBurst: [
    { pattern: /(?:add|log|record) (?:\$)?(\d+(?:\.\d{2})?) (?:to|for) (?:bloom burst|bloomburst) (.+)/i,
      extract: (match: RegExpMatchArray) => ({ amount: parseFloat(match[1]), description: match[2], isBloomBurstTransaction: true }) },
    { pattern: /(?:i )?(?:spent|paid) (?:\$)?(\d+(?:\.\d{2})?) (?:in|during) (?:bloom burst|bloomburst) (?:for|on|at) (.+)/i,
      extract: (match: RegExpMatchArray) => ({ amount: parseFloat(match[1]), description: match[2], isBloomBurstTransaction: true }) },
    { pattern: /(?:bloom burst|bloomburst) (?:expense|transaction) (?:\$)?(\d+(?:\.\d{2})?) (?:for|on) (.+)/i,
      extract: (match: RegExpMatchArray) => ({ amount: parseFloat(match[1]), description: match[2], isBloomBurstTransaction: true }) },
  ],
};

// Category keywords for smart categorization
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Food & Dining": ["coffee", "lunch", "dinner", "breakfast", "restaurant", "food", "groceries", "snack", "meal", "eat", "pizza", "burger", "sandwich"],
  "Transportation": ["gas", "uber", "lyft", "taxi", "parking", "transit", "bus", "train", "subway", "fuel", "car"],
  "Shopping": ["amazon", "clothes", "shoes", "shopping", "store", "mall", "purchase", "buy", "online"],
  "Entertainment": ["movie", "netflix", "spotify", "game", "concert", "show", "ticket", "music", "streaming"],
  "Bills & Utilities": ["rent", "utilities", "electric", "water", "internet", "phone", "cable", "insurance", "mortgage"],
  "Healthcare": ["doctor", "pharmacy", "medicine", "hospital", "dentist", "health", "medical", "prescription"],
  "Education": ["course", "book", "school", "tuition", "class", "education", "learning", "training"],
  "Travel": ["flight", "hotel", "vacation", "trip", "airbnb", "booking", "travel"],
  "Personal Care": ["haircut", "salon", "spa", "gym", "fitness", "beauty", "wellness"],
  "Gifts & Donations": ["gift", "donation", "charity", "present", "birthday"],
  "Business": ["office", "supplies", "client", "meeting", "business", "work"],
  "Other": [],
};

/**
 * Process voice commands using pattern matching and AI
 */
export async function processVoiceCommand(
  command: string, 
  context: CommandContext
): Promise<VoiceCommandResult> {
  const lowerCommand = command.toLowerCase().trim();
  
  // First, try pattern matching for common commands
  const patternResult = processWithPatterns(lowerCommand);
  if (patternResult) {
    // Navigation is handled client-side - return immediately
    if (patternResult.action === 'navigate') {
      return patternResult;
    }
    
    // Enhance transaction with AI if needed
    if (patternResult.action === 'transaction') {
      return await enhanceTransactionWithAI(patternResult, command);
    }
    
    // Query is handled client-side with edge function data fetch
    if (patternResult.action === 'query') {
      try {
        const { data, error } = await supabase.functions.invoke('voice-command', {
          body: {
            command: command,
            intent: 'query',
            parameters: patternResult
          }
        });
        
        if (error) {
          console.error("Query error:", error);
          return patternResult;
        }
        
        return {
          ...patternResult,
          success: data?.success ?? true,
          response: data?.response || patternResult.response,
        };
      } catch (error) {
        console.error("Query processing error:", error);
        return patternResult;
      }
    }
    
    // Send other actions to server for processing
    if (patternResult.action) {
      try {
        const { data, error } = await supabase.functions.invoke('voice-command', {
          body: {
            command: command,
            intent: patternResult.action,
            parameters: patternResult
          }
        });
        
        if (error) {
          console.error("Voice command error:", error);
          return patternResult;
        }
        
        return {
          ...patternResult,
          success: data?.success ?? true,
          response: data?.response || patternResult.response,
        };
      } catch (error) {
        console.error("Server processing error:", error);
      }
    }
    return patternResult;
  }
  
  // If no pattern matches, use AI to understand the command
  try {
    const aiResult = await processWithAI(command, context);
    return aiResult;
  } catch (error) {
    console.error("AI processing error:", error);
    
    // Fallback response
    return {
      success: false,
      response: "I didn't understand that command. Try saying something like 'Add $50 expense for groceries' or 'Show me my budget'.",
      needsClarification: true,
      clarificationQuestion: "What would you like me to help you with?",
    };
  }
}

/**
 * Process command using pattern matching
 */
function processWithPatterns(command: string): VoiceCommandResult | null {
  // Check navigation patterns
  for (const pattern of COMMAND_PATTERNS.navigation) {
    const match = command.match(pattern.pattern);
    if (match) {
      const extracted = pattern.extract(match);
      return {
        success: true,
        action: 'navigate',
        target: normalizeNavigationTarget(extracted.target),
        response: `Navigating to ${extracted.target}`,
      };
    }
  }
  
  // Check transaction patterns
  for (const pattern of COMMAND_PATTERNS.transaction) {
    const match = command.match(pattern.pattern);
    if (match) {
      const extracted = pattern.extract(match);
      const category = detectCategory(extracted.description || '');
      return {
        success: true,
        action: 'transaction',
        type: extracted.type,
        amount: extracted.amount,
        description: extracted.description,
        category,
        date: new Date().toISOString().split('T')[0],
      };
    }
  }
  
  // Check query patterns
  for (const pattern of COMMAND_PATTERNS.query) {
    const match = command.match(pattern.pattern);
    if (match) {
      const extracted = pattern.extract(match);
      return processQuery(extracted.query);
    }
  }
  
  // Check budget patterns
  for (const pattern of COMMAND_PATTERNS.budget) {
    const match = command.match(pattern.pattern);
    if (match) {
      const extracted = pattern.extract(match);
      return {
        success: true,
        action: 'budget',
        amount: extracted.amount,
        category: extracted.category,
        response: `Setting a budget of $${extracted.amount} for ${extracted.category}`,
      };
    }
  }
  
  // Check bill patterns
  for (const pattern of COMMAND_PATTERNS.bill) {
    const match = command.match(pattern.pattern);
    if (match) {
      const extracted = pattern.extract(match);
      return {
        success: true,
        action: 'bill',
        target: extracted.bill,
        response: `Processing payment for ${extracted.bill} bill`,
      };
    }
  }
  
  // Check savings patterns
  for (const pattern of COMMAND_PATTERNS.savings) {
    const match = command.match(pattern.pattern);
    if (match) {
      const extracted = pattern.extract(match);
      return {
        success: true,
        action: 'savings',
        amount: extracted.amount,
        description: extracted.goal,
        response: extracted.amount 
          ? `Adding $${extracted.amount} to ${extracted.goal} savings goal`
          : `Creating savings goal for ${extracted.goal}`,
      };
    }
  }
  
  // Check Bloom Burst patterns
  for (const pattern of COMMAND_PATTERNS.bloomBurst) {
    const match = command.match(pattern.pattern);
    if (match) {
      const extracted = pattern.extract(match);
      const category = detectCategory(extracted.description || '');
      return {
        success: true,
        action: 'transaction',
        type: 'expense',
        amount: extracted.amount,
        description: extracted.description,
        category,
        isBloomBurstTransaction: true,
        date: new Date().toISOString().split('T')[0],
        response: `Adding $${extracted.amount} expense to active Bloom Burst: ${extracted.description}`,
      };
    }
  }
  
  return null;
}

/**
 * Process command using OpenAI API
 */
async function processWithAI(command: string, context: CommandContext): Promise<VoiceCommandResult> {
  try {
    // Use the voice-command edge function
    const { data: response, error } = await supabase.functions.invoke('voice-command', {
      body: {
        command,
        intent: 'unknown',
        parameters: {
          query: command,
          currentPath: context.currentPath,
          timestamp: new Date().toISOString(),
        },
      },
    });
    
    if (error) throw error;
    
    // Parse the AI response
    if (response.intent) {
      switch (response.intent) {
        case 'transaction':
          return {
            success: true,
            action: 'transaction',
            type: response.transactionType || 'expense',
            amount: response.amount,
            description: response.description,
            category: response.category || detectCategory(response.description || ''),
            merchant: response.merchant,
            date: response.date || new Date().toISOString().split('T')[0],
            recurring: response.recurring || false,
            response: response.message || `Adding ${response.transactionType}: $${response.amount}`,
          };
          
        case 'navigation':
          return {
            success: true,
            action: 'navigate',
            target: response.target,
            response: response.message || `Navigating to ${response.target}`,
          };
          
        case 'query':
          return {
            success: true,
            action: 'query',
            response: response.answer || response.message,
          };
          
        case 'budget':
          return {
            success: true,
            action: 'budget',
            amount: response.amount,
            category: response.category,
            response: response.message || `Setting budget: $${response.amount} for ${response.category}`,
          };
          
        case 'clarification':
          return {
            success: false,
            needsClarification: true,
            clarificationQuestion: response.question,
            response: response.message,
          };
          
        default:
          return {
            success: true,
            action: response.intent,
            response: response.message,
          };
      }
    }
    
    return {
      success: false,
      response: "I couldn't process that command. Please try again.",
    };
    
  } catch (error) {
    console.error("AI API error:", error);
    
    // Fallback to pattern matching or basic processing
    return {
      success: false,
      response: "I'm having trouble understanding. Please try rephrasing your command.",
      needsClarification: true,
    };
  }
}

/**
 * Enhance transaction with AI categorization and save to database
 */
async function enhanceTransactionWithAI(
  transaction: VoiceCommandResult, 
  originalCommand: string
): Promise<VoiceCommandResult> {
  try {
    // Call the edge function to save the transaction
    const { data, error } = await supabase.functions.invoke('voice-command', {
      body: {
        command: originalCommand,
        intent: 'transaction',
        parameters: {
          amount: transaction.amount,
          type: transaction.type || 'expense',
          category: transaction.category,
          description: transaction.description || transaction.response,
          merchant: transaction.merchant,
          date: transaction.date,
          recurring: transaction.recurring,
          isBloomBurstTransaction: transaction.isBloomBurstTransaction,
        }
      }
    });
    
    if (error) {
      console.error("Transaction save error:", error);
      return {
        ...transaction,
        success: false,
        response: "Failed to save transaction. Please try again.",
      };
    }
    
    return {
      ...transaction,
      success: data?.success ?? true,
      response: data?.response || transaction.response,
    };
  } catch (error) {
    console.error("Transaction processing error:", error);
    return {
      ...transaction,
      success: false,
      response: "Error saving transaction. Please try again.",
    };
  }
}

/**
 * Process query commands
 */
function processQuery(query: string): VoiceCommandResult {
  const lowerQuery = query.toLowerCase();
  
  // Common queries
  if (lowerQuery.includes('net worth') || lowerQuery.includes('networth')) {
    return {
      success: true,
      action: 'query',
      response: "Checking your net worth...",
    };
  }
  
  if (lowerQuery.includes('spending') || lowerQuery.includes('spent')) {
    const period = extractTimePeriod(lowerQuery);
    return {
      success: true,
      action: 'query',
      response: `Calculating your spending for ${period}...`,
    };
  }
  
  if (lowerQuery.includes('budget')) {
    return {
      success: true,
      action: 'query',
      response: "Checking your budget status...",
    };
  }
  
  if (lowerQuery.includes('credit score')) {
    return {
      success: true,
      action: 'query',
      response: "Retrieving your credit score...",
    };
  }
  
  if (lowerQuery.includes('savings') || lowerQuery.includes('saved')) {
    return {
      success: true,
      action: 'query',
      response: "Checking your savings...",
    };
  }
  
  if (lowerQuery.includes('bills')) {
    return {
      success: true,
      action: 'query',
      response: "Checking your upcoming bills...",
    };
  }
  
  return {
    success: true,
    action: 'query',
    response: `Looking up information about ${query}...`,
  };
}

/**
 * Detect category based on description keywords
 */
function detectCategory(description: string): string {
  const lowerDesc = description.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => lowerDesc.includes(keyword))) {
      return category;
    }
  }
  
  return "Other";
}

/**
 * Normalize navigation targets to route paths
 */
function normalizeNavigationTarget(target: string): string {
  const lowerTarget = target.toLowerCase().trim();
  
  const routeMap: Record<string, string> = {
    'dashboard': '/dashboard',
    'home': '/dashboard',
    'transactions': '/transactions',
    'transaction': '/transactions',
    'money': '/transactions',
    'budget': '/budgets',
    'budgets': '/budgets',
    'budgeting': '/budgets',
    'bloom burst': '/budgets',
    'bloom bursts': '/budgets',
    'bloomburst': '/budgets',
    'bills': '/bills',
    'bill': '/bills',
    'savings': '/goals',
    'savings goals': '/goals',
    'goals': '/goals',
    'accounts': '/accounts',
    'account': '/accounts',
    'reports': '/reports',
    'analytics': '/reports',
    'settings': '/settings',
    'profile': '/settings',
    'inbox': '/inbox',
    'messages': '/inbox',
    'notifications': '/inbox',
    'credit score': '/credit',
    'credit': '/credit',
    'investments': '/investments',
    'investment': '/investments',
    'tax': '/tax',
    'taxes': '/tax',
    'family': '/household',
    'household': '/household',
    'kids': '/kids',
    'education': '/money-academy',
    'academy': '/money-academy',
    'money academy': '/money-academy',
    'learn': '/money-academy',
    'learning': '/money-academy',
    'debts': '/debts',
    'debt': '/debts',
    'professionals': '/professionals',
    'help center': '/help-center',
    'help': '/help-center',
    'advanced': '/advanced-tools',
    'advanced tools': '/advanced-tools',
    'vision board': '/vision-board',
    'vision': '/vision-board',
    'hub': '/hub',
    'feature hub': '/hub',
    'tools': '/tools',
    'calculator': '/tools/calculator',
    'notepad': '/tools/notepad',
  };
  
  // Check for exact matches
  if (routeMap[lowerTarget]) {
    return routeMap[lowerTarget];
  }
  
  // Check for partial matches
  for (const [key, route] of Object.entries(routeMap)) {
    if (lowerTarget.includes(key)) {
      return route;
    }
  }
  
  // Default to search
  return `/search?q=${encodeURIComponent(target)}`;
}

/**
 * Extract time period from query
 */
function extractTimePeriod(query: string): string {
  if (query.includes('today')) return 'today';
  if (query.includes('yesterday')) return 'yesterday';
  if (query.includes('this week')) return 'this week';
  if (query.includes('last week')) return 'last week';
  if (query.includes('this month')) return 'this month';
  if (query.includes('last month')) return 'last month';
  if (query.includes('this year')) return 'this year';
  if (query.includes('last year')) return 'last year';
  
  // Default
  return 'this month';
}

/**
 * Format amount for display
 */
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Parse amount from various formats
 */
export function parseAmount(text: string): number | null {
  // Remove currency symbols and spaces
  const cleanText = text.replace(/[$,\s]/g, '');
  
  // Try to parse as float
  const amount = parseFloat(cleanText);
  
  return isNaN(amount) ? null : amount;
}