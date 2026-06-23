import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getTodayDate } from "./tools.ts";

interface ToolResult {
  success: boolean;
  message: string;
  data?: unknown;
}

export async function executeToolCall(
  supabase: SupabaseClient,
  userId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  console.log(`Executing tool: ${toolName}`, args);

  try {
    switch (toolName) {
      case "add_bill":
        return await addBill(supabase, userId, args);
      case "add_transaction":
        return await addTransaction(supabase, userId, args);
      case "add_budget":
        return await addBudget(supabase, userId, args);
      case "add_goal":
        return await addGoal(supabase, userId, args);
      case "add_debt":
        return await addDebt(supabase, userId, args);
      case "add_account":
        return await addAccount(supabase, userId, args);
      case "mark_bill_paid":
        return await markBillPaid(supabase, userId, args);
      case "add_to_goal":
        return await addToGoal(supabase, userId, args);
      case "make_debt_payment":
        return await makeDebtPayment(supabase, userId, args);
      case "update_account_balance":
        return await updateAccountBalance(supabase, userId, args);
      case "get_financial_summary":
        return await getFinancialSummary(supabase, userId, args);
      case "delete_bill":
        return await deleteBill(supabase, userId, args);
      case "delete_goal":
        return await deleteGoal(supabase, userId, args);
      case "delete_budget":
        return await deleteBudget(supabase, userId, args);
      case "delete_debt":
        return await deleteDebt(supabase, userId, args);
      case "navigate_to_page":
        return navigateToPage(args);
      case "generate_letter":
        return generateLetter(args);
      case "add_credit_score":
        return await addCreditScore(supabase, userId, args);
      case "web_search":
        return await webSearch(args);
      case "get_market_context":
        return await getMarketContext(supabase, userId, args);
      case "save_advice_conclusion":
        return await saveAdviceConclusion(supabase, userId, args);
      case "get_advice_history":
        return await getAdviceHistory(supabase, userId, args);
      case "create_financial_plan":
        return await createFinancialPlan(supabase, userId, args);
      case "get_financial_plans":
        return await getFinancialPlans(supabase, userId, args);
      case "update_plan_progress":
        return await updatePlanProgress(supabase, userId, args);
      case "get_user_watchlist":
        return await getUserWatchlist(supabase, userId);
      case "list_price_alerts":
        return await listPriceAlerts(supabase, userId);
      case "create_price_alert":
        return await createPriceAlert(supabase, userId, args);
      case "generate_chart_pattern":
        return await generateChartPattern(args);
      default:
        return { success: false, message: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    console.error(`Tool execution error for ${toolName}:`, error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Tool execution failed" 
    };
  }
}

async function addBill(supabase: SupabaseClient, userId: string, args: Record<string, unknown>): Promise<ToolResult> {
  const { data, error } = await supabase
    .from("bills")
    .insert({
      user_id: userId,
      name: args.name as string,
      amount: args.amount as number,
      due_date: args.due_date as string,
      category: args.category || "other",
      frequency: args.frequency || "monthly",
      is_autopay: args.is_autopay || false,
      autopay_source: args.is_autopay ? (args.autopay_source || null) : null,
      autopay_account_last_four: args.autopay_account_last_four || null,
      is_recurring: (args.frequency || "monthly") !== "one-time",
      is_variable_amount: args.is_variable_amount || false,
      notes: args.notes as string,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    return { success: false, message: `Failed to add bill: ${error.message}` };
  }

  const autopayInfo = args.is_autopay 
    ? ` (Autopay: ${args.autopay_source === 'external_bank' ? `Bank ••${args.autopay_account_last_four || ''}` : 'CoinsBloom'})`
    : '';
  return {
    success: true,
    message: `Successfully added bill "${args.name}" for $${args.amount} due on ${args.due_date}${autopayInfo}`,
    data
  };
}

async function addTransaction(supabase: SupabaseClient, userId: string, args: Record<string, unknown>): Promise<ToolResult> {
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      title: args.title as string,
      amount: args.amount as number,
      type: args.type as string,
      category: args.category || "Other",
      merchant: args.merchant as string,
      transaction_date: (args.transaction_date as string) || getTodayDate(),
      notes: args.notes as string,
    })
    .select()
    .single();

  if (error) {
    return { success: false, message: `Failed to add transaction: ${error.message}` };
  }

  const typeLabel = args.type === "income" ? "income" : "expense";
  return {
    success: true,
    message: `Successfully added ${typeLabel} of $${args.amount} for "${args.title}"`,
    data
  };
}

async function addBudget(supabase: SupabaseClient, userId: string, args: Record<string, unknown>): Promise<ToolResult> {
  const { data, error } = await supabase
    .from("budgets")
    .insert({
      user_id: userId,
      name: args.name as string,
      amount: args.amount as number,
      category: args.category as string,
      period: "monthly",
      spent: 0,
      is_active: true,
      start_date: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return { success: false, message: `Failed to create budget: ${error.message}` };
  }

  return {
    success: true,
    message: `Successfully created $${args.amount} monthly budget for ${args.category}`,
    data
  };
}

async function addGoal(supabase: SupabaseClient, userId: string, args: Record<string, unknown>): Promise<ToolResult> {
  const { data, error } = await supabase
    .from("goals")
    .insert({
      user_id: userId,
      title: args.title as string,
      target_amount: args.target_amount as number,
      current_amount: (args.current_amount as number) || 0,
      target_date: args.target_date as string,
      goal_type: args.goal_type || "personal",
      notes: args.notes as string,
      is_archived: false,
    })
    .select()
    .single();

  if (error) {
    return { success: false, message: `Failed to create goal: ${error.message}` };
  }

  return {
    success: true,
    message: `Successfully created savings goal "${args.title}" with a target of $${args.target_amount}`,
    data
  };
}

async function addDebt(supabase: SupabaseClient, userId: string, args: Record<string, unknown>): Promise<ToolResult> {
  const { data, error } = await supabase
    .from("debts")
    .insert({
      user_id: userId,
      name: args.name as string,
      current_balance: args.current_balance as number,
      original_balance: (args.original_balance as number) || args.current_balance as number,
      interest_rate: (args.interest_rate as number) || 0,
      minimum_payment: args.minimum_payment as number,
      debt_type: args.debt_type || "other",
      creditor: args.creditor as string,
      due_day: args.due_day as number,
      status: "active",
    })
    .select()
    .single();

  if (error) {
    return { success: false, message: `Failed to add debt: ${error.message}` };
  }

  return {
    success: true,
    message: `Successfully added debt "${args.name}" with a balance of $${args.current_balance}`,
    data
  };
}

async function addAccount(supabase: SupabaseClient, userId: string, args: Record<string, unknown>): Promise<ToolResult> {
  const { data, error } = await supabase
    .from("accounts")
    .insert({
      user_id: userId,
      name: args.name as string,
      balance: args.balance as number,
      account_type: args.account_type as string,
      category: args.category || "asset",
      institution: args.institution as string,
      is_manual: true,
    })
    .select()
    .single();

  if (error) {
    return { success: false, message: `Failed to add account: ${error.message}` };
  }

  return {
    success: true,
    message: `Successfully added ${args.account_type} account "${args.name}" with balance $${args.balance}`,
    data
  };
}

async function markBillPaid(supabase: SupabaseClient, userId: string, args: Record<string, unknown>): Promise<ToolResult> {
  // Find the bill by name
  const { data: bill, error: findError } = await supabase
    .from("bills")
    .select("*")
    .eq("user_id", userId)
    .ilike("name", `%${args.bill_name}%`)
    .eq("status", "pending")
    .order("due_date", { ascending: true })
    .limit(1)
    .single();

  if (findError || !bill) {
    return { success: false, message: `Could not find a pending bill matching "${args.bill_name}"` };
  }

  const paidDate = (args.paid_date as string) || getTodayDate();
  const amount = (args.amount as number) || bill.amount;

  // Create payment record
  await supabase.from("bill_payments").insert({
    user_id: userId,
    bill_id: bill.id,
    amount,
    paid_date: paidDate,
    payment_method: "ai_assistant",
  });

  // Update bill status
  const { error: updateError } = await supabase
    .from("bills")
    .update({ status: "paid", last_paid_date: paidDate })
    .eq("id", bill.id);

  if (updateError) {
    return { success: false, message: `Failed to update bill: ${updateError.message}` };
  }

  return {
    success: true,
    message: `Successfully marked "${bill.name}" as paid ($${amount})`,
    data: { bill, paidAmount: amount }
  };
}

async function addToGoal(supabase: SupabaseClient, userId: string, args: Record<string, unknown>): Promise<ToolResult> {
  // Find the goal by name
  const { data: goal, error: findError } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .ilike("title", `%${args.goal_name}%`)
    .eq("is_archived", false)
    .limit(1)
    .single();

  if (findError || !goal) {
    return { success: false, message: `Could not find an active goal matching "${args.goal_name}"` };
  }

  const newAmount = goal.current_amount + (args.amount as number);

  // Update goal amount
  const { error: updateError } = await supabase
    .from("goals")
    .update({ current_amount: newAmount })
    .eq("id", goal.id);

  if (updateError) {
    return { success: false, message: `Failed to update goal: ${updateError.message}` };
  }

  // Add contribution record
  await supabase.from("goal_contributions").insert({
    goal_id: goal.id,
    user_id: userId,
    amount: args.amount as number,
    notes: (args.notes as string) || "Added via AI assistant",
    is_approved: true,
  });

  return {
    success: true,
    message: `Successfully added $${args.amount} to "${goal.title}". New total: $${newAmount} of $${goal.target_amount}`,
    data: { goal, newAmount }
  };
}

async function makeDebtPayment(supabase: SupabaseClient, userId: string, args: Record<string, unknown>): Promise<ToolResult> {
  // Find the debt by name
  const { data: debt, error: findError } = await supabase
    .from("debts")
    .select("*")
    .eq("user_id", userId)
    .ilike("name", `%${args.debt_name}%`)
    .eq("status", "active")
    .limit(1)
    .single();

  if (findError || !debt) {
    return { success: false, message: `Could not find an active debt matching "${args.debt_name}"` };
  }

  const paymentAmount = args.amount as number;
  const newBalance = Math.max(0, debt.current_balance - paymentAmount);
  const paymentDate = (args.payment_date as string) || getTodayDate();

  // Update debt balance
  const { error: updateError } = await supabase
    .from("debts")
    .update({ 
      current_balance: newBalance,
      status: newBalance === 0 ? "paid" : "active"
    })
    .eq("id", debt.id);

  if (updateError) {
    return { success: false, message: `Failed to update debt: ${updateError.message}` };
  }

  // Add payment record
  await supabase.from("debt_payments").insert({
    debt_id: debt.id,
    user_id: userId,
    amount: paymentAmount,
    payment_date: paymentDate,
    payment_type: "regular",
  });

  const paidOffMsg = newBalance === 0 ? " 🎉 Debt is now paid off!" : "";
  return {
    success: true,
    message: `Successfully recorded $${paymentAmount} payment on "${debt.name}". New balance: $${newBalance}${paidOffMsg}`,
    data: { debt, newBalance }
  };
}

async function updateAccountBalance(supabase: SupabaseClient, userId: string, args: Record<string, unknown>): Promise<ToolResult> {
  // Find the account by name
  const { data: account, error: findError } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", userId)
    .ilike("name", `%${args.account_name}%`)
    .limit(1)
    .single();

  if (findError || !account) {
    return { success: false, message: `Could not find an account matching "${args.account_name}"` };
  }

  const oldBalance = account.balance;
  const newBalance = args.new_balance as number;

  const { error: updateError } = await supabase
    .from("accounts")
    .update({ balance: newBalance })
    .eq("id", account.id);

  if (updateError) {
    return { success: false, message: `Failed to update account: ${updateError.message}` };
  }

  const change = newBalance - oldBalance;
  const changeStr = change >= 0 ? `+$${change}` : `-$${Math.abs(change)}`;

  return {
    success: true,
    message: `Successfully updated "${account.name}" balance from $${oldBalance} to $${newBalance} (${changeStr})`,
    data: { account, oldBalance, newBalance }
  };
}

async function getFinancialSummary(supabase: SupabaseClient, userId: string, args: Record<string, unknown>): Promise<ToolResult> {
  const include = (args.include as string[]) || ["accounts", "bills", "debts", "goals", "budgets"];
  const summary: Record<string, unknown> = {};

  if (include.includes("accounts")) {
    const { data } = await supabase
      .from("accounts")
      .select("name, balance, account_type, category")
      .eq("user_id", userId)
      .limit(10);
    summary.accounts = data || [];
    summary.totalBalance = data?.reduce((sum, a) => sum + (a.balance || 0), 0) || 0;
  }

  if (include.includes("bills")) {
    const { data } = await supabase
      .from("bills")
      .select("name, amount, due_date, status, category")
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("due_date", { ascending: true })
      .limit(10);
    summary.upcomingBills = data || [];
    summary.totalBillsDue = data?.reduce((sum, b) => sum + (b.amount || 0), 0) || 0;
  }

  if (include.includes("debts")) {
    const { data } = await supabase
      .from("debts")
      .select("name, current_balance, interest_rate, minimum_payment, debt_type")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(10);
    summary.debts = data || [];
    summary.totalDebt = data?.reduce((sum, d) => sum + (d.current_balance || 0), 0) || 0;
  }

  if (include.includes("goals")) {
    const { data } = await supabase
      .from("goals")
      .select("title, current_amount, target_amount, target_date, goal_type")
      .eq("user_id", userId)
      .eq("is_archived", false)
      .limit(10);
    summary.goals = data || [];
  }

  if (include.includes("budgets")) {
    const { data } = await supabase
      .from("budgets")
      .select("name, amount, spent, category")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(10);
    summary.budgets = data || [];
  }

  if (include.includes("transactions")) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    
    const { data } = await supabase
      .from("transactions")
      .select("title, amount, type, category, transaction_date")
      .eq("user_id", userId)
      .gte("transaction_date", startOfMonth.toISOString().split('T')[0])
      .order("transaction_date", { ascending: false })
      .limit(15);
    summary.recentTransactions = data || [];
    
    const expenses = data?.filter(t => t.type === "expense").reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
    const income = data?.filter(t => t.type === "income").reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
    summary.monthlyExpenses = expenses;
    summary.monthlyIncome = income;
  }

  return {
    success: true,
    message: "Financial summary retrieved",
    data: summary
  };
}

async function deleteBill(supabase: SupabaseClient, userId: string, args: Record<string, unknown>): Promise<ToolResult> {
  const { data: bill, error: findError } = await supabase
    .from("bills")
    .select("id, name")
    .eq("user_id", userId)
    .ilike("name", `%${args.bill_name}%`)
    .limit(1)
    .single();

  if (findError || !bill) {
    return { success: false, message: `Could not find a bill matching "${args.bill_name}"` };
  }

  const { error } = await supabase.from("bills").delete().eq("id", bill.id);

  if (error) {
    return { success: false, message: `Failed to delete bill: ${error.message}` };
  }

  return { success: true, message: `Successfully deleted bill "${bill.name}"` };
}

async function deleteGoal(supabase: SupabaseClient, userId: string, args: Record<string, unknown>): Promise<ToolResult> {
  const { data: goal, error: findError } = await supabase
    .from("goals")
    .select("id, title")
    .eq("user_id", userId)
    .ilike("title", `%${args.goal_name}%`)
    .limit(1)
    .single();

  if (findError || !goal) {
    return { success: false, message: `Could not find a goal matching "${args.goal_name}"` };
  }

  // Mark as archived instead of hard delete
  const { error } = await supabase.from("goals").update({ is_archived: true }).eq("id", goal.id);

  if (error) {
    return { success: false, message: `Failed to delete goal: ${error.message}` };
  }

  return { success: true, message: `Successfully deleted goal "${goal.title}"` };
}

async function deleteBudget(supabase: SupabaseClient, userId: string, args: Record<string, unknown>): Promise<ToolResult> {
  const { data: budget, error: findError } = await supabase
    .from("budgets")
    .select("id, name")
    .eq("user_id", userId)
    .ilike("name", `%${args.budget_name}%`)
    .limit(1)
    .single();

  if (findError || !budget) {
    return { success: false, message: `Could not find a budget matching "${args.budget_name}"` };
  }

  // Mark as inactive instead of hard delete
  const { error } = await supabase.from("budgets").update({ is_active: false }).eq("id", budget.id);

  if (error) {
    return { success: false, message: `Failed to delete budget: ${error.message}` };
  }

  return { success: true, message: `Successfully deleted budget "${budget.name}"` };
}

async function deleteDebt(supabase: SupabaseClient, userId: string, args: Record<string, unknown>): Promise<ToolResult> {
  const { data: debt, error: findError } = await supabase
    .from("debts")
    .select("id, name")
    .eq("user_id", userId)
    .ilike("name", `%${args.debt_name}%`)
    .limit(1)
    .single();

  if (findError || !debt) {
    return { success: false, message: `Could not find a debt matching "${args.debt_name}"` };
  }

  // Mark as paid instead of hard delete
  const { error } = await supabase.from("debts").update({ status: "paid", current_balance: 0 }).eq("id", debt.id);

  if (error) {
    return { success: false, message: `Failed to delete debt: ${error.message}` };
  }

  return { success: true, message: `Successfully marked debt "${debt.name}" as paid off` };
}

const PAGE_ROUTES: Record<string, string> = {
  dashboard: "/dashboard",
  bills: "/bills",
  budgets: "/budgets",
  transactions: "/transactions",
  goals: "/goals",
  accounts: "/accounts",
  debts: "/debts",
  reports: "/reports",
  settings: "/settings",
  "money-academy": "/money-academy",
  "help-center": "/help-center",
  credit: "/credit",
  "vision-board": "/vision-board",
  "financial-plans": "/financial-plans",
};

function navigateToPage(args: Record<string, unknown>): ToolResult {
  const page = args.page as string;
  const route = PAGE_ROUTES[page];
  
  if (!route) {
    return { success: false, message: `Unknown page: ${page}` };
  }

  return {
    success: true,
    message: `Navigating to ${page} page`,
    data: { navigate_to: route, reason: args.reason || "" }
  };
}

function generateLetter(args: Record<string, unknown>): ToolResult {
  const letterContent = args.letter_content as string;
  const letterType = args.letter_type as string;
  const recipient = args.recipient as string || "Recipient";

  if (!letterContent) {
    return { success: false, message: "Letter content is required" };
  }

  return {
    success: true,
    message: `Letter generated successfully`,
    data: { 
      letter_content: letterContent, 
      letter_type: letterType, 
      recipient,
      generated_at: new Date().toISOString()
    }
  };
}

async function addCreditScore(supabase: SupabaseClient, userId: string, args: Record<string, unknown>): Promise<ToolResult> {
  const scores = args.scores as Array<{ score: number; bureau: string; score_date?: string; notes?: string }>;
  
  if (!scores || scores.length === 0) {
    return { success: false, message: "No credit scores provided" };
  }

  // Validate scores
  for (const s of scores) {
    if (s.score < 300 || s.score > 850) {
      return { success: false, message: `Invalid score ${s.score} for ${s.bureau}. Credit scores must be between 300 and 850.` };
    }
  }

  const today = getTodayDate();
  const inserts = scores.map(s => ({
    user_id: userId,
    score: s.score,
    bureau: s.bureau,
    score_date: s.score_date || today,
    notes: s.notes || "Added via Bloom",
  }));

  const { data, error } = await supabase
    .from("credit_scores")
    .insert(inserts)
    .select();

  if (error) {
    return { success: false, message: `Failed to add credit scores: ${error.message}` };
  }

  const summary = scores.map(s => `${s.bureau}: ${s.score}`).join(", ");
  return {
    success: true,
    message: `Successfully added ${scores.length} credit score${scores.length > 1 ? "s" : ""}: ${summary}`,
    data
  };
}

async function webSearch(args: Record<string, unknown>): Promise<ToolResult> {
  const query = args.query as string;
  const searchContext = (args.search_context as string) || "";
  
  if (!query) {
    return { success: false, message: "Search query is required" };
  }

  const apiKey = Deno.env.get("PERPLEXITY_API_KEY");
  if (!apiKey) {
    console.error("PERPLEXITY_API_KEY not configured");
    return { 
      success: false, 
      message: "Real-time search is not available right now. I'll answer based on my existing knowledge instead." 
    };
  }

  try {
    console.log("Perplexity search:", query);
    
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          { 
            role: "system", 
            content: "You are a financial research assistant. Provide accurate, current financial data with specific numbers, rates, and dates. Be concise and factual. Always include the date or timeframe of the data you're citing." 
          },
          { role: "user", content: query }
        ],
        search_recency_filter: "month",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Perplexity API error:", response.status, errorText);
      return { 
        success: false, 
        message: "Search temporarily unavailable. I'll answer based on my existing knowledge." 
      };
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || "";
    const citations = data.citations || [];

    console.log("Perplexity search successful, citations:", citations.length);

    return {
      success: true,
      message: "Search completed successfully",
      data: {
        answer,
        citations,
        query,
        context: searchContext,
      }
    };
  } catch (error) {
    console.error("Perplexity search error:", error);
    return { 
      success: false, 
      message: "Search temporarily unavailable. I'll answer based on my existing knowledge." 
    };
  }
}

