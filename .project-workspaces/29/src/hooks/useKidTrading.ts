import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface KidPortfolio {
  id: string;
  user_id: string;
  balance: number;
  initial_balance: number;
  total_stars_earned: number;
  trades_completed: number;
  created_at: string;
  updated_at: string;
}

export interface KidTrade {
  id: string;
  user_id: string;
  portfolio_id: string;
  symbol: string;
  company_name: string | null;
  trade_type: 'buy' | 'sell';
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  entry_date: string;
  exit_date: string | null;
  profit_loss: number | null;
  status: 'open' | 'closed';
  notes: string | null;
  emoji: string | null;
  created_at: string;
  updated_at: string;
}

export interface KidTradeInput {
  symbol: string;
  company_name?: string;
  entry_price: number;
  quantity: number;
  notes?: string;
  emoji?: string;
}

// Kid-friendly stock options with company names
export const KID_FRIENDLY_STOCKS = [
  { symbol: 'AAPL', name: 'Apple', emoji: '🍎', description: 'iPhones & MacBooks' },
  { symbol: 'DIS', name: 'Disney', emoji: '🏰', description: 'Movies & Theme Parks' },
  { symbol: 'NFLX', name: 'Netflix', emoji: '🎬', description: 'Streaming Shows' },
  { symbol: 'SBUX', name: 'Starbucks', emoji: '☕', description: 'Coffee & Treats' },
  { symbol: 'NKE', name: 'Nike', emoji: '👟', description: 'Sneakers & Sports' },
  { symbol: 'TSLA', name: 'Tesla', emoji: '🚗', description: 'Electric Cars' },
  { symbol: 'AMZN', name: 'Amazon', emoji: '📦', description: 'Online Shopping' },
  { symbol: 'GOOGL', name: 'Google', emoji: '🔍', description: 'Search & YouTube' },
  { symbol: 'MSFT', name: 'Microsoft', emoji: '💻', description: 'Xbox & Windows' },
  { symbol: 'MCD', name: "McDonald's", emoji: '🍔', description: 'Fast Food' },
];

