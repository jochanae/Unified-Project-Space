/**
 * useWorkImage — generates strategic / work visuals (diagrams, mockups,
 * charts, sketches, mood boards, references) via the generate-work-image
 * edge function.
 *
 * Stored under: storage bucket `work-artifacts/{userId}/...`
 * Indexed in: `chat_artifacts` table (kind = 'work_image')
 * Surfaced in: ArtifactsDrawer + dashboard Workbench card.
 *
 * NOT for selfies, companion likeness, or character portraits — use
 * useChatImages.requestCompanionMedia for those.
 */

import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

const URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-work-image`;

export type WorkVisualKind =
  | 'diagram'
  | 'flowchart'
  | 'mockup'
  | 'wireframe'
  | 'chart'
  | 'moodboard'
  | 'sketch'
  | 'reference'
  | 'other';

import type { SketchStylePreset } from '@/lib/sketchStylePresets';

export interface GenerateWorkImageOpts {
  prompt: string;
  visualKind?: WorkVisualKind;
  title?: string;
  memberId?: string;
  messageId?: string;
  projectId?: string | null;
  /** When set, the model edits/refines this existing image instead of generating from scratch */
  referenceImageUrl?: string;
  /** When refining, link the new artifact back to its parent */
  parentArtifactId?: string;
  /** Optional recent conversation lines to bias the prompt */
  conversationContext?: string;
  /** User-selected style preset; overrides visualKind inference */
  stylePreset?: SketchStylePreset;
}

export interface WorkImageResult {
  imageUrl: string;
  artifactId: string | null;
  title: string;
  visualKind: WorkVisualKind;
  parentArtifactId?: string;
  stylePreset?: SketchStylePreset;
}

export function useWorkImage() {
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async (opts: GenerateWorkImageOpts): Promise<WorkImageResult | null> => {
    if (!opts.prompt?.trim()) {
      toast.error('Describe what you want me to sketch');
      return null;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(opts),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        if (resp.status === 429) toast.error('Too many requests — give it a moment.');
        else if (resp.status === 402) toast.error('AI credits exhausted. Top up in workspace settings.');
        else toast.error(data?.error || 'Could not generate that visual.');
        return null;
      }
      const data = await resp.json() as WorkImageResult;
      return data;
    } catch (e) {
      logger.error('[useWorkImage] failed:', e);
      toast.error('Something went wrong generating that visual.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { generate, loading };
}
