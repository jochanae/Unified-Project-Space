import { useState, useCallback } from 'react';
import type { Profile, Connection } from '@/hooks/useProfile';
import type { ChatMessage } from '@/hooks/useChatHistory';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { buildGenerationPayload, deriveStyleFromConnection, isAbstractStyle, safeAppearanceDescription, type GenerationPathType, type GenerationMode } from '@/lib/generationPayload';

const IMAGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/companion-image`;
const GENERATE_AVATAR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-avatar`;

async function getEdgeFunctionHeaders() {
  const { data: { session } } = await supabase.auth.getSession();

  return {
    'Content-Type': 'application/json',
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };
}

interface UseChatImagesOpts {
  companionName: string;
  profile: Profile;
  connection?: Connection;
  userId: string;
  chatHistory: { role: string; content: string }[];
  onAddMessage: (msg: ChatMessage) => void;
  onUpdateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  onSaveMedia?: (item: { mediaType: string; imageUrl: string; caption?: string; prompt?: string; stickerTarget?: 'user' | 'companion' }) => void;
  onImageGenerated?: () => void;
  onPersistMessage?: (content: string, role: 'user' | 'assistant', imageUrl?: string, messageId?: string) => void;
  onAppendHistory?: (entry: { role: string; content: string }) => void;
}

