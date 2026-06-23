import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { detectBroker, brokerParsers } from '@/lib/brokerParsers';

export interface Trade {
  id: string;
  user_id: string;
  symbol: string;
  trade_type: 'long' | 'short';
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  entry_date: string;
  exit_date: string | null;
  profit_loss: number | null;
  status: 'open' | 'closed';
  notes: string | null;
  trade_mode: 'real' | 'paper';
  asset_class: string;
  tags: string[];
  emotion: string | null;
  screenshot_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface TradeInput {
  symbol: string;
  trade_type: 'long' | 'short';
  entry_price: number;
  exit_price?: number | null;
  quantity: number;
  entry_date: string;
  exit_date?: string | null;
  notes?: string | null;
  status?: 'open' | 'closed';
  trade_mode?: 'real' | 'paper';
  asset_class?: string;
  tags?: string[];
  emotion?: string | null;
  screenshot_url?: string | null;
}

export function useTrades() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTrades = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false });

      if (error) throw error;
      setTrades((data || []).map(d => ({
        ...d,
        trade_mode: d.trade_mode || 'real',
        asset_class: d.asset_class || 'equity',
        tags: d.tags || [],
        emotion: d.emotion || null,
        screenshot_url: d.screenshot_url || null,
      })) as Trade[]);
    } catch (error) {
      console.error('Error fetching trades:', error);
      toast.error('Failed to load trades');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrades();
  }, [user]);

  const addTrade = async (input: TradeInput) => {
    if (!user) return null;

    const profitLoss = input.exit_price && input.status === 'closed'
      ? calculateProfitLoss(input)
      : null;

    try {
      const { data, error } = await supabase
        .from('trades')
        .insert({
          user_id: user.id,
          symbol: input.symbol.toUpperCase(),
          trade_type: input.trade_type,
          entry_price: input.entry_price,
          exit_price: input.exit_price || null,
          quantity: input.quantity,
          entry_date: input.entry_date,
          exit_date: input.exit_date || null,
          profit_loss: profitLoss,
          status: input.status || 'open',
          notes: input.notes || null,
          trade_mode: input.trade_mode || 'real',
          asset_class: input.asset_class || 'equity',
          tags: input.tags || [],
          emotion: input.emotion || null,
          screenshot_url: input.screenshot_url || null,
        })
        .select()
        .single();

      if (error) throw error;
      
      const trade = {
        ...data,
        trade_mode: data.trade_mode || 'real',
        asset_class: data.asset_class || 'equity',
        tags: data.tags || [],
        emotion: data.emotion || null,
        screenshot_url: data.screenshot_url || null,
      } as Trade;
      setTrades(prev => [trade, ...prev]);
      toast.success('Trade added successfully');
      return trade;
    } catch (error) {
      console.error('Error adding trade:', error);
      toast.error('Failed to add trade');
      return null;
    }
  };

  const updateTrade = async (id: string, input: Partial<TradeInput>) => {
    if (!user) return null;

    const existingTrade = trades.find(t => t.id === id);
    if (!existingTrade) return null;

    const updatedData = { ...existingTrade, ...input };
    const profitLoss = updatedData.exit_price && updatedData.status === 'closed'
      ? calculateProfitLoss(updatedData as TradeInput)
      : null;

    try {
      const { data, error } = await supabase
        .from('trades')
        .update({
          symbol: updatedData.symbol?.toUpperCase(),
          trade_type: updatedData.trade_type,
          entry_price: updatedData.entry_price,
          exit_price: updatedData.exit_price || null,
          quantity: updatedData.quantity,
          entry_date: updatedData.entry_date,
          exit_date: updatedData.exit_date || null,
          profit_loss: profitLoss,
          status: updatedData.status,
          notes: updatedData.notes || null,
          trade_mode: updatedData.trade_mode || 'real',
          asset_class: updatedData.asset_class || 'equity',
          tags: updatedData.tags || [],
          emotion: updatedData.emotion || null,
          screenshot_url: updatedData.screenshot_url || null,
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      
      const trade = {
        ...data,
        trade_mode: data.trade_mode || 'real',
        asset_class: data.asset_class || 'equity',
        tags: data.tags || [],
        emotion: data.emotion || null,
        screenshot_url: data.screenshot_url || null,
      } as Trade;
      setTrades(prev => prev.map(t => t.id === id ? trade : t));
      toast.success('Trade updated successfully');
      return trade;
    } catch (error) {
      console.error('Error updating trade:', error);
      toast.error('Failed to update trade');
      return null;
    }
  };

  const deleteTrade = async (id: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('trades')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      
      setTrades(prev => prev.filter(t => t.id !== id));
      toast.success('Trade deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting trade:', error);
      toast.error('Failed to delete trade');
      return false;
    }
  };

  const closeTrade = async (id: string, exitPrice: number, exitDate: string) => {
    return updateTrade(id, {
      exit_price: exitPrice,
      exit_date: exitDate,
      status: 'closed',
    });
  };

  const exportTrades = () => {
    const headers = ['Symbol', 'Type', 'Entry Price', 'Exit Price', 'Quantity', 'Entry Date', 'Exit Date', 'P&L', 'Status', 'Mode', 'Asset Class', 'Tags', 'Emotion', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...trades.map(trade => [
        trade.symbol,
        trade.trade_type,
        trade.entry_price,
        trade.exit_price || '',
        trade.quantity,
        trade.entry_date,
        trade.exit_date || '',
        trade.profit_loss || '',
        trade.status,
        trade.trade_mode,
        trade.asset_class,
        `"${(trade.tags || []).join(';')}"`,
        trade.emotion || '',
        `"${(trade.notes || '').replace(/"/g, '""')}"`,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `trades_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Trades exported successfully');
  };

  const importTrades = async (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          const headers = lines[0].split(',').map(h => h.trim());
          
          const broker = detectBroker(headers.map(h => h.toLowerCase()));
          
          const importedTrades: TradeInput[] = [];
          
          for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length < 2) continue;
            
            const trade = broker.parse(values, headers);
            
            if (trade && trade.symbol && trade.entry_price > 0) {
              importedTrades.push(trade);
            }
          }
          
          let successCount = 0;
          for (const trade of importedTrades) {
            const result = await addTrade(trade);
            if (result) successCount++;
          }
          
          const brokerName = broker.name !== 'Generic/IntoIQ' ? ` (${broker.name} format)` : '';
          toast.success(`Imported ${successCount} of ${importedTrades.length} trades${brokerName}`);
          resolve(successCount > 0);
        } catch (error) {
          console.error('Error importing trades:', error);
          toast.error('Failed to import trades');
          resolve(false);
        }
      };
      reader.readAsText(file);
    });
  };

  const uploadScreenshot = async (file: File): Promise<string | null> => {
    if (!user) return null;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('trade-screenshots')
      .upload(fileName, file);
    
    if (error) {
      console.error('Error uploading screenshot:', error);
      toast.error('Failed to upload screenshot');
      return null;
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('trade-screenshots')
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  // Stats calculations
  const stats = {
    totalTrades: trades.length,
    openTrades: trades.filter(t => t.status === 'open').length,
    closedTrades: trades.filter(t => t.status === 'closed').length,
    winningTrades: trades.filter(t => t.profit_loss && t.profit_loss > 0).length,
    losingTrades: trades.filter(t => t.profit_loss && t.profit_loss < 0).length,
    totalProfitLoss: trades.reduce((sum, t) => sum + (t.profit_loss || 0), 0),
    winRate: trades.filter(t => t.status === 'closed').length > 0
      ? (trades.filter(t => t.profit_loss && t.profit_loss > 0).length / trades.filter(t => t.status === 'closed').length) * 100
      : 0,
  };

  return {
    trades,
    isLoading,
    stats,
    addTrade,
    updateTrade,
    deleteTrade,
    closeTrade,
    exportTrades,
    importTrades,
    uploadScreenshot,
    refetch: fetchTrades,
  };
}

function calculateProfitLoss(trade: TradeInput): number {
  if (!trade.exit_price) return 0;
  
  const diff = trade.exit_price - trade.entry_price;
  const multiplier = trade.trade_type === 'short' ? -1 : 1;
  return diff * trade.quantity * multiplier;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  
  return result;
}
