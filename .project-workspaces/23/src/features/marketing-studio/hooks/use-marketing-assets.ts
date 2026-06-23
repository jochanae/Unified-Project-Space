import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { AssetConfig, AssetType, MarketingAssetRow, TemplateId } from '../types';

interface SaveAssetInput {
  asset_type: AssetType;
  template_id: TemplateId;
  title: string;
  config: AssetConfig;
  /** Rendered PNG/JPEG as a Blob (legacy). */
  blob?: Blob;
  /** Pre-hosted image URL (e.g. AI-generated, already in marketing-assets bucket). */
  image_url?: string;
  /** Storage path inside marketing-assets bucket, when image_url was pre-uploaded. */
  storage_path?: string | null;
  project_id?: string | null;
}

export function useMarketingAssets(projectId?: string | null) {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const orgId = user?.orgId;

  const list = useQuery({
    queryKey: ['marketing-assets', orgId, projectId ?? 'all'],
    queryFn: async () => {
      if (!orgId) return [] as MarketingAssetRow[];
      let q = supabase
        .from('marketing_assets')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(60);
      if (projectId) q = q.eq('project_id', projectId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as MarketingAssetRow[];
    },
    enabled: !!orgId,
  });

  const saveAsset = useMutation({
    mutationFn: async (input: SaveAssetInput) => {
      if (!orgId || !user?.id) throw new Error('Sign in required');
      let imageUrl = input.image_url;
      let storagePath: string | null = input.storage_path ?? null;
      if (!imageUrl && input.blob) {
        const ext = input.blob.type === 'image/jpeg' ? 'jpg' : 'png';
        const path = `${orgId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('marketing-assets')
          .upload(path, input.blob, { contentType: input.blob.type, upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('marketing-assets').getPublicUrl(path);
        imageUrl = pub.publicUrl;
        storagePath = path;
      }
      if (!imageUrl) throw new Error('No image to save');
      const insertRow = {
        org_id: orgId,
        project_id: input.project_id ?? null,
        created_by: user.id,
        asset_type: input.asset_type,
        template_id: input.template_id,
        title: input.title,
        config: input.config as unknown as Record<string, unknown>,
        image_url: imageUrl,
        storage_path: storagePath,
      };
      const { data, error } = await supabase
        .from('marketing_assets')
        .insert(insertRow as never)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as MarketingAssetRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketing-assets'] });
    },
  });

  const deleteAsset = useMutation({
    mutationFn: async (asset: MarketingAssetRow) => {
      if (asset.storage_path) {
        await supabase.storage.from('marketing-assets').remove([asset.storage_path]);
      }
      const { error } = await supabase.from('marketing_assets').delete().eq('id', asset.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketing-assets'] }),
  });

  return { assets: list.data ?? [], isLoading: list.isLoading, saveAsset, deleteAsset };
}
