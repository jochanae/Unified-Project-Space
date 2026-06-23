import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { testGoal, testBudget, testBill, testTransaction } from './test-data';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://hrmyijlvmilxizrtjoyp.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhybXlpamx2bWlseGl6cnRqb3lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMjIxNzUsImV4cCI6MjA4MDg5ODE3NX0.TLGaFitFeU-IigY_7vA_0azlQPWrwPFUDqf5DofFVgc';

const getSeederClient = (): SupabaseClient => {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
  });
};

export interface SeededData {
  userId: string;
  goals: { id: string; title: string }[];
  budgets: { id: string; name: string }[];
  bills: { id: string; name: string }[];
  transactions: { id: string; description: string }[];
  seededSuccessfully: boolean;
}

export async function authenticateAndSeed(email: string, password: string): Promise<SeededData> {
  const supabase = getSeederClient();
  const seededData: SeededData = {
    userId: '',
    goals: [],
    budgets: [],
    bills: [],
    transactions: [],
    seededSuccessfully: false,
  };

  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError || !authData.user) {
      console.warn('Could not authenticate for seeding:', authError?.message);
      return seededData;
    }

    seededData.userId = authData.user.id;
    console.log(`Seeding test data for user: ${seededData.userId}`);

    // Seed goal
    const { data: goalData } = await supabase.from('goals').upsert({
      user_id: seededData.userId,
      title: testGoal.title,
      target_amount: parseFloat(testGoal.targetAmount),
      current_amount: 1000,
      description: testGoal.description,
      goal_type: 'personal',
    }, { onConflict: 'user_id,title' }).select().single();
    if (goalData) seededData.goals.push({ id: goalData.id, title: goalData.title });

    // Seed budget
    const { data: budgetData } = await supabase.from('budgets').upsert({
      user_id: seededData.userId,
      name: testBudget.name,
      amount: parseFloat(testBudget.amount),
      spent: 150,
      category: 'food',
      period: 'monthly',
    }, { onConflict: 'user_id,name' }).select().single();
    if (budgetData) seededData.budgets.push({ id: budgetData.id, name: budgetData.name });

    // Seed bill
    const { data: billData } = await supabase.from('bills').upsert({
      user_id: seededData.userId,
      name: testBill.name,
      amount: parseFloat(testBill.amount),
      due_date: testBill.dueDate,
      status: 'pending',
      frequency: 'monthly',
      category: 'utilities',
    }, { onConflict: 'user_id,name' }).select().single();
    if (billData) seededData.bills.push({ id: billData.id, name: billData.name });

    seededData.seededSuccessfully = true;
    console.log('Test data seeding complete');
  } catch (error) {
    console.error('Error seeding test data:', error);
  }

  return seededData;
}
