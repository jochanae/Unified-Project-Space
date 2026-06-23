import { useState } from 'react';
import { Plus, Pencil, Trash2, Bell, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CollapsibleFinanceSection } from './CollapsibleFinanceSection';
import {
  ASSET_CATEGORIES,
  LIABILITY_CATEGORIES,
  type NetWorthItem,
} from '@/hooks/useNetWorth';
import { AddNetWorthItemDialog } from './AddNetWorthItemDialog';
import { EditNetWorthItemDialog } from './EditNetWorthItemDialog';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import type { UseMutationResult } from '@tanstack/react-query';
import type { NewNetWorthItem } from '@/hooks/useNetWorth';

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function getCategoryInfo(category: string, type: 'asset' | 'liability') {
  const list = type === 'asset' ? ASSET_CATEGORIES : LIABILITY_CATEGORIES;
  return list.find(c => c.value === category) || { label: category, emoji: '📋' };
}

interface NetWorthTrackerProps {
  items: NetWorthItem[];
  manualAssets: NetWorthItem[];
  manualLiabilities: NetWorthItem[];
  summary: {
    totalAssets: number;
    totalManualAssets: number;
    autoSyncedSavings: number;
    totalLiabilities: number;
    netWorth: number;
  };
  itemsDueForReview: NetWorthItem[];
  addItem: UseMutationResult<void, Error, NewNetWorthItem>;
  updateItem: UseMutationResult<void, Error, { id: string; amount: number; name?: string; notes?: string; category?: string; review_frequency?: string }>;
  deleteItem: UseMutationResult<void, Error, string>;
}

