import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type AssetClass = 'equity' | 'forex' | 'crypto' | 'options';

export interface PaperPortfolio {
  id: string;
  user_id: string;
  balance: number;
  initial_balance: number;
  created_at: string;
  updated_at: string;
}

export interface PaperTrade {
  id: string;
  user_id: string;
  portfolio_id: string;
  symbol: string;
  trade_type: 'long' | 'short';
  asset_class: AssetClass;
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  entry_date: string;
  exit_date: string | null;
  profit_loss: number | null;
  status: 'open' | 'closed';
  notes: string | null;
  stop_loss: number | null;
  take_profit: number | null;
  strike_price: number | null;
  expiration_date: string | null;
  option_type: string | null;
  contract_size: number;
  base_currency: string | null;
  quote_currency: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaperTradeInput {
  symbol: string;
  trade_type: 'long' | 'short';
  asset_class?: AssetClass;
  entry_price: number;
  quantity: number;
  notes?: string | null;
  stop_loss?: number | null;
  take_profit?: number | null;
  strike_price?: number | null;
  expiration_date?: string | null;
  option_type?: string | null;
  contract_size?: number;
  base_currency?: string | null;
  quote_currency?: string | null;
}

export interface PaperOrder {
  id: string;
  user_id: string;
  portfolio_id: string;
  trade_id: string;
  order_type: 'stop_loss' | 'take_profit';
  trigger_price: number;
  status: 'pending' | 'triggered' | 'cancelled';
  triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

export function usePaperTrading() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<PaperPortfolio | null>(null);
  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const [orders, setOrders] = useState<PaperOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [historyFilter, setHistoryFilter] = useState<{ assetClass?: AssetClass; symbol?: string }>({});

  const fetchPortfolio = async () => {
    if (!user) return;
    try {
      let { data, error } = await supabase
        .from('paper_portfolios')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        const { data: newPortfolio, error: createError } = await supabase
          .from('paper_portfolios')
          .upsert({ user_id: user.id }, { onConflict: 'user_id' })
          .select()
          .single();
        if (createError) throw createError;
        data = newPortfolio;
      }

      setPortfolio(data as PaperPortfolio);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      toast.error('Failed to load portfolio');
    }
  };

  const fetchTrades = async () => {
    if (!user || !portfolio) return;
    try {
      let query = supabase
        .from('paper_trades')
        .select('*')
        .eq('user_id', user.id)
        .eq('portfolio_id', portfolio.id)
        .order('entry_date', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      setTrades((data || []) as PaperTrade[]);
    } catch (error) {
      console.error('Error fetching trades:', error);
      toast.error('Failed to load trades');
    }
  };

  const fetchOrders = async () => {
    if (!user || !portfolio) return;
    try {
      const { data, error } = await supabase
        .from('paper_orders')
        .select('*')
        .eq('user_id', user.id)
        .eq('portfolio_id', portfolio.id)
        .eq('status', 'pending');
      if (error) throw error;
      setOrders((data || []) as PaperOrder[]);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await fetchPortfolio();
      setIsLoading(false);
    };
    init();
  }, [user]);

  useEffect(() => {
    if (portfolio) {
      fetchTrades();
      fetchOrders();
    }
  }, [portfolio]);

  const openTrade = async (input: PaperTradeInput) => {
    if (!user || !portfolio) return null;

    const contractSize = input.contract_size || 1;
    const totalCost = input.entry_price * input.quantity * contractSize;

    if (totalCost > portfolio.balance) {
      toast.error('Insufficient funds for this trade');
      return null;
    }

    try {
      const { data: trade, error: tradeError } = await supabase
        .from('paper_trades')
        .insert({
          user_id: user.id,
          portfolio_id: portfolio.id,
          symbol: input.symbol.toUpperCase(),
          trade_type: input.trade_type,
          asset_class: input.asset_class || 'equity',
          entry_price: input.entry_price,
          quantity: input.quantity,
          notes: input.notes || null,
          stop_loss: input.stop_loss || null,
          take_profit: input.take_profit || null,
          strike_price: input.strike_price || null,
          expiration_date: input.expiration_date || null,
          option_type: input.option_type || null,
          contract_size: contractSize,
          base_currency: input.base_currency || null,
          quote_currency: input.quote_currency || null,
          status: 'open',
        })
        .select()
        .single();

      if (tradeError) throw tradeError;

      // Create stop-loss / take-profit orders if specified
      const ordersToCreate: any[] = [];
      if (input.stop_loss) {
        ordersToCreate.push({
          user_id: user.id,
          portfolio_id: portfolio.id,
          trade_id: trade.id,
          order_type: 'stop_loss',
          trigger_price: input.stop_loss,
          status: 'pending',
        });
      }
      if (input.take_profit) {
        ordersToCreate.push({
          user_id: user.id,
          portfolio_id: portfolio.id,
          trade_id: trade.id,
          order_type: 'take_profit',
          trigger_price: input.take_profit,
          status: 'pending',
        });
      }
      if (ordersToCreate.length > 0) {
        await supabase.from('paper_orders').insert(ordersToCreate);
      }

      // Update balance
      const newBalance = portfolio.balance - totalCost;
      const { error: balanceError } = await supabase
        .from('paper_portfolios')
        .update({ balance: newBalance })
        .eq('id', portfolio.id);
      if (balanceError) throw balanceError;

      setPortfolio(prev => prev ? { ...prev, balance: newBalance } : null);
      setTrades(prev => [trade as PaperTrade, ...prev]);
      await fetchOrders();
      toast.success(`Opened ${input.symbol} position`);
      return trade as PaperTrade;
    } catch (error) {
      console.error('Error opening trade:', error);
      toast.error('Failed to open trade');
      return null;
    }
  };

