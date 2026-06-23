import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Star, 
  CheckCircle, 
  Globe, 
  Calendar,
  Briefcase,
  Users,
  Share2,
  Edit
} from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ProfessionalReviews } from "@/components/professionals/ProfessionalReviews";
import { ProfessionalQRCode } from "@/components/professionals/ProfessionalQRCode";

// Public-safe professional data (excludes contact_email, claim_token, stripe_connect_account_id)
interface Professional {
  id: string;
  name: string;
  title: string | null;
  avatar_url: string | null;
  specialty: string;
  bio: string | null;
  website_url: string | null;
  calendar_url: string | null;
  is_verified: boolean;
  is_featured: boolean;
  is_active: boolean;
  rating: number | null;
  review_count: number | null;
  partner_id: string | null;
  qr_code_url: string | null;
}

interface PartnerTheme {
  primary_color: string;
  secondary_color: string;
}

// Helper to get tags from specialty
const getTagsFromSpecialty = (specialty: string): string[] => {
  const tagMap: Record<string, string[]> = {
    financial_advisor: ["Investments", "Retirement", "Wealth Management"],
    tax_professional: ["Tax", "Business", "Accounting"],
    credit_counselor: ["Credit", "Debt", "Financial Recovery"],
    debt_specialist: ["Debt", "Loans", "Consolidation"],
    investment_advisor: ["Stocks", "Bonds", "Mutual Funds"],
    insurance_agent: ["Life Insurance", "Health", "Auto"],
    real_estate: ["Real Estate", "Mortgages", "Property"],
    estate_planning: ["Estate Planning", "Trusts", "Legal"],
  };
  return tagMap[specialty] || [specialty.replace(/_/g, " ")];
};

// Helper to get services from specialty
const getServicesFromSpecialty = (specialty: string): string[] => {
  const servicesMap: Record<string, string[]> = {
    financial_advisor: ["Financial Planning", "Investment Management", "Retirement Planning", "Tax Strategy"],
    tax_professional: ["Tax Preparation", "Business Accounting", "Tax Strategy", "Audit Support"],
    credit_counselor: ["Credit Repair", "Debt Management", "Budget Counseling", "Financial Education"],
    debt_specialist: ["Debt Consolidation", "Loan Negotiation", "Payment Plans", "Bankruptcy Guidance"],
    investment_advisor: ["Portfolio Management", "Stock Trading", "Bond Investments", "Wealth Building"],
    insurance_agent: ["Life Insurance", "Health Insurance", "Auto Insurance", "Home Insurance"],
    real_estate: ["Property Sales", "Home Buying", "Mortgage Assistance", "Investment Properties"],
    estate_planning: ["Will Preparation", "Trust Management", "Estate Administration", "Legacy Planning"],
  };
  return servicesMap[specialty] || ["Consultation", "Advisory Services"];
};

const ProfessionalProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { loading: authLoading, user } = useAuth();
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [partnerTheme, setPartnerTheme] = useState<PartnerTheme | null>(null);
  const [loading, setLoading] = useState(true);

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareData = {
      title: professional ? `${professional.name} - CoinsBloom Professional` : 'CoinsBloom Professional',
      text: professional ? `Check out ${professional.name}, a verified financial professional on CoinsBloom!` : 'Check out this professional on CoinsBloom!',
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or share failed, fallback to copy
        if ((err as Error).name !== 'AbortError') {
          await copyToClipboard(shareUrl);
        }
      }
    } else {
      await copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const scrollToReviews = () => {
    document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchProfessional = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    try {
      // Use the public-safe view that excludes sensitive fields like contact_email, claim_token, stripe_connect_account_id
      const { data, error } = await supabase
        .from("professionals_public")
        .select("id, name, title, avatar_url, specialty, bio, website_url, calendar_url, is_verified, is_featured, is_active, rating, review_count, partner_id, qr_code_url")
        .eq("id", id)
        .eq("is_active", true)
        .single();

      if (error) throw error;
      setProfessional(data);

      // If professional belongs to a partner, fetch the partner's theme
      if (data.partner_id) {
        const { data: partnerData } = await supabase
          .from("partners")
          .select("primary_color, secondary_color")
          .eq("id", data.partner_id)
          .single();
        
        if (partnerData) {
          setPartnerTheme({
            primary_color: partnerData.primary_color || "#8B5CF6",
            secondary_color: partnerData.secondary_color || "#EC4899"
          });
        }
      }
    } catch (error) {
      console.error("Error fetching professional:", error);
      setProfessional(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Track profile view when page loads
  const trackProfileView = useCallback(async () => {
    if (!id) return;

    try {
      await supabase
        .from("professional_profile_views")
        .insert({
          professional_id: id,
          viewer_user_id: user?.id || null,
          referrer_url: document.referrer || null,
        });
    } catch (error) {
      // Silently fail - don't interrupt user experience for analytics
      console.error("Error tracking profile view:", error);
    }
  }, [id, user?.id]);

  useEffect(() => {
    fetchProfessional();
  }, [fetchProfessional]);

  // Track view after a short delay to avoid counting quick bounces
  useEffect(() => {
    const timer = setTimeout(() => {
      trackProfileView();
    }, 2000); // Track after 2 seconds of viewing

    return () => clearTimeout(timer);
  }, [trackProfileView]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center loading-screen-bg">
        <LoadingSpinner size="lg" text="Loading profile..." />
      </div>
    );
  }

  if (!professional) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background border-b p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </header>
        <div className="flex flex-col items-center justify-center py-20">
          <Users className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Professional Not Found</h2>
          <p className="text-muted-foreground mb-4">This profile doesn't exist or has been removed.</p>
          <Button onClick={() => navigate("/professionals")}>View All Professionals</Button>
        </div>
      </div>
    );
  }

  // Use partner theme colors or default to purple/pink gradient
  const primaryColor = partnerTheme?.primary_color || "#8B5CF6";
  const secondaryColor = partnerTheme?.secondary_color || "#EC4899";
  
  const tags = getTagsFromSpecialty(professional.specialty);
  const services = getServicesFromSpecialty(professional.specialty);
  const isTopRated = (professional.rating || 0) >= 4.5;
  const isNew = (professional.review_count || 0) === 0;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{professional.name} - {professional.title || professional.specialty.replace(/_/g, " ")} | CoinsBloom</title>
        <meta name="description" content={`Connect with ${professional.name}, ${professional.title || professional.specialty.replace(/_/g, " ")}. ${professional.bio?.slice(0, 120) || 'Verified financial professional on CoinsBloom.'}`} />
      </Helmet>
      
      {/* Header with gradient background - uses partner theme if available */}
      <div className="relative">
        <div 
          className="h-32"
          style={{ background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}
        />
        
        {/* Back button */}
        <div className="absolute top-4 left-4 right-4 flex justify-between">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/professionals")}
            className="bg-black/20 hover:bg-black/30 text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <ProfessionalQRCode 
              professionalId={professional.id} 
              professionalName={professional.name}
              variant="icon"
            />
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleShare}
              className="bg-black/20 hover:bg-black/30 text-white"
            >
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Avatar overlapping header */}
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
          <div className="relative">
            <Avatar className="h-24 w-24 shadow-lg">
              <AvatarImage src={professional.avatar_url || undefined} className="object-cover w-full h-full" />
              <AvatarFallback 
                className="text-white text-2xl"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
              >
                {professional.name.split(" ").map(n => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-16 px-4 pb-6">
        {/* Name and badges */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-xl font-bold">{professional.name}</h1>
            {professional.is_verified && (
              <CheckCircle className="h-5 w-5 text-blue-500" />
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {professional.title || professional.specialty.replace(/_/g, " ")}
          </p>
          
          {/* Status badges */}
          <div className="flex items-center justify-center gap-2 mt-2">
            {isTopRated && (
              <Badge className="bg-amber-100 text-amber-700 border-amber-300">
                <Star className="h-3 w-3 mr-1" />
                Top Rated
              </Badge>
            )}
            {professional.is_featured && (
              <Badge className="bg-purple-100 text-purple-700 border-purple-300">
                Featured
              </Badge>
            )}
            {isNew && (
              <Badge className="bg-green-100 text-green-700 border-green-300">
                New
              </Badge>
            )}
          </div>
        </div>

        {/* Stats - clickable to scroll to reviews */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card 
            className="text-center py-3 cursor-pointer hover:border-primary/50 transition-colors"
            onClick={scrollToReviews}
          >
            <CardContent className="p-0">
              <div className="flex items-center justify-center gap-1 text-amber-500 mb-1">
                <Star className="h-4 w-4 fill-amber-500" />
                <span className="font-bold">{professional.rating || "New"}</span>
              </div>
              <p className="text-xs text-muted-foreground">{professional.review_count || 0} reviews</p>
              {user && (
                <p className="text-[10px] text-primary mt-1 flex items-center justify-center gap-1">
                  <Edit className="h-3 w-3" />
                  Tap to review
                </p>
              )}
            </CardContent>
          </Card>
          <Card className="text-center py-3">
            <CardContent className="p-0">
              <div className="flex items-center justify-center gap-1 text-primary mb-1">
                <Briefcase className="h-4 w-4" />
                <span className="font-bold capitalize">{professional.specialty.replace(/_/g, " ")}</span>
              </div>
              <p className="text-xs text-muted-foreground">Specialty</p>
            </CardContent>
          </Card>
        </div>

        {/* Tags/Specialties */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-2">Specialties</h3>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="bg-primary/10 text-primary">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* About */}
        {professional.bio && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-2">About</h3>
            <p className="text-sm text-muted-foreground">{professional.bio}</p>
          </div>
        )}

        {/* Services */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-2">Services</h3>
          <div className="space-y-2">
            {services.map((service) => (
              <div key={service} className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>{service}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reviews Section */}
        <div id="reviews-section" className="mb-6 scroll-mt-4">
          <ProfessionalReviews 
            professionalId={professional.id} 
            onReviewChange={fetchProfessional}
          />
        </div>

        {/* Contact Info - Website and Calendar only (email protected for privacy) */}
        <Card className="mb-6">
          <CardContent className="p-4 space-y-3">
            {professional.website_url && (
              <div className="flex items-center gap-3 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <a href={professional.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {professional.website_url}
                </a>
              </div>
            )}
            {professional.calendar_url && (
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <a href={professional.calendar_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Book a consultation
                </a>
              </div>
            )}
            {!professional.website_url && !professional.calendar_url && (
              <p className="text-sm text-muted-foreground">Contact information not available</p>
            )}
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="grid grid-cols-1 gap-3">
          {professional.calendar_url && (
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => window.open(professional.calendar_url!, '_blank')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Consultation
            </Button>
          )}
          {professional.website_url && (
            <Button 
              variant="outline" 
              className="w-full" 
              size="lg"
              onClick={() => window.open(professional.website_url!, '_blank')}
            >
              <Globe className="h-4 w-4 mr-2" />
              Visit Website
            </Button>
          )}
          {!professional.website_url && !professional.calendar_url && (
            <p className="col-span-2 text-center text-sm text-muted-foreground">
              Contact options coming soon
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfessionalProfile;
