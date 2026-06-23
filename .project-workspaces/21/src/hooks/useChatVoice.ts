import { useState, useCallback, useRef, useEffect } from 'react';
import { VOICE_IDS } from '@/lib/companions';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const VOICE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/companion-voice`;

interface UseChatVoiceOpts {
  voiceId?: string;
  companionGender: 'male' | 'female' | 'neutral';
  userName?: string;
  namePronunciation?: string;
}

export function useChatVoice({ voiceId, companionGender, userName, namePronunciation }: UseChatVoiceOpts) {
  const [voiceLoadingId, setVoiceLoadingId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentUrlRef = useRef<string | null>(null);

  const stopVoiceClip = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      try { a.pause(); } catch {}
      audioRef.current = null;
    }
    if (currentUrlRef.current) {
      URL.revokeObjectURL(currentUrlRef.current);
      currentUrlRef.current = null;
    }
    setPlayingId(null);
    setVoiceLoadingId(null);
  }, []);

  useEffect(() => () => { stopVoiceClip(); }, [stopVoiceClip]);

  const playVoiceClip = useCallback(async (text: string) => {
    // Toggle off if same clip is already playing
    if (playingId === text || voiceLoadingId === text) {
      stopVoiceClip();
      return;
    }
    // Stop any currently playing clip
    stopVoiceClip();
    setVoiceLoadingId(text);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const resolvedVoiceId = voiceId || VOICE_IDS[companionGender] || VOICE_IDS.neutral;
      const resp = await fetch(VOICE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: text.slice(0, 500),
          voiceId: resolvedVoiceId,
          companionGender,
          stream: true,
          userName,
          namePronunciation,
        }),
      });
      if (!resp.ok) throw new Error('Voice generation failed');

      const contentType = resp.headers.get('Content-Type') || '';
      let audioUrl: string | null = null;
      if (contentType.includes('audio/mpeg') && resp.body) {
        const reader = resp.body.getReader();
        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }
        const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
        const audioBytes = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          audioBytes.set(chunk, offset);
          offset += chunk.length;
        }
        const blob = new Blob([audioBytes], { type: 'audio/mpeg' });
        audioUrl = URL.createObjectURL(blob);
      } else {
        const data = await resp.json();
        if (data.audioContent) {
          audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
        }
      }

      if (!audioUrl) throw new Error('No audio returned');

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      currentUrlRef.current = audioUrl.startsWith('blob:') ? audioUrl : null;
      audio.onended = () => {
        if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
        currentUrlRef.current = null;
        audioRef.current = null;
        setPlayingId(null);
      };
      audio.onerror = () => {
        if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
        currentUrlRef.current = null;
        audioRef.current = null;
        setPlayingId(null);
      };
      setPlayingId(text);
      setVoiceLoadingId(null);
      await audio.play();
    } catch (e) {
      console.error('[Voice] Failed:', e);
      toast.error('Voice playback failed');
      setVoiceLoadingId(null);
      setPlayingId(null);
    }
  }, [voiceId, companionGender, userName, namePronunciation, playingId, voiceLoadingId, stopVoiceClip]);

  return { voiceLoadingId, playingId, playVoiceClip, stopVoiceClip };
}
