import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertTriangle, Clock, CheckCircle2, Bell, RefreshCw, DollarSign, Pencil, Trash2, ExternalLink, ChevronDown, Zap, Repeat, Circle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Bill {
  id: string;
  name: string;
  amount: number;
  category: string;
  due_date: string;
  frequency: string;
  is_recurring: boolean;
  is_autopay: boolean;
  reminder_enabled: boolean;
  status: string;
  notes: string | null;
  autopay_source?: 'internal' | 'external' | null;
  is_projected?: boolean;
}

interface BillCardProps {
  bill: Bill;
  variant: 'overdue' | 'urgent' | 'default' | 'paid';
  onPay: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onQuickPay?: () => void;
  isFutureMonth?: boolean;
}

const BillCard = ({ bill, variant, onPay, onEdit, onDelete, onQuickPay, isFutureMonth }: BillCardProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const isPaid = variant === 'paid' || bill.status === 'paid';

  const getStatusIcon = () => {
    if (variant === 'overdue') return <AlertTriangle className="h-4 w-4 text-destructive" />;
    if (variant === 'urgent') return <Clock className="h-4 w-4 text-orange-500" />;
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  };

  const getBorderColor = () => {
    if (variant === 'overdue') return 'border-l-4 border-l-destructive';
    if (variant === 'urgent') return 'border-l-4 border-l-orange-500';
    if (isPaid) return 'border-l-4 border-l-emerald-500';
    return 'border-l-4 border-l-violet-500';
  };

  const formatDueDate = () => {
    const date = new Date(bill.due_date);
    if (variant === 'overdue') return `Due: ${format(date, 'MMM dd')}`;
    if (variant === 'urgent') return 'Due tomorrow';
    return format(date, 'EEE, MMM dd');
  };

  const paymentUrl = (bill as any).payment_url;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={cn("transition-colors", getBorderColor())}>
        <CollapsibleTrigger asChild>
          <button className="w-full text-left">
            <CardContent className="p-3 flex items-center gap-3">
              {/* Quick Pay Checkbox */}
              {!isPaid && !bill.is_projected && onQuickPay && (
                <button
                  className="flex-shrink-0 p-1 rounded-full border-2 border-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500 transition-all group"
                  title="Tap to mark paid"
                  onClick={(e) => {
                    e.stopPropagation();
                    toast(`Mark ${bill.name} as paid for $${Number(bill.amount).toFixed(2)}?`, {
                      action: {
                        label: "Confirm",
                        onClick: () => onQuickPay(),
                      },
                      cancel: {
                        label: "Cancel",
                        onClick: () => {},
                      },
                      duration: 8000,
                    });
                  }}
                >
                  <Circle className="h-3.5 w-3.5 text-emerald-400 group-hover:text-emerald-500 transition-colors" />
                </button>
              )}
              {isPaid && (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              )}

              {/* Status Icon */}
              <div className="flex-shrink-0">{getStatusIcon()}</div>

              {/* Name & Date */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-semibold text-sm truncate">{bill.name}</p>
                  {bill.is_projected && (
                    <Badge variant="secondary" className="text-[10px] h-4 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 shrink-0">
                      Projected
                    </Badge>
                  )}
                  {bill.is_recurring && (
                    <Badge variant="secondary" className="text-[10px] h-4 bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 shrink-0">
                      <Repeat className="h-2.5 w-2.5 mr-0.5" />
                      Recurring
                    </Badge>
                  )}
                  {bill.is_autopay && bill.autopay_source === 'internal' && (
                    <Badge className="text-[10px] h-4 bg-primary/10 text-primary border-primary/20 shrink-0">
                      ⚡ Autopay
                    </Badge>
                  )}
                  {bill.is_autopay && bill.autopay_source === 'external' && (
                    <Badge className="text-[10px] h-4 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800 shrink-0">
                      🏦 Autopay{(bill as any).autopay_account_last_four ? ` ••${(bill as any).autopay_account_last_four}` : ''}
                    </Badge>
                  )}
                  {bill.is_autopay && !bill.autopay_source && (
                    <Badge className="text-[10px] h-4 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 shrink-0">
                      Autopay
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{formatDueDate()}</p>
              </div>

              {/* Amount & Chevron */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <p className={cn(
                  "font-bold text-sm",
                  variant === 'overdue' && "text-destructive"
                )}>
                  ${Number(bill.amount).toFixed(2)}
                </p>
                <ChevronDown className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform duration-200",
                  isOpen && "rotate-180"
                )} />
              </div>
            </CardContent>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-3 space-y-3">
            {/* Badges */}
            <div className="flex flex-wrap gap-1.5">
              {bill.reminder_enabled && (
                <Badge variant="outline" className="text-[10px] h-5">
                  <Bell className="h-3 w-3 mr-1" /> Reminder
                </Badge>
              )}
              {isPaid && (
                <Badge className="text-[10px] h-5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Paid
                </Badge>
              )}
            </div>

            {/* Notes */}
            {bill.notes && (
              <p className="text-xs text-muted-foreground italic">{bill.notes}</p>
            )}

            {/* Website Link */}
            {paymentUrl && (
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full h-8 text-xs gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
                onClick={(e) => { e.stopPropagation(); window.open(paymentUrl, '_blank', 'noopener,noreferrer'); }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Visit Website
              </Button>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              {!isPaid && (
                <Button size="sm" className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={(e) => { e.stopPropagation(); onPay(); }}>
                  <DollarSign className="h-3.5 w-3.5 mr-1" /> Pay
                </Button>
              )}
              <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs px-2 text-destructive hover:bg-destructive/10 border-destructive/30" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Setup Autopay CTA for overdue, non-autopay bills */}
            {variant === 'overdue' && !bill.is_autopay && (
              <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-lg p-2.5 text-white flex items-center gap-2 text-sm font-medium">
                <Zap className="h-4 w-4" />
                <span>Setup Autopay</span>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default BillCard;
