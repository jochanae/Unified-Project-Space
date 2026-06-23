import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Volume2, Check } from 'lucide-react';
import {
  getAvailableVoices,
  previewVoice,
  getSavedRate,
  getSavedPitch,
  setSavedRate,
  setSavedPitch,
} from '@/lib/readAloudVoice';

const STORAGE_KEY = 'readAloudVoiceURI';

export function getSavedVoiceURI(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

/** Format a voice lang code into a readable label like "EN-US", "ES-MX" */
function formatLocale(lang: string): string {
  return lang.replace(/-/g, '-').toUpperCase();
}

export default function ReadAloudVoicePicker() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedURI, setSelectedURI] = useState<string | null>(getSavedVoiceURI());
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [rate, setRate] = useState<number>(getSavedRate());
  const [pitch, setPitch] = useState<number>(getSavedPitch());

  useEffect(() => {
    getAvailableVoices().then(setVoices);
  }, []);

  const playSampleWithCurrent = useCallback(() => {
    const voice = voices.find(v => v.voiceURI === selectedURI) || voices.find(v => v.default) || voices[0];
    if (voice) previewVoice(voice);
  }, [voices, selectedURI]);

  const handleSelect = useCallback((voice: SpeechSynthesisVoice | null) => {
    if (!voice) {
      // "Auto" selected
      setSelectedURI(null);
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    setSelectedURI(voice.voiceURI);
    localStorage.setItem(STORAGE_KEY, voice.voiceURI);

    // Play preview
    setPreviewing(voice.voiceURI);
    previewVoice(voice);
    setTimeout(() => setPreviewing(null), 1500);
  }, []);

  const isAuto = selectedURI === null;

  return (
    <div className="border-t border-border/30 pt-4">
      <div className="flex items-center gap-1.5 mb-2">
        <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Read Aloud Voice</span>
      </div>
      <p className="text-[11px] text-muted-foreground/70 mb-3">
        Choose a voice for reading messages. "Auto" picks the best match for your companion.
      </p>

      {/* Auto option */}
      <button
        onClick={() => handleSelect(null)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-2 active:scale-[0.98] ${
          isAuto
            ? 'bg-primary/15 text-primary border border-primary/30'
            : 'bg-muted/40 text-muted-foreground border border-transparent hover:bg-muted/60'
        }`}
      >
        <span>🔄 Auto</span>
        {isAuto && <Check className="h-3.5 w-3.5" />}
      </button>

      {/* Voice list */}
      {voices.length > 0 && (
        <div className="max-h-40 overflow-y-auto rounded-xl border border-border/30 divide-y divide-border/20">
          {voices.map((voice) => {
            const isSelected = selectedURI === voice.voiceURI;
            const isPreviewing = previewing === voice.voiceURI;
            return (
              <button
                key={voice.voiceURI}
                onClick={() => handleSelect(voice)}
                className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                  isSelected
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted/40'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  {isPreviewing ? (
                    <Volume2 className="h-3 w-3 shrink-0 animate-pulse" />
                  ) : isSelected ? (
                    <Check className="h-3 w-3 shrink-0" />
                  ) : (
                    <span className="w-3" />
                  )}
                  <span className="truncate">{voice.name}</span>
                </span>
                <span className="text-[10px] text-muted-foreground/60 ml-2 shrink-0">
                  {formatLocale(voice.lang)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Rate & Pitch — Cinematic Luxury sliders */}
      <div className="mt-4 space-y-3 rounded-xl border border-[rgba(212,175,55,0.18)] bg-[rgba(10,10,12,0.4)] p-3">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] uppercase tracking-[0.12em] text-[rgba(212,175,55,0.75)]">
              Speed
            </label>
            <span className="text-[11px] text-muted-foreground tabular-nums">{rate.toFixed(2)}×</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={1.6}
            step={0.05}
            value={rate}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setRate(v);
              setSavedRate(v);
            }}
            onMouseUp={playSampleWithCurrent}
            onTouchEnd={playSampleWithCurrent}
            className="w-full accent-[rgb(212,175,55)]"
            aria-label="Reading speed"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] uppercase tracking-[0.12em] text-[rgba(212,175,55,0.75)]">
              Pitch
            </label>
            <span className="text-[11px] text-muted-foreground tabular-nums">{pitch.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={1.5}
            step={0.05}
            value={pitch}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setPitch(v);
              setSavedPitch(v);
            }}
            onMouseUp={playSampleWithCurrent}
            onTouchEnd={playSampleWithCurrent}
            className="w-full accent-[rgb(212,175,55)]"
            aria-label="Reading pitch"
          />
        </div>

        <button
          type="button"
          onClick={playSampleWithCurrent}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] uppercase tracking-[0.15em] text-[rgba(212,175,55,0.9)] border border-[rgba(212,175,55,0.3)] hover:bg-[rgba(212,175,55,0.08)] transition-colors"
        >
          <Volume2 className="h-3 w-3" />
          Preview
        </button>
      </div>
    </div>
  );
}
