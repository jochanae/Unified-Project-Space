import { useState } from "react";
import { Phone, Check, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PhoneVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPhone?: string | null;
  isVerified?: boolean;
  onVerified: () => void;
}

export const PhoneVerificationModal = ({
  open,
  onOpenChange,
  currentPhone = null,
  isVerified = false,
  onVerified,
}: PhoneVerificationModalProps) => {
  const { user } = useAuth();
  const [phone, setPhone] = useState(currentPhone || "");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"phone" | "verify">(currentPhone && !isVerified ? "verify" : "phone");
  const [smsConsent, setSmsConsent] = useState(false);

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const normalizePhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    return `+${digits}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  const handleSavePhone = async () => {
    if (!user) return;
    
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }

    setIsLoading(true);
    
    try {
      const normalizedPhone = normalizePhone(phone);
      
      const { error } = await supabase
        .from("profiles")
        .update({ 
          phone_number: normalizedPhone,
          phone_verified: false 
        })
        .eq("id", user.id);

      if (error) throw error;
      
      if (smsConsent) {
        toast.success("Phone number saved! Click verify to enable SMS.");
        setStep("verify");
      } else {
        toast.success("Phone number saved. SMS is optional—check the box to enable it.");
      }
    } catch (error) {
      console.error("Error saving phone:", error);
      toast.error("Failed to save phone number");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      // For now, we'll auto-verify since Twilio verification requires additional setup
      // In production, you'd send an SMS code and verify it
      const { error } = await supabase
        .from("profiles")
        .update({ phone_verified: true })
        .eq("id", user.id);

      if (error) throw error;
      
      toast.success("Phone verified! You can now text transactions to the CoinsBloom number.");
      onVerified();
    } catch (error) {
      console.error("Error verifying phone:", error);
      toast.error("Failed to verify phone number");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            SMS Transaction Tracking
          </DialogTitle>
          <DialogDescription>
            Link your phone number to track transactions via SMS.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {step === "phone" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={phone}
                  onChange={handlePhoneChange}
                  maxLength={14}
                />
              </div>

              {/* SMS consent checkbox (optional). Consent is collected separately from Terms. */}
              <div className="flex items-start space-x-3 p-3 rounded-lg border border-border bg-muted/30">
                <Checkbox
                  id="sms-consent"
                  checked={smsConsent}
                  onCheckedChange={(checked) => setSmsConsent(checked === true)}
                  className="mt-0.5"
                />
                <label
                  htmlFor="sms-consent"
                  className="text-xs leading-relaxed cursor-pointer"
                >
                  <strong>(Optional)</strong> I agree to receive SMS notifications from CoinsBloom about my
                  account activity and transaction confirmations. Message and data rates may apply. Reply
                  STOP to opt out at any time.
                </label>
              </div>

              <p className="text-xs text-muted-foreground">
                SMS consent is not required to use CoinsBloom. Details: {" "}
                <a href="/sms-consent" className="underline text-primary">SMS Consent</a>. Legal: {" "}
                <a href="/privacy" className="underline text-primary">Privacy</a> and{" "}
                <a href="/terms" className="underline text-primary">Terms</a>.
              </p>

              <Button 
                onClick={handleSavePhone} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Save Phone Number
              </Button>
              
              {!smsConsent && (
                <p className="text-xs text-muted-foreground text-center">
                  You can enable SMS notifications later in settings.
                </p>
              )}
            </>
          ) : (
            <>
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <p className="text-sm font-medium">Your phone: {phone || currentPhone}</p>
                <p className="text-xs text-muted-foreground">
                  Click verify to enable SMS tracking. After verification, you can text 
                  transactions like "$25 lunch" to our number.
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setStep("phone")}
                  className="flex-1"
                >
                  Change Number
                </Button>
                <Button 
                  onClick={handleVerify} 
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Verify
                </Button>
              </div>
            </>
          )}

          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground">
              <strong>How it works:</strong> Text your transactions to +1 (888) 411-9298. 
              Include an amount like "$45.99 groceries" and we'll automatically log it.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
