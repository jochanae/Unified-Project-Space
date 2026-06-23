import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Search, Shield, AlertCircle, Info, CheckCircle, Bug, Clock, CheckCheck, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import { ActivityHeatMap } from "@/components/admin/ActivityHeatMap";

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: unknown;
  ip_address: string | null;
  created_at: string;
}

interface BugReport {
  id: string;
  user_id: string | null;
  error_message: string;
  error_stack: string | null;
  page_url: string | null;
  status: string;
  created_at: string;
}

export default function AdminAudit() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activityData, setActivityData] = useState<{ date: string; count: number }[]>([]);
  const [clearDays, setClearDays] = useState("30");
  const [isClearing, setIsClearing] = useState(false);

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
        fetchData();
      }
      setLoading(false);
    };

    checkAdminRole();
  }, [user]);

  const fetchData = async () => {
    // Fetch audit logs
    const { data: logsData } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (logsData) {
      setLogs(logsData);
      
      // Calculate activity data for heat map
      const activityMap = new Map<string, number>();
      logsData.forEach((log) => {
        const date = format(new Date(log.created_at), "yyyy-MM-dd");
        activityMap.set(date, (activityMap.get(date) || 0) + 1);
      });
      
      setActivityData(
        Array.from(activityMap.entries()).map(([date, count]) => ({ date, count }))
      );
    }

    // Fetch bug reports
    const { data: bugsData } = await supabase
      .from("bug_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (bugsData) {
      setBugReports(bugsData);
    }
  };

  const updateBugStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("bug_reports")
      .update({ 
        status, 
        resolved_at: status === "resolved" ? new Date().toISOString() : null 
      })
      .eq("id", id);

    if (!error) {
      setBugReports((prev) =>
        prev.map((bug) => (bug.id === id ? { ...bug, status } : bug))
      );
    }
  };

  const clearResolvedBugs = async () => {
    setIsClearing(true);
    const cutoffDate = subDays(new Date(), parseInt(clearDays)).toISOString();
    
    const { error, count } = await supabase
      .from("bug_reports")
      .delete()
      .eq("status", "resolved")
      .lt("resolved_at", cutoffDate);

    if (error) {
      toast.error("Failed to clear resolved bugs");
    } else {
      toast.success(`Cleared ${count || 0} resolved bug reports`);
      // Refresh the data
      fetchData();
    }
    setIsClearing(false);
  };

  const resolvedCount = bugReports.filter(b => b.status === "resolved").length;

  const getActionIcon = (action: string) => {
    if (action.includes("delete") || action.includes("remove")) {
      return <AlertCircle className="h-4 w-4 text-red-400" />;
    }
    if (action.includes("create") || action.includes("add")) {
      return <CheckCircle className="h-4 w-4 text-emerald-400" />;
    }
    return <Info className="h-4 w-4 text-blue-400" />;
  };

  const getActionColor = (action: string) => {
    if (action.includes("delete") || action.includes("remove")) return "bg-red-500/20 text-red-400";
    if (action.includes("create") || action.includes("add")) return "bg-emerald-500/20 text-emerald-400";
    if (action.includes("update") || action.includes("edit")) return "bg-amber-500/20 text-amber-400";
    return "bg-blue-500/20 text-blue-400";
  };

  const getStatusColor = (status: string) => {
    if (status === "resolved") return "bg-emerald-500/20 text-emerald-400";
    if (status === "in_progress") return "bg-amber-500/20 text-amber-400";
    return "bg-red-500/20 text-red-400";
  };

  const filteredLogs = logs.filter(
    (log) =>
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBugs = bugReports.filter(
    (bug) =>
      bug.error_message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bug.page_url?.toLowerCase().includes(searchQuery.toLowerCase())
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
        <title>Audit Log | CoinsBloom Admin</title>
      </Helmet>

      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="text-white">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
              <Shield className="h-7 w-7 text-emerald-400" />
              Audit Log
            </h1>
            <p className="text-white/60 text-sm">Activity, security trails & bug reports</p>
          </div>
        </div>

        {/* Activity Heat Map */}
        <div className="mb-6">
          <ActivityHeatMap data={activityData} title="Activity Overview (Last 12 Weeks)" />
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            placeholder="Search logs or bug reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="audit" className="space-y-4">
          <TabsList className="bg-white/5 border-white/10">
            <TabsTrigger value="audit" className="data-[state=active]:bg-emerald-600">
              <Clock className="h-4 w-4 mr-2" />
              Audit Logs ({logs.length})
            </TabsTrigger>
            <TabsTrigger value="bugs" className="data-[state=active]:bg-red-600">
              <Bug className="h-4 w-4 mr-2" />
              Bug Reports ({bugReports.filter(b => b.status === "open").length} open)
            </TabsTrigger>
          </TabsList>

          {/* Audit Logs Tab */}
          <TabsContent value="audit" className="space-y-2">
            {filteredLogs.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-8 text-center text-white/60">
                  {searchQuery ? "No logs matching your search" : "No audit logs yet. Actions will appear here as they occur."}
                </CardContent>
              </Card>
            ) : (
              filteredLogs.map((log) => (
                <Card key={log.id} className="bg-white/5 border-white/10">
                  <CardContent className="p-3 flex items-center gap-3">
                    {getActionIcon(log.action)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getActionColor(log.action)}>{log.action}</Badge>
                        <span className="text-sm text-white/60">{log.entity_type}</span>
                      </div>
                    </div>
                    <div className="text-xs text-white/40">
                      {format(new Date(log.created_at), "MMM d, h:mm a")}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Bug Reports Tab */}
          <TabsContent value="bugs" className="space-y-4">
            {/* Clear Resolved Bugs Section */}
            {resolvedCount > 0 && (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="text-white/70 text-sm">
                    <span className="text-white font-medium">{resolvedCount}</span> resolved bug(s) in records
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-white/50 text-sm">Clear older than:</span>
                    <Select value={clearDays} onValueChange={setClearDays}>
                      <SelectTrigger className="w-[120px] bg-white/5 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-400 border-red-400/30 hover:bg-red-400/10"
                      onClick={clearResolvedBugs}
                      disabled={isClearing}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {isClearing ? "Clearing..." : "Clear Resolved"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <div className="space-y-2">
            {filteredBugs.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-8 text-center text-white/60">
                  {searchQuery ? "No bug reports matching your search" : "No bug reports yet. User-reported issues will appear here."}
                </CardContent>
              </Card>
            ) : (
              filteredBugs.map((bug) => (
                <Card key={bug.id} className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Bug className="h-4 w-4 text-red-400" />
                          <Badge className={getStatusColor(bug.status)}>{bug.status}</Badge>
                          <span className="text-xs text-white/40">
                            {format(new Date(bug.created_at), "MMM d, h:mm a")}
                          </span>
                        </div>
                        <p className="text-sm text-white font-medium truncate mb-1">
                          {bug.error_message}
                        </p>
                        {bug.page_url && (
                          <p className="text-xs text-white/50 truncate">
                            Page: {bug.page_url}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {bug.status === "open" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-amber-400 border-amber-400/30 hover:bg-amber-400/10"
                            onClick={() => updateBugStatus(bug.id, "in_progress")}
                          >
                            In Progress
                          </Button>
                        )}
                        {bug.status !== "resolved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-emerald-400 border-emerald-400/30 hover:bg-emerald-400/10"
                            onClick={() => updateBugStatus(bug.id, "resolved")}
                          >
                            <CheckCheck className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
