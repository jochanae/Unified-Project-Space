import { useState } from 'react';
import { Trade, TradeInput } from '@/hooks/useTrades';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TradeForm } from './TradeForm';
import { TradeSparkline } from './TradeSparkline';
import { format } from 'date-fns';
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TradeTableProps {
  trades: Trade[];
  onUpdate: (id: string, data: Partial<TradeInput>) => Promise<unknown>;
  onDelete: (id: string) => Promise<boolean>;
  onClose: (id: string, exitPrice: number, exitDate: string) => Promise<unknown>;
  onUploadScreenshot?: (file: File) => Promise<string | null>;
  onTradeClick?: (trade: Trade) => void;
  selectedTradeId?: string;
  showSparklines?: boolean;
}

export function TradeTable({ 
  trades, 
  onUpdate, 
  onDelete, 
  onClose,
  onUploadScreenshot,
  onTradeClick,
  selectedTradeId,
  showSparklines = false,
}: TradeTableProps) {
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [closingTrade, setClosingTrade] = useState<Trade | null>(null);
  const [deletingTrade, setDeletingTrade] = useState<Trade | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const handleEdit = async (data: TradeInput) => {
    if (editingTrade) {
      await onUpdate(editingTrade.id, data);
    }
  };

  const handleClose = async (data: TradeInput) => {
    if (closingTrade && data.exit_price && data.exit_date) {
      await onClose(closingTrade.id, data.exit_price, data.exit_date);
    }
  };

  const handleDelete = async () => {
    if (deletingTrade) {
      await onDelete(deletingTrade.id);
      setDeletingTrade(null);
    }
  };

  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <TrendingUp className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">No trades yet</h3>
        <p className="text-muted-foreground text-sm">
          Start logging your trades to track your performance
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Symbol</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Entry</TableHead>
              <TableHead className="text-right">Exit</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">P&L</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]">
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground mx-auto" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map((trade) => (
              <TableRow 
                key={trade.id} 
                className={cn(
                  'group cursor-pointer transition-colors',
                  selectedTradeId === trade.id && 'bg-primary/5 border-l-2 border-l-primary'
                )}
                onClick={() => onTradeClick?.(trade)}
              >
                <TableCell className="font-semibold">
                  <div className="flex items-center gap-2">
                    {trade.symbol}
                    {showSparklines && (
                      <TradeSparkline
                        symbol={trade.symbol}
                        entryPrice={trade.entry_price}
                        exitPrice={trade.exit_price}
                        status={trade.status}
                      />
                    )}
                    {trade.tags && trade.tags.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">+{trade.tags.length}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px]',
                      trade.trade_mode === 'paper'
                        ? 'border-chart-4/50 text-chart-4 bg-chart-4/10'
                        : 'border-primary/50 text-primary bg-primary/10'
                    )}
                  >
                    {trade.trade_mode === 'paper' ? '📝' : '💰'} {trade.trade_mode}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      trade.trade_type === 'long'
                        ? 'border-gain/50 text-gain bg-gain/10'
                        : 'border-loss/50 text-loss bg-loss/10'
                    )}
                  >
                    {trade.trade_type === 'long' ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {trade.trade_type}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(trade.entry_price)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {trade.exit_price ? formatCurrency(trade.exit_price) : '—'}
                </TableCell>
                <TableCell className="text-right font-mono">{trade.quantity}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {format(new Date(trade.entry_date), 'MMM d, yyyy')}
                </TableCell>
                <TableCell className="text-right">
                  {trade.profit_loss !== null ? (
                    <span
                      className={cn(
                        'font-semibold font-mono',
                        trade.profit_loss >= 0 ? 'text-gain' : 'text-loss'
                      )}
                    >
                      {trade.profit_loss >= 0 ? '+' : ''}
                      {formatCurrency(trade.profit_loss)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={trade.status === 'open' ? 'default' : 'secondary'}
                    className={cn(
                      trade.status === 'open'
                        ? 'bg-primary/10 text-primary border-primary/20'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {trade.status}
                  </Badge>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {trade.status === 'open' && (
                        <DropdownMenuItem onClick={() => setClosingTrade(trade)}>
                          <DollarSign className="h-4 w-4 mr-2" />
                          Close Trade
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => setEditingTrade(trade)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeletingTrade(trade)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      {editingTrade && (
        <TradeForm
          open={!!editingTrade}
          onOpenChange={(open) => !open && setEditingTrade(null)}
          onSubmit={handleEdit}
          onUploadScreenshot={onUploadScreenshot}
          initialData={editingTrade}
          mode="edit"
        />
      )}

      {/* Close Trade Dialog */}
      {closingTrade && (
        <TradeForm
          open={!!closingTrade}
          onOpenChange={(open) => !open && setClosingTrade(null)}
          onSubmit={handleClose}
          initialData={{
            ...closingTrade,
            exit_date: new Date().toISOString().split('T')[0],
          }}
          mode="close"
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingTrade} onOpenChange={(open) => !open && setDeletingTrade(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trade</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {deletingTrade?.symbol} trade? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
