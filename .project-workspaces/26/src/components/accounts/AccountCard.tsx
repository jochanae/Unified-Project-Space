import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TrendingUp, Pencil, Trash2, Wallet, Home, PiggyBank, CreditCard, Car, GraduationCap, Shield, Building, Landmark, Link2, ExternalLink, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { AccountHistoryModal } from "./AccountHistoryModal";
import { EditAccountModal } from "./EditAccountModal";
import { LinkLiabilityModal } from "./LinkLiabilityModal";
import { ASSET_LIABILITY_MAP } from "./AssetLiabilityPrompt";

interface Account {
  id: string;
  name: string;
  institution: string | null;
  account_number_masked: string | null;
  account_type: string;
  category: "asset" | "liability";
  balance: number;
  is_manual: boolean;
  notes?: string | null;
}

const ACCOUNT_ICONS: Record<string, React.ReactNode> = {
  checking: <Wallet className="h-4 w-4" />,
  savings: <Wallet className="h-4 w-4" />,
  money_market: <Wallet className="h-4 w-4" />,
  cd: <Wallet className="h-4 w-4" />,
  credit_card: <CreditCard className="h-4 w-4" />,
  line_of_credit: <CreditCard className="h-4 w-4" />,
  mortgage: <Home className="h-4 w-4" />,
  heloc: <Home className="h-4 w-4" />,
  auto_loan: <Car className="h-4 w-4" />,
  vehicle: <Car className="h-4 w-4" />,
  student_loan: <GraduationCap className="h-4 w-4" />,
  personal_loan: <Landmark className="h-4 w-4" />,
  investment: <TrendingUp className="h-4 w-4" />,
  brokerage: <TrendingUp className="h-4 w-4" />,
  retirement_401k: <PiggyBank className="h-4 w-4" />,
  retirement_ira: <PiggyBank className="h-4 w-4" />,
  retirement_roth: <PiggyBank className="h-4 w-4" />,
  real_estate: <Home className="h-4 w-4" />,
  insurance: <Shield className="h-4 w-4" />,
  annuity: <Shield className="h-4 w-4" />,
  crypto: <TrendingUp className="h-4 w-4" />,
  other: <Building className="h-4 w-4" />,
};

interface AccountCardProps {
  account: Account;
  groupColor: string;
  onDelete: () => void;
  onRefresh: () => void;
}

export function AccountCard({ account, groupColor, onDelete, onRefresh }: AccountCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [linkLiabilityOpen, setLinkLiabilityOpen] = useState(false);
  
  const isLiability = account.category === "liability";
  const canLinkLiability = !isLiability && !!ASSET_LIABILITY_MAP[account.account_type];
  const icon = ACCOUNT_ICONS[account.account_type] || <Building className="h-4 w-4" />;
  const paymentUrl = (account as any).payment_url;

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className={cn("transition-colors", groupColor)}>
          <CollapsibleTrigger asChild>
            <button className="w-full text-left">
              <div className="p-3 flex items-center gap-3">
                {/* Icon */}
                <div className={cn(
                  "p-1.5 rounded-lg shrink-0",
                  isLiability ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                )}>
                  {icon}
                </div>

                {/* Name & Institution */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{account.name}</p>
                  {account.institution && (
                    <p className="text-xs text-muted-foreground truncate">{account.institution}</p>
                  )}
                </div>

                {/* Balance & Chevron */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <p className={cn(
                    "font-bold text-sm",
                    isLiability ? "text-destructive" : "text-foreground"
                  )}>
                    ${Number(account.balance).toLocaleString()}
                  </p>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-200",
                    isOpen && "rotate-180"
                  )} />
                </div>
              </div>
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-4 pb-3 space-y-2.5">
              {/* Details */}
              {account.account_number_masked && (
                <p className="text-xs text-muted-foreground">{account.account_number_masked}</p>
              )}
              {account.is_manual && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  ⓘ Manual value — update periodically
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={(e) => { e.stopPropagation(); setHistoryModalOpen(true); }}
                >
                  <TrendingUp className="h-3.5 w-3.5 mr-1" /> History
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={(e) => { e.stopPropagation(); setEditModalOpen(true); }}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
                {paymentUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={(e) => { e.stopPropagation(); window.open(paymentUrl, '_blank', 'noopener,noreferrer'); }}
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> Website
                  </Button>
                )}
                {canLinkLiability && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={(e) => { e.stopPropagation(); setLinkLiabilityOpen(true); }}
                  >
                    <Link2 className="h-3.5 w-3.5 mr-1" /> Link Liability
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs px-2 text-destructive hover:bg-destructive/10 border-destructive/30"
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* History Modal */}
      <AccountHistoryModal
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        accountId={account.id}
        accountName={account.name}
      />

      {/* Edit Modal */}
      <EditAccountModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        account={account}
        onSuccess={onRefresh}
      />

      {/* Link Liability Modal */}
      {canLinkLiability && (
        <LinkLiabilityModal
          open={linkLiabilityOpen}
          onOpenChange={setLinkLiabilityOpen}
          account={account}
          onSuccess={onRefresh}
        />
      )}
    </>
  );
}
