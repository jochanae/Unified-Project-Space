import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface PartnerBranding {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  hero_title: string | null;
  hero_description: string | null;
  design_theme: 'gradient' | 'glass_morphism' | 'professional' | null;
  branding_level: 'full' | 'minimal' | null;
  show_name_with_logo: boolean;
}

interface PartnerBrandingContextType {
  partner: PartnerBranding | null;
  isPartnerBranded: boolean;
  isPreviewMode: boolean;
  loading: boolean;
}

const PartnerBrandingContext = createContext<PartnerBrandingContextType | undefined>(undefined);

// Convert hex to HSL for CSS variable usage
function hexToHsl(hex: string): string {
  // Remove the # if present
  hex = hex.replace('#', '');
  
  // Parse the hex values
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function PartnerBrandingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const [partner, setPartner] = useState<PartnerBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const previewSlug = searchParams.get('partner');

  useEffect(() => {
    async function fetchPartnerBranding() {
      setLoading(true);

      try {
        // Check for preview mode first (via URL param)
        if (previewSlug) {
          const { data: previewPartner } = await supabase
            .from('partners_public')
            .select('id, name, slug, logo_url, primary_color, secondary_color, hero_title, hero_description, design_theme, branding_level, show_name_with_logo')
            .eq('slug', previewSlug)
            .single();

          if (previewPartner) {
            setPartner(previewPartner as PartnerBranding);
            setIsPreviewMode(true);
            setLoading(false);
            return;
          }
        }

        setIsPreviewMode(false);

        if (!user) {
          setPartner(null);
          setLoading(false);
          return;
        }

        // Get user's partner_id from profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('partner_id')
          .eq('id', user.id)
          .single();

        if (!profile?.partner_id) {
          setPartner(null);
          setLoading(false);
          return;
        }

        // Fetch partner branding
        const { data: partnerData } = await supabase
          .from('partners')
          .select('id, name, slug, logo_url, primary_color, secondary_color, hero_title, hero_description, design_theme, branding_level, show_name_with_logo')
          .eq('id', profile.partner_id)
          .eq('is_active', true)
          .single();

        setPartner(partnerData as PartnerBranding || null);
      } catch (error) {
        console.error('Error fetching partner branding:', error);
        setPartner(null);
      } finally {
        setLoading(false);
      }
    }

    fetchPartnerBranding();
  }, [user, previewSlug]);

  // Apply CSS variables when partner changes - MINIMAL branding only (accent colors)
  // Dashboard keeps CoinsBloom branding, partners just get subtle accent colors
  useEffect(() => {
    const root = document.documentElement;
    
    if (partner?.primary_color) {
      // Only set accent colors - don't override core CoinsBloom branding
      root.style.setProperty('--partner-accent', partner.primary_color);
      root.style.setProperty('--partner-accent-hsl', hexToHsl(partner.primary_color));
    } else {
      root.style.removeProperty('--partner-accent');
      root.style.removeProperty('--partner-accent-hsl');
    }

    // Cleanup on unmount
    return () => {
      root.style.removeProperty('--partner-accent');
      root.style.removeProperty('--partner-accent-hsl');
    };
  }, [partner]);

  return (
    <PartnerBrandingContext.Provider value={{ partner, isPartnerBranded: !!partner, isPreviewMode, loading }}>
      {children}
    </PartnerBrandingContext.Provider>
  );
}

export function usePartnerBranding() {
  const context = useContext(PartnerBrandingContext);
  if (context === undefined) {
    throw new Error('usePartnerBranding must be used within a PartnerBrandingProvider');
  }
  return context;
}
