import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface UseSpatialAudioOptions {
  micSensitivity?: number;
  localParticipantId?: string;
  autoStart?: boolean;
  autoStartMuted?: boolean;
  silenceDuration?: number;
  onSpeechEnd?: (blob: Blob) => void;
  onSpeechStart?: () => void;
}

export function useSpatialAudio({
  micSensitivity = 50,
  localParticipantId,
  autoStart = false,
  autoStartMuted = false,
  silenceDuration = 1500,
  onSpeechEnd,
  onSpeechStart,
}: UseSpatialAudioOptions = {}) {
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [localAmplitude, setLocalAmplitude] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingPeerIds, setSpeakingPeerIds] = useState<string[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const speechActiveRef = useRef(false);
  const silenceStartRef = useRef<number | null>(null);
  const recordingStartRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const autoStartedRef = useRef(false);

  const threshold = 1.0 - micSensitivity / 100;
  const rmsThreshold = 0.005 + threshold * 0.08;
  const maxDuration = 120;

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    try {
      const recorder = new MediaRecorder(streamRef.current, { mimeType: 'audio/webm;codecs=opus' });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const elapsed = Date.now() - recordingStartRef.current;
        if (chunksRef.current.length > 0 && elapsed > 500) {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
          onSpeechEnd?.(blob);
        }
        chunksRef.current = [];
        speechActiveRef.current = false;
        setIsSpeaking(false);
        silenceStartRef.current = null;
        setLocalAmplitude(0);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      recordingStartRef.current = Date.now();
    } catch {
      speechActiveRef.current = false;
      silenceStartRef.current = null;
    }
  }, [onSpeechEnd]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
  }, []);

  const analyse = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const dataArray = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / dataArray.length);
    const normalizedAmplitude = Math.min(rms * 10, 1);
    setLocalAmplitude(normalizedAmplitude);

    const now = Date.now();

    if (rms > rmsThreshold) {
      silenceStartRef.current = null;
      if (!speechActiveRef.current) {
        speechActiveRef.current = true;
        setIsSpeaking(true);
        onSpeechStart?.();
        startRecording();
      }
    } else if (speechActiveRef.current) {
      if (silenceStartRef.current === null) {
        silenceStartRef.current = now;
      } else if (now - silenceStartRef.current > silenceDuration) {
        speechActiveRef.current = false;
        setIsSpeaking(false);
        silenceStartRef.current = null;
        stopRecording();
      }
    }

    if (speechActiveRef.current && now - recordingStartRef.current > maxDuration * 1000) {
      speechActiveRef.current = false;
      setIsSpeaking(false);
      silenceStartRef.current = null;
      stopRecording();
    }

    rafRef.current = requestAnimationFrame(analyse);
  }, [rmsThreshold, silenceDuration, onSpeechStart, startRecording, stopRecording]);

  const startAudio = useCallback(async (startMuted = false) => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = mediaStream;
      setLocalStream(mediaStream);

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(mediaStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
      setIsActive(true);

      if (startMuted) {
        const track = mediaStream.getAudioTracks()[0];
        if (track) track.enabled = false;
        setIsMuted(true);
      } else {
        setIsMuted(false);
      }

      rafRef.current = requestAnimationFrame(analyse);
    } catch {
      toast.error('Microphone access denied');
      throw new Error('Microphone access denied');
    }
  }, [analyse]);

  const stopAudio = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    stopRecording();
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setLocalStream(null);
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
    setIsActive(false);
    setIsSpeaking(false);
    setIsMuted(false);
    setLocalAmplitude(0);
    speechActiveRef.current = false;
    silenceStartRef.current = null;
  }, [stopRecording]);

  const toggleMute = useCallback(() => {
    if (!isActive) {
      startAudio(false);
      return;
    }
    if (!streamRef.current) return;
    const track = streamRef.current.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsMuted(!track.enabled);
      if (!track.enabled) {
        if (speechActiveRef.current) {
          speechActiveRef.current = false;
          setIsSpeaking(false);
          stopRecording();
        }
      }
    }
  }, [isActive, startAudio, stopRecording]);

  useEffect(() => {
    if (!localParticipantId) return;
    if (isSpeaking) {
      setSpeakingPeerIds(prev => prev.includes(localParticipantId) ? prev : [...prev, localParticipantId]);
    } else {
      setSpeakingPeerIds(prev => prev.filter(pid => pid !== localParticipantId));
    }
  }, [isSpeaking, localParticipantId]);

  useEffect(() => {
    if (autoStartedRef.current || !autoStart || isActive) return;
    autoStartedRef.current = true;
    const timer = setTimeout(() => {
      startAudio(autoStartMuted).catch(() => {});
    }, 800);
    return () => clearTimeout(timer);
  }, [autoStart, autoStartMuted, isActive, startAudio]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach(t => t.stop());
      audioCtxRef.current?.close();
    };
  }, []);

  return {
    isActive,
    isMuted,
    localAmplitude,
    isSpeaking,
    speakingPeerIds,
    setSpeakingPeerIds,
    localStream,
    startAudio,
    stopAudio,
    toggleMute,
  };
}
