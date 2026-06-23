import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

type PracticeState = 'idle' | 'requesting' | 'listening' | 'processing' | 'done' | 'error';

interface UseVoicePracticeReturn {
  state: PracticeState;
  transcript: string | null;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
  isSupported: boolean;
}

export function useVoicePractice(): UseVoicePracticeReturn {
  const [state, setState] = useState<PracticeState>('idle');
  const [transcript, setTranscript] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isSupported = typeof window !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    (typeof MediaRecorder !== 'undefined');

  const reset = useCallback(() => {
    setState('idle');
    setTranscript(null);
    chunksRef.current = [];
    if (mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
  }, []);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current &&
        mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const start = useCallback(async () => {
    if (!isSupported) {
      setState('error');
      return;
    }

    setState('requesting');
    chunksRef.current = [];

    try {
      // Get mic access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });

      // Set up MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Stop all mic tracks
        stream.getTracks().forEach(t => t.stop());
        setState('processing');

        try {
          const audioBlob = new Blob(chunksRef.current, { type: mimeType });

          // Get auth session for edge function call
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error('No session');

          // Build form data for ElevenLabs STT
          const formData = new FormData();
          formData.append('audio', audioBlob, 'practice.webm');
          formData.append('model_id', 'scribe_v1');

          // Call ElevenLabs Speech-to-Text directly
          // The API key is fetched via the scribe token edge function
          const tokenResp = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-scribe-token`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              },
            }
          );

          if (!tokenResp.ok) throw new Error('Token fetch failed');

          // Use the token to transcribe
          const { token } = await tokenResp.json();

          const sttResp = await fetch(
            'https://api.elevenlabs.io/v1/speech-to-text',
            {
              method: 'POST',
              headers: { 'xi-api-key': token },
              body: formData,
            }
          );

          if (!sttResp.ok) throw new Error('Transcription failed');

          const sttData = await sttResp.json();
          const text = sttData.text || sttData.transcript || '';

          setTranscript(text);
          setState('done');
        } catch (err) {
          console.error('[useVoicePractice] transcription error:', err);
          setState('error');
        }
      };

      recorder.start();
      setState('listening');

      // Auto-stop after 10 seconds as a safety limit
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 10000);

    } catch (err) {
      console.error('[useVoicePractice] mic error:', err);
      setState('error');
    }
  }, [isSupported]);

  return { state, transcript, start, stop, reset, isSupported };
}
