import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Users, Rocket, FolderKanban, CreditCard, Crown, ShieldCheck, Wrench, Activity, Bug, Flag, DollarSign, StickyNote, Mail, Clock, Library, Sparkles,
} from 'lucide-react';
import GlobalFollowupsTab from '@/features/admin/components/GlobalFollowupsTab';
import ScheduledFollowupsTab from '@/features/admin/components/ScheduledFollowupsTab';
import FounderDashboard from '@/features/admin/components/FounderDashboard';
import UserManagement from '@/features/admin/components/UserManagement';
import AdminProjectsTab from '@/features/admin/components/AdminProjectsTab';
import AdminSubscriptionsTab from '@/features/admin/components/AdminSubscriptionsTab';
import HealthCheckRunner from '@/features/admin/components/HealthCheckRunner';
import HeartbeatIndicator from '@/features/admin/components/HeartbeatIndicator';
import EmailHealthPanel from '@/features/admin/components/EmailHealthPanel';
import ErrorLogDashboard from '@/features/admin/components/ErrorLogDashboard';
import FeatureFlagsDashboard from '@/features/admin/components/FeatureFlagsDashboard';
import UserDeletionTool from '@/features/admin/components/UserDeletionTool';
import UserBlockTool from '@/features/admin/components/UserBlockTool';
import RegressionChecklist from '@/features/admin/components/RegressionChecklist';
import CostsDashboard from '@/features/admin/components/CostsDashboard';
import DevNotes from '@/features/admin/components/DevNotes';
import { RevenueDashboard } from '@/features/billing/components/RevenueDashboard';
import AdminLibraryManager from '@/features/admin/components/AdminLibraryManager';
import LandingLeadsTab from '@/features/admin/components/LandingLeadsTab';

export default function AdminPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [errorCount, setErrorCount] = useState(0);
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) {
      setIsAdmin(false);
      return;
    }

    let cancelled = false;

    supabase.rpc('is_admin').then(({ data, error }) => {
      if (cancelled) return;
      setIsAdmin(!error && !!data);
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (isAdmin === null) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background text-muted-foreground">
        Checking access…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background gap-4">
        <ShieldCheck className="h-12 w-12 text-destructive" />
        <p className="text-lg font-semibold text-foreground">Admin access required</p>
        <button onClick={() => navigate('/projects')} className="text-sm text-primary hover:underline">
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header — sits below the global AppShell header (h-14) */}
      <div className="sticky top-14 z-20 flex items-center gap-3 border-b border-border/30 bg-background/80 backdrop-blur-lg px-4 py-3">
        <button onClick={() => navigate('/projects')} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Admin Dashboard</h1>
        <div className="ml-auto flex items-center gap-2">
          {/* Live indicator */}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-500">
            <Crown className="h-3 w-3 mr-1" /> Super Admin
          </Badge>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4">
        <Tabs defaultValue="mission" className="space-y-4">
          <TabsList className="w-full flex flex-wrap gap-1 h-auto p-1">
            <TabsTrigger value="mission" className="gap-1.5 text-xs"><Rocket className="h-3.5 w-3.5" /> Mission</TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5 text-xs"><Users className="h-3.5 w-3.5" /> Users</TabsTrigger>
            <TabsTrigger value="projects" className="gap-1.5 text-xs"><FolderKanban className="h-3.5 w-3.5" /> Projects</TabsTrigger>
            <TabsTrigger value="billing" className="gap-1.5 text-xs"><CreditCard className="h-3.5 w-3.5" /> Billing</TabsTrigger>
            <TabsTrigger value="health" className="gap-1.5 text-xs"><Activity className="h-3.5 w-3.5" /> Health</TabsTrigger>
            <TabsTrigger value="errors" className="gap-1.5 text-xs">
              <Bug className="h-3.5 w-3.5" /> Errors
              {errorCount > 0 && <Badge variant="destructive" className="ml-1 text-[10px] h-4 px-1">{errorCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="flags" className="gap-1.5 text-xs"><Flag className="h-3.5 w-3.5" /> Flags</TabsTrigger>
            <TabsTrigger value="tools" className="gap-1.5 text-xs"><Wrench className="h-3.5 w-3.5" /> Tools</TabsTrigger>
            <TabsTrigger value="costs" className="gap-1.5 text-xs"><DollarSign className="h-3.5 w-3.5" /> Costs</TabsTrigger>
            <TabsTrigger value="revenue" className="gap-1.5 text-xs"><CreditCard className="h-3.5 w-3.5" /> Revenue</TabsTrigger>
            <TabsTrigger value="followups" className="gap-1.5 text-xs"><Mail className="h-3.5 w-3.5" /> Audit</TabsTrigger>
            <TabsTrigger value="scheduled" className="gap-1.5 text-xs"><Clock className="h-3.5 w-3.5" /> Scheduled</TabsTrigger>
            <TabsTrigger value="devnotes" className="gap-1.5 text-xs"><StickyNote className="h-3.5 w-3.5" /> Notes</TabsTrigger>
            <TabsTrigger value="library" className="gap-1.5 text-xs"><Library className="h-3.5 w-3.5" /> Library</TabsTrigger>
            <TabsTrigger value="landing" className="gap-1.5 text-xs"><Sparkles className="h-3.5 w-3.5" /> Landing</TabsTrigger>
          </TabsList>

          {/* Mission / Founder Hub */}
          <TabsContent value="mission" className="space-y-4">
            <FounderDashboard />
          </TabsContent>

          {/* Users — full management */}
          <TabsContent value="users" className="space-y-3">
            <UserManagement currentUserId={userId} />
          </TabsContent>

          {/* Projects */}
          <TabsContent value="projects" className="space-y-3">
            <AdminProjectsTab />
          </TabsContent>

          {/* Billing / Subscriptions */}
          <TabsContent value="billing" className="space-y-3">
            <AdminSubscriptionsTab />
          </TabsContent>

          {/* Health */}
          <TabsContent value="health" className="space-y-3">
            <HeartbeatIndicator />
            <EmailHealthPanel />
            <HealthCheckRunner />
          </TabsContent>

          {/* Errors */}
          <TabsContent value="errors" className="space-y-3">
            <ErrorLogDashboard onCount={setErrorCount} />
          </TabsContent>

          {/* Feature Flags */}
          <TabsContent value="flags" className="space-y-3">
            <FeatureFlagsDashboard />
          </TabsContent>

          {/* Tools */}
          <TabsContent value="tools" className="space-y-4">
            <UserDeletionTool currentUserId={userId} />
            <UserBlockTool />
            <RegressionChecklist />
          </TabsContent>

          {/* Costs */}
          <TabsContent value="costs" className="space-y-3">
            <CostsDashboard />
          </TabsContent>

          {/* Revenue */}
          <TabsContent value="revenue" className="space-y-3">
            <RevenueDashboard />
          </TabsContent>

          {/* Global Follow-ups */}
          <TabsContent value="followups" className="space-y-3">
            <GlobalFollowupsTab />
          </TabsContent>

          {/* Scheduled Follow-ups */}
          <TabsContent value="scheduled" className="space-y-3">
            <ScheduledFollowupsTab />
          </TabsContent>

          {/* Dev Notes */}
          <TabsContent value="devnotes" className="space-y-3">
            <DevNotes />
          </TabsContent>

          {/* Knowledge Vault */}
          <TabsContent value="library" className="space-y-3">
            <AdminLibraryManager />
          </TabsContent>

          {/* Landing Leads */}
          <TabsContent value="landing" className="space-y-3">
            <LandingLeadsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
