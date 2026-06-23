import { useState, useEffect } from "react";
import { Phone, Copy, Plus, Check, Loader2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PhoneVerificationModal } from "./PhoneVerificationModal";
import { SMSTransactionHistory } from "./SMSTransactionHistory";

interface SMSTrackerCardContentProps {
  isExpanded?: boolean;
}

export const SMSTrackerCardContent = ({ isExpanded = false }: SMSTrackerCardContentProps) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [smsText, setSmsText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);

  const twilioNumber = "+18884119298";

  useEffect(() => {
    if (user) {
      fetchPhoneStatus();
    }
  }, [user]);

  const fetchPhoneStatus = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('phone_number, phone_verified')
      .eq('id', user.id)
      .single();
    
    if (data) {
      setPhoneNumber(data.phone_number);
      setIsPhoneVerified(data.phone_verified || false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(twilioNumber);
      setCopied(true);
      toast.success("Phone number copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleAddTransaction = async () => {
    if (!smsText.trim()) {
      toast.error("Please enter SMS text");
      return;
    }
    if (!user) {
      toast.error("Please sign in first");
      return;
    }

    setIsProcessing(true);
    
    const amountMatch = smsText.match(/\$?([\d,]+\.?\d*)/);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(",", "")) : 0;

    if (amount > 0) {
      try {
        const { error } = await supabase.from("transactions").insert({
          user_id: user.id,
          amount,
          title: "SMS Transaction",
          type: "expense",
          category: "other",
          notes: smsText,
          transaction_date: new Date().toISOString().split("T")[0],
        });

        if (error) throw error;
        toast.success(`Transaction of $${amount.toFixed(2)} added!`);
        setSmsText("");
      } catch (error) {
        console.error("Error adding transaction:", error);
        toast.error("Failed to add transaction");
      }
    } else {
      toast.error("Could not detect amount from SMS");
    }
    
    setIsProcessing(false);
  };

  // If expanded, show the SMS transaction history
  if (isExpanded) {
    return <SMSTransactionHistory />;
  }

  return (
    <div className="space-y-3">
      <div className="p-2 rounded-lg border border-border/50 bg-muted/30">
        <div className="flex items-start gap-2">
          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
            1
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium">Add your phone number</p>
            {isPhoneVerified ? (
              <div className="flex items-center gap-1 mt-1">
                <Check className="h-3 w-3 text-green-500" />
                <span className="text-xs text-green-600 truncate">{phoneNumber}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 ml-auto flex-shrink-0"
                  onClick={() => setShowPhoneModal(true)}
                >
                  <Settings className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-xs mt-1"
                onClick={() => setShowPhoneModal(true)}
              >
                {phoneNumber ? "Verify Phone" : "Add Phone"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Step 2: Text transactions */}
      <div className="p-2 rounded-lg bg-primary/5 border border-primary/20">
        <div className="flex items-start gap-2">
          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
            2
          </span>
          <div className="flex-1">
            <p className="text-xs font-medium mb-1">Text your transactions to:</p>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-sm font-mono font-medium">{twilioNumber}</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 ml-auto"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Example: "$25 lunch at cafe"
            </p>
          </div>
        </div>
      </div>

      {/* Manual Entry */}
      <div className="space-y-1.5 pt-1 border-t border-border/30">
        <p className="text-xs font-medium text-muted-foreground">
          Or paste SMS here:
        </p>
        <div className="flex gap-1.5">
          <Input
            placeholder="Paste bank SMS text..."
            className="text-xs h-8"
            value={smsText}
            onChange={(e) => setSmsText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTransaction()}
          />
          <Button 
            size="icon" 
            className="h-8 w-8 shrink-0"
            onClick={handleAddTransaction}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <PhoneVerificationModal
        open={showPhoneModal}
        onOpenChange={setShowPhoneModal}
        currentPhone={phoneNumber}
        isVerified={isPhoneVerified}
        onVerified={() => {
          fetchPhoneStatus();
          setShowPhoneModal(false);
        }}
      />
    </div>
  );
};
