import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreditCard, Plus, Trash2, Star, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface PaymentMethod {
  id: string;
  method_type: string;
  display_name: string;
  details: string | null;
  instructions: string | null;
  is_primary: boolean;
}

interface PaymentMethodsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "goal" | "budget";
  entityId: string;
  entityName: string;
  isOwner: boolean;
}

const methodTypes = [
  { value: "venmo", label: "Venmo", icon: "💸" },
  { value: "paypal", label: "PayPal", icon: "🅿️" },
  { value: "zelle", label: "Zelle", icon: "⚡" },
  { value: "cashapp", label: "Cash App", icon: "💵" },
  { value: "bank", label: "Bank Transfer", icon: "🏦" },
  { value: "other", label: "Other", icon: "💳" },
];

const PaymentMethodsModal = ({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityName,
  isOwner,
}: PaymentMethodsModalProps) => {
  const { user } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [methodType, setMethodType] = useState("venmo");
  const [displayName, setDisplayName] = useState("");
  const [details, setDetails] = useState("");
  const [instructions, setInstructions] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchPaymentMethods();
    }
  }, [open, entityId]);

  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("is_primary", { ascending: false });

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!user || !displayName.trim()) {
      toast.error("Please enter a display name");
      return;
    }

    setSubmitting(true);
    try {
      const isPrimary = paymentMethods.length === 0;

      const { error } = await supabase.from("payment_methods").insert({
        user_id: user.id,
        entity_type: entityType,
        entity_id: entityId,
        method_type: methodType,
        display_name: displayName.trim(),
        details: details.trim() || null,
        instructions: instructions.trim() || null,
        is_primary: isPrimary,
      });

      if (error) throw error;

      toast.success("Payment method added");
      resetForm();
      fetchPaymentMethods();
    } catch (error) {
      console.error("Error adding payment method:", error);
      toast.error("Failed to add payment method");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("payment_methods")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Payment method removed");
      fetchPaymentMethods();
    } catch (error) {
      console.error("Error deleting payment method:", error);
      toast.error("Failed to remove payment method");
    }
  };

  const handleSetPrimary = async (id: string) => {
    try {
      // First, unset all as primary
      await supabase
        .from("payment_methods")
        .update({ is_primary: false })
        .eq("entity_type", entityType)
        .eq("entity_id", entityId);

      // Then set the selected one as primary
      const { error } = await supabase
        .from("payment_methods")
        .update({ is_primary: true })
        .eq("id", id);

      if (error) throw error;
      toast.success("Primary payment method updated");
      fetchPaymentMethods();
    } catch (error) {
      console.error("Error setting primary:", error);
      toast.error("Failed to update primary method");
    }
  };

  const handleCopy = async (method: PaymentMethod) => {
    const text = method.details || method.display_name;
    await navigator.clipboard.writeText(text);
    setCopiedId(method.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Copied to clipboard");
  };

  const resetForm = () => {
    setMethodType("venmo");
    setDisplayName("");
    setDetails("");
    setInstructions("");
    setShowAddForm(false);
  };

  const getMethodIcon = (type: string) => {
    return methodTypes.find((m) => m.value === type)?.icon || "💳";
  };

  const getMethodLabel = (type: string) => {
    return methodTypes.find((m) => m.value === type)?.label || type;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Methods
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Payment options for "{entityName}"
        </p>

        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Existing payment methods */}
            {paymentMethods.length === 0 && !showAddForm && (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center">
                  <CreditCard className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {isOwner
                      ? "No payment methods added yet. Add one so collaborators know where to send contributions."
                      : "The organizer hasn't added payment methods yet."}
                  </p>
                </CardContent>
              </Card>
            )}

            {paymentMethods.map((method) => (
              <Card key={method.id} className={method.is_primary ? "border-primary" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getMethodIcon(method.method_type)}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{method.display_name}</p>
                          {method.is_primary && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Primary
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {getMethodLabel(method.method_type)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {method.details && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopy(method)}
                          className="h-8 w-8"
                        >
                          {copiedId === method.id ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(method.id)}
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {method.details && (
                    <p className="mt-2 text-sm font-mono bg-muted p-2 rounded">
                      {method.details}
                    </p>
                  )}

                  {method.instructions && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      📝 {method.instructions}
                    </p>
                  )}

                  {isOwner && !method.is_primary && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetPrimary(method.id)}
                      className="mt-3"
                    >
                      <Star className="h-3 w-3 mr-1" />
                      Set as Primary
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Add new form */}
            {isOwner && showAddForm && (
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Payment Type</Label>
                    <Select value={methodType} onValueChange={setMethodType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {methodTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.icon} {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Display Name *</Label>
                    <Input
                      placeholder="e.g., My Venmo, Family PayPal"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Username / Link / Account Info</Label>
                    <Input
                      placeholder="e.g., @username, email@example.com"
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Instructions (optional)</Label>
                    <Textarea
                      placeholder="Any special instructions for contributors..."
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleAdd} disabled={submitting} className="flex-1">
                      {submitting ? "Adding..." : "Add Method"}
                    </Button>
                    <Button variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Add button */}
            {isOwner && !showAddForm && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Payment Method
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PaymentMethodsModal;
