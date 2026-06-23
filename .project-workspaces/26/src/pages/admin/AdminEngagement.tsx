import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ActivityHeatMap } from "@/components/admin/ActivityHeatMap";
import {
  ArrowLeft,
  Users,
  Target,
  Wallet,
  Sparkles,
  TrendingUp,
  Activity,
  BarChart3,
  Calendar,
  Clock,
  RefreshCw,
} from "lucide-react";
import { format, subDays, startOfMonth, differenceInDays } from "date-fns";

interface EngagementMetrics {
  // Active Users
  dau: number;
  mau: number;
  dauMauRatio: number;
  
  // Feature Usage
  featureUsage: { name: string; uses: number; users: number }[];
  
  // Goal Engagement
  totalGoals: number;
  activeGoals: number;
  goalActivities: { type: string; count: number }[];
  
  // Budget Engagement
  totalBudgets: number;
  activeBudgets: number;
  budgetActivities: { type: string; count: number }[];
  
  // Login Activity (from audit_logs)
  loginsByDay: { date: string; count: number }[];
  
  // Retention
  newUsersThisMonth: number;
  returningUsers: number;
  
  // Feature Adoption
  usersWithGoals: number;
  usersWithBudgets: number;
  usersWithAccounts: number;
  usersWithTransactions: number;
}

