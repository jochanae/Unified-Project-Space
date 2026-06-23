import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Target, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface OptionContract {
  strike: number;
  lastPrice: number;
  bid: number;
  ask: number;
  change: number;
  percentChange: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  inTheMoney: boolean;
  expiration: number;
}

interface OptionsData {
  symbol: string;
  underlyingPrice: number;
  expirationDates: number[];
  strikes: number[];
  calls: OptionContract[];
  puts: OptionContract[];
}

interface OptionsChainProps {
  symbol: string;
  onSelectOption?: (option: { symbol: string; strike: number; type: 'call' | 'put'; expiration: string; price: number }) => void;
  className?: string;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

const formatVolume = (v: number) => {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v?.toString() || '—';
};

export function OptionsChain({ symbol, onSelectOption, className }: OptionsChainProps) {
  const [data, setData] = useState<OptionsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedExpiration, setSelectedExpiration] = useState<string>('');
  const [viewMode, setViewMode] = useState<'calls' | 'puts' | 'both'>('both');

  const fetchOptions = async (expiration?: string) => {
    if (!symbol) return;
    setLoading(true);
    setError(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const publicKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || publicKey;

      const params = new URLSearchParams({ symbol, type: 'options' });
      if (expiration) params.set('expiration', expiration);

      const response = await fetch(`${supabaseUrl}/functions/v1/market-data?${params}`, {
        headers: {
          Accept: 'application/json',
          apikey: publicKey,
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch options data');
      }

      const json = await response.json();
      if (json.error) throw new Error(json.error);

      setData(json);
      if (!selectedExpiration && json.expirationDates?.length > 0) {
        setSelectedExpiration(json.expirationDates[0].toString());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load options');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (symbol) fetchOptions();
  }, [symbol]);

  useEffect(() => {
    if (selectedExpiration && data) {
      fetchOptions(selectedExpiration);
    }
  }, [selectedExpiration]);

  const handleSelect = (contract: OptionContract, type: 'call' | 'put') => {
    if (!onSelectOption || !data) return;
    const expDate = format(new Date(contract.expiration * 1000), 'yyyy-MM-dd');
    onSelectOption({
      symbol: data.symbol,
      strike: contract.strike,
      type,
      expiration: expDate,
      price: contract.lastPrice,
    });
  };

  const renderContractRow = (contract: OptionContract, type: 'call' | 'put') => {
    const isITM = contract.inTheMoney;
    return (
      <TableRow
        key={`${type}-${contract.strike}`}
        className={cn(
          'cursor-pointer hover:bg-accent/50 transition-colors',
          isITM && 'bg-primary/5'
        )}
        onClick={() => handleSelect(contract, type)}
      >
        <TableCell className="font-mono text-sm font-semibold">
          {formatCurrency(contract.strike)}
          {isITM && (
            <Badge variant="outline" className="ml-1 text-[9px] px-1 py-0 border-primary/30 text-primary">
              ITM
            </Badge>
          )}
        </TableCell>
        <TableCell className="font-mono text-sm">{formatCurrency(contract.lastPrice)}</TableCell>
        <TableCell className="font-mono text-xs text-muted-foreground">
          {contract.bid ? formatCurrency(contract.bid) : '—'}
        </TableCell>
        <TableCell className="font-mono text-xs text-muted-foreground">
          {contract.ask ? formatCurrency(contract.ask) : '—'}
        </TableCell>
        <TableCell className={cn('font-mono text-xs', contract.change >= 0 ? 'text-gain' : 'text-loss')}>
          {contract.change >= 0 ? '+' : ''}{contract.change?.toFixed(2) || '0.00'}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">{formatVolume(contract.volume)}</TableCell>
        <TableCell className="text-xs text-muted-foreground">{formatVolume(contract.openInterest)}</TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {(contract.impliedVolatility * 100).toFixed(1)}%
        </TableCell>
      </TableRow>
    );
  };

  const OptionTable = ({ contracts, type }: { contracts: OptionContract[]; type: 'call' | 'put' }) => (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Strike</TableHead>
            <TableHead>Last</TableHead>
            <TableHead>Bid</TableHead>
            <TableHead>Ask</TableHead>
            <TableHead>Change</TableHead>
            <TableHead>Vol</TableHead>
            <TableHead>OI</TableHead>
            <TableHead>IV</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contracts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-6 text-muted-foreground text-sm">
                No {type} contracts available
              </TableCell>
            </TableRow>
          ) : (
            contracts.map((c) => renderContractRow(c, type))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <Card className={cn('border-border/50', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5 text-chart-5" />
            Options Chain — {symbol}
            {data && (
              <Badge variant="outline" className="font-mono text-xs">
                ${data.underlyingPrice.toFixed(2)}
              </Badge>
            )}
          </CardTitle>

          <div className="flex items-center gap-2">
            {data && data.expirationDates.length > 0 && (
              <Select value={selectedExpiration} onValueChange={setSelectedExpiration}>
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue placeholder="Expiration" />
                </SelectTrigger>
                <SelectContent>
                  {data.expirationDates.slice(0, 12).map((ts) => (
                    <SelectItem key={ts} value={ts.toString()}>
                      {format(new Date(ts * 1000), 'MMM d, yyyy')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <p>{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => fetchOptions()}>
              Retry
            </Button>
          </div>
        ) : !data ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Enter a stock symbol to view options chain
          </div>
        ) : (
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
            <TabsList className="mb-3">
              <TabsTrigger value="both" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="calls" className="text-xs gap-1">
                <ArrowUp className="h-3 w-3 text-gain" /> Calls
              </TabsTrigger>
              <TabsTrigger value="puts" className="text-xs gap-1">
                <ArrowDown className="h-3 w-3 text-loss" /> Puts
              </TabsTrigger>
            </TabsList>

            <TabsContent value="calls" className="mt-0">
              <OptionTable contracts={data.calls} type="call" />
            </TabsContent>

            <TabsContent value="puts" className="mt-0">
              <OptionTable contracts={data.puts} type="put" />
            </TabsContent>

            <TabsContent value="both" className="mt-0 space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <ArrowUp className="h-3.5 w-3.5 text-gain" /> Calls
                </h4>
                <OptionTable contracts={data.calls} type="call" />
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <ArrowDown className="h-3.5 w-3.5 text-loss" /> Puts
                </h4>
                <OptionTable contracts={data.puts} type="put" />
              </div>
            </TabsContent>

            <p className="text-[10px] text-muted-foreground mt-3">
              💡 Click a contract to pre-fill the trade form. ITM = In The Money. IV = Implied Volatility. OI = Open Interest.
            </p>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