  const closeTrade = async (tradeId: string, exitPrice: number) => {
    if (!user || !portfolio) return null;

    const trade = trades.find(t => t.id === tradeId);
    if (!trade || trade.status === 'closed') return null;

    const diff = exitPrice - trade.entry_price;
    const multiplier = trade.trade_type === 'short' ? -1 : 1;
    const profitLoss = diff * trade.quantity * trade.contract_size * multiplier;
    const returnAmount = (trade.entry_price * trade.quantity * trade.contract_size) + profitLoss;

    try {
      const { data: updatedTrade, error: tradeError } = await supabase
        .from('paper_trades')
        .update({
          exit_price: exitPrice,
          exit_date: new Date().toISOString(),
          profit_loss: profitLoss,
          status: 'closed',
        })
        .eq('id', tradeId)
        .select()
        .single();
      if (tradeError) throw tradeError;

      // Cancel pending orders for this trade
      await supabase
        .from('paper_orders')
        .update({ status: 'cancelled' })
        .eq('trade_id', tradeId)
        .eq('status', 'pending');

      const newBalance = portfolio.balance + returnAmount;
      const { error: balanceError } = await supabase
        .from('paper_portfolios')
        .update({ balance: newBalance })
        .eq('id', portfolio.id);
      if (balanceError) throw balanceError;

      setPortfolio(prev => prev ? { ...prev, balance: newBalance } : null);
      setTrades(prev => prev.map(t => t.id === tradeId ? updatedTrade as PaperTrade : t));
      setOrders(prev => prev.filter(o => o.trade_id !== tradeId));

      const emoji = profitLoss >= 0 ? '🎉' : '📉';
      toast.success(`${emoji} Closed ${trade.symbol} for ${profitLoss >= 0 ? '+' : ''}$${profitLoss.toFixed(2)}`);
      return updatedTrade as PaperTrade;
    } catch (error) {
      console.error('Error closing trade:', error);
      toast.error('Failed to close trade');
      return null;
    }
  };

  const resetPortfolio = async () => {
    if (!user || !portfolio) return false;
    try {
      await supabase.from('paper_orders').delete().eq('portfolio_id', portfolio.id);
      await supabase.from('paper_trades').delete().eq('portfolio_id', portfolio.id);
      const { error } = await supabase
        .from('paper_portfolios')
        .update({ balance: portfolio.initial_balance })
        .eq('id', portfolio.id);
      if (error) throw error;

      setPortfolio(prev => prev ? { ...prev, balance: prev.initial_balance } : null);
      setTrades([]);
      setOrders([]);
      toast.success('Portfolio reset successfully');
      return true;
    } catch (error) {
      console.error('Error resetting portfolio:', error);
      toast.error('Failed to reset portfolio');
      return false;
    }
  };

  // Calculate stats
  const openPositions = trades.filter(t => t.status === 'open');
  const closedTrades = trades.filter(t => t.status === 'closed');
  const totalProfitLoss = closedTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
  const winningTrades = closedTrades.filter(t => t.profit_loss && t.profit_loss > 0).length;
  const winRate = closedTrades.length > 0 ? (winningTrades / closedTrades.length) * 100 : 0;

  const openPositionValue = openPositions.reduce((sum, t) => sum + (t.entry_price * t.quantity * t.contract_size), 0);
  const portfolioValue = (portfolio?.balance || 0) + openPositionValue;
  const totalReturn = portfolio ? ((portfolioValue - portfolio.initial_balance) / portfolio.initial_balance) * 100 : 0;

  // Filtered history
  const filteredClosedTrades = closedTrades.filter(t => {
    if (historyFilter.assetClass && t.asset_class !== historyFilter.assetClass) return false;
    if (historyFilter.symbol && !t.symbol.includes(historyFilter.symbol.toUpperCase())) return false;
    return true;
  });

  const stats = {
    balance: portfolio?.balance || 0,
    initialBalance: portfolio?.initial_balance || 100000,
    portfolioValue,
    totalReturn,
    totalProfitLoss,
    openPositions: openPositions.length,
    closedTrades: closedTrades.length,
    winRate,
    openPositionValue,
  };

  return {
    portfolio,
    trades,
    openPositions,
    closedTrades,
    filteredClosedTrades,
    orders,
    stats,
    isLoading,
    historyFilter,
    setHistoryFilter,
    openTrade,
    closeTrade,
    resetPortfolio,
    refetch: fetchTrades,
  };
}
