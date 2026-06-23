import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface AudioRecorderProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

const getSpeechRecognition = (): any => {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
};

const BAR_COUNT = 28;

const normalizeTranscript = (value: string) => value.replace(/\s+/g, ' ').trim();

const wordCount = (value: string) => {
  const normalized = normalizeTranscript(value);
  return normalized ? normalized.split(' ').length : 0;
};

export default function AudioRecorder({ onTranscript, disabled }: AudioRecorderProps) {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [bars, setBars] = useState<number[]>(() => Array(BAR_COUNT).fill(0.08));

  const recognitionRef = useRef<any>(null);
  const finalTextRef = useRef('');
  const sessionFinalTextRef = useRef('');
  const displayedTextRef = useRef('');
  const shouldKeepListeningRef = useRef(false);
  const isListeningRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);

  // Web Audio for live waveform
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number | null>(null);

  const SpeechRecognition = getSpeechRecognition();
  const supported = !!SpeechRecognition;

  const teardownAudio = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (restartTimerRef.current) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    mediaRecorderRef.current = null;
    try { sourceRef.current?.disconnect(); } catch {}
    sourceRef.current = null;
    analyserRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => { try { t.stop(); } catch {} });
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch {}
      audioCtxRef.current = null;
    }
    setBars(Array(BAR_COUNT).fill(0.08));
  }, []);

  const publishTranscript = useCallback((text: string, force = false) => {
    const normalized = normalizeTranscript(text);
    if (!normalized) return;

    const current = displayedTextRef.current;
    const currentWords = wordCount(current);
    const nextWords = wordCount(normalized);
    const isClearImprovement = nextWords > currentWords || normalized.length > current.length + 4;

    if (force || !current || isClearImprovement || normalized.toLowerCase().startsWith(current.toLowerCase())) {
      displayedTextRef.current = normalized;
      onTranscript(normalized);
    }
  }, [onTranscript]);

  const transcribeWithBackend = useCallback(async (blob: Blob) => {
    if (blob.size < 1024) return;

    setIsTranscribing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const formData = new FormData();
      formData.append('audio', blob, 'dictation.webm');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-audio`, {
        method: 'POST',
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        logger.warn('[AudioRecorder] backend transcription failed', response.status);
        return;
      }

      const data = await response.json();
      const text = typeof data?.text === 'string' ? data.text.trim() : '';
      if (text) {
        finalTextRef.current = text;
        publishTranscript(text);
      }
    } catch (err) {
      logger.warn('[AudioRecorder] backend transcription unavailable', err);
    } finally {
      setIsTranscribing(false);
    }
  }, [publishTranscript]);

  const startWaveform = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
        chunksRef.current = [];
        void transcribeWithBackend(blob);
      };
      try { recorder.start(); } catch { mediaRecorderRef.current = null; }

      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new Ctx();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      sourceRef.current = source;
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(data);
        // Map FFT bins onto BAR_COUNT visual bars
        const next: number[] = new Array(BAR_COUNT);
        const step = data.length / BAR_COUNT;
        for (let i = 0; i < BAR_COUNT; i++) {
          const start = Math.floor(i * step);
          const end = Math.floor((i + 1) * step);
          let sum = 0;
          for (let j = start; j < end; j++) sum += data[j];
          const avg = sum / Math.max(1, end - start);
          // Normalize 0..1 with a soft floor so bars are always visibly alive
          next[i] = Math.max(0.08, Math.min(1, avg / 180));
        }
        setBars(next);
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (err) {
      // Mic blocked or unavailable — waveform stays flat, recognition may still fail gracefully
      logger.warn('[AudioRecorder] mic/waveform unavailable:', err);
    }
  }, [transcribeWithBackend]);

  const stop = useCallback(() => {
    shouldKeepListeningRef.current = false;
    isListeningRef.current = false;
    if (restartTimerRef.current) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    teardownAudio();
    setIsListening(false);
    setInterimText('');
  }, [teardownAudio]);

  const start = useCallback(() => {
    if (!supported || disabled) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'en-US';
      finalTextRef.current = '';
      sessionFinalTextRef.current = '';
      displayedTextRef.current = '';
      shouldKeepListeningRef.current = true;

      recognition.onresult = (event: any) => {
        let interim = '';
        let sessionFinal = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) sessionFinal += ` ${transcript}`;
          else interim += transcript;
        }
        if (sessionFinal) {
          sessionFinalTextRef.current = normalizeTranscript(`${sessionFinalTextRef.current} ${sessionFinal}`);
          finalTextRef.current = sessionFinalTextRef.current;
        }
        // Always push the live combined transcript to the input field so the user
        // sees their words appear in real time (matches native dictation UX).
        const combined = (finalTextRef.current + ' ' + interim).trim();
        logger.log('[AudioRecorder] onresult', { interim, final: sessionFinal, combined });
        if (combined) {
          publishTranscript(combined, true);
        }
        setInterimText(interim);
      };

      recognition.onerror = (e: any) => {
        logger.warn('[AudioRecorder] recognition error', e?.error || e);
        if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') {
          stop();
          return;
        }
        setInterimText('');
      };

      recognition.onend = () => {
        if (finalTextRef.current.trim()) {
          publishTranscript(finalTextRef.current.trim());
        }
        if (shouldKeepListeningRef.current && isListeningRef.current) {
          restartTimerRef.current = window.setTimeout(() => {
            try {
              recognition.start();
            } catch (err) {
              logger.warn('[AudioRecorder] recognition restart blocked', err);
            }
          }, 300);
          return;
        }
        isListeningRef.current = false;
        teardownAudio();
        setIsListening(false);
        setInterimText('');
      };

      recognition.onaudiostart = () => logger.log('[AudioRecorder] audiostart');
      recognition.onspeechstart = () => logger.log('[AudioRecorder] speechstart');
      recognition.onspeechend = () => {
        logger.log('[AudioRecorder] speechend');
      };

      recognitionRef.current = recognition;
      recognition.start();
      isListeningRef.current = true;
      setIsListening(true);
      logger.log('[AudioRecorder] recognition.start() called, lang=', recognition.lang);
      // Start waveform AFTER a short delay so recognition gets the mic first.
      // On Android Chrome, opening a parallel getUserMedia at the exact same
      // moment as recognition.start() can cause recognition to silently produce
      // no results. Delaying avoids the race.
      setTimeout(() => {
        if (isListeningRef.current) void startWaveform();
      }, 250);
    } catch (err) {
      logger.warn('[AudioRecorder] start failed', err);
      isListeningRef.current = false;
      teardownAudio();
      setIsListening(false);
    }
  }, [SpeechRecognition, supported, disabled, publishTranscript, startWaveform, teardownAudio, stop]);

  useEffect(() => {
    const input = document.querySelector('[data-chat-input]');
    if (!input) return;

    const releaseForNativeDictation = () => {
      if (isListeningRef.current) stop();
    };

    input.addEventListener('focus', releaseForNativeDictation);
    input.addEventListener('touchstart', releaseForNativeDictation, { passive: true });
    return () => {
      input.removeEventListener('focus', releaseForNativeDictation);
      input.removeEventListener('touchstart', releaseForNativeDictation);
    };
  }, [stop]);

  useEffect(() => () => { stop(); }, [stop]);

  return (
    <div className="relative flex items-center gap-2">
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            className="flex items-center gap-2 overflow-hidden"
          >
            {/* Live waveform — Whisper Gold bars on Obsidian */}
            <div
              className="flex items-end gap-[2px] h-7 px-2 rounded-full bg-[rgba(10,10,12,0.85)] border border-[rgba(212,175,55,0.25)]"
              aria-hidden="true"
            >
              {bars.map((v, i) => (
                <span
                  key={i}
                  className="w-[2px] rounded-full"
                  style={{
                    height: `${Math.max(10, v * 100)}%`,
                    background: 'linear-gradient(180deg, rgba(245,215,140,0.95), rgba(212,175,55,0.6))',
                    boxShadow: v > 0.4 ? '0 0 4px rgba(212,175,55,0.55)' : 'none',
                    transition: 'height 60ms linear',
                  }}
                />
              ))}
            </div>
            {(interimText || isTranscribing) && (
              <span className="max-w-[140px] truncate text-xs text-[rgba(212,175,55,0.85)] italic">
                {interimText || 'Listening…'}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        data-mic-button={true}
        onClick={isListening ? stop : start}
        disabled={disabled || !supported}
        aria-label={isListening ? 'Stop dictation' : 'Start dictation'}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-all active:scale-95 disabled:opacity-40 ${
          isListening
            ? 'border-[rgba(212,175,55,0.6)] bg-[rgba(10,10,12,0.9)] text-[rgba(245,215,140,0.95)] shadow-[0_0_12px_rgba(212,175,55,0.35)]'
            : 'border-border/60 bg-background text-muted-foreground hover:bg-secondary hover:text-primary'
        }`}
        title={supported ? (isListening ? 'Stop dictation' : 'Start dictation') : 'Speech recognition is not supported in this browser'}
      >
        {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </button>
    </div>
  );
}
