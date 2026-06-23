import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  ShoppingCart, 
  Calendar, 
  Tag, 
  FileText, 
  Repeat, 
  Building2,
  Receipt,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  X,
  ZoomIn
} from "lucide-react";
import { format } from "date-fns";

interface Transaction {
  id: string;
  title: string;
  category: string;
  transaction_date: string;
  amount: number;
  type: "income" | "expense";
  is_recurring: boolean;
  is_pending: boolean;
  is_tax_deductible: boolean;
  linked_bill_id: string | null;
  notes: string | null;
  merchant: string | null;
  account_id: string | null;
  bloom_burst_id: string | null;
  receipt_url?: string | null;
  is_archived?: boolean;
}

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (transaction: Transaction) => void;
  onArchive: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

export function TransactionDetailModal({
  transaction,
  open,
  onOpenChange,
  onEdit,
  onArchive,
  onDelete,
}: TransactionDetailModalProps) {
  const [showFullReceipt, setShowFullReceipt] = useState(false);

  if (!transaction) return null;

  const isArchived = transaction.is_archived;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={`p-2 rounded-full ${transaction.type === "income" ? "bg-green-100" : "bg-red-100"}`}>
                {transaction.type === "income" ? (
                  <DollarSign className="h-5 w-5 text-green-600" />
                ) : (
                  <ShoppingCart className="h-5 w-5 text-red-500" />
                )}
              </div>
              <span className="truncate">{transaction.title}</span>
              {isArchived && (
                <Badge variant="secondary" className="ml-auto">Archived</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Amount */}
            <div className="text-center py-4 bg-muted/50 rounded-lg">
              <p className={`text-3xl font-bold ${transaction.type === "income" ? "text-green-600" : "text-red-500"}`}>
                {transaction.type === "income" ? "+" : "-"}${Number(transaction.amount).toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground capitalize">{transaction.type}</p>
            </div>

            {/* Details Grid */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{format(new Date(transaction.transaction_date), "MMMM d, yyyy")}</span>
              </div>

              <div className="flex items-center gap-3">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm capitalize">{transaction.category}</span>
              </div>

              {transaction.merchant && (
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{transaction.merchant}</span>
                </div>
              )}

              {transaction.is_recurring && (
                <div className="flex items-center gap-3">
                  <Repeat className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Recurring transaction</span>
                </div>
              )}

              {transaction.notes && (
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-sm">{transaction.notes}</span>
                </div>
              )}

              {/* Badges */}
              <div className="flex flex-wrap gap-2 pt-2">
                {transaction.is_pending && (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">Pending</Badge>
                )}
                {transaction.is_tax_deductible && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">Tax Deductible</Badge>
                )}
                {transaction.linked_bill_id && (
                  <Badge variant="outline">Linked to Bill</Badge>
                )}
              </div>
            </div>

            {/* Receipt Section */}
            {transaction.receipt_url && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Receipt className="h-4 w-4" />
                  Attached Receipt
                </div>
                <div 
                  className="relative cursor-pointer group"
                  onClick={() => setShowFullReceipt(true)}
                >
                  <img 
                    src={transaction.receipt_url} 
                    alt="Receipt" 
                    className="w-full h-40 object-cover rounded-lg border"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <ZoomIn className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t">
              <Button 
                variant="outline" 
                className="flex-1 gap-2"
                onClick={() => {
                  onEdit(transaction);
                  onOpenChange(false);
                }}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 gap-2"
                onClick={() => {
                  onArchive(transaction);
                  onOpenChange(false);
                }}
              >
                {isArchived ? (
                  <>
                    <ArchiveRestore className="h-4 w-4" />
                    Restore
                  </>
                ) : (
                  <>
                    <Archive className="h-4 w-4" />
                    Archive
                  </>
                )}
              </Button>
              <Button 
                variant="destructive" 
                size="icon"
                onClick={() => {
                  onDelete(transaction);
                  onOpenChange(false);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Receipt Modal */}
      <Dialog open={showFullReceipt} onOpenChange={setShowFullReceipt}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white"
              onClick={() => setShowFullReceipt(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            <img 
              src={transaction.receipt_url || ""} 
              alt="Receipt" 
              className="w-full h-auto max-h-[85vh] object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
