import { useState, useCallback, useEffect, useRef } from 'react';
import { callEdgeFunction } from '@/lib/edgeFunction';
import { useVAD } from '@/hooks/useVAD';
import { toast } from 'sonner';

export type AutoJoinMode = 'unmuted' | 'muted' | 'none';

interface UseCircleAudioProps {
  micSensitivity: number;
  localParticipantId?: string;
  autoJoinMode?: AutoJoinMode;
  /** Delay in ms before auto-join triggers (default 800) */
  autoJoinDelay?: number;
  onSpeechEnd?: (text: string) => void;
  onSpeechStart?: () => void;
}

export function useCircleAudio({
  micSensitivity,
  localParticipantId,
  autoJoinMode = 'none',
  autoJoinDelay = 800,
  onSpeechEnd,
  onSpeechStart,
}: UseCircleAudioProps) {
  const [isAudioJoined, setIsAudioJoined] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [speakingIds, setSpeakingIds] = useState<string[]>([]);

  const handleVADSpeechEnd = useCallback(async (blob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-audio`, {
        method: 'POST',
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: formData,
      });
      if (!response.ok) return;
      const data = await response.json();
      const text = data.text?.trim();
      if (text && text.length > 1) {
        onSpeechEnd?.(text);
      }
    } catch {
      // Silently fail — user can always type
    }
  }, [onSpeechEnd]);

  const vad = useVAD({
    sensitivityLevel: micSensitivity,
    silenceDuration: 1500,
    maxDuration: 120,
    onSpeechEnd: handleVADSpeechEnd,
    onAmplitude: setAmplitude,
    onSpeechStart,
  });

  const handleJoinAudio = useCallback(async (autoMute = false) => {
    try {
      await vad.startListening();
      setIsAudioJoined(true);
      if (autoMute) {
        setTimeout(() => vad.toggleMute(), 100);
        setIsMuted(true);
        toast.success('Audio auto-joined (muted) 🎙️');
      } else {
        setIsMuted(false);
        toast.success('Audio joined — hands-free mode active 🎙️');
      }
    } catch {
      toast.error('Microphone access denied');
    }
  }, [vad]);

  const handleLeaveAudio = useCallback(() => {
    vad.stopListening();
    setIsAudioJoined(false);
    setIsMuted(false);
  }, [vad]);

  const handleToggleMute = useCallback(() => {
    if (!isAudioJoined) {
      handleJoinAudio(false);
      return;
    }
    vad.toggleMute();
    setIsMuted(prev => !prev);
  }, [isAudioJoined, vad, handleJoinAudio]);

  // Track local user speaking state
  useEffect(() => {
    if (!localParticipantId) return;
    if (vad.isSpeaking) {
      setSpeakingIds(prev => prev.includes(localParticipantId) ? prev : [...prev, localParticipantId]);
    } else {
      setSpeakingIds(prev => prev.filter(pid => pid !== localParticipantId));
    }
  }, [vad.isSpeaking, localParticipantId]);

  // Auto-join logic
  const autoJoinedRef = useRef(false);
  useEffect(() => {
    if (autoJoinedRef.current || autoJoinMode === 'none' || isAudioJoined) return;
    autoJoinedRef.current = true;
    const timer = setTimeout(() => {
      handleJoinAudio(autoJoinMode === 'muted');
    }, autoJoinDelay);
    return () => clearTimeout(timer);
  }, [autoJoinMode, isAudioJoined, handleJoinAudio, autoJoinDelay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      vad.stopListening();
    };
  }, [vad]);

  return {
    isAudioJoined,
    isMuted,
    amplitude,
    speakingIds,
    joinAudio: handleJoinAudio,
    leaveAudio: handleLeaveAudio,
    toggleMute: handleToggleMute,
    isSpeaking: vad.isSpeaking,
  };
}
