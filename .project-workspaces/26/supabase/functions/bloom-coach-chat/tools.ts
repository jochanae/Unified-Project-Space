// Tool definitions for Quinn AI Mentor
export const COACH_TOOLS = [
  {
    type: "function",
    function: {
      name: "add_bill",
      description: "Add a new bill for the user. Use this when the user asks to add, create, or set up a bill.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Name of the bill (e.g., 'Netflix', 'Electric Bill')" },
          amount: { type: "number", description: "Amount due for the bill" },
          due_date: { type: "string", description: "Due date in YYYY-MM-DD format" },
          category: { 
            type: "string", 
            enum: ["utilities", "subscriptions", "insurance", "rent", "loan", "credit_card", "phone", "internet", "other"],
            description: "Category of the bill" 
          },
          frequency: {
            type: "string",
            enum: ["one-time", "weekly", "biweekly", "monthly", "quarterly", "annually"],
            description: "How often this bill recurs. Default is monthly."
          },
          is_autopay: { type: "boolean", description: "Whether autopay is enabled for this bill" },
          autopay_source: { 
            type: "string", 
            enum: ["coinsbloom", "external_bank"],
            description: "Source of autopay. 'coinsbloom' for in-app autopay, 'external_bank' for user's own bank autopay setup." 
          },
          autopay_account_last_four: { type: "string", description: "Last 4 digits of the bank account used for external autopay (e.g., '9396')" },
          is_variable_amount: { type: "boolean", description: "Whether the bill amount varies each period" },
          notes: { type: "string", description: "Optional notes about the bill" }
        },
        required: ["name", "amount", "due_date"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_transaction",
      description: "Add a new transaction (expense or income) for the user.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Description of the transaction" },
          amount: { type: "number", description: "Amount of the transaction" },
          type: { type: "string", enum: ["expense", "income"], description: "Type of transaction" },
          category: { type: "string", description: "Category (e.g., 'Food & Groceries', 'Shopping', 'Salary')" },
          merchant: { type: "string", description: "Optional merchant name" },
          transaction_date: { type: "string", description: "Date in YYYY-MM-DD format. Defaults to today." },
          notes: { type: "string", description: "Optional notes" }
        },
        required: ["title", "amount", "type"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_budget",
      description: "Create a new budget for a spending category.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Name for the budget" },
          amount: { type: "number", description: "Monthly budget amount" },
          category: {
            type: "string",
            enum: ["food", "housing", "transportation", "utilities", "entertainment", "shopping", "healthcare", "education", "travel", "personal", "gifts", "insurance", "debt", "savings", "other"],
            description: "Budget category"
          }
        },
        required: ["name", "amount", "category"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_goal",
      description: "Create a new savings goal for the user.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Name of the savings goal" },
          target_amount: { type: "number", description: "Target amount to save" },
          current_amount: { type: "number", description: "Initial amount already saved (default 0)" },
          target_date: { type: "string", description: "Target date in YYYY-MM-DD format (optional)" },
          goal_type: { 
            type: "string", 
            enum: ["personal", "family", "emergency", "vacation", "house", "car", "education", "retirement", "other"],
            description: "Type of goal" 
          },
          notes: { type: "string", description: "Optional notes about the goal" }
        },
        required: ["title", "target_amount"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_debt",
      description: "Add a new debt to track (credit card, loan, etc.).",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Name of the debt (e.g., 'Chase Credit Card')" },
          current_balance: { type: "number", description: "Current balance owed" },
          original_balance: { type: "number", description: "Original balance when debt started (optional)" },
          interest_rate: { type: "number", description: "Annual interest rate as a percentage (e.g., 18.99)" },
          minimum_payment: { type: "number", description: "Minimum monthly payment" },
          debt_type: {
            type: "string",
            enum: ["credit_card", "personal_loan", "student_loan", "auto_loan", "mortgage", "medical", "other"],
            description: "Type of debt"
          },
          creditor: { type: "string", description: "Name of the creditor/lender" },
          due_day: { type: "number", description: "Day of month payment is due (1-31)" }
        },
        required: ["name", "current_balance", "minimum_payment"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_account",
      description: "Add a new financial account (bank account, investment, etc.).",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Account name (e.g., 'Chase Checking')" },
          balance: { type: "number", description: "Current balance" },
          account_type: {
            type: "string",
            enum: ["checking", "savings", "investment", "retirement", "credit", "loan", "other"],
            description: "Type of account"
          },
          category: {
            type: "string",
            enum: ["asset", "liability"],
            description: "Whether this is an asset or liability"
          },
          institution: { type: "string", description: "Bank or institution name" }
        },
        required: ["name", "balance", "account_type"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "mark_bill_paid",
      description: "Mark an existing bill as paid.",
      parameters: {
        type: "object",
        properties: {
          bill_name: { type: "string", description: "Name of the bill to mark as paid" },
          paid_date: { type: "string", description: "Date paid in YYYY-MM-DD format. Defaults to today." },
          amount: { type: "number", description: "Amount paid (optional, uses bill amount if not specified)" }
        },
        required: ["bill_name"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_to_goal",
      description: "Add money to an existing savings goal.",
      parameters: {
        type: "object",
        properties: {
          goal_name: { type: "string", description: "Name of the goal to add to" },
          amount: { type: "number", description: "Amount to add" },
          notes: { type: "string", description: "Optional notes about the contribution" }
        },
        required: ["goal_name", "amount"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "make_debt_payment",
      description: "Record a payment toward a debt.",
      parameters: {
        type: "object",
        properties: {
          debt_name: { type: "string", description: "Name of the debt to pay" },
          amount: { type: "number", description: "Payment amount" },
          payment_date: { type: "string", description: "Date of payment in YYYY-MM-DD format. Defaults to today." }
        },
        required: ["debt_name", "amount"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_account_balance",
      description: "Update the balance of an existing account.",
      parameters: {
        type: "object",
        properties: {
          account_name: { type: "string", description: "Name of the account to update" },
          new_balance: { type: "number", description: "New balance amount" }
        },
        required: ["account_name", "new_balance"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function", 
    function: {
      name: "get_financial_summary",
      description: "Get a summary of the user's financial data including accounts, bills, debts, goals, and recent transactions. Use this to answer questions about the user's finances.",
      parameters: {
        type: "object",
        properties: {
          include: {
            type: "array",
            items: { type: "string", enum: ["accounts", "bills", "debts", "goals", "transactions", "budgets"] },
            description: "What data to include in the summary"
          }
        },
        required: [],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_bill",
      description: "Delete an existing bill.",
      parameters: {
        type: "object",
        properties: {
          bill_name: { type: "string", description: "Name of the bill to delete" }
        },
        required: ["bill_name"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_goal",
      description: "Delete an existing savings goal.",
      parameters: {
        type: "object",
        properties: {
          goal_name: { type: "string", description: "Name of the goal to delete" }
        },
        required: ["goal_name"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_budget",
      description: "Delete an existing budget.",
      parameters: {
        type: "object",
        properties: {
          budget_name: { type: "string", description: "Name of the budget to delete" }
        },
        required: ["budget_name"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_debt",
      description: "Delete or mark a debt as paid off.",
      parameters: {
        type: "object",
        properties: {
          debt_name: { type: "string", description: "Name of the debt to delete" }
        },
        required: ["debt_name"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "navigate_to_page",
      description: "Navigate the user to a specific page in the app. Use this when the user asks to go to a page, view something, or when you want to direct them somewhere after completing an action.",
      parameters: {
        type: "object",
        properties: {
          page: {
            type: "string",
            enum: ["dashboard", "bills", "budgets", "transactions", "goals", "accounts", "debts", "reports", "settings", "money-academy", "help-center", "credit", "vision-board", "financial-plans"],
            description: "The page to navigate to"
          },
          reason: { type: "string", description: "Brief reason for navigating (shown to the user)" }
        },
        required: ["page"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_letter",
      description: "Generate a professional letter for the user. Use this for credit dispute letters, goodwill letters, hardship letters, debt validation letters, or any other letter the user needs help writing. The AI should compose the full letter text and return it. The frontend will provide PDF download and share options.",
      parameters: {
        type: "object",
        properties: {
          letter_type: { 
            type: "string", 
            description: "Type of letter (e.g., 'credit_dispute', 'goodwill', 'hardship', 'debt_validation', 'general')" 
          },
          letter_content: { 
            type: "string", 
            description: "The full formatted letter content including date, addresses, salutation, body, and closing. Use the user's name from context." 
          },
          recipient: { 
            type: "string", 
            description: "Who the letter is addressed to (e.g., 'Equifax', 'Chase Bank')" 
          }
        },
        required: ["letter_type", "letter_content"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_credit_score",
      description: "Add one or more credit scores for the user. Use this when the user asks to add, update, or log a credit score, or when you extract credit scores from an uploaded image (screenshot of a credit report, credit monitoring app, etc.).",
      parameters: {
        type: "object",
        properties: {
          scores: {
            type: "array",
            description: "Array of credit scores to add",
            items: {
              type: "object",
              properties: {
                score: { type: "number", description: "The credit score value (300-850)" },
                bureau: { 
                  type: "string", 
                  enum: ["Equifax", "Experian", "TransUnion", "Other"],
                  description: "Which credit bureau the score is from" 
                },
                score_date: { type: "string", description: "Date of the score in YYYY-MM-DD format. Defaults to today." },
                notes: { type: "string", description: "Optional notes about this score entry" }
              },
              required: ["score", "bureau"],
              additionalProperties: false
            }
          }
        },
        required: ["scores"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for real-time, up-to-date financial information. Use this when the user asks about current rates (mortgage, savings, CD, Fed rate), latest financial news, current stock/crypto prices, recent policy changes, updated tax rules, best current credit cards or bank offers, or anything that requires information newer than your training data. Do NOT use this for basic math, budgeting advice, or questions you can answer from the user's data.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query. Be specific and include 'current', '2026', or 'latest' when relevant." },
          search_context: { 
            type: "string", 
            description: "Brief context about why you're searching, to help format the response" 
          }
        },
        required: ["query"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_market_context",
      description: "Fetch LIVE market quote + context for a major index or ETF (indexes and ETFs only — NOT individual stocks or crypto). Use for ANY question about current market levels, momentum, or 'is X a buy/sell today'. Returns price, daily change, 52-week range, and the canonical name so you never confuse Nasdaq 100 (NDX/QQQ ~30,000) with Nasdaq Composite (IXIC ~26,700).",
      parameters: {
        type: "object",
        properties: {
          symbol: {
            type: "string",
            enum: [
              "NDX","QQQ","IXIC","GSPC","SPY","VOO","DJI","DIA","RUT","IWM","VIX",
              "XLK","XLF","XLE","XLV","XLY","XLP","XLI","XLU","XLB","XLRE","XLC",
              "VTI","VEA","VWO","AGG","TLT","GLD","SLV"
            ],
            description: "Canonical symbol. Use NDX for Nasdaq 100 index, QQQ for its ETF. Use IXIC for Nasdaq Composite. NEVER use individual stock tickers."
          },
          horizon: {
            type: "string",
            enum: ["intraday","short_term","long_term"],
            description: "User's framing horizon — helps Quinn contextualize the response."
          }
        },
        required: ["symbol"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_user_watchlist",
      description: "Return the indexes/ETFs the user is actively tracking in their Watchlist card. Call this BEFORE get_market_context whenever the user asks a generic market question ('how are markets today?', 'should I rebalance?', 'is it a buy?') so Quinn references the symbols they actually care about — not arbitrary defaults.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "save_advice_conclusion",
      description: "Save a key recommendation or conclusion Quinn gave this user so it can be referenced in future conversations. Call this after giving any meaningful financial recommendation — so Quinn never silently contradicts itself. Keep the summary concise (1-2 sentences max).",
      parameters: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            description: "Short topic label (e.g., 'Roth IRA strategy', 'emergency fund priority', 'debt payoff order')"
          },
          conclusion: {
            type: "string",
            description: "The core recommendation in 1-2 sentences (e.g., 'Prioritize maxing Roth IRA before taxable brokerage given current income level and tax bracket.')"
          },
          conditions: {
            type: "string",
            description: "Optional: what conditions this advice depends on — so Quinn knows when to revisit it (e.g., 'Based on fed funds rate at 5.25% and user having no employer 401k match')"
          }
        },
        required: ["topic", "conclusion"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_advice_history",
      description: "Retrieve the key conclusions Quinn has previously given this user. Use at the start of conversations about topics that may have been discussed before — so Quinn can stay consistent or explicitly explain when and why advice has evolved.",
      parameters: {
        type: "object",
        properties: {
          topic_filter: {
            type: "string",
            description: "Optional: filter to conclusions about a specific topic (e.g., 'retirement', 'debt'). Leave empty to get all recent conclusions."
          }
        },
        required: [],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_financial_plan",
      description: "Create a new financial roadmap/plan for the user. Use this when the user asks to build a financial plan, roadmap, or strategy. Quinn should structure the plan with milestones and action items.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Plan title (e.g., 'Debt Freedom Roadmap', '6-Month Emergency Fund Plan')" },
          description: { type: "string", description: "Brief description of what this plan achieves" },
          plan_type: {
            type: "string",
            enum: ["debt_payoff", "savings", "investment", "retirement", "emergency_fund", "budget_overhaul", "credit_repair", "custom"],
            description: "Type of financial plan"
          },
          target_amount: { type: "number", description: "Target dollar amount for the plan (optional)" },
          target_date: { type: "string", description: "Target completion date YYYY-MM-DD (optional)" },
          priority: { type: "string", enum: ["high", "medium", "low"], description: "Plan priority level" },
          milestones: {
            type: "array",
            description: "Array of milestones (phases) for this plan",
            items: {
              type: "object",
              properties: {
                title: { type: "string", description: "Milestone title (e.g., 'Phase 1: Build $1,000 Starter Fund')" },
                description: { type: "string", description: "What this phase involves" },
                target_amount: { type: "number", description: "Dollar target for this milestone" },
                target_date: { type: "string", description: "Target date YYYY-MM-DD" },
                actions: {
                  type: "array",
                  description: "Action items within this milestone",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string", description: "Action item title" },
                      description: { type: "string", description: "Details on how to do this" },
                      amount: { type: "number", description: "Dollar amount associated (e.g., save $200/mo)" },
                      frequency: { type: "string", enum: ["one-time", "daily", "weekly", "biweekly", "monthly", "quarterly", "annually"], description: "How often this action repeats" },
                      due_date: { type: "string", description: "Due date YYYY-MM-DD" }
                    },
                    required: ["title"],
                    additionalProperties: false
                  }
                }
              },
              required: ["title"],
              additionalProperties: false
            }
          }
        },
        required: ["title", "plan_type"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_financial_plans",
      description: "Retrieve the user's financial plans/roadmaps. Use this to review existing plans before creating new ones or when the user asks about their plans.",
      parameters: {
        type: "object",
        properties: {
          status_filter: { type: "string", enum: ["active", "completed", "paused", "all"], description: "Filter by plan status. Default is 'active'." },
          include_details: { type: "boolean", description: "Whether to include milestones and actions. Default true." }
        },
        required: [],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_plan_progress",
      description: "Update progress on a financial plan — mark actions complete, update milestone amounts, or change plan status. Use when the user reports progress or asks to modify their plan.",
      parameters: {
        type: "object",
        properties: {
          plan_title: { type: "string", description: "Title of the plan to update" },
          action: {
            type: "string",
            enum: ["complete_action", "update_milestone", "update_plan_status", "add_milestone", "add_action"],
            description: "What kind of update to make"
          },
          action_title: { type: "string", description: "Title of the action item to mark complete (for complete_action)" },
          milestone_title: { type: "string", description: "Title of the milestone to update or add to" },
          new_status: { type: "string", enum: ["active", "completed", "paused"], description: "New status (for update_plan_status)" },
          current_amount: { type: "number", description: "Updated current amount for a milestone" },
          new_milestone: {
            type: "object",
            description: "New milestone to add (for add_milestone)",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              target_amount: { type: "number" },
              target_date: { type: "string" }
            },
            required: ["title"],
            additionalProperties: false
          },
          new_action: {
            type: "object",
            description: "New action to add to a milestone (for add_action)",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              amount: { type: "number" },
              frequency: { type: "string" },
              due_date: { type: "string" }
            },
            required: ["title"],
            additionalProperties: false
          }
        },
        required: ["plan_title", "action"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_price_alerts",
      description: "Return the user's active and triggered price alerts on tracked indexes/ETFs. Call before recommending new alerts so Quinn doesn't duplicate existing ones.",
      parameters: { type: "object", properties: {}, additionalProperties: false }
    }
  },
  {
    type: "function",
    function: {
      name: "create_price_alert",
      description: "Create a price alert for an in-scope index or ETF symbol (e.g., SPY, QQQ, DIA, IWM, VTI, VOO, XLK, XLF, XLE, GLD, TLT, VIX). Only call after the user explicitly asks for an alert at a specific price level. Frame as an educational tracking tool — not a buy/sell signal.",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string", description: "Ticker symbol, uppercase (e.g., SPY)" },
          target_price: { type: "number", description: "Target price in USD, > 0" },
          direction: { type: "string", enum: ["above", "below"], description: "Trigger when price crosses above or below the target" },
          notes: { type: "string", description: "Optional short note explaining the level" }
        },
        required: ["symbol", "target_price", "direction"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_chart_pattern",
      description: "Generate an illustrative chart-pattern image (head-shoulders, double-top, double-bottom, cup-handle, ascending-triangle, descending-triangle, bull-flag, bear-flag, wedge-rising, wedge-falling, support-resistance, fibonacci) for educational explanation. Use only when the user asks to *see* or *visualize* what a pattern looks like.",
      parameters: {
        type: "object",
        properties: {
          pattern: {
            type: "string",
            enum: ["head-shoulders","double-top","double-bottom","cup-handle","ascending-triangle","descending-triangle","bull-flag","bear-flag","wedge-rising","wedge-falling","support-resistance","fibonacci"]
          },
          style: { type: "string", enum: ["clean", "dark"], description: "Visual style. Default clean (white background)." }
        },
        required: ["pattern"],
        additionalProperties: false
      }
    }
  }
];

// Helper function to get today's date in YYYY-MM-DD format
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}
