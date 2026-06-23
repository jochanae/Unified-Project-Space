import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import {
  Users,
  Send,
  Sparkles,
  TrendingUp,
  ChevronRight,
  DollarSign,
  CheckCircle,
  Star,
} from "lucide-react";

interface LinkedKid {
  id: string;
  kid_profile_id: string;
  kids_profiles: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    balance: number;
  } | null;
}

interface FamilyFundingPanelProps {
  linkedKids: LinkedKid[];
}

export const FamilyFundingPanel = ({ linkedKids }: FamilyFundingPanelProps) => {
  const { toast } = useToast();
  const [selectedKid, setSelectedKid] = useState<LinkedKid | null>(null);
  const [fundAmount, setFundAmount] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleFund = async () => {
    if (!selectedKid || !fundAmount) return;

    setIsSending(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    toast({
      title: "Funds Sent!",
      description: `$${fundAmount} has been sent to ${selectedKid.kids_profiles?.display_name}`,
    });

    setIsSending(false);
    setSelectedKid(null);
    setFundAmount("");
  };

  const quickAmounts = [5, 10, 20, 50];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Family Members</h3>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/kids" className="flex items-center gap-1">
            Manage
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Kids List */}
      <div className="space-y-3">
        {linkedKids.map((link, index) => {
          const kid = link.kids_profiles;
          if (!kid) return null;

          return (
            <motion.div
              key={link.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 shadow-sm">
                      <AvatarImage src={kid.avatar_url || undefined} className="object-cover w-full h-full" />
                      <AvatarFallback className="bg-gradient-to-br from-violet-400 to-purple-500 text-white">
                        {kid.display_name?.charAt(0) || "K"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{kid.display_name}</p>
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Balance: ${(kid.balance || 0).toFixed(2)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setSelectedKid(link)}
                      className="bg-gradient-to-r from-emerald-500 to-teal-500"
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Fund
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {linkedKids.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-2">No Kids Linked Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Link your children's accounts to send them money instantly
            </p>
            <Button asChild>
              <Link to="/kids">Link a Child</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      {linkedKids.length > 0 && (
        <Card className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/20 border-violet-200/50 dark:border-violet-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-violet-500 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sent This Month</p>
                <p className="text-xl font-bold text-violet-700 dark:text-violet-400">$245.00</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fund Dialog */}
      <Dialog open={!!selectedKid} onOpenChange={() => setSelectedKid(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Send Money
            </DialogTitle>
            <DialogDescription>
              Send funds instantly to {selectedKid?.kids_profiles?.display_name}'s account
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Recipient */}
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
              <Avatar className="h-12 w-12">
                <AvatarImage src={selectedKid?.kids_profiles?.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-violet-400 to-purple-500 text-white">
                  {selectedKid?.kids_profiles?.display_name?.charAt(0) || "K"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{selectedKid?.kids_profiles?.display_name}</p>
                <p className="text-sm text-muted-foreground">
                  Current balance: ${(selectedKid?.kids_profiles?.balance || 0).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-3">
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="0.00"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  className="pl-10 text-2xl h-14 font-bold"
                />
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {quickAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => setFundAmount(amount.toString())}
                    className={fundAmount === amount.toString() ? "border-primary bg-primary/10" : ""}
                  >
                    ${amount}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedKid(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleFund}
              disabled={!fundAmount || parseFloat(fundAmount) <= 0 || isSending}
              className="bg-gradient-to-r from-emerald-500 to-teal-500"
            >
              {isSending ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Send ${fundAmount || "0"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
