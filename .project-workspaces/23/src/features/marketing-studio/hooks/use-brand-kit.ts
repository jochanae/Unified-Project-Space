import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { BrandKit } from '../types';

const DEFAULT_BRAND: BrandKit = {
  accent_hex: '#D4AF37',
};

/**
 * Resolve the effective brand kit for a given project:
 * org-level studio_brand merged with optional per-project brand_override.
 */
export function useBrandKit(projectId?: string | null) {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const orgId = user?.orgId;

  const orgQuery = useQuery({
    queryKey: ['org-brand', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, brand_logo_url, brand_primary_color, studio_brand')
        .eq('id', orgId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const projectQuery = useQuery({
    queryKey: ['project-brand', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, brand_override')
        .eq('id', projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const orgBrand: BrandKit = {
    ...DEFAULT_BRAND,
    brand_name: orgQuery.data?.name ?? undefined,
    logo_url: orgQuery.data?.brand_logo_url ?? undefined,
    accent_hex: orgQuery.data?.brand_primary_color || DEFAULT_BRAND.accent_hex,
    ...((orgQuery.data?.studio_brand as BrandKit) || {}),
  };

  const projectOverride = (projectQuery.data?.brand_override as BrandKit | null) || null;
  const effective: BrandKit = projectOverride ? { ...orgBrand, ...projectOverride } : orgBrand;

  const saveOrgBrand = useMutation({
    mutationFn: async (kit: Partial<BrandKit>) => {
      if (!orgId) throw new Error('No org');
      const next = { ...((orgQuery.data?.studio_brand as BrandKit) || {}), ...kit };
      const { error } = await supabase
        .from('organizations')
        .update({ studio_brand: next })
        .eq('id', orgId);
      if (error) throw error;
      return next;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org-brand', orgId] }),
  });

  const saveProjectOverride = useMutation({
    mutationFn: async (kit: Partial<BrandKit> | null) => {
      if (!projectId) throw new Error('No project');
      const { error } = await supabase
        .from('projects')
        .update({ brand_override: kit })
        .eq('id', projectId);
      if (error) throw error;
      return kit;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-brand', projectId] }),
  });

  return {
    orgBrand,
    projectOverride,
    effective,
    isLoading: orgQuery.isLoading || projectQuery.isLoading,
    saveOrgBrand,
    saveProjectOverride,
  };
}
