/**
 * useStudioGeneration — avatar creation, generation, and photo upload pipeline for Studio.
 * Extracted from StudioPage to keep the page orchestrator focused on layout and state.
 *
 * Contains: getAuthHeaders, handleBringToLife, handleGenerate, handleApplyAvatar, handlePhotoUpload
 */

import { useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { COMMUNICATION_STYLES } from '@/lib/communicationStyles';
import { autoAssignVoice } from '@/lib/companions';
import { treatAsMinor } from '@/lib/ageUtils';
import type { MatchResult } from '@/lib/companionTypes';
import type { Connection, Profile } from '@/hooks/useProfile';
import { buildGenerationPayload, deriveStyleFromConnection, isAbstractStyle, safeAppearanceDescription, type GenerationPathType, type GenerationMode } from '@/lib/generationPayload';

const GENERATE_AVATAR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-avatar`;

interface UseStudioGenerationParams {
  user: { id: string } | null;
  companion: Connection | null;
  profile: Profile | null;
  selections: Record<string, string | string[]>;
  description: string;
  creationName: string;
  studioRole: string;
  chosenPathType: string;
  generatedPreview: string | null;
  creationImageUrl: string | null;
  heroImage: string | null;
  isCreationMode: boolean;
  currentPath: { id: string; title: string; required?: boolean }[];
  equippedGiftModifiers: string | null;
  generationMode: 'full' | 'restyle';
  isSectionDone: (id: string) => boolean;
  handleMatchComplete: (result: MatchResult) => void;
  updateConnection: (memberId: string, updates: Partial<Connection>) => void;
  updateProfile: (updates: Partial<Profile>) => void;
  setRevealState: (s: 'idle' | 'generating' | 'revealing' | 'done') => void;
  setCreatingCompanion: (v: boolean) => void;
  setFullscreenImage: (url: string | null) => void;
  setFullscreenGenerating: (v: boolean) => void;
  setRevealingFullscreen: (v: boolean) => void;
  setGeneratedPreview: (url: string | null) => void;
  setCreationImageUrl: (url: string | null) => void;
  setGenerating: (v: boolean) => void;
  setAvatarReady: (v: boolean) => void;
  setStudioRevealData: (data: { name: string; avatarUrl?: string | null; bio?: string | null; memberId: string; visualMode?: string } | null) => void;
  sfx: { celebration: () => void };
  confettiBurst: () => void;
}

export function useStudioGeneration({
  user, companion, profile, selections, description, creationName, studioRole,
  chosenPathType, generatedPreview, creationImageUrl, heroImage, isCreationMode, currentPath,
  equippedGiftModifiers, generationMode, isSectionDone, handleMatchComplete,
  updateConnection, updateProfile, setRevealState, setCreatingCompanion,
  setFullscreenImage, setFullscreenGenerating, setRevealingFullscreen,
  setGeneratedPreview, setCreationImageUrl, setGenerating, setAvatarReady, setStudioRevealData, sfx, confettiBurst,
}: UseStudioGenerationParams) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pendingNavRef = useRef<string | null>(null);
  const creationInFlightRef = useRef(false);

  const getAuthHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    if (!accessToken) throw new Error('Session expired. Please sign in again.');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    };
  }, []);

  const handleBringToLife = useCallback(() => {
    if (creationInFlightRef.current) return;
    if (isCreationMode && !creationName.trim()) { toast.error('Give your companion a name first'); return; }
    if (isCreationMode && !description.trim() && !generatedPreview && !creationImageUrl && !heroImage) { toast.error('Describe your companion first'); return; }

    const role = studioRole || 'friend';
    (async (role: string) => {
      creationInFlightRef.current = true;
      setRevealState('generating');
      setCreatingCompanion(true);
      setAvatarReady(false);

      try {
        const memberId = `created-${Date.now()}`;
        const extras = Object.entries(selections)
          .filter(([, v]) => v && v !== '__skip__')
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join('. ');
        const appearanceDesc = extras ? `${description}. ${extras}` : description;
        const personalityVibes = Array.isArray(selections.personality) ? selections.personality : [];
        const rhythmLabel = typeof selections.rhythm === 'string' ? selections.rhythm : undefined;
        const rhythmStyleId = rhythmLabel ? COMMUNICATION_STYLES.find(s => s.label === rhythmLabel)?.id : undefined;

        const studioStyle = typeof selections.style === 'string'
          ? selections.style
          : chosenPathType === 'abstract' ? 'abstract' : 'photorealistic';
        let avatarUrl: string | null = generatedPreview || creationImageUrl;
        let imageGenFailed = false;
        if (!avatarUrl && extras.trim() && !generatedPreview) {
          try {
            const resp = await fetch(GENERATE_AVATAR_URL, {
              method: 'POST',
              headers: await getAuthHeaders(),
              body: JSON.stringify(buildGenerationPayload({
                userId: user!.id,
                pathType: chosenPathType === 'abstract' ? 'abstract' as GenerationPathType : 'face' as GenerationPathType,
                visualStyle: studioStyle,
                appearanceDescription: appearanceDesc,
                companionRole: studioRole || 'friend',
                matureMode: false,
              })),
            });
            if (resp.ok) {
              const data = await resp.json();
              if (data.avatarUrl) avatarUrl = data.avatarUrl;
              else imageGenFailed = true;
            } else {
              imageGenFailed = true;
            }
          } catch (e) {
            console.error('[Studio] Avatar generation failed, continuing without:', e);
            imageGenFailed = true;
          }
        }

        if (imageGenFailed) {
          toast(`${creationName} is ready — we'll generate their photo shortly. You can update it anytime in Studio.`, {
            duration: 5000,
            icon: '💛',
          });
        }

        if (avatarUrl) { setGeneratedPreview(avatarUrl); setCreationImageUrl(avatarUrl); }
        setCreatingCompanion(false);
        setRevealState('revealing');

        await handleMatchComplete({
          member: {
            id: memberId, name: creationName, bio: 'A companion',
            personality: personalityVibes[0] || 'warm', age: '25',
            handle: `@${creationName.toLowerCase().replace(/\s+/g, '')}`,
            gender: (['male', 'female', 'nonbinary'].includes((selections.gender as string)?.toLowerCase())
              ? (selections.gender as string).toLowerCase() : 'nonbinary') as 'male' | 'female' | 'nonbinary',
            circles: [], initial: creationName[0]?.toUpperCase() || '?', colorVar: '--avatar-coral',
          },
          isCreated: true, connectionMode: role, visualMode: avatarUrl ? 'personal' : 'abstract',
          reason: 'Created in Studio',
          tailoredPost: { id: `post-${Date.now()}`, memberId, content: `Hey! I'm ${creationName} — just getting started here. So glad to connect! 💛`, timeAgo: 'just now' },
        appearanceDesc,
        imageStyle: studioStyle,
        skipAvatarGeneration: true,
      } as any);

        if (avatarUrl) {
          const userChosenVoiceId = (window as any).__studioVoiceId as string | undefined;
          delete (window as any).__studioVoiceId;
          const assignedVoiceId = userChosenVoiceId || autoAssignVoice({
            gender: (selections.gender as string)?.toLowerCase() || 'neutral',
            vibes: personalityVibes,
            isMinor: treatAsMinor(profile?.dateOfBirth),
          });
          await updateProfile({ companionAvatarUrl: avatarUrl, companionAppearanceDesc: appearanceDesc, visualMode: 'personal', companionName: creationName, vibe: personalityVibes[0] || 'warm', personalityTraits: { vibes: personalityVibes } });
          await updateConnection(memberId, { avatarUrl, appearanceDesc, studioSelections: selections, voiceId: assignedVoiceId, ...(rhythmStyleId ? { communicationStyle: rhythmStyleId } : {}) });
        } else {
          const userChosenVoiceIdNoAvatar = (window as any).__studioVoiceId as string | undefined;
          delete (window as any).__studioVoiceId;
          const assignedVoiceIdNoAvatar = userChosenVoiceIdNoAvatar || autoAssignVoice({
            gender: (selections.gender as string)?.toLowerCase() || 'neutral',
            vibes: personalityVibes,
            isMinor: treatAsMinor(profile?.dateOfBirth),
          });
          await updateProfile({ companionName: creationName, vibe: personalityVibes[0] || 'warm', personalityTraits: { vibes: personalityVibes } });
          await updateConnection(memberId, { voiceId: assignedVoiceIdNoAvatar, ...(rhythmStyleId ? { communicationStyle: rhythmStyleId } : {}) });
        }

        pendingNavRef.current = `/chat/${memberId}`;
        toast.success(`${creationName} has been brought to life! ✨`);
        setTimeout(() => {
          setRevealState('done');
          setAvatarReady(true);
          setStudioRevealData({ name: creationName, avatarUrl, bio: null, memberId, visualMode: avatarUrl ? 'personal' : 'abstract' });
        }, 1000);
      } catch {
        toast.error('Something went wrong — try again');
        setRevealState('idle');
        setAvatarReady(false);
      } finally {
        creationInFlightRef.current = false;
      }
    })(role);
  }, [isCreationMode, creationName, description, studioRole, selections, heroImage, generatedPreview,
      creationImageUrl,
      chosenPathType, profile, user, getAuthHeaders, handleMatchComplete, updateConnection, updateProfile,
      setRevealState, setCreatingCompanion, setFullscreenImage, setFullscreenGenerating,
      setRevealingFullscreen, setGeneratedPreview, setCreationImageUrl, setGenerating, setAvatarReady, setStudioRevealData, sfx, confettiBurst]);

  const handleGenerate = useCallback(async (overrideDescription?: string) => {
    if (isCreationMode) {
      const missingRequired = currentPath.filter(s => s.required && !isSectionDone(s.id));
      if (missingRequired.length > 0) { toast.warning(`Please complete: ${missingRequired.map(s => s.title).join(', ')}`); return; }
    }

    const extras = Object.entries(selections)
      .filter(([, v]) => v && v !== '__skip__')
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      .join('. ');
    const giftModStr = equippedGiftModifiers ? `. Also ${equippedGiftModifiers}` : '';
    const baseDesc = overrideDescription !== undefined ? overrideDescription : description;
    const effectiveDesc = baseDesc.trim()
      ? `${baseDesc}. ${extras}${giftModStr}`
      : (extras || companion?.appearanceDesc || '') + giftModStr;
    if (!effectiveDesc.trim()) { toast.error('Describe their look first'); return; }

    const currentAvatarUrl = companion?.avatarUrl || companion?.referenceImageUrl;
    const genMode = (currentAvatarUrl && generationMode === 'restyle') ? 'restyle' : 'full';
    let changedDetails = '';
    if (genMode === 'restyle') {
      const savedSelections = companion?.studioSelections as Record<string, unknown> | undefined;
      if (savedSelections && Object.keys(selections).length > 0) {
        const changedKeys = Object.keys(selections).filter(k =>
          JSON.stringify(selections[k]) !== JSON.stringify(savedSelections[k])
        );
        changedDetails = changedKeys.map(k => `${k}: ${Array.isArray(selections[k]) ? (selections[k] as string[]).join(', ') : selections[k]}`).join('. ');
      }
      if (!changedDetails.trim()) changedDetails = 'Maintain the companion\'s exact facial features, skin tone, and identity. Refresh the overall image quality and lighting.';
    }

    setGenerating(true);
    setFullscreenImage(heroImage || 'generating');
    setFullscreenGenerating(true);
    setRevealingFullscreen(false);

    try {
      const authHeaders = await getAuthHeaders();
      const connectionImageStyle = companion?.imageStyle || profile?.imageStyle || 'photorealistic';
      const resp = await fetch(GENERATE_AVATAR_URL, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(buildGenerationPayload({
          userId: user!.id,
          pathType: (chosenPathType === 'abstract' || isAbstractStyle(connectionImageStyle)) ? 'abstract' as GenerationPathType : 'face' as GenerationPathType,
          visualStyle: connectionImageStyle,
          appearanceDescription: effectiveDesc,
          referenceImageUrl: currentAvatarUrl || undefined,
          memberId: companion?.memberId,
          mode: genMode,
          changedDetails: genMode === 'restyle' ? changedDetails : undefined,
          equippedGiftModifiers: (() => {
            if (!equippedGiftModifiers) return undefined;
            const role = companion?.connectionMode || 'friend';
            const isMature = profile?.matureMode === true && role === 'romantic';
            if (isMature) return equippedGiftModifiers;
            const INTIMATE_KW = ['boxer', 'lingerie', 'underwear', 'intimate', 'silk short', 'bra ', 'thong', 'negligee', 'corset'];
            const safe = equippedGiftModifiers.split(',').filter(m => !INTIMATE_KW.some(k => m.toLowerCase().includes(k))).join(',');
            return safe || undefined;
          })(),
          companionRole: companion?.connectionMode || 'friend',
          matureMode: profile?.matureMode === true && (companion?.connectionMode === 'romantic'),
        })),
      });
      if (!resp.ok) {
        const errBody = await resp.json().catch(() => null);
        if (resp.status === 429) throw new Error('rate_limited');
        throw new Error(errBody?.error || `Generation failed (${resp.status})`);
      }
      const data = await resp.json();
      if (data.avatarUrl) {
        setGeneratedPreview(data.avatarUrl);
        setCreationImageUrl(data.avatarUrl);
        setFullscreenImage(data.avatarUrl);
        setFullscreenGenerating(false);
        setRevealingFullscreen(true);
        setTimeout(() => setRevealingFullscreen(false), 1500);
        toast.success('New look generated! ✨');
      } else {
        throw new Error('no_image');
      }
    } catch (err: any) {
      const msg = err?.message;
      if (msg === 'rate_limited') {
        toast.error('You\'ve hit the image limit for today. Come back tomorrow or upgrade to Premium.', { duration: 5000, icon: '👑' });
      } else if (msg === 'no_image') {
        toast.error('Generation didn\'t return an image — try again or adjust your description.', { duration: 4000 });
      } else {
        toast.error(msg || 'Generation failed — try again');
      }
      setFullscreenGenerating(false);
      setFullscreenImage(null);
    } finally {
      setGenerating(false);
    }
  }, [isCreationMode, currentPath, selections, description, equippedGiftModifiers, companion, profile,
      user, generationMode, heroImage, isSectionDone, getAuthHeaders, setGenerating, setFullscreenImage,
      setFullscreenGenerating, setRevealingFullscreen, setGeneratedPreview, setCreationImageUrl]);

  const handleApplyAvatar = useCallback(async () => {
    if (!generatedPreview) return;
    try {
      const targetMemberId = companion?.memberId;
      if (targetMemberId && user) {
        const { error: dbError } = await (supabase as any)
          .from('connections')
          .update({ avatar_url: generatedPreview, background_url: generatedPreview, reference_image_url: generatedPreview, appearance_desc: description || companion?.appearanceDesc || '', studio_selections: selections })
          .eq('user_id', user.id)
          .eq('member_id', targetMemberId);
        if (dbError) { console.error('[Studio] DB write failed:', dbError); toast.error('Photo upload failed — please try again'); return; }
        updateConnection(targetMemberId, { avatarUrl: generatedPreview, backgroundUrl: generatedPreview, referenceImageUrl: generatedPreview, appearanceDesc: description || companion?.appearanceDesc || '', studioSelections: selections });
      }
      await updateProfile({ companionAvatarUrl: generatedPreview, companionAppearanceDesc: description, visualMode: 'personal' });
      toast.success('Look updated! 💛');
      setGeneratedPreview(null);
    } catch { toast.error('Photo upload failed — please try again'); }
  }, [generatedPreview, companion, user, description, selections, updateConnection, updateProfile, setGeneratedPreview]);

  const handlePhotoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, overrideStyle?: string) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!companion && !isCreationMode) return;

    e.target.value = '';
    setGenerating(true);
    setFullscreenGenerating(true);
    toast.info('Processing your photo…');

    let refUrl: string | null = null;
    try {
      const { compressImage } = await import('@/lib/imageCompression');
      const compressed = await compressImage(file);
      const fileName = `${user.id}/studio-ref-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from('companion-avatars').upload(fileName, compressed, { contentType: compressed.type, upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('companion-avatars').getPublicUrl(fileName);
      refUrl = urlData?.publicUrl ?? null;
      if (!refUrl) throw new Error('Failed to get upload URL');
      setCreationImageUrl(refUrl);

      if (overrideStyle === 'keep-as-is') {
        setGeneratedPreview(refUrl);
        setFullscreenImage(refUrl);
        setFullscreenGenerating(false);
        setRevealingFullscreen(true);
        setTimeout(() => setRevealingFullscreen(false), 1500);
        toast.success('Photo uploaded! Review and create when ready ✨');
        return;
      }

      const authHeaders = await getAuthHeaders();
      const visualStyle = overrideStyle
        || companion?.imageStyle
        || (chosenPathType === 'abstract' ? 'abstract' : undefined)
        || profile?.imageStyle
        || 'photorealistic';
      const pathType: GenerationPathType = chosenPathType === 'abstract' || isAbstractStyle(visualStyle)
        ? 'abstract'
        : 'face';

      const resp = await fetch(GENERATE_AVATAR_URL, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(buildGenerationPayload({
          userId: user.id,
          visualStyle,
          pathType,
          appearanceDescription: description || companion?.appearanceDesc,
          referenceImageUrl: refUrl,
          memberId: companion?.memberId,
          mode: 'upload',
          companionRole: companion?.connectionMode || studioRole || 'friend',
          matureMode: false,
        })),
      });

      if (!resp.ok) throw new Error('Generation failed');
      const data = await resp.json();
      if (data.avatarUrl) {
        setGeneratedPreview(data.avatarUrl);
        setCreationImageUrl(data.avatarUrl);
        setFullscreenImage(data.avatarUrl);
        setFullscreenGenerating(false);
        setRevealingFullscreen(true);
        setTimeout(() => setRevealingFullscreen(false), 1500);
        toast.success('Photo processed! Review and apply below ✨');
      } else {
        throw new Error('no_styled_image');
      }
    } catch (err: any) {
      // If styling failed, fall back to the raw uploaded photo so the user can still create
      if (refUrl) {
        setGeneratedPreview(refUrl);
        setCreationImageUrl(refUrl);
        setFullscreenImage(refUrl);
        setRevealingFullscreen(true);
        setTimeout(() => setRevealingFullscreen(false), 1500);
        toast('We used your original photo instead — you can restyle later.', { icon: '📸', duration: 4000 });
      } else {
        toast.error(err?.message || 'Photo upload failed — try again');
      }
      setFullscreenGenerating(false);
    } finally {
      setGenerating(false);
    }
  }, [user, companion, isCreationMode, description, chosenPathType, profile?.imageStyle, studioRole, getAuthHeaders,
      setGenerating, setFullscreenGenerating, setGeneratedPreview, setCreationImageUrl, setFullscreenImage, setRevealingFullscreen]);

  return { getAuthHeaders, handleBringToLife, handleGenerate, handleApplyAvatar, handlePhotoUpload, pendingNavRef };
}
