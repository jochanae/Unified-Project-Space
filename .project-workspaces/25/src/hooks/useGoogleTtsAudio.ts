import { useCallback, useEffect, useRef, useState } from "react";
import { getGoogleTTSAudio } from "@/lib/google-tts.functions";
import type { ReaderVoiceEngine } from "@/lib/readerVoiceEngine";
import { applyVoiceSettings, getVoiceSettings } from "@/hooks/useVoiceSettings";

export type GoogleTtsStatus = "idle" | "loading" | "playing" | "error";
export type GoogleTtsAvailability = "ready" | "unavailable";

type CachedClip = {
  url: string;
  voiceName: string;
};

type PlayOptions = {
  speakingRate?: number;
  pitch?: number;
};

type UseGoogleTtsAudioOptions = {
  engine?: ReaderVoiceEngine;
};

const SESSION_PREFIX = "sanctumiq:tts:clip:";
const RETRY_DELAYS_MS = [700, 1500, 2800] as const;

function decodeBase64ToBlobUrl(base64: string, mimeType: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
}

function formatVoiceLabel(engine?: string) {
  if (engine === "system-native") {
    return "Device voice narration";
  }
  return "Neural2 ministerial voice";
}

function getCacheKey(text: string, options: PlayOptions) {
  return JSON.stringify({
    text,
    speakingRate: options.speakingRate ?? 0.95,
    pitch: options.pitch ?? -1.0,
  });
}

async function wait(delayMs: number) {
  await new Promise((resolve) => window.setTimeout(resolve, delayMs));
}

async function retryWithBackoff<T>(task: () => Promise<T>) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt === RETRY_DELAYS_MS.length) break;
      await wait(RETRY_DELAYS_MS[attempt]);
    }
  }

  throw lastError;
}

function readSessionCache(cacheKey: string) {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(`${SESSION_PREFIX}${cacheKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      audioContent?: string;
      mimeType?: string;
      voiceName?: string;
    };
    if (!parsed.audioContent || !parsed.mimeType) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSessionCache(
  cacheKey: string,
  payload: { audioContent: string; mimeType: string; voiceName: string },
) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(`${SESSION_PREFIX}${cacheKey}`, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

function isSystemNativeSupported() {
  if (typeof window === "undefined") return false;
  return "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

export function useGoogleTtsAudio(options?: UseGoogleTtsAudioOptions) {
  const engine = options?.engine ?? "google";
  const isSystemNative = engine === "system-native";
  const [status, setStatus] = useState<GoogleTtsStatus>("idle");
  const voiceLabel = formatVoiceLabel(engine);
  const [availability, setAvailability] = useState<GoogleTtsAvailability>("ready");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const requestIdRef = useRef(0);
  const cacheRef = useRef<Map<string, CachedClip>>(new Map());

  const getAudio = useCallback(async (text: string, options: PlayOptions = {}) => {
    const cacheKey = getCacheKey(text, options);
    const cached = cacheRef.current.get(cacheKey);
    if (cached) return cached;

    const sessionCached = readSessionCache(cacheKey);
    if (sessionCached) {
      const clip = {
        url: decodeBase64ToBlobUrl(
          sessionCached.audioContent ?? "",
          sessionCached.mimeType ?? "audio/mpeg",
        ),
        voiceName: sessionCached.voiceName ?? "en-US-Neural2-F",
      };
      cacheRef.current.set(cacheKey, clip);
      return clip;
    }

    const invoke = async () => {
      try {
        return await getGoogleTTSAudio({
          data: {
            text,
            speakingRate: options.speakingRate,
            pitch: options.pitch,
          },
        });
      } catch (error) {
        // Server middleware (e.g. requireSupabaseAuth) throws raw Response
        // objects, which surface as "[object Response]" blank-screen errors
        // if left unhandled. Convert to a typed failure result instead.
        if (error instanceof Response) {
          const message =
            error.status === 401
              ? "Sign in again to use the premium voice."
              : `Premium voice request failed (${error.status}).`;
          return { ok: false as const, message };
        }
        throw error;
      }
    };

    const result = await retryWithBackoff(invoke);

    if (!result.ok) {
      throw new Error(result.message);
    }

    writeSessionCache(cacheKey, {
      audioContent: result.audioContent,
      mimeType: result.mimeType,
      voiceName: result.voiceName,
    });

    const clip = {
      url: decodeBase64ToBlobUrl(result.audioContent, result.mimeType),
      voiceName: result.voiceName,
    };

    cacheRef.current.set(cacheKey, clip);
    return clip;
  }, []);

  const stop = useCallback(() => {
    requestIdRef.current += 1;
    if (isSystemNative) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setStatus("idle");
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
    }
    setStatus("idle");
  }, [isSystemNative]);

  const playText = useCallback(
    async (text: string, options: PlayOptions = {}) => {
      const normalized = text.replace(/\s+/g, " ").trim();
      if (!normalized) return;

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      setStatus("loading");

      if (isSystemNative) {
        if (!isSystemNativeSupported()) {
          setAvailability("unavailable");
          setErrorMessage("System native voice is unavailable. Selah will be text-only for now.");
          setStatus("error");
          return;
        }

        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(normalized);
          const voiceSettings = getVoiceSettings();
          applyVoiceSettings(utterance, voiceSettings);
          // Allow caller to override pitch if explicitly provided
          if (options.pitch !== undefined) utterance.pitch = options.pitch;

          utterance.onstart = () => {
            if (requestId !== requestIdRef.current) return;
            setAvailability("ready");
            setErrorMessage(null);
            setStatus("playing");
          };

          utterance.onend = () => {
            if (requestId === requestIdRef.current) {
              setStatus("idle");
            }
          };

          utterance.onerror = () => {
            if (requestId === requestIdRef.current) {
              setAvailability("unavailable");
              setErrorMessage(
                "System native voice is temporarily unavailable. Selah will be text-only for now.",
              );
              setStatus("error");
            }
          };

          window.speechSynthesis.speak(utterance);
        } catch (error) {
          console.error("System native TTS playback failed:", error);
          if (requestId === requestIdRef.current) {
            setAvailability("unavailable");
            setErrorMessage(
              "System native voice is temporarily unavailable. Selah will be text-only for now.",
            );
            setStatus("error");
          }
        }

        return;
      }

      try {
        const clip = await getAudio(normalized, options);
        if (requestId !== requestIdRef.current) return;
        setAvailability("ready");
        setErrorMessage(null);

        const audio = audioRef.current ?? new Audio();
        audioRef.current = audio;
        audio.src = clip.url;
        audio.currentTime = 0;
        audio.onended = () => {
          if (requestId === requestIdRef.current) {
            setStatus("idle");
          }
        };
        audio.onerror = () => {
          if (requestId === requestIdRef.current) {
            setStatus("error");
          }
        };

        await audio.play();
        if (requestId === requestIdRef.current) {
          setStatus("playing");
        }
      } catch (error) {
        console.error("Google TTS playback failed:", error);
        if (requestId === requestIdRef.current) {
          setAvailability("unavailable");
          setErrorMessage(
            "Premium voice is temporarily unavailable. Selah will be text-only for now.",
          );
          setStatus("error");
        }
      }
    },
    [getAudio, isSystemNative],
  );

  useEffect(() => {
    const cache = cacheRef.current;
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
      }
      cache.forEach((clip) => URL.revokeObjectURL(clip.url));
      cache.clear();
    };
  }, []);

  return {
    status,
    voiceLabel,
    availability,
    errorMessage,
    playText,
    stop,
  };
}
