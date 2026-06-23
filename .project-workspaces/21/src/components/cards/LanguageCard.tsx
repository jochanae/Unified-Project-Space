import React, { useState, useRef } from 'react';
import { Volume2, Pencil, Mic, Send, ChevronDown, Play, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SmartCard from './SmartCard';

interface LanguageCardProps {
  phrase: string;
  translation: string;
  lang: string;
  phonetic?: string;
  onTypeIt?: (typed: string) => void;
}

const LanguageCard: React.FC<LanguageCardProps> = ({ phrase, translation, lang, phonetic, onTypeIt }) => {
  const [tryOpen, setTryOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const playbackRef = useRef<HTMLAudioElement | null>(null);

  const handleSayIt = async () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      return;
    }
    // Clear previous recording when starting a new one
    if (recordingUrl) {
      URL.revokeObjectURL(recordingUrl);
      setRecordingUrl(null);
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Pick a mime type Safari supports (mp4) with webm as fallback
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordingUrl(url);
        setRecording(false);
      };

      recorder.start();
      setRecording(true);

      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 8000);
    } catch {
      setRecording(false);
    }
  };

  const handlePlayback = () => {
    if (!recordingUrl) return;
    const audio = new Audio(recordingUrl);
    playbackRef.current = audio;
    setPlaying(true);
    audio.onended = () => setPlaying(false);
    audio.play();
  };

  const speak = (rate: number) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    // Chrome PWA fix — speechSynthesis loses voices after cancel()
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.lang = lang || 'en-US';
      utterance.rate = rate;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }, 100);
  };

  const handleTypeSubmit = () => {
    if (!typed.trim() || !onTypeIt) return;
    onTypeIt(typed.trim());
    setSubmitted(true);
  };

  return (
    <SmartCard type="language">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-lg font-semibold text-foreground">{phrase}</p>
          <p className="text-sm text-muted-foreground/70 italic">{translation}</p>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 text-primary text-[10px] px-2 py-0.5 uppercase font-medium mt-1">
          {lang}
        </span>
      </div>

      {phonetic && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[13px] text-muted-foreground/60 font-mono tracking-wide">
            {phonetic}
          </span>
          <button
            onClick={() => speak(0.85)}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.08] hover:bg-white/[0.15] transition-colors text-muted-foreground/60 hover:text-foreground shrink-0"
            title="Hear pronunciation"
          >
            <Volume2 className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => speak(0.5)}
          className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium bg-white/[0.08] hover:bg-white/[0.15] transition-colors"
        >
          🐢 Slow
        </button>
        <button
          onClick={() => speak(0.85)}
          className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium bg-white/[0.08] hover:bg-white/[0.15] transition-colors"
        >
          <Volume2 className="h-3.5 w-3.5" /> Normal
        </button>
        <button
          onClick={() => setTryOpen(!tryOpen)}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
            tryOpen
              ? 'bg-primary/20 text-primary'
              : 'bg-white/[0.08] hover:bg-white/[0.15]'
          }`}
        >
          <Pencil className="h-3.5 w-3.5" /> Try it
          <ChevronDown className={`h-3 w-3 transition-transform ${tryOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Expandable Try It section */}
      <AnimatePresence>
        {tryOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-2.5">
              {/* Type it */}
              {!submitted ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={typed}
                      onChange={(e) => setTyped(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleTypeSubmit()}
                      placeholder={`Type: ${phrase}`}
                      className="w-full rounded-lg bg-white/[0.06] border border-white/[0.08] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 transition-colors"
                    />
                  </div>
                  <button
                    onClick={handleTypeSubmit}
                    disabled={!typed.trim()}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors disabled:opacity-30 disabled:cursor-default shrink-0"
                    title="Submit"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-primary/80">
                  <span>✓ Sent to chat — check below for feedback</span>
                </div>
              )}

              {/* Say it */}
              <button
                onClick={handleSayIt}
                className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  recording
                    ? 'bg-destructive/20 border-destructive/30 text-destructive animate-pulse'
                    : 'bg-white/[0.06] border-white/[0.08] hover:bg-white/[0.1]'
                }`}
              >
                <Mic className={`h-3.5 w-3.5 ${recording ? 'text-destructive' : 'text-primary'}`} />
                <span>{recording ? 'Tap to stop' : 'Say it'}</span>
                {!recording && !recordingUrl && <span className="text-muted-foreground/50 text-xs ml-1">— say it out loud</span>}
              </button>

              {/* Playback controls after recording */}
              {recordingUrl && !recording && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePlayback}
                    disabled={playing}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border bg-primary/10 border-primary/20 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>{playing ? 'Playing…' : 'Play it back'}</span>
                  </button>
                  <button
                    onClick={handleSayIt}
                    className="flex items-center justify-center gap-1.5 rounded-lg border bg-white/[0.06] border-white/[0.08] px-3 py-2 text-sm font-medium hover:bg-white/[0.1] transition-colors"
                    title="Try again"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </SmartCard>
  );
};

export default LanguageCard;
