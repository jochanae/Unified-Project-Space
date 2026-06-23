import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Users, TrendingUp, ExternalLink, QrCode, Share2, RefreshCw, Building2 } from "lucide-react";
import { useProfessionalMode } from "@/contexts/ProfessionalModeContext";
import { ProfessionalQRCode } from "./ProfessionalQRCode";
import { B2BReferralDashboard } from "@/components/referrals/B2BReferralDashboard";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export function ProfessionalDashboard() {
  const { professional, stats, isProfessionalMode, refreshStats } = useProfessionalMode();
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (isProfessionalMode && professional) {
      refreshStats();
    }
  }, [isProfessionalMode, professional, refreshStats]);

  if (!professional || !isProfessionalMode) {
    return null;
  }

  const profileUrl = `${window.location.origin}/professionals/${professional.id}`;

  const handleShareProfile = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${professional.name} - Financial Professional`,
          text: `Check out my professional profile on CoinsBloom`,
          url: profileUrl,
        });
      } else {
        await navigator.clipboard.writeText(profileUrl);
        toast.success("Profile link copied to clipboard!");
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        await navigator.clipboard.writeText(profileUrl);
        toast.success("Profile link copied to clipboard!");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Professional Dashboard
            {professional.is_verified && (
              <Badge variant="secondary" className="text-xs">Verified</Badge>
            )}
            {professional.is_featured && (
              <Badge className="text-xs">Featured</Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your profile performance and referrals
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refreshStats()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleShareProfile}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <ProfessionalQRCode 
            professionalId={professional.id} 
            professionalName={professional.name}
            variant="button"
          />
          <Link to={`/professionals/${professional.id}`}>
            <Button size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Profile
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs for Overview and B2B Referrals */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="b2b" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            B2B Referrals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Profile Views</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {stats ? (
                  <>
                    <div className="text-2xl font-bold">{stats.totalViews}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.viewsThisMonth} this month
                    </p>
                  </>
                ) : (
                  <Skeleton className="h-8 w-20" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Views This Week</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {stats ? (
                  <>
                    <div className="text-2xl font-bold">{stats.viewsThisWeek}</div>
                    <p className="text-xs text-muted-foreground">
                      Last 7 days
                    </p>
                  </>
                ) : (
                  <Skeleton className="h-8 w-20" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {stats ? (
                  <>
                    <div className="text-2xl font-bold">{stats.totalReferrals}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.referralsThisMonth} this month
                    </p>
                  </>
                ) : (
                  <Skeleton className="h-8 w-20" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Premium Conversions</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                {stats ? (
                  <>
                    <div className="text-2xl font-bold">{stats.convertedToPremium}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.totalReferrals > 0 
                        ? `${Math.round((stats.convertedToPremium / stats.totalReferrals) * 100)}% conversion rate`
                        : "No referrals yet"
                      }
                    </p>
                  </>
                ) : (
                  <Skeleton className="h-8 w-20" />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Share Your Profile</CardTitle>
              <CardDescription>
                Share your professional profile with clients to help them get started with CoinsBloom
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={profileUrl}
                      className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted truncate"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(profileUrl);
                        toast.success("Link copied!");
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    When clients sign up through your profile, they'll be tracked as your referrals
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="b2b" className="mt-6">
          <B2BReferralDashboard 
            referrerType="professional" 
            professionalId={professional.id} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