function ItemRow({
  item,
  onEdit,
  onDelete,
}: {
  item: NetWorthItem;
  onEdit: (item: NetWorthItem) => void;
  onDelete: (id: string) => void;
}) {
  const catInfo = getCategoryInfo(item.category, item.type as 'asset' | 'liability');
  const isDueForReview = item.next_review_at && new Date(item.next_review_at) <= new Date();

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/40 last:border-0 group">
      <span className="text-xl">{catInfo.emoji}</span>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEdit(item)}>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm truncate">{item.name}</span>
          {isDueForReview && (
            <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-600 dark:text-amber-400 gap-1 px-1.5 py-0 bg-amber-500/10">
              <Bell className="h-2.5 w-2.5" />
              Review
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {catInfo.label} · Updated {formatDistanceToNow(new Date(item.last_updated_at), { addSuffix: true })}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-bold text-sm tabular-nums">
          ${fmt(item.amount)}
        </span>
        <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onEdit(item)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive" onClick={() => onDelete(item.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function NetWorthTracker({
  items,
  manualAssets,
  manualLiabilities,
  summary,
  itemsDueForReview,
  addItem,
  updateItem,
  deleteItem,
}: NetWorthTrackerProps) {
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showAddLiability, setShowAddLiability] = useState(false);
  const [editingItem, setEditingItem] = useState<NetWorthItem | null>(null);

  return (
    <div className="space-y-4">
      {/* Review reminder banner */}
      {itemsDueForReview.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/10 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">
                {itemsDueForReview.length} item{itemsDueForReview.length > 1 ? 's' : ''} due for review
              </p>
              <p className="text-xs text-muted-foreground">
                Update your balances to keep net worth accurate
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-emerald-500/20 bg-emerald-500/5 shadow-sm">
          <CardContent className="p-3 text-center">
            <div className="h-7 w-7 rounded-lg bg-emerald-500/20 flex items-center justify-center mx-auto mb-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">${fmt(summary.totalAssets)}</p>
            <p className="text-[10px] font-medium text-muted-foreground">Total Assets</p>
          </CardContent>
        </Card>
        <Card className="border-rose-500/20 bg-rose-500/5 shadow-sm">
          <CardContent className="p-3 text-center">
            <div className="h-7 w-7 rounded-lg bg-rose-500/20 flex items-center justify-center mx-auto mb-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
            </div>
            <p className="text-lg font-black text-rose-600 dark:text-rose-400">${fmt(summary.totalLiabilities)}</p>
            <p className="text-[10px] font-medium text-muted-foreground">Liabilities</p>
          </CardContent>
        </Card>
        <Card className={`shadow-sm ${summary.netWorth >= 0 ? 'border-primary/20 bg-primary/5' : 'border-rose-500/20 bg-rose-500/5'}`}>
          <CardContent className="p-3 text-center">
            <span className="text-base block mb-1">🏆</span>
            <p className={`text-lg font-black ${summary.netWorth >= 0 ? 'text-primary' : 'text-rose-600 dark:text-rose-400'}`}>
              {summary.netWorth < 0 ? '-' : ''}${fmt(Math.abs(summary.netWorth))}
            </p>
            <p className="text-[10px] font-medium text-muted-foreground">Net Worth</p>
          </CardContent>
        </Card>
      </div>

      {/* Auto-synced info */}
      {summary.autoSyncedSavings > 0 && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium px-1">
          ✨ ${fmt(summary.autoSyncedSavings)} auto-synced from your savings goals
        </p>
      )}

      {/* Assets — collapsible */}
      <CollapsibleFinanceSection
        id="net-worth-assets"
        title="Assets"
        icon={<span className="text-base">💰</span>}
        badge={
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            ${fmt(summary.totalManualAssets)}
          </span>
        }
        actionButton={
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
            onClick={() => setShowAddAsset(true)}
          >
            <Plus className="h-3 w-3" /> Add Asset
          </Button>
        }
      >
        {manualAssets.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No assets added yet. Tap "Add Asset" to get started.
          </p>
        ) : (
          manualAssets.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onEdit={setEditingItem}
              onDelete={(id) => {
                const item = manualAssets.find(i => i.id === id);
                deleteItem.mutate(id);
                if (item) {
                  toast(`"${item.name}" deleted`, {
                    action: {
                      label: 'Undo',
                      onClick: () => {
                        addItem.mutate({
                          name: item.name,
                          amount: item.amount,
                          type: item.type as 'asset' | 'liability',
                          category: item.category,
                          notes: item.notes,
                          review_frequency: item.review_frequency,
                        });
                      },
                    },
                    duration: 6000,
                  });
                }
              }}
            />
          ))
        )}
      </CollapsibleFinanceSection>

      {/* Liabilities — collapsible */}
      <CollapsibleFinanceSection
        id="net-worth-liabilities"
        title="Liabilities"
        icon={<span className="text-base">💳</span>}
        badge={
          <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
            ${fmt(summary.totalLiabilities)}
          </span>
        }
        actionButton={
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 border-rose-500/30 text-rose-700 dark:text-rose-400 hover:bg-rose-500/10"
            onClick={() => setShowAddLiability(true)}
          >
            <Plus className="h-3 w-3" /> Add Liability
          </Button>
        }
      >
        {manualLiabilities.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No liabilities added yet.
          </p>
        ) : (
          manualLiabilities.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onEdit={setEditingItem}
              onDelete={(id) => {
                const item = manualLiabilities.find(i => i.id === id);
                deleteItem.mutate(id);
                if (item) {
                  toast(`"${item.name}" deleted`, {
                    action: {
                      label: 'Undo',
                      onClick: () => {
                        addItem.mutate({
                          name: item.name,
                          amount: item.amount,
                          type: item.type as 'asset' | 'liability',
                          category: item.category,
                          notes: item.notes,
                          review_frequency: item.review_frequency,
                        });
                      },
                    },
                    duration: 6000,
                  });
                }
              }}
            />
          ))
        )}
      </CollapsibleFinanceSection>

      <AddNetWorthItemDialog
        open={showAddAsset}
        onOpenChange={setShowAddAsset}
        defaultType="asset"
        onSubmit={(data) => {
          addItem.mutate(data);
          setShowAddAsset(false);
        }}
      />
      <AddNetWorthItemDialog
        open={showAddLiability}
        onOpenChange={setShowAddLiability}
        defaultType="liability"
        onSubmit={(data) => {
          addItem.mutate(data);
          setShowAddLiability(false);
        }}
      />

      <EditNetWorthItemDialog
        item={editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
        onUpdate={(data) => {
          updateItem.mutate(data);
          setEditingItem(null);
        }}
      />
    </div>
  );
}
