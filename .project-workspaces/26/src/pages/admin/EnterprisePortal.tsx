import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Building2, 
  Plus, 
  Users, 
  Palette, 
  Globe, 
  BarChart3,
  Search,
  Eye,
  Settings,
  MoreVertical,
  Loader2,
  Monitor,
  Handshake
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { B2BReferralsManager } from "@/components/admin/B2BReferralsManager";

interface Partner {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  custom_domain: string | null;
  subscription_status: string;
  seats_purchased: number;
  seats_used: number;
  is_active: boolean;
  created_at: string;
}

export default function EnterprisePortal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [partners, setPartners] = useState<Partner[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newPartnerName, setNewPartnerName] = useState("");
  const [newPartnerSlug, setNewPartnerSlug] = useState("");
  const [newPartnerSeats, setNewPartnerSeats] = useState(5);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState("partners");

  // Handle success callback from Stripe
  useEffect(() => {
    const handleSuccess = async () => {
      const success = searchParams.get("success");
      const partnerName = searchParams.get("partner");
      const seats = searchParams.get("seats");
      const slug = searchParams.get("slug");

      if (success === "true" && partnerName && seats && slug) {
        try {
          const { error } = await supabase.functions.invoke("activate-partner", {
            body: { partnerName, slug, seats },
          });

          if (error) throw error;
          toast.success(`Partner "${partnerName}" activated successfully!`);
          fetchPartners();
        } catch (error) {
          console.error("Error activating partner:", error);
          toast.error("Failed to activate partner");
        }

        // Clear URL params
        window.history.replaceState({}, "", "/admin/enterprise");
      }

      if (searchParams.get("canceled") === "true") {
        toast.error("Partner checkout was canceled");
        window.history.replaceState({}, "", "/admin/enterprise");
      }
    };

    handleSuccess();
  }, [searchParams]);

  const fetchPartners = async () => {
    try {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPartners(data || []);
    } catch (error) {
      console.error("Error fetching partners:", error);
    }
  };

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        // Don't immediately deny - wait for auth state to settle
        return;
      }

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "super_admin"])
        .limit(1);

      setIsAdmin(data && data.length > 0);
      setLoading(false);

      if (data && data.length > 0) {
        fetchPartners();
      }
    };

    checkAdminRole();
  }, [user]);

  // Only set loading false after we've confirmed no user (give auth time to settle)
  useEffect(() => {
    if (!user) {
      const timeout = setTimeout(() => {
        setLoading(false);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [user]);

  const handleCreatePartner = async () => {
    if (!newPartnerName || !newPartnerSlug || newPartnerSeats < 1) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-partner-checkout", {
        body: {
          partnerName: newPartnerName,
          slug: newPartnerSlug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
          seats: newPartnerSeats,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error("Error creating partner checkout:", error);
      toast.error(error?.message || "Failed to create checkout session");
    } finally {
      setIsCreating(false);
    }
  };

  const filteredPartners = partners.filter(partner =>
    partner.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSeats = partners.reduce((acc, p) => acc + p.seats_purchased, 0);
  const usedSeats = partners.reduce((acc, p) => acc + p.seats_used, 0);
  const activePartners = partners.filter(p => p.is_active).length;

  // Calculate monthly pricing
  const monthlyRevenue = partners.reduce((acc, p) => {
    if (p.is_active) {
      return acc + 29 + (p.seats_purchased * 7);
    }
    return acc;
  }, 0);

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
        <title>Enterprise Partners | CoinsBloom Admin</title>
      </Helmet>

      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/settings")} className="text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
                <Building2 className="h-7 w-7 text-emerald-400" />
                Enterprise Partners
              </h1>
              <p className="text-white/60 text-sm">Manage B2B partners and white-label tenants</p>
            </div>
          </div>
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Partner
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-white/10">
              <DialogHeader>
                <DialogTitle className="text-white">Add New Partner</DialogTitle>
                <DialogDescription className="text-white/60">
                  Create a new B2B partner with white-label access. Pricing: $29/mo base + $7/seat/mo
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label className="text-white/80">Partner Name</Label>
                  <Input
                    value={newPartnerName}
                    onChange={(e) => setNewPartnerName(e.target.value)}
                    placeholder="Acme Realty"
                    className="bg-white/5 border-white/10 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-white/80">URL Slug</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-white/40 text-sm">coinsbloom.com/p/</span>
                    <Input
                      value={newPartnerSlug}
                      onChange={(e) => setNewPartnerSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                      placeholder="acme-realty"
                      className="bg-white/5 border-white/10 text-white flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-white/80">Number of Seats</Label>
                  <Input
                    type="number"
                    min={1}
                    value={newPartnerSeats}
                    onChange={(e) => setNewPartnerSeats(parseInt(e.target.value) || 1)}
                    className="bg-white/5 border-white/10 text-white mt-1"
                  />
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                  <p className="text-emerald-400 font-medium">Monthly Cost</p>
                  <p className="text-2xl font-bold text-white">
                    ${29 + (newPartnerSeats * 7)}/mo
                  </p>
                  <p className="text-white/60 text-sm">
                    $29 base + ${newPartnerSeats * 7} ({newPartnerSeats} seats × $7)
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setShowAddDialog(false)} className="text-white/70">
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreatePartner} 
                  disabled={isCreating}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Continue to Payment"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <Building2 className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white/60 text-xs">Total Partners</p>
                  <p className="text-2xl font-bold text-white">{partners.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-white/60 text-xs">Active Users</p>
                  <p className="text-2xl font-bold text-white">{usedSeats}/{totalSeats}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-white/60 text-xs">Active Partners</p>
                  <p className="text-2xl font-bold text-white">{activePartners}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Globe className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-white/60 text-xs">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-white">${monthlyRevenue}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Partners vs Referrals */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="bg-white/10 border-white/10">
            <TabsTrigger value="partners" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-white/70">
              <Building2 className="h-4 w-4 mr-2" />
              Partners
            </TabsTrigger>
            <TabsTrigger value="referrals" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-white/70">
              <Handshake className="h-4 w-4 mr-2" />
              B2B Referrals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="partners" className="mt-6">
            {/* Search & Filter */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  placeholder="Search partners..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>
              <Button 
                variant="outline" 
                className="border-white/40 text-white bg-white/10 hover:bg-white/20 font-medium"
                onClick={() => navigate("/partner/admin")}
              >
                <Settings className="h-4 w-4 mr-2" />
                Partner Admin Portal
              </Button>
            </div>

            <p className="text-white/60 text-xs mb-6">
          Tip: Use a partner row’s ⋯ menu → <span className="text-white/80">Preview Dashboard</span> to open the white‑label dashboard in a new tab.
        </p>

        {/* Partners List */}
        <div className="space-y-4">
          {filteredPartners.map((partner) => (
            <Card key={partner.id} className="bg-white/5 border-white/10 hover:bg-white/[0.07] transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Logo/Color Preview */}
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: partner.primary_color }}
                    >
                      {partner.name.charAt(0)}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-white">{partner.name}</h3>
                        <Badge 
                          variant={partner.is_active ? "default" : "secondary"}
                          className={partner.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-yellow-500/20 text-yellow-400"}
                        >
                          {partner.subscription_status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-white/60">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {partner.seats_used}/{partner.seats_purchased} seats
                        </span>
                        {partner.custom_domain && (
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {partner.custom_domain}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Palette className="h-3 w-3" />
                          Custom theme
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-white/70 hover:text-white hover:bg-white/10"
                      onClick={() => navigate(`/partner/admin?id=${partner.id}`)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Configure
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-slate-800 border-white/10">
                        <DropdownMenuItem 
                          className="text-white hover:bg-white/10"
                          onClick={() => navigate(`/p/${partner.slug}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Preview Landing Page
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-white hover:bg-white/10"
                          onClick={() => {
                            window.open(`/dashboard?partner=${partner.slug}`, "_blank", "noopener,noreferrer");
                            toast.info(`Opening ${partner.name} dashboard preview…`);
                          }}
                        >
                          <Monitor className="h-4 w-4 mr-2" />
                          Preview Dashboard
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-white hover:bg-white/10">
                          <Users className="h-4 w-4 mr-2" />
                          Manage Users
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-white hover:bg-white/10">
                          <BarChart3 className="h-4 w-4 mr-2" />
                          View Analytics
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredPartners.length === 0 && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-12 text-center">
              <Building2 className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No partners found</h3>
              <p className="text-white/60 mb-4">Get started by adding your first enterprise partner</p>
              <Button 
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Partner
              </Button>
            </CardContent>
          </Card>
        )}
          </TabsContent>

          <TabsContent value="referrals" className="mt-6">
            <B2BReferralsManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