async function saveAdviceConclusion(supabase: SupabaseClient, userId: string, args: Record<string, unknown>): Promise<ToolResult> {
  const topic = args.topic as string;
  const conclusion = args.conclusion as string;
  const conditions = args.conditions as string | undefined;

  if (!topic || !conclusion) {
    return { success: false, message: "Topic and conclusion are required" };
  }

  // Deactivate any previous advice on same topic
  await supabase
    .from("bloom_advice_history")
    .update({ is_active: false })
    .eq("user_id", userId)
    .ilike("topic", `%${topic}%`);

  const { error } = await supabase
    .from("bloom_advice_history")
    .insert({
      user_id: userId,
      topic,
      conclusion,
      conditions: conditions || null,
      is_active: true,
    });

  if (error) {
    console.error("Failed to save advice:", error);
    return { success: false, message: `Failed to save advice: ${error.message}` };
  }

  return {
    success: true,
    message: `Advice saved: "${topic}" — will reference in future conversations`,
  };
}

async function getAdviceHistory(supabase: SupabaseClient, userId: string, args: Record<string, unknown>): Promise<ToolResult> {
  const topicFilter = args.topic_filter as string | undefined;

  let query = supabase
    .from("bloom_advice_history")
    .select("topic, conclusion, conditions, created_at")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(20);

  if (topicFilter) {
    query = query.ilike("topic", `%${topicFilter}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to get advice history:", error);
    return { success: false, message: "Failed to retrieve advice history" };
  }

  if (!data || data.length === 0) {
    return {
      success: true,
      message: "No previous advice recorded for this user yet.",
      data: [],
    };
  }

  const summary = data.map(a =>
    `- [${a.created_at?.split('T')[0]}] ${a.topic}: ${a.conclusion}${a.conditions ? ` (Conditions: ${a.conditions})` : ''}`
  ).join('\n');

  return {
    success: true,
    message: `Found ${data.length} previous advice entries:\n${summary}`,
    data,
  };
}

// =============================================
// FINANCIAL PLAN TOOLS
// =============================================

async function createFinancialPlan(supabase: SupabaseClient, userId: string, args: Record<string, unknown>): Promise<ToolResult> {
  const title = args.title as string;
  const planType = (args.plan_type as string) || "custom";
  const description = args.description as string || "";
  const targetAmount = (args.target_amount as number) || 0;
  const targetDate = args.target_date as string | null;
  const priority = (args.priority as string) || "medium";
  const milestones = args.milestones as Array<{
    title: string; description?: string; target_amount?: number; target_date?: string;
    actions?: Array<{ title: string; description?: string; amount?: number; frequency?: string; due_date?: string }>;
  }> || [];

  // Create the plan
  const { data: plan, error: planError } = await supabase
    .from("bloom_financial_plans")
    .insert({
      user_id: userId,
      title,
      description,
      plan_type: planType,
      target_amount: targetAmount,
      target_date: targetDate,
      priority,
      status: "active",
    })
    .select("id")
    .single();

  if (planError || !plan) {
    return { success: false, message: `Failed to create plan: ${planError?.message}` };
  }

  let totalMilestones = 0;
  let totalActions = 0;

  // Create milestones and their actions
  for (let i = 0; i < milestones.length; i++) {
    const ms = milestones[i];
    const { data: milestone, error: msError } = await supabase
      .from("bloom_plan_milestones")
      .insert({
        plan_id: plan.id,
        user_id: userId,
        title: ms.title,
        description: ms.description || "",
        target_amount: ms.target_amount || 0,
        target_date: ms.target_date || null,
        order_index: i,
        status: "pending",
      })
      .select("id")
      .single();

    if (msError || !milestone) {
      console.error("Failed to create milestone:", msError);
      continue;
    }
    totalMilestones++;

    // Create actions for this milestone
    if (ms.actions && ms.actions.length > 0) {
      const actionInserts = ms.actions.map((a, j) => ({
        milestone_id: milestone.id,
        plan_id: plan.id,
        user_id: userId,
        title: a.title,
        description: a.description || "",
        amount: a.amount || 0,
        frequency: a.frequency || "one-time",
        due_date: a.due_date || null,
        order_index: j,
        is_completed: false,
      }));

      const { error: actError } = await supabase
        .from("bloom_plan_actions")
        .insert(actionInserts);

      if (!actError) {
        totalActions += actionInserts.length;
      } else {
        console.error("Failed to create actions:", actError);
      }
    }
  }

  return {
    success: true,
    message: `✅ Created financial plan "${title}" with ${totalMilestones} milestones and ${totalActions} action items. View it on your Financial Plans page!`,
    data: { plan_id: plan.id, navigate_to: "/financial-plans" }
  };
}

async function getFinancialPlans(supabase: SupabaseClient, userId: string, args: Record<string, unknown>): Promise<ToolResult> {
  const statusFilter = (args.status_filter as string) || "active";
  const includeDetails = args.include_details !== false;

  let query = supabase
    .from("bloom_financial_plans")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data: plans, error } = await query;

  if (error) {
    return { success: false, message: `Failed to fetch plans: ${error.message}` };
  }

  if (!plans || plans.length === 0) {
    return { success: true, message: "No financial plans found. Would you like me to create one?", data: [] };
  }

  if (!includeDetails) {
    return { success: true, message: `Found ${plans.length} financial plans`, data: plans };
  }

  // Fetch milestones and actions for each plan
  const planIds = plans.map(p => p.id);
  
  const [milestonesRes, actionsRes] = await Promise.all([
    supabase.from("bloom_plan_milestones").select("*").in("plan_id", planIds).order("order_index"),
    supabase.from("bloom_plan_actions").select("*").in("plan_id", planIds).order("order_index"),
  ]);

  const milestones = milestonesRes.data || [];
  const actions = actionsRes.data || [];

  const enrichedPlans = plans.map(plan => ({
    ...plan,
    milestones: milestones
      .filter(m => m.plan_id === plan.id)
      .map(m => ({
        ...m,
        actions: actions.filter(a => a.milestone_id === m.id),
      })),
  }));

  const summary = enrichedPlans.map(p => {
    const totalActions = p.milestones.reduce((sum: number, m: any) => sum + m.actions.length, 0);
    const completedActions = p.milestones.reduce((sum: number, m: any) => sum + m.actions.filter((a: any) => a.is_completed).length, 0);
    return `- "${p.title}" (${p.plan_type}): ${completedActions}/${totalActions} actions complete, ${p.milestones.length} milestones`;
  }).join('\n');

  return {
    success: true,
    message: `Found ${plans.length} financial plans:\n${summary}`,
    data: enrichedPlans,
  };
}

async function updatePlanProgress(supabase: SupabaseClient, userId: string, args: Record<string, unknown>): Promise<ToolResult> {
  const planTitle = args.plan_title as string;
  const action = args.action as string;

  // Find the plan
  const { data: plan, error: findError } = await supabase
    .from("bloom_financial_plans")
    .select("id, title, status")
    .eq("user_id", userId)
    .ilike("title", `%${planTitle}%`)
    .limit(1)
    .single();

  if (findError || !plan) {
    return { success: false, message: `Could not find a plan matching "${planTitle}"` };
  }

  switch (action) {
    case "complete_action": {
      const actionTitle = args.action_title as string;
      if (!actionTitle) return { success: false, message: "action_title is required" };

      const { data: actionItem, error: aErr } = await supabase
        .from("bloom_plan_actions")
        .select("id, title")
        .eq("plan_id", plan.id)
        .eq("user_id", userId)
        .ilike("title", `%${actionTitle}%`)
        .eq("is_completed", false)
        .limit(1)
        .single();

      if (aErr || !actionItem) {
        return { success: false, message: `Could not find an incomplete action matching "${actionTitle}"` };
      }

      const { error } = await supabase
        .from("bloom_plan_actions")
        .update({ is_completed: true, completed_at: new Date().toISOString() })
        .eq("id", actionItem.id);

      if (error) return { success: false, message: `Failed to update: ${error.message}` };
      return { success: true, message: `✅ Marked "${actionItem.title}" as complete in plan "${plan.title}"!` };
    }

    case "update_milestone": {
      const msTitle = args.milestone_title as string;
      const currentAmount = args.current_amount as number;
      if (!msTitle) return { success: false, message: "milestone_title is required" };

      const { data: ms, error: mErr } = await supabase
        .from("bloom_plan_milestones")
        .select("id, title, target_amount")
        .eq("plan_id", plan.id)
        .eq("user_id", userId)
        .ilike("title", `%${msTitle}%`)
        .limit(1)
        .single();

      if (mErr || !ms) {
        return { success: false, message: `Could not find milestone matching "${msTitle}"` };
      }

      const updates: Record<string, unknown> = {};
      if (currentAmount !== undefined) updates.current_amount = currentAmount;
      if (currentAmount !== undefined && ms.target_amount && currentAmount >= ms.target_amount) {
        updates.status = "completed";
      }

      const { error } = await supabase.from("bloom_plan_milestones").update(updates).eq("id", ms.id);
      if (error) return { success: false, message: `Failed to update: ${error.message}` };

      const statusMsg = updates.status === "completed" ? " 🎉 Milestone completed!" : "";
      return { success: true, message: `Updated milestone "${ms.title}" — current: $${currentAmount}${statusMsg}` };
    }

    case "update_plan_status": {
      const newStatus = args.new_status as string;
      if (!newStatus) return { success: false, message: "new_status is required" };

      const { error } = await supabase
        .from("bloom_financial_plans")
        .update({ status: newStatus })
        .eq("id", plan.id);

      if (error) return { success: false, message: `Failed to update: ${error.message}` };
      return { success: true, message: `Plan "${plan.title}" status changed to ${newStatus}` };
    }

    case "add_milestone": {
      const newMs = args.new_milestone as { title: string; description?: string; target_amount?: number; target_date?: string };
      if (!newMs?.title) return { success: false, message: "new_milestone with title is required" };

      // Get max order_index
      const { data: existing } = await supabase
        .from("bloom_plan_milestones")
        .select("order_index")
        .eq("plan_id", plan.id)
        .order("order_index", { ascending: false })
        .limit(1);

      const nextOrder = (existing?.[0]?.order_index ?? -1) + 1;

      const { error } = await supabase.from("bloom_plan_milestones").insert({
        plan_id: plan.id,
        user_id: userId,
        title: newMs.title,
        description: newMs.description || "",
        target_amount: newMs.target_amount || 0,
        target_date: newMs.target_date || null,
        order_index: nextOrder,
        status: "pending",
      });

      if (error) return { success: false, message: `Failed to add milestone: ${error.message}` };
      return { success: true, message: `Added new milestone "${newMs.title}" to plan "${plan.title}"` };
    }

    case "add_action": {
      const msTitle2 = args.milestone_title as string;
      const newAct = args.new_action as { title: string; description?: string; amount?: number; frequency?: string; due_date?: string };
      if (!msTitle2 || !newAct?.title) return { success: false, message: "milestone_title and new_action with title are required" };

      const { data: ms2, error: m2Err } = await supabase
        .from("bloom_plan_milestones")
        .select("id")
        .eq("plan_id", plan.id)
        .eq("user_id", userId)
        .ilike("title", `%${msTitle2}%`)
        .limit(1)
        .single();

      if (m2Err || !ms2) return { success: false, message: `Could not find milestone matching "${msTitle2}"` };

      const { data: existingActs } = await supabase
        .from("bloom_plan_actions")
        .select("order_index")
        .eq("milestone_id", ms2.id)
        .order("order_index", { ascending: false })
        .limit(1);

      const nextActOrder = (existingActs?.[0]?.order_index ?? -1) + 1;

      const { error } = await supabase.from("bloom_plan_actions").insert({
        milestone_id: ms2.id,
        plan_id: plan.id,
        user_id: userId,
        title: newAct.title,
        description: newAct.description || "",
        amount: newAct.amount || 0,
        frequency: newAct.frequency || "one-time",
        due_date: newAct.due_date || null,
        order_index: nextActOrder,
        is_completed: false,
      });

      if (error) return { success: false, message: `Failed to add action: ${error.message}` };
      return { success: true, message: `Added action "${newAct.title}" to milestone in plan "${plan.title}"` };
    }

    default:
      return { success: false, message: `Unknown action: ${action}` };
  }
}

// ============= Market Context (live indexes + ETFs via Yahoo Finance) =============
// Strict mapping prevents Quinn from confusing Nasdaq 100 with Nasdaq Composite.
const MARKET_SYMBOL_MAP: Record<string, { yahoo: string; name: string; kind: "index" | "etf" }> = {
  NDX:  { yahoo: "^NDX",  name: "Nasdaq 100 Index",            kind: "index" },
  QQQ:  { yahoo: "QQQ",   name: "Invesco QQQ (Nasdaq 100 ETF)", kind: "etf" },
  IXIC: { yahoo: "^IXIC", name: "Nasdaq Composite Index",      kind: "index" },
  GSPC: { yahoo: "^GSPC", name: "S&P 500 Index",               kind: "index" },
  SPY:  { yahoo: "SPY",   name: "SPDR S&P 500 ETF",            kind: "etf" },
  VOO:  { yahoo: "VOO",   name: "Vanguard S&P 500 ETF",        kind: "etf" },
  DJI:  { yahoo: "^DJI",  name: "Dow Jones Industrial Average", kind: "index" },
  DIA:  { yahoo: "DIA",   name: "SPDR Dow Jones ETF",          kind: "etf" },
  RUT:  { yahoo: "^RUT",  name: "Russell 2000 Index",          kind: "index" },
  IWM:  { yahoo: "IWM",   name: "iShares Russell 2000 ETF",    kind: "etf" },
  VIX:  { yahoo: "^VIX",  name: "CBOE Volatility Index",       kind: "index" },
  XLK:  { yahoo: "XLK",   name: "Technology Select Sector",    kind: "etf" },
  XLF:  { yahoo: "XLF",   name: "Financial Select Sector",     kind: "etf" },
  XLE:  { yahoo: "XLE",   name: "Energy Select Sector",        kind: "etf" },
  XLV:  { yahoo: "XLV",   name: "Health Care Select Sector",   kind: "etf" },
  XLY:  { yahoo: "XLY",   name: "Consumer Discretionary",      kind: "etf" },
  XLP:  { yahoo: "XLP",   name: "Consumer Staples",            kind: "etf" },
  XLI:  { yahoo: "XLI",   name: "Industrial Select Sector",    kind: "etf" },
  XLU:  { yahoo: "XLU",   name: "Utilities Select Sector",     kind: "etf" },
  XLB:  { yahoo: "XLB",   name: "Materials Select Sector",     kind: "etf" },
  XLRE: { yahoo: "XLRE",  name: "Real Estate Select Sector",   kind: "etf" },
  XLC:  { yahoo: "XLC",   name: "Communication Services",      kind: "etf" },
  VTI:  { yahoo: "VTI",   name: "Vanguard Total US Market ETF", kind: "etf" },
  VEA:  { yahoo: "VEA",   name: "Vanguard Developed Markets ETF", kind: "etf" },
  VWO:  { yahoo: "VWO",   name: "Vanguard Emerging Markets ETF", kind: "etf" },
  AGG:  { yahoo: "AGG",   name: "iShares US Aggregate Bond ETF", kind: "etf" },
  TLT:  { yahoo: "TLT",   name: "iShares 20+ Year Treasury ETF", kind: "etf" },
  GLD:  { yahoo: "GLD",   name: "SPDR Gold Shares",            kind: "etf" },
  SLV:  { yahoo: "SLV",   name: "iShares Silver Trust",        kind: "etf" },
};

async function getUserWatchlist(
  supabase: SupabaseClient,
  userId: string,
): Promise<ToolResult> {
  const { data, error } = await supabase
    .from("bloom_watchlist")
    .select("symbol, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) {
    return { success: false, message: `Failed to load watchlist: ${error.message}` };
  }
  const symbols = (data ?? []).map((r: { symbol: string }) => r.symbol);
  return {
    success: true,
    message: symbols.length
      ? `User is tracking ${symbols.length} symbol${symbols.length === 1 ? "" : "s"}: ${symbols.join(", ")}`
      : "User has no watchlist symbols yet.",
    data: { symbols, count: symbols.length },
  };
}

async function getMarketContext(
  supabase: SupabaseClient,
  userId: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const rawSymbol = String(args.symbol || "").toUpperCase().trim();
  const horizon = (args.horizon as string) || "short_term";

  const mapped = MARKET_SYMBOL_MAP[rawSymbol];
  if (!mapped) {
    return {
      success: false,
      message: `Symbol "${rawSymbol}" is out of scope. Market Context covers major indexes and ETFs only — not individual stocks or crypto.`,
    };
  }

  // Premium bypass: admins/moderators + profiles.is_premium with valid premium_until
  let isPremium = false;
  try {
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "super_admin", "moderator"])
      .limit(1);
    if (roleRows && roleRows.length > 0) {
      isPremium = true;
    } else {
      const { data: prof } = await supabase
        .from("profiles").select("is_premium, premium_until").eq("id", userId).maybeSingle();
      if (prof?.is_premium && (!prof.premium_until || new Date(prof.premium_until) > new Date())) {
        isPremium = true;
      }
    }
  } catch (_) { /* default to non-premium */ }

  // Quota enforcement for free users — 3 lookups/day
  if (!isPremium) {
    const { data: quota, error: quotaErr } = await supabase.rpc("check_and_increment_usage", {
      p_user_id: userId,
      p_feature_name: "market_context",
      p_daily_limit: 3,
    });
    if (quotaErr) {
      console.error("market_context quota error", quotaErr);
    } else if (quota && !(quota as any).can_use) {
      return {
        success: false,
        message: "quota_exceeded",
        data: {
          quota_exceeded: true,
          daily_limit: 3,
          message: "Free tier: 3 market lookups per day. Upgrade to Premium for unlimited live market context.",
        },
      };
    }
  }

  // Fetch live quote from Yahoo Finance (no API key required)
  try {
    // IMPORTANT: range=5d (not 1mo) — with longer ranges Yahoo returns the
    // close at the start of the range as `previousClose`, which produces
    // wildly wrong daily % changes (e.g. QQQ "+11.87%").
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(mapped.yahoo)}?interval=1d&range=5d`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!res.ok) {
      return { success: false, message: `Market data fetch failed (${res.status}).` };
    }
    const json = await res.json();
    if (json?.chart?.error) {
      return { success: false, message: json.chart.error.description || "Symbol not found" };
    }
    const result = json?.chart?.result?.[0];
    const meta = result?.meta;
    if (!meta || typeof meta.regularMarketPrice !== "number") {
      return { success: false, message: `Live data unavailable for ${mapped.name}.` };
    }

    const price = meta.regularMarketPrice;
    const prev = meta.previousClose ?? meta.chartPreviousClose ?? price;
    const change = price - prev;
    const percentChange = prev ? (change / prev) * 100 : 0;

    return {
      success: true,
      message: `Live ${mapped.name} quote retrieved.`,
      data: {
        symbol: rawSymbol,
        canonical_name: mapped.name,
        kind: mapped.kind,
        horizon,
        price,
        change,
        percent_change: percentChange,
        day_high: meta.regularMarketDayHigh ?? null,
        day_low: meta.regularMarketDayLow ?? null,
        open: meta.regularMarketOpen ?? null,
        previous_close: prev,
        week_52_high: meta.fiftyTwoWeekHigh ?? null,
        week_52_low: meta.fiftyTwoWeekLow ?? null,
        exchange: meta.exchangeName ?? null,
        currency: meta.currency ?? "USD",
        as_of: new Date().toISOString(),
        disclaimer: "Quote for educational context only. Not investment advice.",
      },
    };
  } catch (err) {
    console.error("market_context fetch error", err);
    return { success: false, message: "Live market data temporarily unavailable." };
  }
}

