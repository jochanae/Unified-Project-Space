import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseVADOptions {
  /** 0-100 — maps to volume threshold. Higher = picks up softer speech. Default 50 */
  sensitivityLevel?: number;
  /** Milliseconds of silence before auto-clipping. Default 800 */
  silenceDuration?: number;
  /** Max recording duration in seconds. Default 120 */
  maxDuration?: number;
  /** Called when a speech segment is auto-clipped */
  onSpeechEnd?: (blob: Blob) => void;
  /** Called with current RMS amplitude 0-1 on each analysis frame */
  onAmplitude?: (amplitude: number) => void;
  /** Called when speech onset is detected (for haptic feedback etc.) */
  onSpeechStart?: () => void;
}

export interface UseVADReturn {
  /** Whether VAD is actively monitoring the mic */
  isListening: boolean;
  /** Whether speech is currently detected */
  isSpeaking: boolean;
  /** Whether the user's mic is muted */
  isMuted: boolean;
  /** Start listening on the mic */
  startListening: () => Promise<void>;
  /** Stop listening entirely */
  stopListening: () => void;
  /** Toggle mute without stopping the stream */
  toggleMute: () => void;
  /** Current amplitude 0-1 */
  amplitude: number;
  /** The underlying MediaStream (for video orb, etc.) */
  stream: MediaStream | null;
}

export function useVAD({
  sensitivityLevel = 50,
  silenceDuration = 1500,
  maxDuration = 120,
  onSpeechEnd,
  onAmplitude,
  onSpeechStart,
}: UseVADOptions = {}): UseVADReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const silenceStartRef = useRef<number | null>(null);
  const speechActiveRef = useRef(false);
  const recordingStartRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  // Convert sensitivity (0-100) to threshold (1.0 → 0.0)
  // sensitivity=20 (noisy) → threshold=0.8 (only loud triggers)
  // sensitivity=80 (quiet) → threshold=0.2 (soft speech triggers)
  const threshold = 1.0 - sensitivityLevel / 100;
  // Map to a usable RMS range (typical speech RMS is 0.01-0.15)
  const rmsThreshold = 0.005 + threshold * 0.08;

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
        // Immediately reset so the analysis loop can trigger a new recording
        speechActiveRef.current = false;
        setIsSpeaking(false);
        silenceStartRef.current = null;
        // Force amplitude back to baseline so UI reflects idle
        setAmplitude(0);
        onAmplitude?.(0);
      };
      // No timeslice — produces a single complete webm on stop
      recorder.start();
      mediaRecorderRef.current = recorder;
      recordingStartRef.current = Date.now();
    } catch {
      // MediaRecorder not supported or stream ended
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

    // Calculate RMS
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / dataArray.length);
    setAmplitude(Math.min(rms * 10, 1)); // normalize for UI
    onAmplitude?.(Math.min(rms * 10, 1));

    const now = Date.now();

    if (rms > rmsThreshold) {
      // Speech detected
      silenceStartRef.current = null;
      if (!speechActiveRef.current) {
        speechActiveRef.current = true;
        setIsSpeaking(true);
        onSpeechStart?.();
        startRecording();
      }
    } else if (speechActiveRef.current) {
      // Below threshold — track silence
      if (silenceStartRef.current === null) {
        silenceStartRef.current = now;
      } else if (now - silenceStartRef.current > silenceDuration) {
        // Silence long enough → clip
        speechActiveRef.current = false;
        setIsSpeaking(false);
        silenceStartRef.current = null;
        stopRecording();
      }
    }

    // Max duration guard
    if (speechActiveRef.current && now - recordingStartRef.current > maxDuration * 1000) {
      speechActiveRef.current = false;
      setIsSpeaking(false);
      silenceStartRef.current = null;
      stopRecording();
    }

    rafRef.current = requestAnimationFrame(analyse);
  }, [rmsThreshold, silenceDuration, maxDuration, onAmplitude, onSpeechStart, startRecording, stopRecording]);

  const startListening = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = mediaStream;
      setStream(mediaStream);

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(mediaStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
      setIsListening(true);
      setIsMuted(false);

      // Start analysis loop
      rafRef.current = requestAnimationFrame(analyse);
    } catch {
      throw new Error('Microphone access denied');
    }
  }, [analyse]);

  const stopListening = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    stopRecording();
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setStream(null);
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
    setIsListening(false);
    setIsSpeaking(false);
    setIsMuted(false);
    setAmplitude(0);
    speechActiveRef.current = false;
    silenceStartRef.current = null;
  }, [stopRecording]);

  const toggleMute = useCallback(() => {
    if (!streamRef.current) return;
    const track = streamRef.current.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsMuted(!track.enabled);
      if (!track.enabled) {
        // When muting, stop any active recording
        if (speechActiveRef.current) {
          speechActiveRef.current = false;
          setIsSpeaking(false);
          stopRecording();
        }
      }
    }
  }, [stopRecording]);

  // Cleanup on unmount
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
    isListening,
    isSpeaking,
    isMuted,
    startListening,
    stopListening,
    toggleMute,
    amplitude,
    stream,
  };
}
