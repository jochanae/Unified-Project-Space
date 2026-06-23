import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Menu, Sun, ChevronDown, Lightbulb, GraduationCap, Heart, Bell, User, TrendingUp, Target, CreditCard, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import coinsbloomLogo from "@/assets/coinsbloom-logo.png";

interface Partner {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
}

export default function PartnerDashboardPreview() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPartner() {
      if (!slug) return;
      
      const { data } = await supabase
        .from("partners_public")
        .select("id, name, slug, logo_url, primary_color, secondary_color")
        .eq("slug", slug)
        .single();
      
      setPartner(data);
      setLoading(false);
    }
    fetchPartner();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center loading-screen-bg">
        <LoadingSpinner size="lg" text="Loading preview..." />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <p className="text-gray-600">Partner not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/80 via-purple-50/60 to-pink-50/80">
      {/* Preview Mode Banner */}
      <div className="bg-amber-500 text-amber-950 py-2 px-4 flex items-center justify-center gap-3">
        <span className="text-sm font-medium">
          📋 Dashboard Preview: How it looks for <strong>{partner.name}</strong> users
        </span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(`/partner/admin?id=${partner.id}`)}
          className="h-6 px-2 text-amber-950 hover:bg-amber-600"
        >
          ← Back to Admin
        </Button>
      </div>

      {/* Mock Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/50 border-b border-gray-200/30 rounded-b-3xl" style={{ boxShadow: '0 20px 25px -5px rgba(147,51,234,0.2)' }}>
        <div className="flex items-center justify-between px-3 py-2">
          {/* Left: Menu + Logo */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="p-1.5">
              <div className="flex flex-col items-center">
                <Menu className="h-6 w-6" />
                <span className="text-[10px] mt-0.5">Menu</span>
              </div>
            </Button>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                {partner.logo_url ? (
                  <img src={partner.logo_url} alt={partner.name} className="h-8 w-auto object-contain" />
                ) : (
                  <>
                    <img src={coinsbloomLogo} alt="CoinsBloom" className="h-8 w-8" />
                    <span className="font-semibold text-sm bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 bg-clip-text text-transparent">CoinsBloom</span>
                  </>
                )}
                {partner.logo_url && (
                  <span className="ml-2 text-[10px] text-gray-500 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Powered by CoinsBloom
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Icons */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-gray-100">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-gray-100">
              <Sun className="h-5 w-5" />
            </Button>
            <Button variant="ghost" className="flex flex-col items-center h-auto py-1 px-2 rounded-full bg-gray-100">
              <Lightbulb className="h-4 w-4" />
              <span className="text-[8px]">Coach</span>
            </Button>
            <Button variant="ghost" className="flex flex-col items-center h-auto py-1 px-2 rounded-full bg-gray-100">
              <GraduationCap className="h-4 w-4" />
              <span className="text-[8px]">Learn</span>
            </Button>
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
              J
            </div>
          </div>
        </div>
      </header>

      {/* Mock Status Bar */}
      <div className="mx-4 mt-2 p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500"></div>
          <span className="text-xs text-gray-600">All Systems Online</span>
        </div>
        <span className="text-xs text-gray-400">Last synced: Just now</span>
      </div>

      {/* Mock Greeting */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-3xl">☀️</span>
          <h2 className="text-xl font-semibold text-gray-800">
            Good Morning, <span className="text-xl font-bold">Sample User</span>!
          </h2>
        </div>
        <div className="flex items-center gap-2 justify-center">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <p className="text-sm font-semibold text-gray-700 text-center">Start your day with smart financial choices!</p>
          <button className="flex items-center gap-1 opacity-60">
            <Heart className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-[10px] text-gray-400">Like</span>
          </button>
        </div>
      </div>

      {/* Mock Balance Card */}
      <div className="px-4 mt-4">
        <Card className="bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600 text-white p-5 rounded-2xl">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-purple-200 text-sm">Total Balance</p>
              <h3 className="text-3xl font-bold">$12,450.00</h3>
            </div>
            <div className="flex items-center gap-1 bg-green-500/20 px-2 py-1 rounded-full">
              <TrendingUp className="h-3 w-3 text-green-300" />
              <span className="text-xs text-green-300">+5.2%</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <PiggyBank className="h-5 w-5 mx-auto mb-1 text-purple-200" />
              <p className="text-xs text-purple-200">Savings</p>
              <p className="font-semibold">$5,200</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <Target className="h-5 w-5 mx-auto mb-1 text-purple-200" />
              <p className="text-xs text-purple-200">Goals</p>
              <p className="font-semibold">3 Active</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <CreditCard className="h-5 w-5 mx-auto mb-1 text-purple-200" />
              <p className="text-xs text-purple-200">Bills</p>
              <p className="font-semibold">2 Due</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Mock Quick Actions */}
      <div className="px-4 mt-4 grid grid-cols-4 gap-3">
        {[
          { icon: Target, label: "Goals", color: "bg-blue-100 text-blue-600" },
          { icon: CreditCard, label: "Bills", color: "bg-red-100 text-red-600" },
          { icon: PiggyBank, label: "Budget", color: "bg-green-100 text-green-600" },
          { icon: TrendingUp, label: "Invest", color: "bg-purple-100 text-purple-600" },
        ].map((item, i) => (
          <div key={i} className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
            <div className={`h-10 w-10 rounded-full ${item.color} flex items-center justify-center mx-auto mb-2`}>
              <item.icon className="h-5 w-5" />
            </div>
            <p className="text-xs font-medium text-gray-700">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Info Note */}
      <div className="mx-4 mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-sm text-blue-800 text-center">
          👆 This is a preview of how the dashboard appears to users who signed up through <strong>{partner.name}</strong>. 
          The partner logo replaces the CoinsBloom logo in the header.
        </p>
      </div>
    </div>
  );
}