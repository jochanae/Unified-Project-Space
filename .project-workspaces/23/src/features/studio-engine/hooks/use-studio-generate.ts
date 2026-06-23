/**
 * useStudioGenerate — single client hook that fronts the unified
 * `studio-generate` edge function.
 *
 * Contextual awareness:
 *   - If no projectId is provided in the request, the hook auto-detects
 *     one from the current URL (react-router `:projectId` param) so
 *     components inside a project workspace get attribution for free.
 *   - Brand context is loaded server-side from the caller's org_id.
 */

import { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { StudioRequest, StudioResult } from '../types';

interface State {
  loading: boolean;
  error: string | null;
  result: StudioResult | null;
}

export function useStudioGenerate() {
  const params = useParams<{ projectId?: string }>();
  const [state, setState] = useState<State>({ loading: false, error: null, result: null });

  const generate = useCallback(
    async (req: StudioRequest): Promise<StudioResult | null> => {
      setState({ loading: true, error: null, result: null });
      try {
        const projectId = req.projectId ?? params.projectId;
        const { data, error } = await supabase.functions.invoke('studio-generate', {
          body: { ...req, projectId },
        });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Generation failed');
        const result = data as StudioResult;
        setState({ loading: false, error: null, result });
        return result;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Generation failed';
        setState({ loading: false, error: msg, result: null });
        toast.error(msg);
        return null;
      }
    },
    [params.projectId],
  );

  const reset = useCallback(() => setState({ loading: false, error: null, result: null }), []);

  return { ...state, generate, reset };
}