export default function AdminEngagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<EngagementMetrics | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Ensure the background stays consistent all the way to the bottom on mobile.
  useEffect(() => {
    document.documentElement.classList.add("bg-slate-900");
    document.body.classList.add("bg-slate-900");
    return () => {
      document.documentElement.classList.remove("bg-slate-900");
      document.body.classList.remove("bg-slate-900");
    };
  }, []);

  useEffect(() => {
    if (user) {
      checkAdminAndFetch();
    }
  }, [user]);

  const checkAdminAndFetch = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user?.id)
      .in("role", ["admin", "super_admin"])
      .limit(1);

    setIsAdmin(data && data.length > 0);
    if (data && data.length > 0) {
      await fetchMetrics();
    }
    setLoading(false);
  };

  const fetchMetrics = async () => {
    setRefreshing(true);
    try {
      const today = new Date();
      const thirtyDaysAgo = subDays(today, 30);
      const monthStart = startOfMonth(today);
      
      // Fetch all data in parallel
      const [
        profilesRes,
        goalsRes,
        budgetsRes,
        accountsRes,
        transactionsRes,
        featureUsageRes,
        goalActivityRes,
        budgetActivityRes,
        auditLogsRes,
        recentProfilesRes,
      ] = await Promise.all([
        supabase.from("profiles").select("id, created_at"),
        supabase.from("goals").select("id, user_id, is_archived, created_at"),
        supabase.from("budgets").select("id, user_id, is_active, created_at"),
        supabase.from("accounts").select("id, user_id"),
        supabase.from("transactions").select("id, user_id").limit(1000),
        supabase.from("feature_usage").select("feature_name, usage_count, user_id, usage_date"),
        supabase.from("goal_activity").select("activity_type, created_at, user_id"),
        supabase.from("budget_activity").select("activity_type, created_at, user_id"),
        supabase.from("audit_logs").select("action, created_at, user_id").gte("created_at", thirtyDaysAgo.toISOString()),
        supabase.from("profiles").select("id, created_at").gte("created_at", monthStart.toISOString()),
      ]);

      const profiles = profilesRes.data || [];
      const goals = goalsRes.data || [];
      const budgets = budgetsRes.data || [];
      const accounts = accountsRes.data || [];
      const transactions = transactionsRes.data || [];
      const featureUsage = featureUsageRes.data || [];
      const goalActivity = goalActivityRes.data || [];
      const budgetActivity = budgetActivityRes.data || [];
      const auditLogs = auditLogsRes.data || [];
      const recentProfiles = recentProfilesRes.data || [];

      // Calculate DAU (users with any activity today)
      const todayStr = format(today, "yyyy-MM-dd");
      const activeToday = new Set([
        ...featureUsage.filter(f => f.usage_date === todayStr).map(f => f.user_id),
        ...goalActivity.filter(g => format(new Date(g.created_at), "yyyy-MM-dd") === todayStr).map(g => g.user_id),
        ...budgetActivity.filter(b => format(new Date(b.created_at), "yyyy-MM-dd") === todayStr).map(b => b.user_id),
        ...auditLogs.filter(a => format(new Date(a.created_at), "yyyy-MM-dd") === todayStr).map(a => a.user_id),
      ]);

      // Calculate MAU (users with any activity in last 30 days)
      const activeThisMonth = new Set([
        ...featureUsage.map(f => f.user_id),
        ...goalActivity.filter(g => new Date(g.created_at) >= thirtyDaysAgo).map(g => g.user_id),
        ...budgetActivity.filter(b => new Date(b.created_at) >= thirtyDaysAgo).map(b => b.user_id),
        ...auditLogs.map(a => a.user_id),
      ]);

      // Feature usage aggregation
      const featureMap = new Map<string, { uses: number; users: Set<string> }>();
      featureUsage.forEach(f => {
        const existing = featureMap.get(f.feature_name) || { uses: 0, users: new Set() };
        existing.uses += f.usage_count;
        existing.users.add(f.user_id);
        featureMap.set(f.feature_name, existing);
      });

      // Goal activity aggregation
      const goalActivityMap = new Map<string, number>();
      goalActivity.forEach(g => {
        goalActivityMap.set(g.activity_type, (goalActivityMap.get(g.activity_type) || 0) + 1);
      });

      // Budget activity aggregation
      const budgetActivityMap = new Map<string, number>();
      budgetActivity.forEach(b => {
        budgetActivityMap.set(b.activity_type, (budgetActivityMap.get(b.activity_type) || 0) + 1);
      });

      // Login activity by day (from audit logs)
      const loginsByDayMap = new Map<string, number>();
      auditLogs.forEach(log => {
        const date = format(new Date(log.created_at), "yyyy-MM-dd");
        loginsByDayMap.set(date, (loginsByDayMap.get(date) || 0) + 1);
      });

      // Feature adoption
      const usersWithGoals = new Set(goals.map(g => g.user_id)).size;
      const usersWithBudgets = new Set(budgets.map(b => b.user_id)).size;
      const usersWithAccounts = new Set(accounts.map(a => a.user_id)).size;
      const usersWithTransactions = new Set(transactions.map(t => t.user_id)).size;

      const dau = activeToday.size;
      const mau = activeThisMonth.size;

      setMetrics({
        dau,
        mau,
        dauMauRatio: mau > 0 ? Math.round((dau / mau) * 100) : 0,
        
        featureUsage: Array.from(featureMap.entries()).map(([name, data]) => ({
          name,
          uses: data.uses,
          users: data.users.size,
        })),
        
        totalGoals: goals.length,
        activeGoals: goals.filter(g => !g.is_archived).length,
        goalActivities: Array.from(goalActivityMap.entries()).map(([type, count]) => ({ type, count })),
        
        totalBudgets: budgets.length,
        activeBudgets: budgets.filter(b => b.is_active).length,
        budgetActivities: Array.from(budgetActivityMap.entries()).map(([type, count]) => ({ type, count })),
        
        loginsByDay: Array.from(loginsByDayMap.entries())
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date)),
        
        newUsersThisMonth: recentProfiles.length,
        returningUsers: mau - recentProfiles.length,
        
        usersWithGoals,
        usersWithBudgets,
        usersWithAccounts,
        usersWithTransactions,
      });
    } catch (error) {
      console.error("Error fetching engagement metrics:", error);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center loading-screen-bg">
        <LoadingSpinner size="lg" text="Loading engagement data..." />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
      </div>
    );
  }

  const totalUsers = metrics?.mau || 0;

  return (
    <div className="min-h-screen bg-slate-900 pb-20">
      <Helmet>
        <title>User Engagement | CoinsBloom Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600 via-purple-500 to-indigo-500 px-4 pt-12 pb-8 relative overflow-hidden">
        <div className="absolute left-4 top-32 w-48 h-48 rounded-full bg-white/10" />
        <div className="absolute right-0 top-16 w-40 h-40 rounded-full bg-indigo-400/30" />

        <div className="flex items-center gap-3 mb-6 relative z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchMetrics}
            disabled={refreshing}
            className="text-white hover:bg-white/20"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <Activity className="h-8 w-8 text-white" />
          <div>
            <h1 className="text-3xl font-bold text-white">User Engagement</h1>
            <p className="text-white/80 text-sm">Industry-standard engagement metrics</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-4 text-center">
              <Users className="h-5 w-5 text-blue-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-white">{metrics?.dau || 0}</div>
              <div className="text-xs text-white/60">DAU (Today)</div>
            </CardContent>
          </Card>
          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-4 text-center">
              <Calendar className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-white">{metrics?.mau || 0}</div>
              <div className="text-xs text-white/60">MAU (30 days)</div>
            </CardContent>
          </Card>
          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-5 w-5 text-amber-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-white">{metrics?.dauMauRatio || 0}%</div>
              <div className="text-xs text-white/60">Stickiness</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full bg-white/10">
            <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
            <TabsTrigger value="features" className="flex-1">Features</TabsTrigger>
            <TabsTrigger value="activity" className="flex-1">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Activity Heat Map */}
            {metrics?.loginsByDay && metrics.loginsByDay.length > 0 && (
              <ActivityHeatMap data={metrics.loginsByDay} title="Daily Activity (Last 30 Days)" />
            )}

            {/* Retention */}
            <Card className="bg-white/10 border-white/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Retention
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-white/70 text-sm">New users this month</span>
                  <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300">
                    {metrics?.newUsersThisMonth || 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70 text-sm">Returning users</span>
                  <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                    {metrics?.returningUsers || 0}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Feature Adoption */}
            <Card className="bg-white/10 border-white/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Feature Adoption Rates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { name: "Accounts Connected", value: metrics?.usersWithAccounts || 0, icon: Wallet },
                  { name: "Goals Created", value: metrics?.usersWithGoals || 0, icon: Target },
                  { name: "Budgets Created", value: metrics?.usersWithBudgets || 0, icon: Wallet },
                  { name: "Transactions Logged", value: metrics?.usersWithTransactions || 0, icon: Activity },
                ].map((feature) => {
                  const rate = totalUsers > 0 ? Math.round((feature.value / totalUsers) * 100) : 0;
                  return (
                    <div key={feature.name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/70 flex items-center gap-2">
                          <feature.icon className="h-4 w-4" />
                          {feature.name}
                        </span>
                        <span className="text-white">{feature.value} users ({rate}%)</span>
                      </div>
                      <Progress value={rate} className="h-2 bg-white/10" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="space-y-4">
            {/* Feature Usage */}
            <Card className="bg-white/10 border-white/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Rate-Limited Feature Usage
                </CardTitle>
                <p className="text-white/60 text-xs">From feature_usage table</p>
              </CardHeader>
              <CardContent>
                {metrics?.featureUsage && metrics.featureUsage.length > 0 ? (
                  <div className="space-y-3">
                    {metrics.featureUsage.map((feature) => (
                      <div key={feature.name} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                        <div>
                          <div className="text-white font-medium capitalize">
                            {feature.name.replace(/-/g, " ")}
                          </div>
                          <div className="text-white/50 text-xs">{feature.users} unique users</div>
                        </div>
                        <Badge className="bg-violet-500/20 text-violet-300">
                          {feature.uses} uses
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/50 text-center py-4">No feature usage data yet</p>
                )}
              </CardContent>
            </Card>

            {/* Goals & Budgets Stats */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-white/10 border-white/20">
                <CardContent className="p-4">
                  <Target className="h-6 w-6 text-emerald-400 mb-2" />
                  <div className="text-2xl font-bold text-white">{metrics?.activeGoals || 0}</div>
                  <div className="text-xs text-white/60">Active Goals</div>
                  <div className="text-xs text-white/40">of {metrics?.totalGoals || 0} total</div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 border-white/20">
                <CardContent className="p-4">
                  <Wallet className="h-6 w-6 text-blue-400 mb-2" />
                  <div className="text-2xl font-bold text-white">{metrics?.activeBudgets || 0}</div>
                  <div className="text-xs text-white/60">Active Budgets</div>
                  <div className="text-xs text-white/40">of {metrics?.totalBudgets || 0} total</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            {/* Goal Activity */}
            <Card className="bg-white/10 border-white/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Goal Activity
                </CardTitle>
                <p className="text-white/60 text-xs">From goal_activity table</p>
              </CardHeader>
              <CardContent>
                {metrics?.goalActivities && metrics.goalActivities.length > 0 ? (
                  <div className="space-y-2">
                    {metrics.goalActivities.map((activity) => (
                      <div key={activity.type} className="flex justify-between items-center p-2 bg-white/5 rounded">
                        <span className="text-white/70 capitalize">{activity.type.replace(/_/g, " ")}</span>
                        <Badge variant="outline" className="border-emerald-500/50 text-emerald-300">
                          {activity.count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/50 text-center py-4">No goal activity yet</p>
                )}
              </CardContent>
            </Card>

            {/* Budget Activity */}
            <Card className="bg-white/10 border-white/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Budget Activity
                </CardTitle>
                <p className="text-white/60 text-xs">From budget_activity table</p>
              </CardHeader>
              <CardContent>
                {metrics?.budgetActivities && metrics.budgetActivities.length > 0 ? (
                  <div className="space-y-2">
                    {metrics.budgetActivities.map((activity) => (
                      <div key={activity.type} className="flex justify-between items-center p-2 bg-white/5 rounded">
                        <span className="text-white/70 capitalize">{activity.type.replace(/_/g, " ")}</span>
                        <Badge variant="outline" className="border-blue-500/50 text-blue-300">
                          {activity.count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/50 text-center py-4">No budget activity yet</p>
                )}
              </CardContent>
            </Card>

            {/* Data Sources Info */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Data Sources
                </h4>
                <div className="text-white/60 text-xs space-y-1">
                  <p>• <strong>feature_usage</strong> - Rate-limited features (AI Coach)</p>
                  <p>• <strong>goal_activity</strong> - Goal contributions, edits, shares</p>
                  <p>• <strong>budget_activity</strong> - Budget expenses, comments, invites</p>
                  <p>• <strong>audit_logs</strong> - Login/logout, security events</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
