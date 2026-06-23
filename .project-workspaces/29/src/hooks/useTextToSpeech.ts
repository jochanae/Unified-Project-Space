import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { getStoredVoiceId } from '@/components/settings/VoiceSelector';
import { supabase } from '@/integrations/supabase/client';

const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;
function useBrowserTTS() {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Browser does not support speech synthesis'));
        return;
      }

      // Cancel any existing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      // Configure voice settings
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Try to use a natural-sounding voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural'))
      ) || voices.find((v) => v.lang.startsWith('en'));
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = (e) => reject(e);

      window.speechSynthesis.speak(utterance);
    });
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
  }, []);

  return { speak, stop };
}

export function useTextToSpeech() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTextRef = useRef<string>('');
  const browserTTS = useBrowserTTS();

  const stop = useCallback(() => {
    // Stop ElevenLabs audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    // Stop browser TTS
    browserTTS.stop();
    setIsPlaying(false);
    currentTextRef.current = '';
  }, [browserTTS]);

  const speakWithBrowserFallback = useCallback(async (text: string) => {
    // Falling back to browser TTS
    try {
      setIsPlaying(true);
      await browserTTS.speak(text);
    } catch (error) {
      console.error('Browser TTS error:', error);
      toast.error('Text-to-speech is unavailable');
    } finally {
      setIsPlaying(false);
      currentTextRef.current = '';
    }
  }, [browserTTS]);

  const speak = useCallback(async (text: string) => {
    // If same text is playing, stop it
    if (isPlaying && currentTextRef.current === text) {
      stop();
      return;
    }

    // Stop any existing playback
    stop();

    if (!text || text.trim().length === 0) {
      toast.error('No text to read');
      return;
    }

    // Clean text for TTS (remove markdown formatting and emojis)
    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#{1,6}\s/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/`[^`]+`/g, '')
      // Remove emojis and special unicode characters
      .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{2300}-\u{23FF}]|[\u{2B50}]|[\u{20A0}-\u{20CF}]/gu, '')
      // Remove common emoji-like symbols
      .replace(/[📈🎯🌍₿🏠💰🛡️📊⚖️🧠📎😊👋]/g, '')
      // Clean up extra whitespace from removed emojis
      .replace(/\s{2,}/g, ' ')
      .trim();

    setIsLoading(true);
    currentTextRef.current = text;

    try {
      const voiceId = getStoredVoiceId();

      // Get user session token for authenticated TTS requests
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        // User not authenticated — skip ElevenLabs, use browser TTS
        setIsLoading(false);
        await speakWithBrowserFallback(cleanText);
        return;
      }

      const response = await fetch(TTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ text: cleanText, voiceId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn('ElevenLabs TTS failed:', errorData);
        // Fall back to browser TTS
        setIsLoading(false);
        await speakWithBrowserFallback(cleanText);
        return;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        currentTextRef.current = '';
      };

      audio.onerror = () => {
        toast.error('Failed to play audio');
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        currentTextRef.current = '';
      };

      await audio.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('TTS error:', error);
      // Fall back to browser TTS on any error
      await speakWithBrowserFallback(cleanText);
    } finally {
      setIsLoading(false);
    }
  }, [isPlaying, stop, speakWithBrowserFallback]);

  return {
    speak,
    stop,
    isPlaying,
    isLoading,
  };
}
