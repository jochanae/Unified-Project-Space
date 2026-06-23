import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (roleError || !roleData || !["admin", "super_admin"].includes(roleData.role)) {
      return new Response(
        JSON.stringify({ error: "Forbidden - admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Admin ${userId} creating demo account`);

    const demoEmail = "demo@intoiq.com";
    const demoPassword = "Demo2024!";

    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingDemo = existingUsers?.users?.find(u => u.email === demoEmail);

    let demoUserId: string;

    if (existingDemo) {
      demoUserId = existingDemo.id;
      console.log("Demo account already exists:", demoUserId);
    } else {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: demoEmail,
        password: demoPassword,
        email_confirm: true,
        user_metadata: { full_name: "Demo Account" }
      });

      if (createError) throw createError;
      demoUserId = newUser.user.id;
      console.log("Created new demo user:", demoUserId);
    }

    // Update profile
    await supabaseAdmin
      .from('profiles')
      .update({ subscription_tier: 'pro', full_name: 'Demo Account', username: 'demo_trader' })
      .eq('user_id', demoUserId);

    // Get or create paper portfolio
    const { data: existingPortfolio } = await supabaseAdmin
      .from('paper_portfolios')
      .select('id')
      .eq('user_id', demoUserId)
      .maybeSingle();

    let portfolioId: string;
    if (existingPortfolio) {
      portfolioId = existingPortfolio.id;
    } else {
      const { data: portfolio, error: portfolioError } = await supabaseAdmin
        .from('paper_portfolios')
        .insert({ user_id: demoUserId, balance: 85000, initial_balance: 100000 })
        .select()
        .single();
      if (portfolioError) throw portfolioError;
      portfolioId = portfolio.id;
    }

    // Clear existing demo data
    const tablesToClear = [
      'trades', 'paper_trades', 'reminders', 'budget_entries',
      'bills', 'savings_goals', 'net_worth_items', 'price_alerts',
      'notifications', 'conversations',
    ];
    for (const table of tablesToClear) {
      await supabaseAdmin.from(table).delete().eq('user_id', demoUserId);
    }
    // Clear plan items (but keep plans/sections which are auto-created)
    await supabaseAdmin.from('plan_items').delete().eq('user_id', demoUserId);

    // Get plan sections for plan items
    const { data: sections } = await supabaseAdmin
      .from('plan_sections')
      .select('id, name, plan_id')
      .eq('user_id', demoUserId);

    const sectionMap: Record<string, string> = {};
    if (sections) {
      for (const s of sections) {
        sectionMap[s.name] = s.id;
      }
    }

    // ====== TRADES (Journal) ======
    const trades = [
      { user_id: demoUserId, symbol: 'AAPL', trade_type: 'long', entry_price: 178.50, exit_price: 185.20, quantity: 50, status: 'closed', profit_loss: 335, entry_date: '2026-01-15T10:30:00Z', exit_date: '2026-01-22T14:15:00Z', notes: 'Strong earnings beat, tech sector momentum' },
      { user_id: demoUserId, symbol: 'TSLA', trade_type: 'long', entry_price: 245.00, exit_price: 238.00, quantity: 20, status: 'closed', profit_loss: -140, entry_date: '2026-01-18T09:45:00Z', exit_date: '2026-01-25T11:00:00Z', notes: 'Sold on delivery miss news' },
      { user_id: demoUserId, symbol: 'MSFT', trade_type: 'long', entry_price: 415.00, exit_price: 428.50, quantity: 30, status: 'closed', profit_loss: 405, entry_date: '2026-01-02T10:15:00Z', exit_date: '2026-01-10T14:30:00Z', notes: 'Copilot revenue catalyst. Clean breakout above 50-day MA.' },
      { user_id: demoUserId, symbol: 'AMD', trade_type: 'long', entry_price: 168.00, exit_price: 175.50, quantity: 45, status: 'closed', profit_loss: 337.50, entry_date: '2026-01-06T09:45:00Z', exit_date: '2026-01-14T11:00:00Z', notes: 'Data center chip demand thesis. Entered on pullback to support.' },
      { user_id: demoUserId, symbol: 'COIN', trade_type: 'long', entry_price: 245.00, exit_price: 232.00, quantity: 20, status: 'closed', profit_loss: -260, entry_date: '2026-01-08T10:00:00Z', exit_date: '2026-01-13T15:00:00Z', notes: 'Crypto sentiment trade. Stopped out on SEC news.' },
      { user_id: demoUserId, symbol: 'QQQ', trade_type: 'long', entry_price: 485.00, exit_price: 498.20, quantity: 50, status: 'closed', profit_loss: 660, entry_date: '2026-01-12T09:35:00Z', exit_date: '2026-01-22T14:45:00Z', notes: 'Tech sector momentum play. Scaled out at 2R target.' },
      { user_id: demoUserId, symbol: 'PLTR', trade_type: 'long', entry_price: 22.50, exit_price: 25.80, quantity: 200, status: 'closed', profit_loss: 660, entry_date: '2026-01-15T10:00:00Z', exit_date: '2026-01-28T11:30:00Z', notes: 'Government contract catalyst.' },
      { user_id: demoUserId, symbol: 'ROKU', trade_type: 'short', entry_price: 78.00, exit_price: 82.50, quantity: 40, status: 'closed', profit_loss: -180, entry_date: '2026-01-20T09:45:00Z', exit_date: '2026-01-23T10:30:00Z', notes: 'Bearish on streaming. Squeezed out.' },
      { user_id: demoUserId, symbol: 'SOFI', trade_type: 'long', entry_price: 10.80, exit_price: 12.40, quantity: 300, status: 'closed', profit_loss: 480, entry_date: '2026-01-22T10:15:00Z', exit_date: '2026-02-03T14:00:00Z', notes: 'Fintech recovery play.' },
      { user_id: demoUserId, symbol: 'META', trade_type: 'long', entry_price: 380.00, exit_price: 405.50, quantity: 25, status: 'closed', profit_loss: 637.50, entry_date: '2026-01-05T10:00:00Z', exit_date: '2026-01-20T14:30:00Z', notes: 'Reality Labs cost cuts positive' },
      { user_id: demoUserId, symbol: 'GOOGL', trade_type: 'short', entry_price: 142.00, exit_price: 138.50, quantity: 60, status: 'closed', profit_loss: 210, entry_date: '2026-01-08T09:35:00Z', exit_date: '2026-01-11T15:00:00Z', notes: 'Hedged before antitrust ruling' },
      { user_id: demoUserId, symbol: 'DIS', trade_type: 'long', entry_price: 112.00, exit_price: 108.50, quantity: 50, status: 'closed', profit_loss: -175, entry_date: '2026-01-25T10:00:00Z', exit_date: '2026-01-30T15:00:00Z', notes: 'Streaming profitability thesis. Cut early on weak guidance.' },
      { user_id: demoUserId, symbol: 'NVDA', trade_type: 'long', entry_price: 142.00, quantity: 30, status: 'open', entry_date: '2026-02-01T10:00:00Z', notes: 'AI chip demand thesis, long-term hold' },
      { user_id: demoUserId, symbol: 'GOOG', trade_type: 'long', entry_price: 175.00, quantity: 35, status: 'open', entry_date: '2026-02-03T10:00:00Z', notes: 'AI search momentum. Target $195. Stop at $168.' },
      { user_id: demoUserId, symbol: 'AMZN', trade_type: 'long', entry_price: 198.00, quantity: 25, status: 'open', entry_date: '2026-02-05T09:45:00Z', notes: 'AWS growth + retail margin expansion.' },
    ];
    await supabaseAdmin.from('trades').insert(trades);

    // ====== PAPER TRADES ======
    const paperTrades = [
      { user_id: demoUserId, portfolio_id: portfolioId, symbol: 'AAPL', trade_type: 'long', entry_price: 182.00, exit_price: 189.50, quantity: 60, status: 'closed', profit_loss: 450, entry_date: '2026-01-05T10:00:00Z', exit_date: '2026-01-15T14:00:00Z', notes: 'Testing breakout strategy' },
      { user_id: demoUserId, portfolio_id: portfolioId, symbol: 'TSLA', trade_type: 'short', entry_price: 255.00, exit_price: 248.00, quantity: 25, status: 'closed', profit_loss: 175, entry_date: '2026-01-10T09:30:00Z', exit_date: '2026-01-16T11:00:00Z', notes: 'Practiced shorting on weakness' },
      { user_id: demoUserId, portfolio_id: portfolioId, symbol: 'SPY', trade_type: 'long', entry_price: 498.00, exit_price: 502.50, quantity: 100, status: 'closed', profit_loss: 450, entry_date: '2026-01-20T09:35:00Z', exit_date: '2026-01-24T15:00:00Z', notes: 'Quick momentum scalp practice' },
      { user_id: demoUserId, portfolio_id: portfolioId, symbol: 'NVDA', trade_type: 'long', entry_price: 142.00, quantity: 50, status: 'open', entry_date: '2026-02-01T10:00:00Z', notes: 'AI chip thesis - practicing position sizing' },
      { user_id: demoUserId, portfolio_id: portfolioId, symbol: 'META', trade_type: 'long', entry_price: 595.00, quantity: 15, status: 'open', entry_date: '2026-02-04T09:45:00Z', notes: 'Testing mean reversion after pullback' },
    ];
    await supabaseAdmin.from('paper_trades').insert(paperTrades);

    // ====== BUDGET ENTRIES ======
    const budgetEntries = [
      { user_id: demoUserId, type: 'income', category: 'salary', amount: 6500, description: 'Monthly salary - Tech Corp', entry_date: '2026-02-01', is_recurring: true, recurring_interval: 'monthly' },
      { user_id: demoUserId, type: 'income', category: 'freelance', amount: 1200, description: 'Freelance web project', entry_date: '2026-02-10', is_recurring: false },
      { user_id: demoUserId, type: 'income', category: 'dividends', amount: 385, description: 'Quarterly dividend - SCHD', entry_date: '2026-01-15', is_recurring: true, recurring_interval: 'quarterly' },
      { user_id: demoUserId, type: 'income', category: 'salary', amount: 6500, description: 'Monthly salary - Tech Corp', entry_date: '2026-01-01', is_recurring: true, recurring_interval: 'monthly' },
      { user_id: demoUserId, type: 'income', category: 'side_hustle', amount: 450, description: 'Options premium collected', entry_date: '2026-01-20', is_recurring: false },
      { user_id: demoUserId, type: 'expense', category: 'housing', amount: 1800, description: 'Rent', entry_date: '2026-02-01', is_recurring: true, recurring_interval: 'monthly' },
      { user_id: demoUserId, type: 'expense', category: 'food', amount: 620, description: 'Groceries & dining', entry_date: '2026-02-05', is_recurring: false },
      { user_id: demoUserId, type: 'expense', category: 'transportation', amount: 280, description: 'Gas & transit', entry_date: '2026-02-03', is_recurring: true, recurring_interval: 'monthly' },
      { user_id: demoUserId, type: 'expense', category: 'utilities', amount: 185, description: 'Electric, water, internet', entry_date: '2026-02-02', is_recurring: true, recurring_interval: 'monthly' },
      { user_id: demoUserId, type: 'expense', category: 'subscriptions', amount: 95, description: 'Streaming, gym, apps', entry_date: '2026-02-01', is_recurring: true, recurring_interval: 'monthly' },
      { user_id: demoUserId, type: 'expense', category: 'education', amount: 149, description: 'Trading course subscription', entry_date: '2026-02-01', is_recurring: true, recurring_interval: 'monthly' },
      { user_id: demoUserId, type: 'expense', category: 'insurance', amount: 340, description: 'Health insurance premium', entry_date: '2026-02-01', is_recurring: true, recurring_interval: 'monthly' },
      { user_id: demoUserId, type: 'expense', category: 'personal', amount: 175, description: 'Clothing & personal care', entry_date: '2026-02-12', is_recurring: false },
      { user_id: demoUserId, type: 'expense', category: 'food', amount: 580, description: 'Groceries & dining', entry_date: '2026-01-06', is_recurring: false },
      { user_id: demoUserId, type: 'expense', category: 'housing', amount: 1800, description: 'Rent', entry_date: '2026-01-01', is_recurring: true, recurring_interval: 'monthly' },
      { user_id: demoUserId, type: 'expense', category: 'entertainment', amount: 120, description: 'Concert tickets', entry_date: '2026-01-18', is_recurring: false },
      { user_id: demoUserId, type: 'expense', category: 'transportation', amount: 280, description: 'Gas & transit', entry_date: '2026-01-03', is_recurring: true, recurring_interval: 'monthly' },
      { user_id: demoUserId, type: 'expense', category: 'utilities', amount: 195, description: 'Electric, water, internet', entry_date: '2026-01-02', is_recurring: true, recurring_interval: 'monthly' },
    ];
    await supabaseAdmin.from('budget_entries').insert(budgetEntries);

    // ====== BILLS ======
    const bills = [
      { user_id: demoUserId, name: 'Rent', amount: 1800, due_day: 1, category: 'housing', is_autopay: true, is_paid_this_month: true },
      { user_id: demoUserId, name: 'Electric Bill', amount: 95, due_day: 15, category: 'utilities', is_autopay: true, is_paid_this_month: true },
      { user_id: demoUserId, name: 'Internet & Phone', amount: 90, due_day: 10, category: 'utilities', is_autopay: true, is_paid_this_month: true },
      { user_id: demoUserId, name: 'Car Insurance', amount: 145, due_day: 20, category: 'insurance', is_autopay: true, is_paid_this_month: false },
      { user_id: demoUserId, name: 'Health Insurance', amount: 340, due_day: 1, category: 'insurance', is_autopay: true, is_paid_this_month: true },
      { user_id: demoUserId, name: 'Gym Membership', amount: 45, due_day: 5, category: 'subscriptions', is_autopay: true, is_paid_this_month: true },
      { user_id: demoUserId, name: 'Spotify + Netflix', amount: 30, due_day: 12, category: 'subscriptions', is_autopay: true, is_paid_this_month: true },
      { user_id: demoUserId, name: 'Student Loan', amount: 350, due_day: 25, category: 'debt', is_autopay: false, is_paid_this_month: false },
      { user_id: demoUserId, name: 'Credit Card', amount: 200, due_day: 28, category: 'debt', is_autopay: false, is_paid_this_month: false },
    ];
    await supabaseAdmin.from('bills').insert(bills);

    // ====== SAVINGS GOALS ======
    const savingsGoals = [
      { user_id: demoUserId, title: 'Emergency Fund', target_amount: 15000, current_amount: 11250, emoji: '🛡️', status: 'active', deadline: '2026-06-30' },
      { user_id: demoUserId, title: 'Down Payment', target_amount: 50000, current_amount: 18500, emoji: '🏠', status: 'active', deadline: '2027-12-31' },
      { user_id: demoUserId, title: 'Vacation Fund', target_amount: 3000, current_amount: 2100, emoji: '✈️', status: 'active', deadline: '2026-08-01' },
      { user_id: demoUserId, title: 'New Laptop', target_amount: 2500, current_amount: 2500, emoji: '💻', status: 'completed', deadline: '2026-01-15' },
      { user_id: demoUserId, title: 'Trading Capital', target_amount: 25000, current_amount: 8750, emoji: '📈', status: 'active', deadline: '2026-12-31' },
    ];
    await supabaseAdmin.from('savings_goals').insert(savingsGoals);

    // ====== NET WORTH ITEMS ======
    const netWorthItems = [
      { user_id: demoUserId, name: 'Checking Account', type: 'asset', category: 'cash', amount: 4250, notes: 'Chase checking', review_frequency: 'monthly' },
      { user_id: demoUserId, name: 'Savings Account', type: 'asset', category: 'cash', amount: 11250, notes: 'Emergency fund - Ally HYSA', review_frequency: 'monthly' },
      { user_id: demoUserId, name: 'Roth IRA', type: 'asset', category: 'investment', amount: 32500, notes: 'Fidelity - Index funds', review_frequency: 'quarterly' },
      { user_id: demoUserId, name: '401(k)', type: 'asset', category: 'investment', amount: 48700, notes: 'Employer match 4%', review_frequency: 'quarterly' },
      { user_id: demoUserId, name: 'Brokerage Account', type: 'asset', category: 'investment', amount: 21800, notes: 'Individual stocks & ETFs', review_frequency: 'monthly' },
      { user_id: demoUserId, name: 'Crypto Portfolio', type: 'asset', category: 'investment', amount: 5200, notes: 'BTC & ETH', review_frequency: 'monthly' },
      { user_id: demoUserId, name: 'Car (2022 Honda Civic)', type: 'asset', category: 'property', amount: 18500, notes: 'KBB value', review_frequency: 'quarterly' },
      { user_id: demoUserId, name: 'Trading Capital', type: 'asset', category: 'investment', amount: 8750, notes: 'Options & swing trading', review_frequency: 'monthly' },
      { user_id: demoUserId, name: 'Student Loans', type: 'liability', category: 'debt', amount: 22400, notes: 'Federal loans - 4.5% APR', review_frequency: 'monthly' },
      { user_id: demoUserId, name: 'Car Loan', type: 'liability', category: 'debt', amount: 12300, notes: '3.9% APR - 36 months left', review_frequency: 'monthly' },
      { user_id: demoUserId, name: 'Credit Card Balance', type: 'liability', category: 'debt', amount: 1850, notes: 'Chase Sapphire - paying off', review_frequency: 'monthly' },
    ];
    await supabaseAdmin.from('net_worth_items').insert(netWorthItems);

    // ====== PRICE ALERTS ======
    const priceAlerts = [
      { user_id: demoUserId, symbol: 'AAPL', target_price: 195, direction: 'above', notes: 'Breakout level', is_triggered: false },
      { user_id: demoUserId, symbol: 'NVDA', target_price: 150, direction: 'above', notes: 'New ATH territory', is_triggered: false },
      { user_id: demoUserId, symbol: 'TSLA', target_price: 200, direction: 'below', notes: 'Support level - watch for bounce', is_triggered: false },
      { user_id: demoUserId, symbol: 'SPY', target_price: 500, direction: 'above', notes: 'Psychological level', is_triggered: false },
      { user_id: demoUserId, symbol: 'AMD', target_price: 180, direction: 'above', notes: 'Resistance breakout target', is_triggered: false },
      { user_id: demoUserId, symbol: 'MSFT', target_price: 380, direction: 'below', notes: 'Buy the dip level', is_triggered: false },
    ];
    await supabaseAdmin.from('price_alerts').insert(priceAlerts);

    // ====== REMINDERS ======
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const reminders = [
      { user_id: demoUserId, title: 'Pre-market analysis', description: 'Review overnight futures, scan watchlist, check economic calendar', trigger_at: tomorrow.toISOString(), type: 'trade', repeat_interval: 'daily' },
      { user_id: demoUserId, title: 'Review NVDA position', description: 'Check price action and analyst updates', trigger_at: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(), type: 'trade', repeat_interval: 'none' },
      { user_id: demoUserId, title: 'Weekly portfolio review', description: 'Analyze P&L, review open positions, update journal', trigger_at: nextWeek.toISOString(), type: 'journal', repeat_interval: 'weekly' },
      { user_id: demoUserId, title: 'Rebalance Roth IRA', description: 'Check allocation drift - target: 60% VTI, 30% VXUS, 10% BND', trigger_at: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString(), type: 'trade', repeat_interval: 'monthly' },
      { user_id: demoUserId, title: 'Complete options strategy lesson', description: 'Finish the iron condor module on Learn page', trigger_at: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString(), type: 'learning', repeat_interval: 'none' },
      { user_id: demoUserId, title: 'Review savings goal progress', description: 'Check emergency fund and down payment targets', trigger_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), type: 'journal', repeat_interval: 'monthly' },
    ];
    await supabaseAdmin.from('reminders').insert(reminders);

    // ====== NOTIFICATIONS ======
    const notifications = [
      { user_id: demoUserId, title: 'Welcome to IntoIQ Pro! 🎉', message: 'Your Pro subscription is active. Explore all premium features.', type: 'info', is_read: true, action_url: '/dashboard' },
      { user_id: demoUserId, title: 'AAPL trade closed with profit', message: 'Your AAPL long position closed at $185.20 for a $335 gain.', type: 'trade', is_read: true, action_url: '/journal' },
      { user_id: demoUserId, title: 'New lesson available', message: 'Iron Condor Strategy Masterclass is now live.', type: 'info', is_read: false, action_url: '/learn' },
      { user_id: demoUserId, title: 'Savings milestone reached! 🎯', message: 'Your Emergency Fund has reached 75% of its target.', type: 'info', is_read: false, action_url: '/my-finances' },
      { user_id: demoUserId, title: 'Weekly performance summary', message: '3 winning trades, 1 loss. Win rate: 75%. Total P&L: +$1,212.50', type: 'trade', is_read: false, action_url: '/analytics' },
      { user_id: demoUserId, title: 'Bill reminder: Student Loan', message: 'Your student loan payment of $350 is due in 5 days.', type: 'info', is_read: false, action_url: '/my-finances' },
    ];
    await supabaseAdmin.from('notifications').insert(notifications);

    // ====== PLAN ITEMS ======
    if (sectionMap['Foundations']) {
      await supabaseAdmin.from('plan_items').insert([
        { user_id: demoUserId, section_id: sectionMap['Foundations'], title: 'Build 6-month emergency fund', description: 'Save $15,000 in HYSA', status: 'in_progress', priority: 'high', sort_order: 0, notes: 'Currently at $11,250' },
        { user_id: demoUserId, section_id: sectionMap['Foundations'], title: 'Pay off credit card debt', description: 'Eliminate $1,850 CC balance', status: 'in_progress', priority: 'high', sort_order: 1, notes: 'Paying $600/month extra' },
        { user_id: demoUserId, section_id: sectionMap['Foundations'], title: 'Automate all bill payments', description: 'Set up autopay for remaining manual bills', status: 'completed', priority: 'medium', sort_order: 2 },
      ]);
    }
    if (sectionMap['Wealth Building']) {
      await supabaseAdmin.from('plan_items').insert([
        { user_id: demoUserId, section_id: sectionMap['Wealth Building'], title: 'Max out Roth IRA contribution', description: 'Contribute $7,000 for 2026', status: 'in_progress', priority: 'high', sort_order: 0, notes: '$4,200 contributed so far' },
        { user_id: demoUserId, section_id: sectionMap['Wealth Building'], title: 'Increase 401k to 15%', description: 'Currently at 8%', status: 'not_started', priority: 'medium', sort_order: 1 },
        { user_id: demoUserId, section_id: sectionMap['Wealth Building'], title: 'Start dividend growth portfolio', description: 'Build position in SCHD, VIG', status: 'in_progress', priority: 'medium', sort_order: 2, notes: 'Started with $3,000 in SCHD' },
      ]);
    }
    if (sectionMap['Protection']) {
      await supabaseAdmin.from('plan_items').insert([
        { user_id: demoUserId, section_id: sectionMap['Protection'], title: 'Review health insurance options', description: 'Compare plans during open enrollment', status: 'not_started', priority: 'medium', sort_order: 0 },
        { user_id: demoUserId, section_id: sectionMap['Protection'], title: 'Get term life insurance quote', description: '20-year term, $500k coverage', status: 'not_started', priority: 'low', sort_order: 1 },
      ]);
    }
    if (sectionMap['Entry Rules']) {
      await supabaseAdmin.from('plan_items').insert([
        { user_id: demoUserId, section_id: sectionMap['Entry Rules'], title: 'Wait for confirmed breakout above resistance', description: 'Volume must be 1.5x average', status: 'completed', priority: 'high', sort_order: 0 },
        { user_id: demoUserId, section_id: sectionMap['Entry Rules'], title: 'Use 20 EMA as dynamic support', description: 'Only enter long above 20 EMA on daily', status: 'completed', priority: 'high', sort_order: 1 },
        { user_id: demoUserId, section_id: sectionMap['Entry Rules'], title: 'Check earnings calendar before entry', description: 'Never enter within 5 days of earnings', status: 'in_progress', priority: 'medium', sort_order: 2 },
      ]);
    }
    if (sectionMap['Exit Rules']) {
      await supabaseAdmin.from('plan_items').insert([
        { user_id: demoUserId, section_id: sectionMap['Exit Rules'], title: 'Take profits at 2R', description: 'Scale out 50% at 2x risk, trail stop', status: 'completed', priority: 'high', sort_order: 0 },
        { user_id: demoUserId, section_id: sectionMap['Exit Rules'], title: 'Hard stop loss at 1R', description: 'No exceptions - protect capital', status: 'completed', priority: 'high', sort_order: 1 },
      ]);
    }
    if (sectionMap['Risk Management']) {
      await supabaseAdmin.from('plan_items').insert([
        { user_id: demoUserId, section_id: sectionMap['Risk Management'], title: 'Risk max 2% per trade', description: 'Position size based on stop distance', status: 'completed', priority: 'high', sort_order: 0 },
        { user_id: demoUserId, section_id: sectionMap['Risk Management'], title: 'Max 3 open positions', description: 'Avoid overexposure', status: 'in_progress', priority: 'high', sort_order: 1 },
        { user_id: demoUserId, section_id: sectionMap['Risk Management'], title: 'No trading first 15 min of open', description: 'Wait for initial volatility to settle', status: 'completed', priority: 'medium', sort_order: 2 },
      ]);
    }

    // ====== CONVERSATIONS (Quinn history) ======
    const conversations = [
      { user_id: demoUserId, title: 'Options Strategy for Beginners', messages: JSON.stringify([
        { role: 'user', content: 'Quinn, can you explain covered calls in simple terms?' },
        { role: 'assistant', content: 'A covered call is one of the safest options strategies! You own 100 shares and sell a call option against them.\n\n**Think of it like renting out your stocks:**\n- You collect premium upfront\n- In exchange, you agree to sell at a specific strike price\n\n**Example:** Own 100 AAPL at $180. Sell $190 call for $3.00.\n- Pocket $300 immediately\n- Below $190: keep shares AND $300\n- Above $190: sell at $190 ($10/share profit + $300)\n\nThe tradeoff: you cap upside, but generate consistent income.' }
      ]) },
      { user_id: demoUserId, title: 'Risk Management Deep Dive', messages: JSON.stringify([
        { role: 'user', content: 'How should I size my positions? I have a $25,000 account.' },
        { role: 'assistant', content: '**The 2% Rule:** Never risk more than 2% ($500) on a single trade.\n\n**Position sizing:** Stop loss $5 below entry → $500 ÷ $5 = 100 shares max.\n\n**Portfolio heat:** Keep total open risk under 6% ($1,500). That\'s max 3 positions at 2% each.\n\nThis ensures no single trade can significantly damage your account.' }
      ]) },
    ];
    await supabaseAdmin.from('conversations').insert(conversations);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Demo account seeded with comprehensive data',
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error creating demo account:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
