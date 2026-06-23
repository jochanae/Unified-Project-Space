import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { usePartnerBranding } from "@/contexts/PartnerBrandingContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Search, 
  Star, 
  CheckCircle, 
  ChevronRight,
  Users,
  Briefcase,
  ExternalLink,
  BookOpen,
  Receipt,
  CreditCard,
  Scale,
  GraduationCap
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { PageHeroHeader } from "@/components/navigation/PageHeroHeader";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ProfessionalApplicationForm } from "@/components/professionals/ProfessionalApplicationForm";
import { 
  trustedResources, 
  educationalResources, 
  resourceCategories,
  ExternalResource 
} from "@/data/financialResources";

interface Professional {
  id: string;
  name: string;
  title: string | null;
  avatar_url: string | null;
  specialty: string;
  bio: string | null;
  is_verified: boolean;
  is_featured: boolean;
  is_active: boolean;
  rating: number | null;
  review_count: number | null;
}

// Helper to get tags from specialty
const getTagsFromSpecialty = (specialty: string): string[] => {
  const tagMap: Record<string, string[]> = {
    financial_advisor: ["Investments", "Retirement", "Wealth"],
    tax_professional: ["Tax", "Business", "Accounting"],
    credit_counselor: ["Credit", "Debt", "Recovery"],
    debt_specialist: ["Debt", "Loans", "Consolidation"],
    investment_advisor: ["Stocks", "Bonds", "Funds"],
    insurance_agent: ["Life", "Health", "Auto"],
    real_estate: ["Real Estate", "Mortgages", "Property"],
    estate_planning: ["Estate", "Trusts", "Legal"],
    financial_planning: ["Planning", "Goals", "Budget"],
    lending: ["Loans", "Mortgages", "Financing"],
    education: ["Education", "Coaching", "Planning"],
  };
  return tagMap[specialty] || [specialty.replace(/_/g, " ")];
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'taxes':
      return <Receipt className="h-5 w-5" />;
    case 'debt_credit':
      return <CreditCard className="h-5 w-5" />;
    case 'legal':
      return <Scale className="h-5 w-5" />;
    case 'education':
      return <GraduationCap className="h-5 w-5" />;
    default:
      return <BookOpen className="h-5 w-5" />;
  }
};

const ResourceCard = ({ resource }: { resource: ExternalResource }) => (
  <a
    href={resource.url}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors group"
  >
    <div className="flex-1 min-w-0">
      <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
        {resource.name}
      </p>
      <p className="text-xs text-muted-foreground truncate">
        {resource.description}
      </p>
    </div>
    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
  </a>
);

