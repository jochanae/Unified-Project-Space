import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Search, Users, UserCheck, UserX, Mail, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ActivityHeatMap } from "@/components/admin/ActivityHeatMap";
import { UserPremiumToggle } from "@/components/admin/UserPremiumToggle";

interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
  created_at: string;
}

export default function AdminUserMonitoring() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({ total: 0, thisMonth: 0, active: 0 });
  const [activityData, setActivityData] = useState<{ date: string; count: number }[]>([]);
  const [premiumUsers, setPremiumUsers] = useState<Set<string>>(new Set());
  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      setIsAdmin(!!data);
      if (data) {
        fetchUsers();
        fetchPremiumUsers();
      }
      setLoading(false);
    };

    checkAdminRole();
  }, [user]);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setUsers(data);
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      setStats({
        total: data.length,
        thisMonth: data.filter((u) => new Date(u.created_at) >= monthStart).length,
        active: data.length,
      });

      // Calculate activity data for heat map
      const activityMap = new Map<string, number>();
      data.forEach((profile) => {
        const date = format(new Date(profile.created_at), "yyyy-MM-dd");
        activityMap.set(date, (activityMap.get(date) || 0) + 1);
      });
      setActivityData(
        Array.from(activityMap.entries()).map(([date, count]) => ({ date, count }))
      );
    }
  };

  const fetchPremiumUsers = async () => {
    const { data } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("plan", "premium")
      .eq("status", "active");

    if (data) {
      setPremiumUsers(new Set(data.map((s) => s.user_id)));
    }
  };

  const handlePremiumToggle = (userId: string, newState: boolean) => {
    setPremiumUsers((prev) => {
      const next = new Set(prev);
      if (newState) next.add(userId);
      else next.delete(userId);
      return next;
    });
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-950 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <Button onClick={() => navigate("/dashboard")}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-950">
      <Helmet>
        <title>User Monitoring | CoinsBloom Admin</title>
      </Helmet>

      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="text-white">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">User Monitoring</h1>
            <p className="text-white/60 text-sm">View and manage all users</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <Users className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-xs text-white/60">Total Users</div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <UserCheck className="h-6 w-6 text-blue-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{stats.thisMonth}</div>
              <div className="text-xs text-white/60">This Month</div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <UserCheck className="h-6 w-6 text-violet-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{stats.active}</div>
              <div className="text-xs text-white/60">Active</div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Heat Map */}
        <div className="mb-6">
          <ActivityHeatMap data={activityData} title="User Signups (Last 12 Weeks)" />
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
          />
        </div>

        {/* User List */}
        <div className="space-y-3">
          {filteredUsers.map((profile) => (
            <Card key={profile.id} className="bg-white/5 border-white/10">
              <CardContent className="p-4 flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={profile.profile_image_url || ""} />
                  <AvatarFallback className="bg-emerald-600 text-white">
                    {profile.first_name?.[0] || profile.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white truncate">
                    {profile.first_name || profile.last_name
                      ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
                      : "Unknown User"}
                  </h3>
                  <div className="flex items-center gap-1 text-sm text-white/60">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{profile.email}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <UserPremiumToggle
                    userId={profile.id}
                    isPremium={premiumUsers.has(profile.id)}
                    adminId={user!.id}
                    onToggle={handlePremiumToggle}
                  />
                  <div className="flex items-center gap-1 text-xs text-white/50">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(profile.created_at), "MMM d, yyyy")}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredUsers.length === 0 && (
            <div className="text-center py-12 text-white/60">
              {searchQuery ? "No users found matching your search" : "No users yet"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
