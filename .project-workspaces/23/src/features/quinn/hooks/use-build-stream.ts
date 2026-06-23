import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { LockedAngle } from '../components/PreFlightChecklist';

interface Strategy {
  audience: string;
  offer: string;
  positioning: string;
  hook: string;
}

interface FunnelStepResult {
  title: string;
  step_type: string;
  description: string;
}

interface LandingPage {
  headline: string;
  subheadline: string;
  cta_text: string;
  cta_subtext?: string;
  optin_heading?: string;
  service_area_zips?: string[];
  service_area_label?: string;
  service_area_required?: boolean;
  features: { title: string; description: string }[];
  social_proof: string;
  hero_image?: string;
}

interface ThankYouPage {
  headline: string;
  subheadline: string;
  cta_text: string;
  cta_url?: string;
  bonus_message?: string;
}

interface SocialPromo {
  instagram_caption: string;
  linkedin_post: string;
  twitter_post: string;
  email_teaser: string;
}

interface VideoSuggestion {
  title: string;
  description: string;
  placement: 'hero' | 'after_features' | 'before_cta' | 'testimonial_section';
  placeholder_url: string;
}

export interface BuildStreamResult {
  strategy: Strategy;
  funnel_steps: FunnelStepResult[];
  landing_page: LandingPage;
  thank_you_page?: ThankYouPage;
  social_promo?: SocialPromo;
  video_suggestion?: VideoSuggestion;
}

export type StreamPhase = 'idle' | 'generating' | 'strategy' | 'funnel' | 'page' | 'complete' | 'error';

export function useBuildStream() {
  const [phase, setPhase] = useState<StreamPhase>('idle');
  const [result, setResult] = useState<BuildStreamResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lockedAngle, setLockedAngle] = useState<LockedAngle | null>(null);
  const projectIdRef = useRef<string | null>(null);
  const orgIdRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const generate = async (projectId: string, goal: string, locked?: LockedAngle | null) => {
    projectIdRef.current = projectId;
    if (locked) setLockedAngle(locked);
    setPhase('generating');
    setError(null);
    setResult(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-build-stream', {
        body: { projectId, goal, lockedAngle: locked ?? null },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      const result = data.data as BuildStreamResult;

      setPhase('strategy');
      setResult(result);

      await new Promise(r => setTimeout(r, 800));
      setPhase('funnel');

      await new Promise(r => setTimeout(r, 800));
      setPhase('page');

      await new Promise(r => setTimeout(r, 800));
      setPhase('complete');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
      setPhase('error');
    }
  };

  const loadExistingBuild = async (projectId: string) => {
    projectIdRef.current = projectId;
    try {
      const { data: blocks, error: err } = await supabase
        .from('stream_blocks')
        .select('block_type, content, org_id')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (err || !blocks || blocks.length === 0) return;
      orgIdRef.current = (blocks[0] as any).org_id ?? null;

      const strategyBlock = blocks.find(b => b.block_type === 'strategy');
      const funnelBlock = blocks.find(b => b.block_type === 'funnel_map');
      const pageBlock = blocks.find(b => b.block_type === 'page_content');
      const thankYouBlock = blocks.find(b => b.block_type === 'thank_you_content');
      const socialPromoBlock = blocks.find(b => b.block_type === 'social_promo');
      const videoSuggestionBlock = blocks.find(b => b.block_type === 'video_suggestion');
      const lockedAngleBlock = blocks.find(b => b.block_type === 'locked_angle');

      if (lockedAngleBlock) {
        setLockedAngle(lockedAngleBlock.content as unknown as LockedAngle);
      }

      if (!strategyBlock || !funnelBlock || !pageBlock) return;

      const content: BuildStreamResult = {
        strategy: strategyBlock.content as unknown as Strategy,
        funnel_steps: ((funnelBlock.content as any)?.steps ?? []) as FunnelStepResult[],
        landing_page: pageBlock.content as unknown as LandingPage,
        ...(thankYouBlock ? { thank_you_page: thankYouBlock.content as unknown as ThankYouPage } : {}),
        ...(socialPromoBlock ? { social_promo: socialPromoBlock.content as unknown as SocialPromo } : {}),
        ...(videoSuggestionBlock ? { video_suggestion: videoSuggestionBlock.content as unknown as VideoSuggestion } : {}),
      };

      setResult(content);
      setPhase('complete');
    } catch {
      // Non-blocking
    }
  };

  const reset = () => {
    setPhase('idle');
    setResult(null);
    setError(null);
    setLockedAngle(null);
  };

  const persistLandingPage = (landing: LandingPage) => {
    const projectId = projectIdRef.current;
    if (!projectId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await supabase
          .from('stream_blocks')
          .update({ content: landing as any })
          .eq('project_id', projectId)
          .eq('block_type', 'page_content');
      } catch {
        // Non-blocking
      }
    }, 600);
  };

  const updateResult = (updated: BuildStreamResult) => {
    setResult(updated);
    persistLandingPage(updated.landing_page);
  };

  return { phase, setPhase, result, error, generate, reset, updateResult, loadExistingBuild, lockedAngle, setLockedAngle };
}