const ALERT_ALLOWED_SYMBOLS = new Set(Object.keys(MARKET_SYMBOL_MAP));

async function listPriceAlerts(
  supabase: SupabaseClient,
  userId: string,
): Promise<ToolResult> {
  const { data, error } = await supabase
    .from("bloom_price_alerts")
    .select("symbol, target_price, direction, is_triggered, triggered_at, notes, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) return { success: false, message: `Failed to load alerts: ${error.message}` };
  const alerts = data ?? [];
  return {
    success: true,
    message: alerts.length
      ? `User has ${alerts.length} price alert${alerts.length === 1 ? "" : "s"}.`
      : "User has no price alerts set.",
    data: {
      alerts,
      active_count: alerts.filter((a: { is_triggered: boolean }) => !a.is_triggered).length,
      triggered_count: alerts.filter((a: { is_triggered: boolean }) => a.is_triggered).length,
    },
  };
}

async function createPriceAlert(
  supabase: SupabaseClient,
  userId: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const symbol = String(args.symbol || "").toUpperCase().trim();
  const targetPrice = Number(args.target_price);
  const direction = String(args.direction || "").toLowerCase();
  const notes = args.notes ? String(args.notes) : null;

  if (!ALERT_ALLOWED_SYMBOLS.has(symbol)) {
    return {
      success: false,
      message: `Symbol "${symbol}" is out of scope. Price alerts only cover tracked indexes and ETFs.`,
    };
  }
  if (!Number.isFinite(targetPrice) || targetPrice <= 0) {
    return { success: false, message: "target_price must be a positive number." };
  }
  if (direction !== "above" && direction !== "below") {
    return { success: false, message: "direction must be 'above' or 'below'." };
  }

  const { data, error } = await supabase
    .from("bloom_price_alerts")
    .insert({ user_id: userId, symbol, target_price: targetPrice, direction, notes })
    .select()
    .single();
  if (error) return { success: false, message: `Failed to create alert: ${error.message}` };

  return {
    success: true,
    message: `Price alert created: ${symbol} ${direction} $${targetPrice}. Educational tracking only — not investment advice.`,
    data,
  };
}

async function generateChartPattern(
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const pattern = String(args.pattern || "").toLowerCase().trim();
  const style = args.style === "dark" ? "dark" : "clean";
  if (!pattern) return { success: false, message: "pattern is required" };

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return { success: false, message: "AI gateway not configured." };

  const prompt =
    `A clean professional stock chart illustration of the ${pattern} pattern with clear annotations.` +
    (style === "dark"
      ? " Dark background, light lines and text."
      : " White background, dark lines and text.");

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });
    if (res.status === 429) return { success: false, message: "Rate limited. Try again shortly." };
    if (res.status === 402) return { success: false, message: "AI credits exhausted." };
    if (!res.ok) return { success: false, message: "Image generation failed." };
    const data = await res.json();
    const imageUrl = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl) return { success: false, message: "No image returned." };
    return {
      success: true,
      message: `Chart pattern illustration generated for ${pattern}. Educational only — not investment advice.`,
      data: { pattern, imageUrl, disclaimer: "Educational illustration only. Not investment advice." },
    };
  } catch (err) {
    console.error("generate_chart_pattern error", err);
    return { success: false, message: "Chart generation temporarily unavailable." };
  }
}
