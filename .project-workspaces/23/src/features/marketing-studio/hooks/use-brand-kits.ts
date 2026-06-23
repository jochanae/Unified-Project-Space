import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { BrandKit } from '../types';

export interface BrandKitRow {
  id: string;
  org_id: string;
  created_by: string | null;
  name: string;
  is_default: boolean;
  kit: BrandKit;
  created_at: string;
  updated_at: string;
}

const ACTIVE_KEY = 'intoiq_active_brand_kit_id';

/** Manage multiple named brand kits (Brand Environments). */
export function useBrandKits() {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const orgId = user?.orgId;

  const list = useQuery({
    queryKey: ['brand-kits', orgId],
    queryFn: async () => {
      if (!orgId) return [] as BrandKitRow[];
      const { data, error } = await supabase
        .from('brand_kits')
        .select('*')
        .eq('org_id', orgId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as BrandKitRow[];
    },
    enabled: !!orgId,
  });

  const create = useMutation({
    mutationFn: async (input: { name: string; kit?: BrandKit; makeDefault?: boolean }) => {
      if (!orgId) throw new Error('No org');
      if (input.makeDefault) {
        await supabase.from('brand_kits').update({ is_default: false }).eq('org_id', orgId);
      }
      const { data, error } = await supabase
        .from('brand_kits')
        .insert({
          org_id: orgId,
          created_by: user?.id ?? null,
          name: input.name,
          is_default: !!input.makeDefault,
          kit: (input.kit ?? {}) as never,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as BrandKitRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['brand-kits', orgId] }),
  });

  const update = useMutation({
    mutationFn: async (input: { id: string; name?: string; kit?: BrandKit }) => {
      const patch: { name?: string; kit?: BrandKit } = {};
      if (input.name !== undefined) patch.name = input.name;
      if (input.kit !== undefined) patch.kit = input.kit;
      const { error } = await supabase
        .from('brand_kits')
        .update(patch as never)
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['brand-kits', orgId] }),
  });

  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      if (!orgId) throw new Error('No org');
      await supabase.from('brand_kits').update({ is_default: false }).eq('org_id', orgId);
      const { error } = await supabase.from('brand_kits').update({ is_default: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['brand-kits', orgId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('brand_kits').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['brand-kits', orgId] }),
  });

  // Local "active" kit (Brand Environment switch). Falls back to default.
  const getActiveId = () => localStorage.getItem(ACTIVE_KEY);
  const setActiveId = (id: string | null) => {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
    qc.invalidateQueries({ queryKey: ['brand-kits', orgId] });
  };

  const activeId = getActiveId();
  const active =
    list.data?.find((k) => k.id === activeId) ||
    list.data?.find((k) => k.is_default) ||
    list.data?.[0] ||
    null;

  return {
    kits: list.data ?? [],
    isLoading: list.isLoading,
    active,
    setActiveId,
    create,
    update,
    setDefault,
    remove,
  };
}
