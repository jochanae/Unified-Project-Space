import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Radio, Calendar, Heart, User, CreditCard, Key, Building2 } from "lucide-react";
import LiveStreamSettings from "@/components/admin/LiveStreamSettings";
import EventsManager from "@/components/admin/EventsManager";
import DonationLinksManager from "@/components/admin/DonationLinksManager";
import FounderProfileManager from "@/components/admin/FounderProfileManager";
import CreditProductsManager from "@/components/admin/CreditProductsManager";
import PlatformApiKeys from "@/components/admin/PlatformApiKeys";

export default function AdminSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "livestream");

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "super_admin"]);

      // A user may have multiple roles (e.g., both admin + super_admin),
      // so we must NOT use maybeSingle() here.
      setIsAdmin(!error && (data?.length ?? 0) > 0);
      setLoading(false);
    };

    checkAdminRole();
  }, [user]);

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
        <title>Platform Settings | CoinsBloom Admin</title>
      </Helmet>

      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Platform Settings</h1>
              <p className="text-white/60 text-sm">Configure app features and integrations</p>
            </div>
          </div>
          <Button 
            onClick={() => navigate("/admin/enterprise")} 
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Building2 className="h-4 w-4 mr-2" />
            Enterprise Partners
          </Button>
        </div>

        <div className="w-full">
          <div className="w-full grid grid-cols-3 sm:grid-cols-6 bg-white/5 border border-white/10 rounded-xl p-1 gap-1 mb-6">
            <button
              onClick={() => setActiveTab("livestream")}
              className={`flex flex-col items-center gap-1 py-3 rounded-lg transition-colors ${activeTab === "livestream" ? "bg-red-600 text-white" : "text-white/70 hover:bg-white/10"}`}
            >
              <Radio className="h-4 w-4" />
              <span className="text-[10px]">Live</span>
            </button>
            <button
              onClick={() => setActiveTab("events")}
              className={`flex flex-col items-center gap-1 py-3 rounded-lg transition-colors ${activeTab === "events" ? "bg-blue-600 text-white" : "text-white/70 hover:bg-white/10"}`}
            >
              <Calendar className="h-4 w-4" />
              <span className="text-[10px]">Events</span>
            </button>
            <button
              onClick={() => setActiveTab("donations")}
              className={`flex flex-col items-center gap-1 py-3 rounded-lg transition-colors ${activeTab === "donations" ? "bg-pink-600 text-white" : "text-white/70 hover:bg-white/10"}`}
            >
              <Heart className="h-4 w-4" />
              <span className="text-[10px]">Donate</span>
            </button>
            <button
              onClick={() => setActiveTab("founder")}
              className={`flex flex-col items-center gap-1 py-3 rounded-lg transition-colors ${activeTab === "founder" ? "bg-amber-600 text-white" : "text-white/70 hover:bg-white/10"}`}
            >
              <User className="h-4 w-4" />
              <span className="text-[10px]">Founder</span>
            </button>
            <button
              onClick={() => setActiveTab("credit")}
              className={`flex flex-col items-center gap-1 py-3 rounded-lg transition-colors ${activeTab === "credit" ? "bg-emerald-600 text-white" : "text-white/70 hover:bg-white/10"}`}
            >
              <CreditCard className="h-4 w-4" />
              <span className="text-[10px]">Credit</span>
            </button>
            <button
              onClick={() => setActiveTab("api")}
              className={`flex flex-col items-center gap-1 py-3 rounded-lg transition-colors ${activeTab === "api" ? "bg-violet-600 text-white" : "text-white/70 hover:bg-white/10"}`}
            >
              <Key className="h-4 w-4" />
              <span className="text-[10px]">API</span>
            </button>
          </div>

          <div className="relative">
            {activeTab === "livestream" && <LiveStreamSettings />}
            {activeTab === "events" && <EventsManager />}
            {activeTab === "donations" && <DonationLinksManager />}
            {activeTab === "founder" && <FounderProfileManager />}
            {activeTab === "credit" && <CreditProductsManager />}
            {activeTab === "api" && <PlatformApiKeys />}
          </div>
        </div>
      </div>
    </div>
  );
}
