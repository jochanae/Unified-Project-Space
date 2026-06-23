import { useState, useEffect } from "react";
import { Star, CheckCircle, Globe, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

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

// Helper to get tags from specialty
const getTagsFromSpecialty = (specialty: string): string[] => {
  const tagMap: Record<string, string[]> = {
    financial_advisor: ["Investments", "Retirement"],
    tax_professional: ["Tax", "Business"],
    credit_counselor: ["Credit", "Debt"],
    debt_specialist: ["Debt", "Loans"],
    investment_advisor: ["Stocks", "Bonds"],
    insurance_agent: ["Life", "Health"],
    real_estate: ["Real Estate", "Mortgages"],
    estate_planning: ["Estate", "Trusts"],
  };
  return tagMap[specialty] || [specialty.replace(/_/g, " ")];
};

interface ProfessionalCardProps {
  professional: Professional;
  onNavigate: (id: string) => void;
  size?: "compact" | "expanded";
}

const ProfessionalCard = ({ professional, onNavigate, size = "compact" }: ProfessionalCardProps) => {
  const isCompact = size === "compact";
  const tags = getTagsFromSpecialty(professional.specialty);
  const isTopRated = (professional.rating || 0) >= 4.5;
  const isNew = (professional.review_count || 0) === 0;
  
  // Get proper initials (first + last)
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };
  
  return (
    <div
      className={`${isCompact ? 'p-2' : 'p-4'} rounded-xl border border-border/50 bg-background shadow-sm cursor-pointer hover:shadow-md hover:border-primary/30 transition-all`}
      onClick={() => onNavigate(professional.id)}
    >
      <div className="flex items-start gap-2">
        {/* Avatar with ring */}
        <div className="relative flex-shrink-0">
          <Avatar className={`${isCompact ? "h-10 w-10" : "h-14 w-14"} shadow-sm`}>
            <AvatarImage src={professional.avatar_url || undefined} className="object-cover w-full h-full" />
            <AvatarFallback className="bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900 dark:to-blue-900 text-primary text-xs font-medium">
              {getInitials(professional.name)}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {/* Top row: Name + Top badge + Arrow */}
          <div className="flex items-center justify-between gap-1">
            <p className={`${isCompact ? 'text-xs' : 'text-base'} font-semibold text-foreground truncate`}>
              {professional.name.split(" ")[0]}...
            </p>
            <div className="flex items-center gap-1 flex-shrink-0">
              {isTopRated && (
                <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 text-[10px] px-1.5 py-0 flex items-center gap-0.5 shadow-sm">
                  <Star className="h-2.5 w-2.5" />
                  Top
                </Badge>
              )}
              <ChevronRight className="h-4 w-4 text-amber-500" />
            </div>
          </div>

          {/* Title */}
          <p className={`${isCompact ? 'text-[10px]' : 'text-sm'} text-muted-foreground mt-0.5 line-clamp-1`}>
            {professional.title || professional.specialty.replace(/_/g, " ")}
          </p>

          {/* Tags row - more compact */}
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {tags.slice(0, 2).map((tag) => (
              <Badge 
                key={tag} 
                variant="outline"
                className="text-[10px] px-1.5 py-0 bg-background border-border rounded-full font-medium"
              >
                {tag}
              </Badge>
            ))}
            {tags.length > 2 && (
              <Badge 
                variant="outline"
                className="text-[10px] px-1.5 py-0 bg-background border-border rounded-full"
              >
                +{tags.length - 2}
              </Badge>
            )}
          </div>

          {/* Verified + Featured row */}
          <div className="flex items-center gap-2 mt-1">
            {professional.is_verified && (
              <span className="text-[10px] text-blue-600 dark:text-blue-400 flex items-center gap-0.5">
                <CheckCircle className="h-3 w-3" />
                Verified
              </span>
            )}
            {professional.is_featured && (
              <span className="text-[10px] text-purple-600 dark:text-purple-400 flex items-center gap-0.5">
                Featured
              </span>
            )}
          </div>

          {/* Rating/New indicator */}
          <div className="flex items-center gap-1 mt-1">
            <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
            {isNew ? (
              <span className="text-[10px] font-medium text-amber-500">
                New (0)
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground">
                {professional.rating} ({professional.review_count})
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ProfessionalsCardContent = () => {
  const navigate = useNavigate();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfessionals = async () => {
      try {
        const { data, error } = await supabase
          .from("professionals_public")
          .select("id, name, title, avatar_url, specialty, is_verified, is_featured, rating, review_count")
          .eq("is_active", true)
          .order("is_featured", { ascending: false })
          .order("rating", { ascending: false })
          .limit(5);

        if (error) throw error;
        setProfessionals(data || []);
      } catch (error) {
        console.error("Error fetching professionals:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfessionals();
  }, []);

  const handleProfessionalClick = (id: string) => {
    navigate(`/professionals/${id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (professionals.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground">No professionals available</p>
      </div>
    );
  }

  // Show up to 3 professionals in compact view
  const featuredProfessionals = professionals.slice(0, 3);

  return (
    <div className="space-y-1.5 max-h-full overflow-y-auto">
      {featuredProfessionals.map((professional) => (
        <ProfessionalCard 
          key={professional.id}
          professional={professional}
          onNavigate={handleProfessionalClick}
          size="compact"
        />
      ))}
      {professionals.length > 3 && (
        <p className="text-[9px] text-center text-muted-foreground py-1">
          +{professionals.length - 3} more professionals
        </p>
      )}
    </div>
  );
};

// Expanded content for sheet view
export const ProfessionalsExpandedContent = () => {
  const navigate = useNavigate();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfessionals = async () => {
      try {
        const { data, error } = await supabase
          .from("professionals_public")
          .select("id, name, title, avatar_url, specialty, is_verified, is_featured, rating, review_count")
          .eq("is_active", true)
          .order("is_featured", { ascending: false })
          .order("rating", { ascending: false })
          .limit(10);

        if (error) throw error;
        setProfessionals(data || []);
      } catch (error) {
        console.error("Error fetching professionals:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfessionals();
  }, []);

  const handleProfessionalClick = (id: string) => {
    navigate(`/professionals/${id}`);
  };

  const handleViewAll = () => {
    navigate("/professionals");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" text="Loading professionals..." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {professionals.length} featured professionals
        </p>
        <Button variant="outline" size="sm" onClick={handleViewAll}>
          View All
        </Button>
      </div>
      <div className="space-y-3">
        {professionals.map((professional) => (
          <ProfessionalCard 
            key={professional.id}
            professional={professional}
            onNavigate={handleProfessionalClick}
            size="expanded"
          />
        ))}
      </div>
    </div>
  );
};
