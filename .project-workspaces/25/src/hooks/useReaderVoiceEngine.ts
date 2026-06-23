import { useEffect, useState } from "react";
import {
  DEFAULT_READER_VOICE_ENGINE,
  normalizeReaderVoiceEngine,
  type ReaderVoiceEngine,
} from "@/lib/readerVoiceEngine";

type ReaderVoiceEngineResponse = {
  engine?: unknown;
};

export function useReaderVoiceEngine() {
  const [engine, setEngine] = useState<ReaderVoiceEngine>(DEFAULT_READER_VOICE_ENGINE);

  useEffect(() => {
    let active = true;

    async function loadEngine() {
      try {
        const response = await fetch("/api/public/reader-voice-engine", { method: "GET" });
        if (!response.ok) return;
        const payload = (await response.json()) as ReaderVoiceEngineResponse;
        if (!active) return;
        setEngine(normalizeReaderVoiceEngine(payload.engine));
      } catch {
        /* keep default */
      }
    }

    void loadEngine();

    return () => {
      active = false;
    };
  }, []);

  return engine;
}
