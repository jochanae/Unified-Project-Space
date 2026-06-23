import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerBranding } from "@/contexts/PartnerBrandingContext";
import { Card } from "@/components/ui/card";
import { Info, Sparkles, AlertCircle, Gift, Star, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Highlight {
  id: string;
  title: string;
  content: string;
  icon: string | null;
  color_variant: string | null;
  display_order: number;
}

const iconMap: Record<string, React.ElementType> = {
  info: Info,
  sparkles: Sparkles,
  alert: AlertCircle,
  gift: Gift,
  star: Star,
};

const colorMap: Record<string, { bg: string; border: string; icon: string; text: string }> = {
  default: {
    bg: "bg-muted/50",
    border: "border-muted-foreground/20",
    icon: "text-muted-foreground",
    text: "text-foreground",
  },
  primary: {
    bg: "bg-primary/10",
    border: "border-primary/30",
    icon: "text-primary",
    text: "text-foreground",
  },
  success: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    icon: "text-emerald-600",
    text: "text-foreground",
  },
  warning: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    icon: "text-amber-600",
    text: "text-foreground",
  },
  info: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    icon: "text-blue-600",
    text: "text-foreground",
  },
};

export function DashboardHighlights() {
  const { partner, isPartnerBranded } = usePartnerBranding();
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHighlights();
  }, [partner?.id, isPartnerBranded]);

  const fetchHighlights = async () => {
    try {
      let query = supabase
        .from("dashboard_highlights")
        .select("id, title, content, icon, color_variant, display_order")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      // Get partner-specific highlights or global ones (null partner_id)
      if (isPartnerBranded && partner?.id) {
        query = query.or(`partner_id.eq.${partner.id},partner_id.is.null`);
      } else {
        query = query.is("partner_id", null);
      }

      const { data, error } = await query.limit(3);

      if (!error && data) {
        setHighlights(data);
      }
    } catch (error) {
      console.error("Error fetching dashboard highlights:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || highlights.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {highlights.map((highlight) => {
        const IconComponent = iconMap[highlight.icon || "info"] || Info;
        const colors = colorMap[highlight.color_variant || "default"] || colorMap.default;

        return (
          <Card
            key={highlight.id}
            className={cn(
              "p-3 flex items-start gap-3 border transition-all hover:shadow-sm",
              colors.bg,
              colors.border
            )}
          >
            <div className={cn("mt-0.5 shrink-0", colors.icon)}>
              <IconComponent className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={cn("font-medium text-sm", colors.text)}>
                {highlight.title}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {highlight.content}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          </Card>
        );
      })}
    </div>
  );
}
