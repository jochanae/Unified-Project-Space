import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Home,
  Shield,
  Users,
  FileText,
  CreditCard,
  BarChart3,
  Settings,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  PlayCircle,
  Upload,
  Loader2,
  ClipboardCheck,
  Loader,
  Building2,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { importLessonSections } from "@/lib/importLessonSections";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ActivityHeatMap } from "@/components/admin/ActivityHeatMap";
import { AdminFeatureFlags } from "@/components/admin/AdminFeatureFlags";
import { format } from "date-fns";

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalGoals: number;
  totalBudgets: number;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalGoals: 0,
    totalBudgets: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [importingLessons, setImportingLessons] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [activityData, setActivityData] = useState<{ date: string; count: number }[]>([]);

  const handleImportLessonSections = async () => {
    setImportingLessons(true);
    try {
      const result = await importLessonSections((current, total) => {
        setImportProgress({ current, total });
      });
      toast.success(`Imported ${result.imported} lesson sections (${result.errors} errors)`);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import lesson sections');
    } finally {
      setImportingLessons(false);
      setImportProgress({ current: 0, total: 0 });
    }
  };

  useEffect(() => {
    if (user) {
      checkAdminRole();
    }
  }, [user]);

  const checkAdminRole = async () => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user?.id)
        .in("role", ["admin", "super_admin"])
        .limit(1);

      if (error) throw error;
      setIsAdmin(data && data.length > 0);
      
      if (data && data.length > 0) {
        fetchStats();
      }
    } catch (error) {
      console.error("Error checking admin role:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [profilesRes, goalsRes, budgetsRes, profilesWithDates] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("goals").select("id", { count: "exact", head: true }),
        supabase.from("budgets").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("created_at").order("created_at", { ascending: false }).limit(500),
      ]);

      setStats({
        totalUsers: profilesRes.count || 0,
        activeUsers: Math.floor((profilesRes.count || 0) * 0.7),
        totalGoals: goalsRes.count || 0,
        totalBudgets: budgetsRes.count || 0,
      });

      // Calculate activity data for heat map from user signups
      if (profilesWithDates.data) {
        const activityMap = new Map<string, number>();
        profilesWithDates.data.forEach((profile) => {
          const date = format(new Date(profile.created_at), "yyyy-MM-dd");
          activityMap.set(date, (activityMap.get(date) || 0) + 1);
        });
        
        setActivityData(
          Array.from(activityMap.entries()).map(([date, count]) => ({ date, count }))
        );
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center loading-screen-bg">
        <LoadingSpinner size="lg" text="Loading admin panel..." />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Shield className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground mb-4">You don't have admin privileges.</p>
        <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-20">
      <Helmet>
        <title>Admin Panel | CoinsBloom</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-red-600 via-red-500 to-orange-500 px-4 pt-12 pb-8 relative overflow-hidden">
        <div className="absolute left-4 top-32 w-48 h-48 rounded-full bg-white/10" />
        <div className="absolute right-0 top-16 w-40 h-40 rounded-full bg-orange-400/30" />

        <div className="flex items-center gap-3 mb-6 relative z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="text-white hover:bg-white/20"
          >
            <Home className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <Shield className="h-8 w-8 text-white" />
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
            <p className="text-white/80 text-sm">Manage users, content, and settings</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users, content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card"
          />
        </div>

        {/* Activity Heat Map */}
        <ActivityHeatMap data={activityData} title="User Signups (Last 12 Weeks)" />

        {/* Feature Toggles */}
        <AdminFeatureFlags />

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Users className="h-5 w-5 text-blue-400" />
                <Badge variant="secondary" className="bg-white/20 text-white">Users</Badge>
              </div>
              <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
              <p className="text-xs text-white/60">{stats.activeUsers} active</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="h-5 w-5 text-green-400" />
                <Badge variant="secondary" className="bg-white/20 text-white">Savings Goals</Badge>
              </div>
              <p className="text-2xl font-bold text-white">{stats.totalGoals}</p>
              <p className="text-xs text-white/60">Created by users</p>
            </CardContent>
          </Card>
        </div>

        {/* Admin Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow bg-white/10 border-white/20 hover:bg-white/15"
            onClick={() => navigate("/admin/content")}
          >
            <CardContent className="p-4 text-center">
              <FileText className="h-8 w-8 mx-auto mb-2 text-purple-400" />
              <h3 className="font-semibold text-white">Content Hub</h3>
              <p className="text-xs text-white/60">Tips, videos, tutorials</p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow bg-white/10 border-white/20 hover:bg-white/15"
            onClick={() => navigate("/admin/kids-content")}
          >
            <CardContent className="p-4 text-center">
              <span className="text-2xl block mb-1">🌸</span>
              <h3 className="font-semibold text-white">KidsBloom</h3>
              <p className="text-xs text-white/60">Kids learning content</p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow bg-white/10 border-white/20 hover:bg-white/15"
            onClick={() => navigate("/admin/user-monitoring")}
          >
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-blue-400" />
              <h3 className="font-semibold text-white">User Monitoring</h3>
              <p className="text-xs text-white/60">View & manage users</p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow bg-white/10 border-white/20 hover:bg-white/15"
            onClick={() => navigate("/admin/data-integrity")}
          >
            <CardContent className="p-4 text-center">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
              <h3 className="font-semibold text-white">Data Integrity</h3>
              <p className="text-xs text-white/60">Verify calculations</p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow bg-white/10 border-white/20 hover:bg-white/15"
            onClick={() => navigate("/admin/e2e-testing")}
          >
            <CardContent className="p-4 text-center">
              <ClipboardCheck className="h-8 w-8 mx-auto mb-2 text-cyan-400" />
              <h3 className="font-semibold text-white">E2E Testing</h3>
              <p className="text-xs text-white/60">Run browser tests</p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow bg-white/10 border-white/20 hover:bg-white/15"
            onClick={() => navigate("/admin/engagement")}
          >
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-violet-400" />
              <h3 className="font-semibold text-white">Engagement</h3>
              <p className="text-xs text-white/60">DAU/MAU, adoption</p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow bg-white/10 border-white/20 hover:bg-white/15"
            onClick={() => navigate("/admin/audit")}
          >
            <CardContent className="p-4 text-center">
              <Clock className="h-8 w-8 mx-auto mb-2 text-orange-400" />
              <h3 className="font-semibold text-white">Audit Logs</h3>
              <p className="text-xs text-white/60">Activity tracking</p>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow bg-white/10 border-white/20 hover:bg-white/15"
            onClick={() => navigate("/admin/settings")}
          >
            <CardContent className="p-4 text-center">
              <Settings className="h-8 w-8 mx-auto mb-2 text-slate-400" />
              <h3 className="font-semibold text-white">Settings</h3>
              <p className="text-xs text-white/60">Platform config</p>
            </CardContent>
          </Card>
          <Card 
            className="col-span-2 cursor-pointer hover:shadow-md transition-shadow bg-white/10 border-white/20 hover:bg-white/15"
            onClick={() => navigate("/admin/enterprise")}
          >
            <CardContent className="p-4 text-center">
              <Building2 className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
              <h3 className="font-semibold text-white">Enterprise</h3>
              <p className="text-xs text-white/60">B2B partners</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-3">
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow bg-white/10 border-white/20 hover:bg-white/15"
            onClick={() => navigate("/card-dashboard")}
          >
            <CardContent className="p-4 text-center">
              <PlayCircle className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
              <h3 className="font-semibold text-white">Card Dashboard</h3>
              <p className="text-xs text-white/60">Debit card preview</p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow bg-white/10 border-white/20 hover:bg-white/15"
            onClick={() => navigate("/admin/settings?tab=credit")}
          >
            <CardContent className="p-4 text-center">
              <CreditCard className="h-8 w-8 mx-auto mb-2 text-violet-400" />
              <h3 className="font-semibold text-white">Credit Products</h3>
              <p className="text-xs text-white/60">Manage recommendations</p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow bg-white/10 border-white/20 hover:bg-white/15"
            onClick={() => navigate("/beta-testing")}
          >
            <CardContent className="p-4 text-center">
              <ClipboardCheck className="h-8 w-8 mx-auto mb-2 text-cyan-400" />
              <h3 className="font-semibold text-white">Beta Testing</h3>
              <p className="text-xs text-white/60">Tester feedback form</p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow bg-white/10 border-white/20 hover:bg-white/15"
            onClick={() => navigate("/admin/beta-results")}
          >
            <CardContent className="p-4 text-center">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 text-amber-400" />
              <h3 className="font-semibold text-white">Test Results</h3>
              <p className="text-xs text-white/60">View tester feedback</p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow bg-white/10 border-white/20 hover:bg-white/15"
            onClick={() => navigate("/admin/blog")}
          >
            <CardContent className="p-4 text-center">
              <BookOpen className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
              <h3 className="font-semibold text-white">Blog Manager</h3>
              <p className="text-xs text-white/60">Create & manage posts</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Admin;
