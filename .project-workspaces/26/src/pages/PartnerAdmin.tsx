import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Home,
  Building2,
  Users,
  Calendar,
  BookOpen,
  Settings,
  TrendingUp,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { PartnerTeamManager } from "@/components/partner-admin/PartnerTeamManager";
import { PartnerEventsManager } from "@/components/partner-admin/PartnerEventsManager";
import { PartnerContentManager } from "@/components/partner-admin/PartnerContentManager";
import { PartnerSettingsManager } from "@/components/partner-admin/PartnerSettingsManager";

interface Partner {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  tagline: string | null;
  contact_info: string | null;
  highlights_text: string | null;
  external_website_url: string | null;
  seats_purchased: number;
  seats_used: number;
  subscription_status: string;
}

const PartnerAdmin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("team");
  const [stats, setStats] = useState({ users: 0, events: 0, content: 0 });
  const [isAdmin, setIsAdmin] = useState(false);

  // Check for partner ID in URL (for admin access)
  const partnerIdParam = searchParams.get("id");

  useEffect(() => {
    if (user) {
      checkAccess();
    }
  }, [user, partnerIdParam]);

  const checkAccess = async () => {
    try {
      // First check if user is admin/super_admin
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user?.id)
        .in("role", ["admin", "super_admin"]);

      const userIsAdmin = roleData && roleData.length > 0;
      setIsAdmin(userIsAdmin);

      // If admin with partner ID param, load that partner
      if (userIsAdmin && partnerIdParam) {
        const { data: adminPartner, error } = await supabase
          .from("partners")
          .select("*")
          .eq("id", partnerIdParam)
          .single();

        if (!error && adminPartner) {
          setPartner(adminPartner);
          fetchStats(adminPartner.id);
          setLoading(false);
          return;
        }
      }

      // Otherwise check if user owns a partner
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .eq("owner_user_id", user?.id)
        .eq("is_active", true)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      setPartner(data);

      if (data) {
        fetchStats(data.id);
      }
    } catch (error) {
      console.error("Error checking partner access:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (partnerId: string) => {
    try {
      const [usersRes, eventsRes, contentRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("partner_id", partnerId),
        supabase.from("events").select("id", { count: "exact", head: true }).eq("partner_id", partnerId),
        supabase.from("learning_content").select("id", { count: "exact", head: true }).eq("partner_id", partnerId),
      ]);

      setStats({
        users: usersRes.count || 0,
        events: eventsRes.count || 0,
        content: contentRes.count || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center loading-screen-bg">
        <LoadingSpinner size="lg" text="Loading partner dashboard..." />
      </div>
    );
  }

  if (!user || !partner) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold mb-2">Partner Access Required</h2>
        <p className="text-muted-foreground mb-4 text-center">
          {isAdmin 
            ? "Select a partner from the Enterprise Portal to manage."
            : "You don't have partner admin privileges."}
        </p>
        <div className="flex gap-2">
          {isAdmin && (
            <Button onClick={() => navigate("/admin/enterprise")}>
              Enterprise Portal
            </Button>
          )}
          <Button variant={isAdmin ? "outline" : "default"} onClick={() => navigate("/dashboard")}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const primaryColor = partner.primary_color || "#10B981";

  return (
    <div className="min-h-screen bg-background pb-20">
      <Helmet>
        <title>{partner.name} Admin | CoinsBloom</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Hero Header - Clean glass morphism with partner color */}
      <div 
        className="px-4 pt-12 pb-6 relative overflow-hidden"
        style={{ backgroundColor: primaryColor }}
      >
        {/* Subtle decorative circles */}
        <div className="absolute -left-8 top-20 w-32 h-32 rounded-full bg-white/5" />
        <div className="absolute -right-4 top-8 w-24 h-24 rounded-full bg-white/10" />

        <div className="flex items-center gap-3 mb-4 relative z-10">
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
          {partner.logo_url ? (
            <img src={partner.logo_url} alt={partner.name} className="h-10 w-10 object-contain rounded-lg bg-white/10 p-1" />
          ) : (
            <Building2 className="h-8 w-8 text-white" />
          )}
          <div>
            <h1 className="text-2xl font-bold text-white">{partner.name}</h1>
            <p className="text-white/80 text-sm">Partner Admin Dashboard</p>
          </div>
        </div>

        {/* Quick Stats - glass cards */}
        <div className="grid grid-cols-3 gap-3 mt-5 relative z-10">
          <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
            <p className="text-2xl font-bold text-white">{stats.users}</p>
            <p className="text-xs text-white/70">Users</p>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
            <p className="text-2xl font-bold text-white">{stats.events}</p>
            <p className="text-xs text-white/70">Events</p>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
            <p className="text-2xl font-bold text-white">{stats.content}</p>
            <p className="text-xs text-white/70">Content</p>
          </div>
        </div>

        {/* Subscription Badge */}
        <div className="mt-4 flex items-center gap-2 relative z-10">
          <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
            {partner.seats_used} / {partner.seats_purchased} seats used
          </Badge>
          <Badge 
            className={`border-0 backdrop-blur-sm ${
              partner.subscription_status === 'active' 
                ? 'bg-green-500/30 text-green-100' 
                : 'bg-yellow-500/30 text-yellow-100'
            }`}
          >
            {partner.subscription_status}
          </Badge>
        </div>
      </div>

      {/* Subtle shadow divider */}
      <div className="h-px bg-border shadow-sm" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />

      {/* Tabs */}
      <div className="px-4 pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-4 bg-card">
            <TabsTrigger value="team" className="text-xs">
              <Users className="h-4 w-4 mr-1" />
              Team
            </TabsTrigger>
            <TabsTrigger value="events" className="text-xs">
              <Calendar className="h-4 w-4 mr-1" />
              Events
            </TabsTrigger>
            <TabsTrigger value="content" className="text-xs">
              <BookOpen className="h-4 w-4 mr-1" />
              Content
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs">
              <Settings className="h-4 w-4 mr-1" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="team" className="mt-4">
            <PartnerTeamManager partnerId={partner.id} />
          </TabsContent>

          <TabsContent value="events" className="mt-4">
            <PartnerEventsManager partnerId={partner.id} />
          </TabsContent>

          <TabsContent value="content" className="mt-4">
            <PartnerContentManager partnerId={partner.id} />
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <PartnerSettingsManager partner={partner} onUpdate={() => checkAccess()} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PartnerAdmin;
