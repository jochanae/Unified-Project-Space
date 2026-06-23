import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { RegenTone } from '../components/EditableBlock';

interface RegenArgs {
  blockId: string;
  blockType: string;
  currentContent: Record<string, string>;
  tone: RegenTone;
  projectName?: string;
  projectMission?: string;
  lockedAngle?: { intentMode: string; angle: { name: string; wedge: string; hook: string; audience_cut: string } } | null;
}

export function useBlockRegen() {
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const regenerate = useCallback(async (args: RegenArgs): Promise<Record<string, string> | null> => {
    setRegeneratingId(args.blockId);
    try {
      const { data, error } = await supabase.functions.invoke('quinn-block-regen', {
        body: {
          blockType: args.blockType,
          currentContent: args.currentContent,
          tone: args.tone,
          projectName: args.projectName || '',
          projectMission: args.projectMission || '',
          lockedAngle: args.lockedAngle ?? null,
        },
      });

      if (error) {
        const msg = error.message || 'Regeneration failed';
        if (msg.toLowerCase().includes('rate')) toast.error('Rate limit reached. Try again in a minute.');
        else if (msg.toLowerCase().includes('credit')) toast.error('AI credits exhausted. Add credits in workspace settings.');
        else toast.error(msg);
        return null;
      }

      const next = (data as any)?.content as Record<string, string> | undefined;
      if (!next || typeof next !== 'object') {
        toast.error('AI returned no content. Try again.');
        return null;
      }
      toast.success('Block regenerated');
      return next;
    } catch (e: any) {
      toast.error(e?.message || 'Regeneration failed');
      return null;
    } finally {
      setRegeneratingId(null);
    }
  }, []);

  return { regenerate, regeneratingId };
}