const OurExperts = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { loading: authLoading } = useAuth();
  const { partner, isPartnerBranded } = usePartnerBranding();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplicationForm, setShowApplicationForm] = useState(false);

  // Handle URL param for opening application form from Support page
  useEffect(() => {
    if (searchParams.get("apply") === "true") {
      setShowApplicationForm(true);
      // Clear the param after opening
      searchParams.delete("apply");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filters = ["All", "Top Rated", "Verified", "Featured"];

  useEffect(() => {
    const fetchProfessionals = async () => {
      try {
        // Use the public-safe view that excludes sensitive fields like contact_email, claim_token, etc.
        let query = supabase
          .from("professionals_public")
          .select("id, name, title, avatar_url, specialty, bio, is_verified, is_featured, is_active, rating, review_count, partner_id")
          .eq("is_active", true);
        
        // If user is linked to a partner, show only that partner's professionals
        // Otherwise show all professionals (including those without a partner)
        if (isPartnerBranded && partner?.id) {
          query = query.eq("partner_id", partner.id);
        }
        
        const { data, error } = await query
          .order("is_featured", { ascending: false })
          .order("rating", { ascending: false });

        if (error) throw error;
        setProfessionals(data || []);
      } catch (error) {
        console.error("Error fetching professionals:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfessionals();
  }, [isPartnerBranded, partner?.id]);

  const filteredProfessionals = professionals.filter((prof) => {
    const tags = getTagsFromSpecialty(prof.specialty);
    const matchesSearch = prof.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (prof.title?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!selectedFilter || selectedFilter === "All") return matchesSearch;
    if (selectedFilter === "Top Rated") return matchesSearch && (prof.rating || 0) >= 4.5;
    if (selectedFilter === "Verified") return matchesSearch && prof.is_verified;
    if (selectedFilter === "Featured") return matchesSearch && prof.is_featured;
    return matchesSearch;
  });

  const handleProfessionalClick = (id: string) => {
    navigate(`/professionals/${id}`);
  };

  // Group trusted resources by category
  const taxResources = trustedResources.filter(r => r.category === 'taxes');
  const debtResources = trustedResources.filter(r => r.category === 'debt_credit');
  const legalResources = trustedResources.filter(r => r.category === 'legal');

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center loading-screen-bg">
        <LoadingSpinner size="lg" text="Loading experts..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Financial Professionals & Resources | CoinsBloom</title>
        <meta name="description" content="Connect with CoinsBloom financial professionals and access trusted financial resources for taxes, debt management, legal protection, and financial education." />
      </Helmet>

      {/* Hero Header */}
      <PageHeroHeader
        title="Financial Professionals"
        subtitle="Connect with professionals & trusted resources"
        icon={<Users className="h-6 w-6 text-[hsl(280,80%,75%)]" />}
        colorScheme="purple"
      />

      {/* Application Form Modal */}
      <ProfessionalApplicationForm
        open={showApplicationForm}
        onOpenChange={setShowApplicationForm}
      />

      <div className="px-4 pb-6 space-y-6 mt-4 max-w-6xl mx-auto">
        {/* Section 1: Financial Professionals */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >

          {/* Search & Filters for Professionals */}
          <div className="space-y-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search professionals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-primary/40 dark:border-cyan-500/40"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {filters.map((filter) => (
                <Button
                  key={filter}
                  variant={selectedFilter === filter || (!selectedFilter && filter === "All") ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedFilter(filter)}
                  className="shrink-0"
                >
                  {filter}
                </Button>
              ))}
            </div>
          </div>

          {/* Professionals List */}
          <div className="space-y-3">
            {filteredProfessionals.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground">
                  {filteredProfessionals.length} expert{filteredProfessionals.length !== 1 ? "s" : ""} available
                </p>
                {filteredProfessionals.map((professional) => {
                  const tags = getTagsFromSpecialty(professional.specialty);
                  const isTopRated = (professional.rating || 0) >= 4.5;
                  
                  return (
                    <div
                      key={professional.id}
                      className="p-4 rounded-xl border border-border bg-card cursor-pointer hover:bg-accent/50 transition-colors shadow-sm"
                      onClick={() => handleProfessionalClick(professional.id)}
                    >
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className="relative">
                          <Avatar className="h-14 w-14">
                            <AvatarImage src={professional.avatar_url || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white text-base">
                              {professional.name.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-base font-semibold text-foreground truncate">
                              {professional.name}
                            </p>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {isTopRated && (
                                <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-xs px-2 py-0.5 flex items-center gap-1">
                                  <Star className="h-3 w-3" />
                                  Top
                                </Badge>
                              )}
                              {professional.is_featured && (
                                <Badge className="bg-purple-100 text-purple-700 border-purple-300 text-xs px-2 py-0.5">
                                  Featured
                                </Badge>
                              )}
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground mt-0.5">
                            {professional.title || professional.specialty.replace(/_/g, " ")}
                          </p>

                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            {tags.slice(0, 3).map((tag) => (
                              <Badge 
                                key={tag} 
                                variant="outline"
                                className="text-xs px-2 py-0.5 bg-muted/50"
                              >
                                {tag}
                              </Badge>
                            ))}
                            {professional.is_verified && (
                              <Badge 
                                variant="outline"
                                className="text-xs px-2 py-0.5 text-blue-600 border-blue-300 bg-blue-50 flex items-center gap-1"
                              >
                                <CheckCircle className="h-3 w-3" />
                                Verified
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-1 mt-2">
                            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                            {(professional.review_count || 0) === 0 ? (
                              <span className="text-sm text-amber-600 font-medium">New</span>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                {professional.rating} ({professional.review_count} reviews)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <Card className="p-6 text-center">
                <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No experts found</p>
                <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters</p>
              </Card>
            )}
          </div>

          {/* Apply CTA - Compact, right-aligned */}
          <div className="mt-4 flex justify-end">
            <button 
              onClick={() => setShowApplicationForm(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-colors text-xs"
            >
              <Briefcase className="h-3.5 w-3.5 text-primary" />
              <span className="text-muted-foreground">Financial professional?</span>
              <span className="font-medium text-primary">Apply</span>
            </button>
          </div>
        </motion.section>

        {/* Section 2: Trusted Financial Help */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Trusted Financial Help</h2>
              <p className="text-xs text-muted-foreground">Well-known services for specific financial needs</p>
            </div>
          </div>

          <div className="grid gap-4">
            {/* Taxes */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{resourceCategories.taxes.emoji}</span>
                <h3 className="font-medium text-foreground">{resourceCategories.taxes.label}</h3>
              </div>
              <div className="space-y-2">
                {taxResources.map(resource => (
                  <ResourceCard key={resource.id} resource={resource} />
                ))}
              </div>
            </Card>

            {/* Debt & Credit */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{resourceCategories.debt_credit.emoji}</span>
                <h3 className="font-medium text-foreground">{resourceCategories.debt_credit.label}</h3>
              </div>
              <div className="space-y-2">
                {debtResources.map(resource => (
                  <ResourceCard key={resource.id} resource={resource} />
                ))}
              </div>
            </Card>

            {/* Legal */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{resourceCategories.legal.emoji}</span>
                <h3 className="font-medium text-foreground">{resourceCategories.legal.label}</h3>
              </div>
              <div className="space-y-2">
                {legalResources.map(resource => (
                  <ResourceCard key={resource.id} resource={resource} />
                ))}
              </div>
            </Card>
          </div>
        </motion.section>

        {/* Section 3: Educational Resources */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <GraduationCap className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Educational Resources</h2>
              <p className="text-xs text-muted-foreground">Learn more before making important financial decisions</p>
            </div>
          </div>

          <Card className="p-4">
            <div className="grid gap-2">
              {educationalResources.map(resource => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </div>
          </Card>
        </motion.section>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center px-4 pt-2">
          External links are provided as helpful resources. CoinsBloom is not affiliated with these services unless otherwise noted.
        </p>
      </div>
    </div>
  );
};

export default OurExperts;
