import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { BlueprintData } from '../types';

export interface LogicVaultData {
  blueprint: BlueprintData | null;
  directives: Array<{
    id: string;
    directive: string;
    context_type: string;
    created_at: string;
  }>;
  socialArc: Array<{
    id: string;
    narrative_day: number | null;
    narrative_role: string | null;
    platform: string;
    hook: string;
    campaign_theme: string | null;
  }>;
  activeHook: string | null;
  pageTitle: string | null;
}

export function useLogicVault(projectId: string | null) {
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['logic-vault', projectId, user?.orgId],
    queryFn: async (): Promise<LogicVaultData> => {
      if (!projectId || !user?.orgId) {
        return { blueprint: null, directives: [], socialArc: [], activeHook: null, pageTitle: null };
      }

      const [contextRes, socialRes, pageRes] = await Promise.all([
        supabase
          .from('project_context')
          .select('id, directive, context_type, created_at')
          .eq('project_id', projectId)
          .order('created_at', { ascending: true }),
        supabase
          .from('social_campaigns')
          .select('id, narrative_day, narrative_role, platform, hook, campaign_theme, generation_mode, created_at')
          .eq('project_id', projectId)
          .eq('generation_mode', 'deep_dive')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('pages')
          .select('active_hook, title')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const directives = (contextRes.data || []).filter(d => d.context_type !== 'strategy_blueprint');
      const blueprintRaw = (contextRes.data || []).find(d => d.context_type === 'strategy_blueprint');
      let blueprint: BlueprintData | null = null;
      if (blueprintRaw) {
        try {
          blueprint = JSON.parse(blueprintRaw.directive) as BlueprintData;
        } catch {
          blueprint = null;
        }
      }

      return {
        blueprint,
        directives,
        socialArc: (socialRes.data || []).map(p => ({
          id: p.id,
          narrative_day: p.narrative_day,
          narrative_role: p.narrative_role,
          platform: p.platform,
          hook: p.hook,
          campaign_theme: p.campaign_theme,
        })),
        activeHook: pageRes.data?.active_hook ?? null,
        pageTitle: pageRes.data?.title ?? null,
      };
    },
    enabled: !!projectId && !!user?.orgId,
  });
}
