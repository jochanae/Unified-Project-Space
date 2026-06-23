import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useFunnelHub } from '@/features/projects';

export interface QuinnCalibration {
  tacticalGrace: number;      // 0 = full grace, 100 = full tactical
  presenceFrequency: string;  // 'observer' | 'partner' | 'shadow'
  intellectualTone: string;   // 'strategist' | 'creative' | 'guardian'
}

const DEFAULT_CALIBRATION: QuinnCalibration = {
  tacticalGrace: 50,
  presenceFrequency: 'partner',
  intellectualTone: 'strategist',
};

export function useQuinnCalibration() {
  const { user } = useCurrentUser();
  const { activeProject } = useFunnelHub();
  const [calibration, setCalibration] = useState<QuinnCalibration>(DEFAULT_CALIBRATION);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const projectId = activeProject?.id;
  const orgId = user?.orgId;

  // Load calibration from project_context
  useEffect(() => {
    if (!projectId || !orgId) {
      setCalibration(DEFAULT_CALIBRATION);
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('project_context')
        .select('directive')
        .eq('project_id', projectId)
        .eq('org_id', orgId)
        .eq('context_type', 'quinn_calibration')
        .maybeSingle();

      if (data?.directive) {
        try {
          const parsed = JSON.parse(data.directive);
          setCalibration({ ...DEFAULT_CALIBRATION, ...parsed });
        } catch {
          setCalibration(DEFAULT_CALIBRATION);
        }
      } else {
        setCalibration(DEFAULT_CALIBRATION);
      }
      setLoading(false);
    };

    load();
  }, [projectId, orgId]);

  // Save calibration
  const save = useCallback(async (updated: QuinnCalibration) => {
    if (!projectId || !orgId) return;
    setSaving(true);
    setCalibration(updated);

    const directive = JSON.stringify(updated);

    // Upsert: delete old, insert new
    await supabase
      .from('project_context')
      .delete()
      .eq('project_id', projectId)
      .eq('org_id', orgId)
      .eq('context_type', 'quinn_calibration');

    await supabase
      .from('project_context')
      .insert({
        project_id: projectId,
        org_id: orgId,
        context_type: 'quinn_calibration',
        directive,
      });

    setSaving(false);
  }, [projectId, orgId]);

  return { calibration, loading, saving, save };
}
