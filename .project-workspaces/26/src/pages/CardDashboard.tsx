import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CardHero } from "@/components/card/CardHero";
import { CardTransactions } from "@/components/card/CardTransactions";
import { FamilyFundingPanel } from "@/components/card/FamilyFundingPanel";
import { PageHeroHeader } from "@/components/navigation/PageHeroHeader";
import {
  CreditCard,
  Lock,
  Unlock,
  Settings,
  Bell,
  TrendingUp,
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  Eye,
  EyeOff,
  Snowflake,
  Shield,
  Smartphone,
  Gift,
  Wallet,
  DollarSign,
  Sparkles,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

const CardDashboard = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isCardLocked, setIsCardLocked] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [hasLinkedKids, setHasLinkedKids] = useState(false);
  const [linkedKids, setLinkedKids] = useState<any[]>([]);

  const [dailyLimit, setDailyLimit] = useState([500]);
  const [monthlyLimit, setMonthlyLimit] = useState([3000]);

  // Mock card data - in production this would come from your banking partner
  const cardData = {
    balance: 2547.83,
    cardNumber: "4532",
    cardHolder: user?.user_metadata?.first_name + " " + (user?.user_metadata?.last_name || ""),
    design: {
      gradientStart: "#10b981",
      gradientEnd: "#059669",
    },
    monthlySpend: 1234.56,
    monthlyIncome: 3500.00,
    rewardsPoints: 2450,
    rewardsTier: "Silver",
  };

  useEffect(() => {
    // Wait for auth to finish loading before redirecting
    if (loading) return;
    
    if (!user) {
      navigate("/auth");
      return;
    }

    // Check for linked kids
    const fetchLinkedKids = async () => {
      const { data, error } = await supabase
        .from("family_links")
        .select(`
          id,
          kid_profile_id,
          kids_profiles (
            id,
            display_name,
            avatar_url,
            balance
          )
        `)
        .eq("parent_user_id", user.id)
        .eq("status", "active");

      if (!error && data && data.length > 0) {
        setHasLinkedKids(true);
        setLinkedKids(data);
      }
    };

    fetchLinkedKids();
  }, [user, navigate]);

  const quickActions = [
    {
      icon: <ArrowUpRight className="h-5 w-5" />,
      label: "Send",
      color: "bg-blue-500",
      onClick: () => toast.info("Send Money", { description: "This feature will be available when your CoinsBloom debit card is activated." }),
    },
    {
      icon: <ArrowDownLeft className="h-5 w-5" />,
      label: "Request",
      color: "bg-emerald-500",
      onClick: () => toast.info("Request Money", { description: "This feature will be available when your CoinsBloom debit card is activated." }),
    },
    {
      icon: isCardLocked ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />,
      label: isCardLocked ? "Unlock" : "Lock",
      color: isCardLocked ? "bg-amber-500" : "bg-slate-500",
      onClick: () => setIsCardLocked(!isCardLocked),
    },
    {
      icon: <Snowflake className="h-5 w-5" />,
      label: "Freeze",
      color: "bg-cyan-500",
      onClick: () => toast.info("Freeze Card", { description: "Temporarily freeze your card to prevent all transactions. Available when your card is activated." }),
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <Helmet>
        <title>My Card | CoinsBloom</title>
        <meta name="description" content="Manage your CoinsBloom debit card, view transactions, and fund family members." />
      </Helmet>

      <PageHeroHeader
        title="My Card"
        subtitle="Manage your CoinsBloom card"
        icon={<CreditCard className="h-6 w-6" />}
        colorScheme="green"
      />

      <div className="container px-4 -mt-6 relative z-10 space-y-6 max-w-6xl mx-auto">
        {/* Card Display */}
        <CardHero
          balance={cardData.balance}
          cardNumber={cardData.cardNumber}
          cardHolder={cardData.cardHolder}
          gradientStart={cardData.design.gradientStart}
          gradientEnd={cardData.design.gradientEnd}
          isLocked={isCardLocked}
          showBalance={showBalance}
          onToggleBalance={() => setShowBalance(!showBalance)}
        />

        {/* Lock Status Alert */}
        {isCardLocked && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl"
          >
            <Lock className="h-5 w-5 text-amber-600" />
            <div className="flex-1">
              <p className="font-medium text-amber-700 dark:text-amber-400">Card is Locked</p>
              <p className="text-sm text-amber-600/80">Your card is temporarily locked. Unlock to make purchases.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setIsCardLocked(false)}>
              Unlock
            </Button>
          </motion.div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action, index) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={action.onClick}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border hover:shadow-md transition-all"
            >
              <div className={`w-12 h-12 rounded-full ${action.color} flex items-center justify-center text-white`}>
                {action.icon}
              </div>
              <span className="text-sm font-medium">{action.label}</span>
            </motion.button>
          ))}
        </div>

        {/* Digital Card Banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl"
        >
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">Instant Digital Card</p>
            <p className="text-sm text-muted-foreground">Add to Apple Pay or Google Pay for easy mobile spending</p>
          </div>
          <Button size="sm" variant="default" onClick={() => toast.info("Add to Wallet", { description: "Digital wallet integration will be available when your CoinsBloom card ships." })}>
            Add to Wallet
          </Button>
        </motion.div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs">Income</span>
              </div>
              <p className="text-xl font-bold text-emerald-600">
                +${cardData.monthlyIncome.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <ArrowUpRight className="h-4 w-4" />
                <span className="text-xs">Spent</span>
              </div>
              <p className="text-xl font-bold text-rose-500">
                -${cardData.monthlySpend.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200 dark:border-amber-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-amber-600 mb-1">
                <Star className="h-4 w-4 fill-amber-500" />
                <span className="text-xs">Rewards</span>
              </div>
              <p className="text-xl font-bold text-amber-600">
                {cardData.rewardsPoints.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="transactions" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            {hasLinkedKids && <TabsTrigger value="family">Family</TabsTrigger>}
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="mt-4">
            <CardTransactions />
          </TabsContent>

          {hasLinkedKids && (
            <TabsContent value="family" className="mt-4">
              <FamilyFundingPanel linkedKids={linkedKids} />
            </TabsContent>
          )}

          <TabsContent value="settings" className="mt-4 space-y-4">
            {/* Spending Limits */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Spending Limits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Daily Limit</p>
                    <span className="text-sm font-semibold text-primary">${dailyLimit[0].toLocaleString()}</span>
                  </div>
                  <Slider
                    value={dailyLimit}
                    onValueChange={setDailyLimit}
                    max={2000}
                    min={50}
                    step={50}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">Maximum you can spend per day</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Monthly Limit</p>
                    <span className="text-sm font-semibold text-primary">${monthlyLimit[0].toLocaleString()}</span>
                  </div>
                  <Slider
                    value={monthlyLimit}
                    onValueChange={setMonthlyLimit}
                    max={10000}
                    min={500}
                    step={100}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">Maximum you can spend per month</p>
                </div>
              </CardContent>
            </Card>

            {/* Card Security */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Card Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Transaction Alerts</p>
                    <p className="text-sm text-muted-foreground">Get notified for every purchase</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Online Purchases</p>
                    <p className="text-sm text-muted-foreground">Allow card for online transactions</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">International Transactions</p>
                    <p className="text-sm text-muted-foreground">Use card abroad</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">ATM Withdrawals</p>
                    <p className="text-sm text-muted-foreground">Allow cash withdrawals</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            {/* Rewards Section */}
            <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Gift className="h-5 w-5 text-amber-600" />
                  Rewards & Incentives
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Your Tier</p>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-amber-500" />
                      <span className="font-bold text-lg">{cardData.rewardsTier}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Points Balance</p>
                    <p className="font-bold text-2xl text-amber-600">{cardData.rewardsPoints.toLocaleString()}</p>
                  </div>
                </div>
                <div className="p-3 bg-white/60 dark:bg-black/20 rounded-lg space-y-2">
                  <p className="text-sm font-medium">Earn rewards on every purchase:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      1 point per $1 spent
                    </li>
                    <li className="flex items-center gap-2">
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      2x points on groceries
                    </li>
                    <li className="flex items-center gap-2">
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      3x points on education
                    </li>
                  </ul>
                </div>
                <Button className="w-full" variant="outline" onClick={() => toast.info("Redeem Rewards", { description: "Reward redemption will be available once you start earning points with your CoinsBloom card." })}>
                  <Gift className="h-4 w-4 mr-2" />
                  Redeem Rewards
                </Button>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-muted-foreground">Real-time transaction alerts</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Spending Limits Warning</p>
                    <p className="text-sm text-muted-foreground">Alert when approaching limits</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Reward Milestone Alerts</p>
                    <p className="text-sm text-muted-foreground">Notify when you earn new rewards</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CardDashboard;
