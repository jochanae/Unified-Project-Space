import { usePartnerBranding } from '@/contexts/PartnerBrandingContext';
import { Sparkles } from 'lucide-react';

interface PartnerLogoProps {
  className?: string;
  showFallback?: boolean;
  fallbackSize?: 'sm' | 'md' | 'lg';
}

export function PartnerLogo({ className = '', showFallback = true, fallbackSize = 'md' }: PartnerLogoProps) {
  const { partner, isPartnerBranded } = usePartnerBranding();
  
  const sizes = {
    sm: 'h-6 w-auto',
    md: 'h-8 w-auto',
    lg: 'h-10 w-auto'
  };

  const tagline = "All Your Finances. One View.";

  if (isPartnerBranded && partner?.logo_url) {
    return (
      <div className={`flex flex-col gap-0.5 ${className}`}>
        <div className="flex items-center gap-3">
          <img 
            src={partner.logo_url} 
            alt={`${partner.name} logo`}
            className={`${sizes[fallbackSize]} object-contain flex-shrink-0`}
          />
          {partner.show_name_with_logo && (
            <span className="font-semibold text-foreground text-sm">
              {partner.name}
            </span>
          )}
        </div>
        <div className="ml-0 flex flex-col">
          <span className="text-[9px] text-muted-foreground/70 leading-tight">
            Powered by <span className="text-bloom-purple">✨ CoinsBloom</span>
          </span>
          <span className="text-[8px] text-muted-foreground/50 leading-tight hidden xs:block">
            {tagline}
          </span>
        </div>
      </div>
    );
  }

  if (!showFallback) return null;

  // Default CoinsBloom logo/text
  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-bloom-purple to-bloom-pink flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <span className="font-bold text-lg text-gradient-brand">CoinsBloom</span>
      </div>
      <span className="text-[9px] text-muted-foreground/60 ml-10 -mt-0.5 leading-tight">
        {tagline}
      </span>
    </div>
  );
}
