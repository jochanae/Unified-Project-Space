import { supabase } from "@/integrations/supabase/client";

/**
 * Check if a debt already exists linked to a given account
 */
export async function findLinkedDebt(accountId: string) {
  const { data } = await supabase
    .from("debts")
    .select("id, name")
    .eq("linked_account_id", accountId)
    .limit(1)
    .maybeSingle();
  return data;
}

/**
 * Check if a bill already exists linked to a given account or debt
 */
export async function findLinkedBill({
  accountId,
  debtId,
}: {
  accountId?: string | null;
  debtId?: string | null;
}) {
  if (!accountId && !debtId) return null;

  let query = supabase.from("bills").select("id, name").limit(1);

  if (debtId) {
    query = query.eq("linked_debt_id", debtId);
  } else if (accountId) {
    query = query.eq("linked_account_id", accountId);
  }

  const { data } = await query.maybeSingle();
  return data;
}

/**
 * Check if an account already exists with matching name for a user (duplicate prevention)
 */
export async function findExistingLiabilityAccount(userId: string, name: string) {
  const { data } = await supabase
    .from("accounts")
    .select("id, name")
    .eq("user_id", userId)
    .eq("category", "liability")
    .ilike("name", name)
    .limit(1)
    .maybeSingle();
  return data;
}

/** Map account_type to debt_type */
export function accountTypeToDebtType(accountType: string): string {
  switch (accountType) {
    case "credit_card": return "credit_card";
    case "mortgage": return "mortgage";
    case "auto_loan": return "auto_loan";
    case "student_loan": return "student_loan";
    case "personal_loan": return "personal_loan";
    case "line_of_credit": return "other";
    case "heloc": return "mortgage";
    default: return "other";
  }
}

/** Map debt_type to bill category */
export function debtTypeToBillCategory(debtType: string): string {
  switch (debtType) {
    case "credit_card": return "credit_card";
    case "mortgage": return "mortgage";
    case "student_loan": return "student_loan";
    case "auto_loan":
    case "personal_loan": return "loans";
    case "medical": return "medical";
    default: return "other";
  }
}

export interface CreateLinkedDebtParams {
  userId: string;
  accountId: string;
  name: string;
  creditor: string;
  debtType: string;
  currentBalance: number;
  interestRate: number;
  minimumPayment: number;
  dueDay: number | null;
  paymentUrl?: string | null;
}

export async function createLinkedDebt(params: CreateLinkedDebtParams) {
  // Check for existing linked debt first
  const existing = await findLinkedDebt(params.accountId);
  if (existing) return { data: existing, alreadyExisted: true };

  const { data, error } = await supabase
    .from("debts")
    .insert({
      user_id: params.userId,
      name: params.name,
      creditor: params.creditor || null,
      debt_type: params.debtType,
      current_balance: params.currentBalance,
      original_balance: params.currentBalance,
      interest_rate: params.interestRate,
      minimum_payment: params.minimumPayment,
      due_day: params.dueDay,
      linked_account_id: params.accountId,
      status: "active",
      payment_url: params.paymentUrl || null,
    })
    .select("id, name")
    .single();

  if (error) throw error;
  return { data, alreadyExisted: false };
}

export interface CreateLinkedBillParams {
  userId: string;
  name: string;
  amount: number;
  category: string;
  dueDay: number | null;
  linkedAccountId: string | null;
  linkedDebtId: string | null;
  paymentUrl?: string | null;
}

export async function createLinkedBill(params: CreateLinkedBillParams) {
  // Check for existing linked bill first
  const existing = await findLinkedBill({
    accountId: params.linkedAccountId,
    debtId: params.linkedDebtId,
  });
  if (existing) return { data: existing, alreadyExisted: true };

  // Calculate due date from due day
  const now = new Date();
  let dueDate: Date;
  if (params.dueDay) {
    dueDate = new Date(now.getFullYear(), now.getMonth(), params.dueDay);
    if (dueDate < now) {
      dueDate = new Date(now.getFullYear(), now.getMonth() + 1, params.dueDay);
    }
  } else {
    dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  const { data, error } = await supabase
    .from("bills")
    .insert({
      user_id: params.userId,
      name: params.name,
      amount: params.amount,
      category: params.category as any,
      due_date: dueDate.toISOString().split("T")[0],
      frequency: "monthly" as any,
      is_recurring: true,
      reminder_enabled: true,
      linked_account_id: params.linkedAccountId,
      linked_debt_id: params.linkedDebtId,
      status: "pending" as any,
      payment_url: params.paymentUrl || null,
    })
    .select("id, name")
    .single();

  if (error) throw error;
  return { data, alreadyExisted: false };
}
