import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getGoogleTTSAudio } from "@/lib/google-tts.functions";

type NarratorStatus = "idle" | "loading" | "playing" | "paused";

type NarratorTimepoint = {
  markName: string;
  timeSeconds: number;
};

type NarratorSegment = {
  startVerse: number;
  endVerse: number;
  ssml: string;
  cacheKey: string;
};

type CachedSegmentAudio = {
  url: string;
  voiceName: string;
  timepoints: NarratorTimepoint[];
};

type NarratorAvailability = "ready" | "unavailable";

type PrefetchConditions = {
  allowFullSegmentPrefetch: boolean;
  isAggressiveOverrideActive: boolean;
};

type BatteryNavigator = Navigator & {
  getBattery?: () => Promise<{ charging: boolean }>;
};

const SESSION_PREFIX = "sanctumiq:tts:segment:";
const VERSE_BREAK_MS = 800;
const MAX_SSML_CHARS = 4200;
const RETRY_DELAYS_MS = [700, 1500, 2800] as const;

function escapeXml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function decodeBase64ToBlobUrl(base64: string, mimeType: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
}

function buildSegments(verses: string[]) {
  const segments: NarratorSegment[] = [];
  let startVerse = 1;
  let verse = 1;
  let currentBody = "";

  for (const rawVerse of verses) {
    const verseText = rawVerse.replace(/\s+/g, " ").trim();
    const verseSsml = `<mark name="v${verse}"/>${escapeXml(verseText)}<break time="${VERSE_BREAK_MS}ms"/>`;

    if (currentBody && currentBody.length + verseSsml.length > MAX_SSML_CHARS) {
      const ssml = `<speak>${currentBody}</speak>`;
      segments.push({
        startVerse,
        endVerse: verse - 1,
        ssml,
        cacheKey: JSON.stringify({ startVerse, endVerse: verse - 1, text: ssml }),
      });
      currentBody = verseSsml;
      startVerse = verse;
    } else {
      currentBody += verseSsml;
    }

    verse += 1;
  }

  if (currentBody) {
    const ssml = `<speak>${currentBody}</speak>`;
    segments.push({
      startVerse,
      endVerse: verse - 1,
      ssml,
      cacheKey: JSON.stringify({ startVerse, endVerse: verse - 1, text: ssml }),
    });
  }

  return segments;
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
      timepoints?: NarratorTimepoint[];
    };
    if (!parsed.audioContent || !parsed.mimeType) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSessionCache(
  cacheKey: string,
  payload: {
    audioContent: string;
    mimeType: string;
    voiceName: string;
    timepoints: NarratorTimepoint[];
  },
) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(`${SESSION_PREFIX}${cacheKey}`, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

// PRE_ROLL_SECONDS: fire the verse highlight slightly before the audio
// arrives so the text scroll and the voice feel synchronised on screen.
// If the text still lags, raise this value (try 0.35). If it leads, lower it.
const PRE_ROLL_SECONDS = 0.25;

function getVerseFromTimepoints(
  timepoints: NarratorTimepoint[],
  currentTime: number,
  fallbackVerse: number,
) {
  let activeVerse = fallbackVerse;
  const lookaheadTime = currentTime + PRE_ROLL_SECONDS;

  for (const point of timepoints) {
    if (point.timeSeconds <= lookaheadTime && point.markName.startsWith("v")) {
      const nextVerse = Number(point.markName.slice(1));
      if (Number.isFinite(nextVerse)) activeVerse = nextVerse;
    }
  }

  return activeVerse;
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

async function getPrefetchConditions(aggressivePrefetch: boolean): Promise<PrefetchConditions> {
  if (typeof navigator === "undefined") {
    return {
      allowFullSegmentPrefetch: aggressivePrefetch,
      isAggressiveOverrideActive: aggressivePrefetch,
    };
  }

  const connection =
    (
      navigator as Navigator & {
        connection?: { effectiveType?: string; saveData?: boolean };
        mozConnection?: { effectiveType?: string; saveData?: boolean };
        webkitConnection?: { effectiveType?: string; saveData?: boolean };
      }
    ).connection ??
    (navigator as Navigator & { mozConnection?: { effectiveType?: string; saveData?: boolean } })
      .mozConnection ??
    (navigator as Navigator & { webkitConnection?: { effectiveType?: string; saveData?: boolean } })
      .webkitConnection;

  const onWifi = connection?.effectiveType === "4g" && !connection?.saveData;

  const batteryNavigator = navigator as BatteryNavigator;

  if (typeof batteryNavigator.getBattery !== "function") {
    return {
      allowFullSegmentPrefetch: aggressivePrefetch,
      isAggressiveOverrideActive: aggressivePrefetch,
    };
  }

  try {
    const battery = await batteryNavigator.getBattery();
    const wouldNormallyAllowFullSegmentPrefetch = onWifi && battery.charging;
    return {
      allowFullSegmentPrefetch: wouldNormallyAllowFullSegmentPrefetch || aggressivePrefetch,
      isAggressiveOverrideActive: aggressivePrefetch && !wouldNormallyAllowFullSegmentPrefetch,
    };
  } catch {
    return {
      allowFullSegmentPrefetch: aggressivePrefetch,
      isAggressiveOverrideActive: aggressivePrefetch,
    };
  }
}

export function useScriptureNarrator(
  verses: string[],
  options?: { aggressivePrefetch?: boolean; onVerseChange?: (verse: number) => void },
) {
  const [status, setStatus] = useState<NarratorStatus>("idle");
  const [currentVerse, setCurrentVerse] = useState<number | null>(null);
  const [voiceLabel] = useState("Neural2 ministerial voice");
  const [availability, setAvailability] = useState<NarratorAvailability>("ready");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [prefetchedVerses, setPrefetchedVerses] = useState<Set<number>>(new Set());
  const [bufferingVerses, setBufferingVerses] = useState<Set<number>>(new Set());
  const [isAggressivePrefetchOverrideActive, setIsAggressivePrefetchOverrideActive] =
    useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cacheRef = useRef<Map<string, CachedSegmentAudio>>(new Map());
  const pendingSegmentsRef = useRef<Set<string>>(new Set());
  const versesRef = useRef(verses);
  const requestIdRef = useRef(0);
  const currentVerseRef = useRef<number | null>(null);
  const currentSegmentIndexRef = useRef(0);
  const onVerseChangeRef = useRef(options?.onVerseChange);

  // Stable signature: only rebuild segments when verse content actually changes,
  // not when the parent passes a new array reference each render.
  const versesSignature = useMemo(() => verses.join("\u0001"), [verses]);
  const segments = useMemo(() => buildSegments(verses), [versesSignature]); // eslint-disable-line react-hooks/exhaustive-deps

  const ensureAudioElement = useCallback(() => {
    const audio = audioRef.current ?? new Audio();
    audioRef.current = audio;
    audio.preload = "auto";
    return audio;
  }, []);

  useEffect(() => {
    versesRef.current = verses;
  }, [verses]);

  useEffect(() => {
    currentVerseRef.current = currentVerse;
  }, [currentVerse]);

  useEffect(() => {
    onVerseChangeRef.current = options?.onVerseChange;
  }, [options?.onVerseChange]);

  const getSegmentAudio = useCallback(async (segment: NarratorSegment) => {
    const cached = cacheRef.current.get(segment.cacheKey);
    if (cached) return cached;

    const sessionCached = readSessionCache(segment.cacheKey);
    if (sessionCached) {
      const clip = {
        url: decodeBase64ToBlobUrl(
          sessionCached.audioContent ?? "",
          sessionCached.mimeType ?? "audio/mpeg",
        ),
        voiceName: sessionCached.voiceName ?? "en-US-Neural2-F",
        timepoints: sessionCached.timepoints ?? [],
      };
      cacheRef.current.set(segment.cacheKey, clip);
      setPrefetchedVerses((current) => {
        const next = new Set(current);
        for (let verse = segment.startVerse; verse <= segment.endVerse; verse += 1) next.add(verse);
        return next;
      });
      return clip;
    }

    if (!pendingSegmentsRef.current.has(segment.cacheKey)) {
      pendingSegmentsRef.current.add(segment.cacheKey);
      setBufferingVerses((current) => {
        const next = new Set(current);
        for (let verse = segment.startVerse; verse <= segment.endVerse; verse += 1) next.add(verse);
        return next;
      });
    }

    try {
      // Middleware (requireSupabaseAuth) throws raw Response objects on 401/500.
      // Catch them at the call site so they don't surface as "[object Response]"
      // unhandled rejections (blank screen). Convert to the same { ok: false }
      // shape the handler returns on graceful failures.
      const result = await retryWithBackoff(async () => {
        try {
          return await getGoogleTTSAudio({
            data: {
              ssml: segment.ssml,
              speakingRate: 0.95,
              pitch: -1.0,
              includeTimepoints: true,
            },
          });
        } catch (err) {
          if (err instanceof Response) {
            const message =
              err.status === 401
                ? "Sign in to use the premium voice."
                : `Premium voice request failed (${err.status}).`;
            return { ok: false as const, message };
          }
          // Any other error (network, server crash, etc.) — degrade gracefully
          // instead of throwing unhandled and causing a blank screen
          const message = err instanceof Error ? err.message : "Voice temporarily unavailable.";
          return { ok: false as const, message };
        }
      });

      if (!result.ok) {
        // Degrade to unavailable instead of throwing — shows error in AudioBar
        // without crashing the page
        setAvailability("unavailable");
        setErrorMessage(result.message ?? "Voice temporarily unavailable.");
        setStatus("idle");
        return;
      }

      writeSessionCache(segment.cacheKey, {
        audioContent: result.audioContent,
        mimeType: result.mimeType,
        voiceName: result.voiceName,
        timepoints: result.timepoints,
      });

      const clip = {
        url: decodeBase64ToBlobUrl(result.audioContent, result.mimeType),
        voiceName: result.voiceName,
        timepoints: result.timepoints,
      };

      cacheRef.current.set(segment.cacheKey, clip);
      setPrefetchedVerses((current) => {
        const next = new Set(current);
        for (let verse = segment.startVerse; verse <= segment.endVerse; verse += 1) next.add(verse);
        return next;
      });
      return clip;
    } finally {
      pendingSegmentsRef.current.delete(segment.cacheKey);
      setBufferingVerses((current) => {
        const next = new Set(current);
        for (let verse = segment.startVerse; verse <= segment.endVerse; verse += 1)
          next.delete(verse);
        return next;
      });
    }
  }, []);

  const prefetchAhead = useCallback(
    async (fromSegmentIndex: number) => {
      const upcoming: NarratorSegment[] = [];
      let coveredVerses = 0;

      for (
        let index = fromSegmentIndex + 1;
        index < segments.length && coveredVerses < 3;
        index += 1
      ) {
        const segment = segments[index];
        upcoming.push(segment);
        coveredVerses += segment.endVerse - segment.startVerse + 1;
      }

      const conditions = await getPrefetchConditions(Boolean(options?.aggressivePrefetch));
      setIsAggressivePrefetchOverrideActive(conditions.isAggressiveOverrideActive);
      const segmentsToPrefetch = conditions.allowFullSegmentPrefetch
        ? upcoming.slice(0, 1)
        : upcoming;

      segmentsToPrefetch.forEach((segment) => {
        void getSegmentAudio(segment).catch(() => {
          /* ignore prefetch failures */
        });
      });
    },
    [getSegmentAudio, options?.aggressivePrefetch, segments],
  );

  const stop = useCallback(() => {
    requestIdRef.current += 1;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.ontimeupdate = null;
      audioRef.current.onloadedmetadata = null;
    }
    currentSegmentIndexRef.current = 0;
    currentVerseRef.current = null;
    setStatus("idle");
    setCurrentVerse(null);
  }, []);

  const playSegment = useCallback(
    async (segmentIndex: number, startVerse?: number) => {
      const segment = segments[segmentIndex];
      if (!segment) {
        currentSegmentIndexRef.current = 0;
        currentVerseRef.current = null;
        setStatus("idle");
        setCurrentVerse(null);
        return;
      }

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      currentSegmentIndexRef.current = segmentIndex;
      const audio = ensureAudioElement();
      audio.pause();
      setStatus("loading");

      try {
        const clip = await getSegmentAudio(segment);
        if (requestId !== requestIdRef.current) return;
        if (!clip) return;
        setAvailability("ready");
        setErrorMessage(null);
        void prefetchAhead(segmentIndex);

        audio.src = clip.url;
        audio.pause();
        audio.currentTime = 0;

        const initialVerse = startVerse ?? segment.startVerse;
        const seekPoint =
          clip.timepoints.find((point: NarratorTimepoint) => point.markName === `v${initialVerse}`)
            ?.timeSeconds ?? 0;
        currentVerseRef.current = initialVerse;
        setCurrentVerse(initialVerse);
        onVerseChangeRef.current?.(initialVerse);

        audio.ontimeupdate = () => {
          const nextVerse = getVerseFromTimepoints(
            clip.timepoints,
            audio.currentTime,
            currentVerseRef.current ?? initialVerse,
          );
          if (nextVerse !== currentVerseRef.current) {
            currentVerseRef.current = nextVerse;
            setCurrentVerse(nextVerse);
            onVerseChangeRef.current?.(nextVerse);
          }
        };

        audio.onended = () => {
          if (requestId !== requestIdRef.current) return;
          const nextSegmentIndex = segmentIndex + 1;
          if (nextSegmentIndex >= segments.length) {
            currentSegmentIndexRef.current = 0;
            currentVerseRef.current = null;
            setStatus("idle");
            setCurrentVerse(null);
            return;
          }
          void playSegment(nextSegmentIndex, segments[nextSegmentIndex].startVerse);
        };

        audio.onerror = () => {
          if (requestId === requestIdRef.current) {
            setAvailability("unavailable");
            setErrorMessage(
              "Premium voice is temporarily unavailable. Text-only reading is still available.",
            );
            setStatus("idle");
            setCurrentVerse(null);
          }
        };

        audio.onloadedmetadata = () => {
          audio.currentTime = seekPoint;
          void audio
            .play()
            .then(() => {
              if (requestId === requestIdRef.current) {
                setStatus("playing");
              }
            })
            .catch(() => {
              if (requestId === requestIdRef.current) {
                setAvailability("unavailable");
                setErrorMessage(
                  "Premium voice is temporarily unavailable. Text-only reading is still available.",
                );
                setStatus("idle");
                setCurrentVerse(null);
              }
            });
        };

        audio.load();
      } catch (error) {
        console.error("Narrator playback failed:", error);
        if (requestId === requestIdRef.current) {
          setAvailability("unavailable");
          setErrorMessage(
            "Premium voice is temporarily unavailable. Text-only reading is still available.",
          );
          setStatus("idle");
          setCurrentVerse(null);
        }
      }
    },
    [ensureAudioElement, getSegmentAudio, prefetchAhead, segments],
  );

  const play = useCallback(
    async (fromVerse?: number) => {
      const targetVerse = fromVerse ?? currentVerseRef.current ?? 1;
      const segmentIndex = segments.findIndex(
        (segment) => targetVerse >= segment.startVerse && targetVerse <= segment.endVerse,
      );
      await playSegment(segmentIndex === -1 ? 0 : segmentIndex, targetVerse);
    },
    [playSegment, segments],
  );

  const pause = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setStatus("paused");
  }, []);

  const resume = useCallback(async () => {
    const audio = audioRef.current;
    if (audio?.src && audio.paused) {
      await audio.play();
      setStatus("playing");
      return;
    }

    await play(currentVerseRef.current ?? 1);
  }, [play]);

  const skipNext = useCallback(async () => {
    const nextVerse = Math.min(versesRef.current.length, (currentVerseRef.current ?? 0) + 1);
    await play(nextVerse || 1);
  }, [play]);

  const skipPrev = useCallback(async () => {
    const prevVerse = Math.max(1, (currentVerseRef.current ?? 1) - 1);
    await play(prevVerse);
  }, [play]);

  const jumpTo = useCallback(
    async (verse: number) => {
      await play(Math.max(1, verse));
    },
    [play],
  );

  useEffect(() => {
    stop();
    setPrefetchedVerses(new Set());
    setBufferingVerses(new Set());
    setIsAggressivePrefetchOverrideActive(false);
    pendingSegmentsRef.current.clear();
  }, [segments, stop]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current.ontimeupdate = null;
        audioRef.current.onloadedmetadata = null;
      }
      cacheRef.current.forEach((clip) => URL.revokeObjectURL(clip.url));
      cacheRef.current.clear();
    };
  }, []);

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
    isSupported: typeof Audio !== "undefined",
  };
}
