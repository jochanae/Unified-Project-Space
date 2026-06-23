import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Star, CheckCircle, Users, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { usePartnerBranding } from "@/contexts/PartnerBrandingContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";

interface Professional {
  id: string;
  name: string;
  title: string | null;
  avatar_url: string | null;
  specialty: string;
  is_verified: boolean;
  is_featured: boolean;
  rating: number | null;
  review_count: number | null;
}

const getTagsFromSpecialty = (specialty: string): string[] => {
  const tagMap: Record<string, string[]> = {
    financial_planning: ["Planning", "Goals", "Budget"],
    tax_preparation: ["Taxes", "Filing", "Deductions"],
    investment_advice: ["Investing", "Stocks", "Wealth"],
    debt_management: ["Debt", "Credit", "Recovery"],
    insurance: ["Insurance", "Protection", "Coverage"],
    real_estate: ["Real Estate", "Property", "Mortgage"],
    retirement: ["Retirement", "401k", "Pension"],
    estate_planning: ["Estate", "Wills", "Trust"],
  };
  return tagMap[specialty] || [specialty.replace(/_/g, " ")];
};

const ITEMS_PER_PAGE = 5;

export function FeaturedProfessionalCard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { partner, isPartnerBranded } = usePartnerBranding();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showExperts, setShowExperts] = useState<boolean | null>(null);

  // Check user preference for showing experts (non-partner users only)
  useEffect(() => {
    const checkUserPreference = async () => {
      // Partner-branded users always see experts
      if (isPartnerBranded) {
        setShowExperts(true);
        return;
      }

      if (!user?.id) {
        setShowExperts(false);
        return;
      }

      try {
        const { data } = await supabase
          .from("user_settings")
          .select("privacy_preferences")
          .eq("user_id", user.id)
          .single();

        setShowExperts(true);
      } catch {
        setShowExperts(true);
      }
    };

    checkUserPreference();
  }, [user?.id, isPartnerBranded]);

  useEffect(() => {
    // Only fetch if we should show experts
    if (showExperts !== true) {
      setLoading(false);
      return;
    }

    const fetchFeaturedProfessionals = async () => {
      try {
        let query = supabase
          .from("professionals_public")
          .select("id, name, title, avatar_url, specialty, is_verified, is_featured, rating, review_count")
          .eq("is_active", true);
        
        // If user is linked to a partner, show only that partner's professionals
        if (isPartnerBranded && partner?.id) {
          query = query.eq("partner_id", partner.id);
        }

        const { data, error } = await query
          .order("is_featured", { ascending: false })
          .order("rating", { ascending: false })
          .limit(50); // Fetch more for search/pagination

        if (error) throw error;
        setProfessionals(data || []);
      } catch (error) {
        console.error("Error fetching featured professionals:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedProfessionals();
  }, [isPartnerBranded, partner?.id, showExperts]);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  // Filter professionals by search query
  const filteredProfessionals = professionals.filter((prof) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const tags = getTagsFromSpecialty(prof.specialty);
    return (
      prof.name.toLowerCase().includes(query) ||
      (prof.title?.toLowerCase().includes(query) || false) ||
      prof.specialty.toLowerCase().includes(query) ||
      tags.some(tag => tag.toLowerCase().includes(query))
    );
  });

  // Get displayed professionals (paginated)
  const displayedProfessionals = filteredProfessionals.slice(0, displayCount);
  const hasMore = displayCount < filteredProfessionals.length;

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + ITEMS_PER_PAGE);
  };

  const handleSearchToggle = () => {
    if (searchOpen) {
      setSearchQuery("");
      setDisplayCount(ITEMS_PER_PAGE);
    }
    setSearchOpen(!searchOpen);
  };

  // Don't show if user hasn't opted in (and isn't partner-branded)
  if (showExperts === false) {
    return null;
  }

  // Still determining preference
  if (showExperts === null || loading) {
    return (
      <Card className="mt-6 overflow-hidden border-0 shadow-lg bg-[#0f1419]">
        <div className="p-6 flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </Card>
    );
  }

  if (professionals.length === 0) {
    return null;
  }

  return (
    <Card className="mt-6 overflow-hidden border-0 shadow-lg bg-[#0f1419] relative">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl" />
      
      {/* Header */}
      <div className="p-4 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-purple-400" />
          <h2 className="text-lg font-bold text-white">Financial Professionals</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Collapsible Search */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSearchToggle}
            className={`h-8 rounded-full text-white hover:bg-white/20 transition-all ${
              searchOpen ? 'bg-white/20' : 'bg-white/10'
            }`}
          >
            {searchOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <>
                <Search className="h-4 w-4" />
                <span className="text-xs ml-1.5 hidden sm:inline">Search</span>
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/professionals")}
            className="h-9 w-9 rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Search Input (collapsible) */}
      {searchOpen && (
        <div className="px-4 pb-3 relative z-10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              ref={searchInputRef}
              placeholder="Search by name or specialty..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setDisplayCount(ITEMS_PER_PAGE); // Reset pagination on search
              }}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/15"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-xs text-gray-400 mt-2">
              {filteredProfessionals.length} result{filteredProfessionals.length !== 1 ? 's' : ''} found
            </p>
          )}
        </div>
      )}

      {/* Scrollable Professional Cards */}
      <div className="px-4 pb-4 relative z-10">
        <div className="space-y-3">
          {displayedProfessionals.length > 0 ? (
            displayedProfessionals.map((professional) => {
              const tags = getTagsFromSpecialty(professional.specialty);
              const isTopRated = (professional.rating || 0) >= 4.5;
              
              return (
                <Card 
                  key={professional.id}
                  className="p-4 bg-white dark:bg-gray-100 border-0 cursor-pointer hover:shadow-lg transition-all"
                  onClick={() => navigate(`/professionals/${professional.id}`)}
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <Avatar className="h-14 w-14 shadow-md flex-shrink-0">
                      <AvatarImage src={professional.avatar_url || undefined} className="object-cover w-full h-full" />
                      <AvatarFallback className="bg-gradient-to-br from-purple-100 to-indigo-100 text-purple-700 text-lg font-medium">
                        {getInitials(professional.name)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-gray-900 truncate">
                          {professional.name}
                        </h3>
                        {isTopRated && (
                          <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 text-xs px-2 py-0.5 flex items-center gap-1 shadow-sm">
                            <Star className="h-3 w-3" />
                            Top
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-0.5 truncate">
                        {professional.title || professional.specialty.replace(/_/g, " ")}
                      </p>

                      {/* Tags */}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {tags.slice(0, 2).map((tag) => (
                          <Badge 
                            key={tag} 
                            variant="outline"
                            className="text-xs px-2 py-0.5 bg-gray-100 border-gray-300 text-gray-700 rounded-full"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      {/* Verified + Rating */}
                      <div className="flex items-center gap-3 mt-2">
                        {professional.is_verified && (
                          <span className="text-xs text-blue-600 flex items-center gap-1">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Verified
                          </span>
                        )}
                        <span className="text-xs text-gray-600 flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                          {professional.review_count === 0 ? "New" : professional.rating} ({professional.review_count || 0})
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  </div>
                </Card>
              );
            })
          ) : (
            <div className="text-center py-8">
              <Users className="h-10 w-10 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No experts found</p>
              <p className="text-gray-500 text-xs mt-1">Try a different search term</p>
            </div>
          )}

          {/* Load More Button */}
          {hasMore && (
            <Button 
              variant="ghost" 
              className="w-full justify-center gap-2 bg-white/10 text-white hover:bg-white/20 rounded-lg"
              onClick={handleLoadMore}
            >
              Load More ({filteredProfessionals.length - displayCount} remaining)
            </Button>
          )}
        </div>
      </div>

      {/* View All Button */}
      <div className="px-4 pb-4 relative z-10">
        <Button 
          variant="ghost" 
          className="w-full justify-center gap-2 bg-white/10 text-white hover:bg-white/20 rounded-full"
          onClick={() => navigate("/professionals")}
        >
          View All Financial Professionals
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
