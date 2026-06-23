import { useCallback, useEffect, useRef, useState } from "react";
import { getVoiceSettings, applyVoiceSettings } from "@/hooks/useVoiceSettings";

type NarratorStatus = "idle" | "loading" | "playing" | "paused";
type NarratorAvailability = "ready" | "unavailable";

function isSpeechSynthesisAvailable() {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof window.SpeechSynthesisUtterance !== "undefined"
  );
}

export function useSystemNarrator(
  verses: string[],
  options?: { aggressivePrefetch?: boolean; onVerseChange?: (verse: number) => void },
) {
  const [status, setStatus] = useState<NarratorStatus>("idle");
  const [availability, setAvailability] = useState<NarratorAvailability>("ready");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [voiceLabel] = useState("Neural2 ministerial voice");
  const [currentVerse, setCurrentVerse] = useState<number | null>(null);
  const [prefetchedVerses] = useState<Set<number>>(new Set());
  const [bufferingVerses] = useState<Set<number>>(new Set());
  const isAggressivePrefetchOverrideActive = Boolean(options?.aggressivePrefetch);

  const versesRef = useRef(verses);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const activeVerseRef = useRef<number | null>(null);
  const onVerseChangeRef = useRef(options?.onVerseChange);
  const requestIdRef = useRef(0);

  const versesSignature = verses.join("\u0001");

  const cancelCurrent = useCallback(() => {
    if (!isSpeechSynthesisAvailable()) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
  }, []);

  useEffect(() => {
    versesRef.current = verses;
  }, [versesSignature]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    onVerseChangeRef.current = options?.onVerseChange;
  }, [options?.onVerseChange]);

  useEffect(() => () => cancelCurrent(), [cancelCurrent]);

  const speakVerse = useCallback(
    (verse: number, requestId: number) => {
      if (!isSpeechSynthesisAvailable()) {
        setAvailability("unavailable");
        setErrorMessage("System native voice is unavailable on this device.");
        return;
      }

      const verseRows = versesRef.current;
      const safeVerse = Math.min(Math.max(1, verse), verseRows.length || 1);
      const text = (verseRows[safeVerse - 1] ?? "").replace(/\s+/g, " ").trim();
      if (!text) {
        setStatus("idle");
        setCurrentVerse(null);
        activeVerseRef.current = null;
        return;
      }

      cancelCurrent();
      setStatus("loading");
      setAvailability("ready");
      setErrorMessage(null);
      setCurrentVerse(safeVerse);
      activeVerseRef.current = safeVerse;
      onVerseChangeRef.current?.(safeVerse);

      const utterance = new SpeechSynthesisUtterance(text);
      applyVoiceSettings(utterance, getVoiceSettings());
      utteranceRef.current = utterance;

      utterance.onstart = () => {
        if (requestId !== requestIdRef.current) return;
        setStatus("playing");
      };

      utterance.onend = () => {
        if (requestId !== requestIdRef.current) return;
        const currentVerseValue = activeVerseRef.current;
        if (!currentVerseValue) {
          setStatus("idle");
          setCurrentVerse(null);
          return;
        }
        const nextVerse = currentVerseValue + 1;
        if (nextVerse > verseRows.length) {
          setStatus("idle");
          setCurrentVerse(null);
          activeVerseRef.current = null;
          return;
        }
        void speakVerse(nextVerse, requestId);
      };

      utterance.onerror = () => {
        if (requestId !== requestIdRef.current) return;
        setAvailability("unavailable");
        setErrorMessage("System native voice is temporarily unavailable.");
        setStatus("idle");
        setCurrentVerse(null);
        activeVerseRef.current = null;
      };

      window.speechSynthesis.speak(utterance);
    },
    [cancelCurrent],
  );

  const play = useCallback(
    async (fromVerse?: number) => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      void speakVerse(fromVerse ?? activeVerseRef.current ?? currentVerse ?? 1, requestId);
    },
    [currentVerse, speakVerse],
  );

  const pause = useCallback(() => {
    if (!isSpeechSynthesisAvailable()) return;
    window.speechSynthesis.pause();
    setStatus("paused");
  }, []);

  const resume = useCallback(async () => {
    if (!isSpeechSynthesisAvailable()) return;
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setStatus("playing");
      return;
    }
    await play(currentVerse ?? 1);
  }, [currentVerse, play]);

  const stop = useCallback(() => {
    requestIdRef.current += 1;
    cancelCurrent();
    setStatus("idle");
    setCurrentVerse(null);
    activeVerseRef.current = null;
  }, [cancelCurrent]);

  const skipNext = useCallback(async () => {
    const nextVerse = Math.min(
      versesRef.current.length,
      (activeVerseRef.current ?? currentVerse ?? 0) + 1,
    );
    await play(nextVerse || 1);
  }, [currentVerse, play]);

  const skipPrev = useCallback(async () => {
    const prevVerse = Math.max(1, (activeVerseRef.current ?? currentVerse ?? 1) - 1);
    await play(prevVerse);
  }, [currentVerse, play]);

  const jumpTo = useCallback(
    async (verse: number) => {
      await play(Math.max(1, verse));
    },
    [play],
  );

  useEffect(() => {
    stop();
  }, [versesSignature, stop]);

  return {
    status,
    currentVerse,
    voiceLabel,
    availability,
    errorMessage,
    prefetchedVerses,
    bufferingVerses,
    isAggressivePrefetchOverrideActive,
    play,
    pause,
    resume,
    stop,
    skipNext,
    skipPrev,
    jumpTo,
    isSupported: isSpeechSynthesisAvailable(),
  };
}