export function useChatImages({
  companionName, profile, connection, userId,
  chatHistory, onAddMessage, onUpdateMessage, onSaveMedia, onImageGenerated, onPersistMessage, onAppendHistory,
}: UseChatImagesOpts) {
  const [mediaLoading, setMediaLoading] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState<{ messageId: string; imageUrl: string; description: string } | null>(null);

  const getAppearancePayload = useCallback(() => ({
    companionAppearanceDesc: connection?.appearanceDesc || undefined,
    referenceImageUrl: connection?.referenceImageUrl || profile.companionReferenceImageUrl,
    userAppearanceDesc: profile.userAppearanceDesc,
    userReferenceImageUrl: profile.userReferenceImageUrl,
    // Connection's imageStyle takes priority — it's companion-specific
    imageStyle: connection?.imageStyle || profile.imageStyle || 'photorealistic',
    companionRole: connection?.connectionMode || 'friend',
    matureMode: profile.matureMode ?? false,
  }), [connection, profile]);

  const trackImageGenerated = useCallback(async () => {
    // Server now handles increment_image_count — just refresh UI usage display
    onImageGenerated?.();
  }, [onImageGenerated]);

  const preloadAndReveal = useCallback((shimmerId: string, imageUrl: string, isPreview = false) => {
    const img = new Image();
    img.onload = () => onUpdateMessage(shimmerId, { imageUrl, imageLoading: false, isPreview });
    img.onerror = () => onUpdateMessage(shimmerId, { imageLoading: false });
    img.src = imageUrl;
  }, [onUpdateMessage]);

  /** Auto-triggered contextual image based on conversation */
  const tryCompanionImage = useCallback(async (history: { role: string; content: string }[]) => {
    if (mediaLoading) return;
    const shimmerId = `img-${Date.now()}`;
    try {
      const resp = await fetch(IMAGE_URL, {
        method: 'POST',
        headers: await getEdgeFunctionHeaders(),
        body: JSON.stringify({
          messages: history,
          companionName,
          userName: profile.userName,
          ...getAppearancePayload(),
          userId,
          memberId: connection?.memberId,
        }),
      });
      if (!resp.ok) return;
      const data = await resp.json();
      if (data.shouldSend && data.imageUrl) {
        const resolvedMode = data.hasUserLikeness ? 'likeness' : (data.mode || 'activity');
        onAddMessage({
          id: shimmerId,
          content: data.caption || '',
          isUser: false,
          timestamp: new Date(),
          imageLoading: true,
        });
        preloadAndReveal(shimmerId, data.imageUrl);
        trackImageGenerated();
        // Persist caption + image URL so it survives page refresh
        if (data.caption) {
          onPersistMessage?.(data.caption, 'assistant', data.imageUrl);
          onAppendHistory?.({ role: 'assistant', content: `[I sent a photo: "${data.caption}"]` });
        }
        // Save to vault
        onSaveMedia?.({
          mediaType: resolvedMode,
          imageUrl: data.imageUrl,
          caption: data.caption,
        });
      }
    } catch (e) {
      console.error('[CompanionImage] Failed:', e);
      toast.error('Couldn\'t generate that image right now — try again in a moment');
    }
  }, [companionName, profile.userName, getAppearancePayload, userId, onAddMessage, preloadAndReveal, onPersistMessage, onSaveMedia, mediaLoading]);

  /** Generate a new avatar look with preview/approve flow */
  const generateAvatarPreview = useCallback(async (description: string) => {
    const shimmerId = `avatar-preview-${Date.now()}`;
    setMediaLoading(true);

    onAddMessage({
      id: shimmerId,
      content: "Let me sketch that out for you... ✨",
      isUser: false,
      timestamp: new Date(),
      imageLoading: true,
    });

    try {
      const resp = await fetch(GENERATE_AVATAR_URL, {
        method: 'POST',
        headers: await getEdgeFunctionHeaders(),
        body: JSON.stringify(buildGenerationPayload({
          userId,
          visualStyle: connection?.imageStyle || profile.imageStyle,
          pathType: isAbstractStyle(connection?.imageStyle || profile.imageStyle) ? 'abstract' : 'face',
          appearanceDescription: description,
          referenceImageUrl: connection?.referenceImageUrl || profile.companionReferenceImageUrl,
          memberId: connection?.memberId,
          mode: 'full',
          companionRole: connection?.connectionMode || 'friend',
          matureMode: profile.matureMode ?? false,
        })),
      });

      if (!resp.ok) throw new Error(`Failed: ${resp.status}`);
      const data = await resp.json();

      if (data.avatarUrl) {
        setPendingAvatarPreview({ messageId: shimmerId, imageUrl: data.avatarUrl, description: data.appearanceDescription || description });
        preloadAndReveal(shimmerId, data.avatarUrl, true);
        onUpdateMessage(shimmerId, { content: "Here's what I came up with 💛 What do you think?" });
        trackImageGenerated();
      } else {
        throw new Error('No avatar');
      }
    } catch (e) {
      console.error('[AvatarPreview] Failed:', e);
      onUpdateMessage(shimmerId, { content: "Hmm, I had trouble with that one. Try describing it differently?", imageLoading: false });
    } finally {
      setMediaLoading(false);
    }
  }, [userId, connection, profile, onAddMessage, onUpdateMessage, preloadAndReveal]);

  /** Generate 2 side-by-side variations for premium users */
  const generateAvatarVariations = useCallback(async (description: string) => {
    const shimmerId = `avatar-variations-${Date.now()}`;
    setMediaLoading(true);

    onAddMessage({
      id: shimmerId,
      content: "Let me sketch two options for you... ✨",
      isUser: false,
      timestamp: new Date(),
      imageLoading: true,
    });

    try {
      const baseDesc = description || connection?.appearanceDesc || profile.companionAppearanceDesc || 'companion portrait';
      const refUrl = connection?.referenceImageUrl || profile.companionReferenceImageUrl;

      // Generate 2 variations in parallel with slight prompt variation
      const [resp1, resp2] = await Promise.all([
        fetch(GENERATE_AVATAR_URL, {
          method: 'POST',
          headers: await getEdgeFunctionHeaders(),
          body: JSON.stringify(buildGenerationPayload({
            userId,
            visualStyle: connection?.imageStyle || profile.imageStyle,
            pathType: isAbstractStyle(connection?.imageStyle || profile.imageStyle) ? 'abstract' : 'face',
            appearanceDescription: `${baseDesc}. Variation A: slightly different angle and lighting.`,
            referenceImageUrl: refUrl,
            memberId: connection?.memberId,
            mode: 'full',
            companionRole: connection?.connectionMode || 'friend',
            matureMode: profile.matureMode ?? false,
          })),
        }),
        fetch(GENERATE_AVATAR_URL, {
          method: 'POST',
          headers: await getEdgeFunctionHeaders(),
          body: JSON.stringify(buildGenerationPayload({
            userId,
            visualStyle: connection?.imageStyle || profile.imageStyle,
            pathType: isAbstractStyle(connection?.imageStyle || profile.imageStyle) ? 'abstract' : 'face',
            appearanceDescription: `${baseDesc}. Variation B: slightly different expression and mood.`,
            referenceImageUrl: refUrl,
            memberId: connection?.memberId,
            mode: 'full',
            companionRole: connection?.connectionMode || 'friend',
            matureMode: profile.matureMode ?? false,
          })),
        }),
      ]);

      if (!resp1.ok || !resp2.ok) throw new Error('Generation failed');
      const [data1, data2] = await Promise.all([resp1.json(), resp2.json()]);

      if (data1.avatarUrl && data2.avatarUrl) {
        onUpdateMessage(shimmerId, {
          content: "Here are two options — which one feels more like me? 💛",
          imageLoading: false,
          isVariations: true,
          variations: [
            { imageUrl: data1.avatarUrl, description: data1.appearanceDescription || baseDesc },
            { imageUrl: data2.avatarUrl, description: data2.appearanceDescription || baseDesc },
          ],
        });
        trackImageGenerated();
        trackImageGenerated(); // 2 images generated
      } else if (data1.avatarUrl) {
        setPendingAvatarPreview({ messageId: shimmerId, imageUrl: data1.avatarUrl, description: data1.appearanceDescription || baseDesc });
        preloadAndReveal(shimmerId, data1.avatarUrl, true);
        onUpdateMessage(shimmerId, { content: "I could only sketch one this time 💛 What do you think?" });
        trackImageGenerated();
      } else {
        throw new Error('No avatars generated');
      }
    } catch (e) {
      console.error('[AvatarVariations] Failed:', e);
      onUpdateMessage(shimmerId, { content: "Hmm, I had trouble sketching those. Try again?", imageLoading: false });
    } finally {
      setMediaLoading(false);
    }
  }, [userId, connection, profile, onAddMessage, onUpdateMessage, preloadAndReveal]);

  /** User-requested media (selfie, activity, sticker, likeness, text-image, edit-image) */
  const requestCompanionMedia = useCallback(async (
    mode: 'contextual' | 'activity' | 'sticker' | 'selfie' | 'likeness' | 'text-image' | 'edit-image',
    opts?: {
      activityPrompt?: string;
      stickerExpression?: string;
      stickerTarget?: 'companion' | 'user';
      // text-image options
      textImageType?: 'letter' | 'postcard' | 'milestone' | 'note' | 'card';
      textContent?: string;
      textImagePrompt?: string;
      // edit-image options
      sourceImageUrl?: string;
      editInstruction?: string;
    }
  ) => {
    // Prevent duplicate concurrent image requests
    if (mediaLoading) return;
    setMediaLoading(true);
    const shimmerId = `media-${Date.now()}`;

    try {
      const resp = await fetch(IMAGE_URL, {
        method: 'POST',
        headers: await getEdgeFunctionHeaders(),
        body: JSON.stringify({
          messages: chatHistory.slice(-6),
          companionName,
          userName: profile.userName,
          ...(mode === 'sticker' && opts?.stickerTarget === 'user' ? {
            ...getAppearancePayload(),
            companionAppearanceDesc: profile.userAppearanceDesc,
            referenceImageUrl: profile.userReferenceImageUrl,
          } : getAppearancePayload()),
          mode,
          activityPrompt: mode !== 'likeness' ? opts?.activityPrompt : undefined,
          likenessPrompt: mode === 'likeness' ? opts?.activityPrompt : undefined,
          stickerExpression: opts?.stickerExpression,
          // text-image fields
          textImageType: opts?.textImageType,
          textContent: opts?.textContent,
          textImagePrompt: opts?.textImagePrompt,
          // edit-image fields
          sourceImageUrl: opts?.sourceImageUrl,
          editInstruction: opts?.editInstruction,
          userId,
          memberId: connection?.memberId,
        }),
      });
      if (!resp.ok) {
        toast.error('Image generation is temporarily unavailable — please try again shortly');
        return;
      }
      const data = await resp.json();
      if (data.shouldSend && data.imageUrl) {
        // Auto-tag: if backend detected user likeness, override mode to 'likeness'
        const resolvedMode = data.hasUserLikeness ? 'likeness' : (data.mode || mode);
        const isUserSticker = mode === 'sticker' && opts?.stickerTarget === 'user';
        
        onAddMessage({
          id: shimmerId,
          content: '',
          isUser: isUserSticker,
          timestamp: new Date(),
          imageLoading: true,
          isLetterGift: false,
        });
        setShowMediaPicker(false);
        preloadAndReveal(shimmerId, data.imageUrl);
        trackImageGenerated();

        // Persist caption + image URL so it survives page refresh
        if (mode === 'sticker' && isUserSticker) {
          onPersistMessage?.('', 'user', data.imageUrl, shimmerId);
        } else {
          const persistCaption = data.caption || (mode === 'text-image' ? `[${opts?.textImageType || 'letter'} image]` : '');
          onPersistMessage?.(persistCaption, 'assistant', data.imageUrl, shimmerId);
          if (persistCaption) {
            onAppendHistory?.({ role: 'assistant', content: `[I sent a ${mode} photo: "${persistCaption}"]` });
          }
        }

        onSaveMedia?.({
          mediaType: resolvedMode,
          imageUrl: data.imageUrl,
          caption: data.caption,
          prompt: opts?.activityPrompt || opts?.stickerExpression || opts?.textContent || opts?.editInstruction,
          stickerTarget: isUserSticker ? 'user' : 'companion',
        });

        // First-memory detection for likeness images
        if (resolvedMode === 'likeness') {
          try {
            const { count } = await supabase
              .from('companion_media')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', userId)
              .eq('member_id', connection?.memberId || '')
              .eq('media_type', 'likeness');

            if (count === 1) {
              onUpdateMessage(shimmerId, { footerNote: 'Saved as your first memory together ✨' });
            } else if ((count ?? 0) > 1) {
              onUpdateMessage(shimmerId, { footerNote: 'Saved to your story together ✨' });
            }
          } catch (e) {
            // Non-critical — don't block image display
            console.warn('[FirstMemory] count check failed:', e);
          }
        }

        return data.imageUrl;
      }
    } catch (e) {
      console.error('[CompanionMedia] Failed:', e);
      toast.error('Couldn\'t create that media right now — try again in a moment');
    } finally {
      setMediaLoading(false);
    }
  }, [chatHistory, companionName, profile.userName, getAppearancePayload, userId, onAddMessage, preloadAndReveal, onSaveMedia, mediaLoading]);

  /** Auto-generate avatar for companions with appearance_desc but no avatar_url */
  const autoGenerateAvatar = useCallback(async () => {
    if (!connection?.memberId || !connection?.appearanceDesc) return;
    if (connection?.avatarUrl || connection?.referenceImageUrl) return; // already has one
    
    logger.log('[AutoAvatar] Generating master portrait for', connection.memberId);
    try {
      const resp = await fetch(GENERATE_AVATAR_URL, {
        method: 'POST',
        headers: await getEdgeFunctionHeaders(),
        body: JSON.stringify(buildGenerationPayload({
          userId,
          visualStyle: connection.imageStyle,
          pathType: isAbstractStyle(connection.imageStyle) ? 'abstract' : 'face',
          appearanceDescription: connection.appearanceDesc,
          memberId: connection.memberId,
          mode: 'full',
        })),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.avatarUrl) {
          logger.log('[AutoAvatar] Master portrait generated:', data.avatarUrl);
          return data.avatarUrl;
        }
      }
    } catch (e) {
      console.error('[AutoAvatar] Failed:', e);
    }
    return null;
  }, [connection, userId]);

  const [batchGenerating, setBatchGenerating] = useState<Set<string>>(new Set());

  /** Silently generate all missing stickers in background (no chat messages) */
  const batchGenerateStickers = useCallback(async (
    missingExpressions: { prompt: string }[],
    stickerTarget: 'companion' | 'user' = 'companion',
  ) => {
    if (missingExpressions.length === 0) return;

    const inProgress = new Set(missingExpressions.map((e) => e.prompt));
    setBatchGenerating(inProgress);

    for (const expr of missingExpressions) {
      try {
        const appearancePayload = stickerTarget === 'user'
          ? { ...getAppearancePayload(), companionAppearanceDesc: profile.userAppearanceDesc, referenceImageUrl: profile.userReferenceImageUrl }
          : getAppearancePayload();

        const resp = await fetch(IMAGE_URL, {
          method: 'POST',
          headers: await getEdgeFunctionHeaders(),
          body: JSON.stringify({
            messages: chatHistory.slice(-6),
            companionName,
            userName: profile.userName,
            ...appearancePayload,
            mode: 'sticker',
            stickerExpression: expr.prompt,
            userId,
            memberId: connection?.memberId,
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.shouldSend && data.imageUrl) {
            onSaveMedia?.({
              mediaType: 'sticker',
              imageUrl: data.imageUrl,
              caption: data.caption,
              prompt: expr.prompt,
              stickerTarget,
            });
            trackImageGenerated();
          }
        }
      } catch (e) {
        console.error('[BatchSticker] Failed for', expr.prompt, e);
      }
      // Remove from in-progress set
      setBatchGenerating((prev) => {
        const next = new Set(prev);
        next.delete(expr.prompt);
        return next;
      });
    }
  }, [chatHistory, companionName, profile, getAppearancePayload, userId, connection, onSaveMedia, trackImageGenerated]);

  return {
    mediaLoading,
    showMediaPicker,
    setShowMediaPicker,
    tryCompanionImage,
    requestCompanionMedia,
    generateAvatarPreview,
    generateAvatarVariations,
    pendingAvatarPreview,
    setPendingAvatarPreview,
    autoGenerateAvatar,
    batchGenerateStickers,
    batchGenerating,
  };
}