export function useKidTrading(portfolioId?: string | null) {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<KidPortfolio | null>(null);
  const [trades, setTrades] = useState<KidTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPortfolio = async () => {
    if (!user) return;
    
    try {
      let data;

      if (portfolioId) {
        // Fetch the specific portfolio for this kid
        const result = await supabase
          .from('kid_portfolios')
          .select('*')
          .eq('id', portfolioId)
          .eq('user_id', user.id)
          .maybeSingle();
        if (result.error && result.error.code !== 'PGRST116') throw result.error;
        data = result.data;
      } else {
        // Fallback: fetch the first portfolio for this user (legacy behavior)
        const result = await supabase
          .from('kid_portfolios')
          .select('*')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();
        if (result.error && result.error.code !== 'PGRST116') throw result.error;
        data = result.data;
      }

      // Create portfolio if doesn't exist (only if no specific portfolioId requested)
      if (!data && !portfolioId) {
        const { data: newPortfolio, error: createError } = await supabase
          .from('kid_portfolios')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (createError) throw createError;
        data = newPortfolio;
      }

      setPortfolio(data as KidPortfolio | null);
    } catch (error) {
      console.error('Error fetching kid portfolio:', error);
      toast.error('Oops! Could not load your piggy bank 🐷');
    }
  };

  const fetchTrades = async () => {
    if (!user || !portfolio) return;
    
    try {
      const { data, error } = await supabase
        .from('kid_trades')
        .select('*')
        .eq('user_id', user.id)
        .eq('portfolio_id', portfolio.id)
        .order('entry_date', { ascending: false });

      if (error) throw error;
      setTrades(data as KidTrade[]);
    } catch (error) {
      console.error('Error fetching kid trades:', error);
      toast.error('Could not load your trades 📊');
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await fetchPortfolio();
      setIsLoading(false);
    };
    init();
  }, [user, portfolioId]);

  useEffect(() => {
    if (portfolio) {
      fetchTrades();
    }
  }, [portfolio]);

  const buyStock = async (input: KidTradeInput) => {
    if (!user || !portfolio) return null;

    const totalCost = input.entry_price * input.quantity;
    
    if (totalCost > portfolio.balance) {
      toast.error('Not enough coins in your piggy bank! 🐷');
      return null;
    }

    try {
      const { data: trade, error: tradeError } = await supabase
        .from('kid_trades')
        .insert({
          user_id: user.id,
          portfolio_id: portfolio.id,
          symbol: input.symbol.toUpperCase(),
          company_name: input.company_name || null,
          trade_type: 'buy',
          entry_price: input.entry_price,
          quantity: input.quantity,
          notes: input.notes || null,
          emoji: input.emoji || '🎯',
          status: 'open',
        })
        .select()
        .single();

      if (tradeError) throw tradeError;

      // Update balance
      const newBalance = portfolio.balance - totalCost;
      const { error: balanceError } = await supabase
        .from('kid_portfolios')
        .update({ balance: newBalance })
        .eq('id', portfolio.id);

      if (balanceError) throw balanceError;

      setPortfolio(prev => prev ? { ...prev, balance: newBalance } : null);
      setTrades(prev => [trade as KidTrade, ...prev]);
      toast.success(`🎉 You bought ${input.quantity} shares of ${input.symbol}!`);
      return trade as KidTrade;
    } catch (error) {
      console.error('Error buying stock:', error);
      toast.error('Oops! Something went wrong 😅');
      return null;
    }
  };

  const sellStock = async (tradeId: string, exitPrice: number) => {
    if (!user || !portfolio) return null;

    const trade = trades.find(t => t.id === tradeId);
    if (!trade || trade.status === 'closed') return null;

    const profitLoss = (exitPrice - trade.entry_price) * trade.quantity;
    const returnAmount = (trade.entry_price * trade.quantity) + profitLoss;
    const earnedStar = profitLoss > 0 ? 1 : 0;

    try {
      const { data: updatedTrade, error: tradeError } = await supabase
        .from('kid_trades')
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

      // Update balance and stats
      const newBalance = portfolio.balance + returnAmount;
      const { error: portfolioError } = await supabase
        .from('kid_portfolios')
        .update({ 
          balance: newBalance,
          total_stars_earned: portfolio.total_stars_earned + earnedStar,
          trades_completed: portfolio.trades_completed + 1,
        })
        .eq('id', portfolio.id);

      if (portfolioError) throw portfolioError;

      setPortfolio(prev => prev ? { 
        ...prev, 
        balance: newBalance,
        total_stars_earned: prev.total_stars_earned + earnedStar,
        trades_completed: prev.trades_completed + 1,
      } : null);
      setTrades(prev => prev.map(t => t.id === tradeId ? updatedTrade as KidTrade : t));
      
      if (profitLoss > 0) {
        toast.success(`🌟 Amazing! You earned $${profitLoss.toFixed(2)} and a star!`);
      } else if (profitLoss < 0) {
        toast.info(`📚 Learning moment! You lost $${Math.abs(profitLoss).toFixed(2)}. Keep practicing!`);
      } else {
        toast.success(`👍 You broke even! Not bad!`);
      }
      
      return updatedTrade as KidTrade;
    } catch (error) {
      console.error('Error selling stock:', error);
      toast.error('Oops! Could not sell 😅');
      return null;
    }
  };

  const resetPortfolio = async () => {
    if (!user || !portfolio) return false;

    try {
      await supabase
        .from('kid_trades')
        .delete()
        .eq('portfolio_id', portfolio.id);

      const { error } = await supabase
        .from('kid_portfolios')
        .update({ 
          balance: portfolio.initial_balance,
          total_stars_earned: 0,
          trades_completed: 0,
        })
        .eq('id', portfolio.id);

      if (error) throw error;

      setPortfolio(prev => prev ? { 
        ...prev, 
        balance: prev.initial_balance,
        total_stars_earned: 0,
        trades_completed: 0,
      } : null);
      setTrades([]);
      toast.success('🎮 Fresh start! Your piggy bank is reset!');
      return true;
    } catch (error) {
      console.error('Error resetting portfolio:', error);
      toast.error('Could not reset 😅');
      return false;
    }
  };

  // Calculate kid-friendly stats
  const openPositions = trades.filter(t => t.status === 'open');
  const closedTrades = trades.filter(t => t.status === 'closed');
  const totalProfitLoss = closedTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
  const winningTrades = closedTrades.filter(t => t.profit_loss && t.profit_loss > 0).length;
  const winRate = closedTrades.length > 0 ? (winningTrades / closedTrades.length) * 100 : 0;
  
  const openPositionValue = openPositions.reduce((sum, t) => sum + (t.entry_price * t.quantity), 0);
  const portfolioValue = (portfolio?.balance || 0) + openPositionValue;
  const totalReturn = portfolio ? ((portfolioValue - portfolio.initial_balance) / portfolio.initial_balance) * 100 : 0;

  const stats = {
    balance: portfolio?.balance || 0,
    initialBalance: portfolio?.initial_balance || 1000,
    portfolioValue,
    totalReturn,
    totalProfitLoss,
    openPositions: openPositions.length,
    closedTrades: closedTrades.length,
    winRate,
    starsEarned: portfolio?.total_stars_earned || 0,
    tradesCompleted: portfolio?.trades_completed || 0,
  };

  return {
    portfolio,
    trades,
    openPositions,
    closedTrades,
    stats,
    isLoading,
    buyStock,
    sellStock,
    resetPortfolio,
    refetch: fetchTrades,
  };
}
