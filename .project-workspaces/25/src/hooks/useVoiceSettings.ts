/**
 * useVoiceSettings
 *
 * Persists and retrieves Web Speech (system-native) voice preferences.
 * Settings are stored in localStorage and applied when the narrator plays.
 */

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "sanctumiq:voice:settings";

export type VoiceSettings = {
  rate: number; // 0.5 – 1.2, default 0.82
  pitch: number; // 0.7 – 1.2, default 0.95
  voiceURI: string; // SpeechSynthesisVoice.voiceURI, empty = browser default
};

const DEFAULTS: VoiceSettings = {
  rate: 0.82,
  pitch: 0.95,
  voiceURI: "",
};

function load(): VoiceSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<VoiceSettings>;
    return {
      rate: typeof parsed.rate === "number" ? parsed.rate : DEFAULTS.rate,
      pitch: typeof parsed.pitch === "number" ? parsed.pitch : DEFAULTS.pitch,
      voiceURI: typeof parsed.voiceURI === "string" ? parsed.voiceURI : DEFAULTS.voiceURI,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(settings: VoiceSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* noop */
  }
}

export function useVoiceSettings() {
  const [settings, setSettings] = useState<VoiceSettings>(load);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Load available voices — needed because getVoices() is async on some browsers
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const load = () => {
      const available = window.speechSynthesis.getVoices();
      if (available.length > 0) setVoices(available);
    };

    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  const update = useCallback((patch: Partial<VoiceSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      save(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    save(DEFAULTS);
    setSettings({ ...DEFAULTS });
  }, []);

  // Get the selected voice object
  const selectedVoice = voices.find((v) => v.voiceURI === settings.voiceURI) ?? null;

  // Best voices ranked by quality (prefer neural/enhanced/premium)
  const rankedVoices = [...voices].sort((a, b) => {
    const quality = (v: SpeechSynthesisVoice) => {
      const name = v.name.toLowerCase();
      if (name.includes("neural") || name.includes("enhanced") || name.includes("premium"))
        return 2;
      if (name.includes("google") || name.includes("microsoft")) return 1;
      return 0;
    };
    return quality(b) - quality(a);
  });

  return {
    settings,
    update,
    reset,
    voices: rankedVoices,
    selectedVoice,
  };
}

/** Apply stored voice settings to a SpeechSynthesisUtterance. */
export function applyVoiceSettings(utterance: SpeechSynthesisUtterance, settings: VoiceSettings) {
  utterance.rate = settings.rate;
  utterance.pitch = settings.pitch;

  if (settings.voiceURI) {
    const voice = window.speechSynthesis.getVoices().find((v) => v.voiceURI === settings.voiceURI);
    if (voice) utterance.voice = voice;
  }
}

/** Read settings directly from localStorage (for use outside React). */
export function getVoiceSettings(): VoiceSettings {
  return load();
}
