import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GoogleTtsRequestSchema = z
  .object({
    text: z.string().trim().min(1).max(5000).optional(),
    ssml: z.string().trim().min(1).max(12000).optional(),
    speakingRate: z.number().min(0.85).max(1.05).optional(),
    pitch: z.number().min(-5).max(5).optional(),
    includeTimepoints: z.boolean().optional(),
  })
  .refine((value) => Boolean(value.text || value.ssml), {
    message: "text or ssml is required",
    path: ["text"],
  });

const GOOGLE_TTS_ENDPOINT = "https://texttospeech.googleapis.com/v1beta1/text:synthesize";
const DEFAULT_VOICE = "en-US-Neural2-F";
const DEFAULT_RATE = 0.95;
const DEFAULT_PITCH = -1.0;

async function logGoogleTtsDiagnostic(entry: {
  message: string;
  stackTrace?: string;
  metadata: Record<string, unknown>;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabaseAdmin as any).from("app_error_logs").insert({
    message: entry.message,
    source: "google-tts",
    route: "/reader",
    stack_trace: entry.stackTrace ?? null,
    metadata: entry.metadata,
  });

  if (error) {
    console.error("Could not write Google TTS diagnostic", error.message);
  }
}

type GoogleTtsSuccess = {
  ok: true;
  audioContent: string;
  mimeType: string;
  voiceName: string;
  timepoints: { markName: string; timeSeconds: number }[];
};

type GoogleTtsFailure = {
  ok: false;
  message: string;
};

type GoogleTtsResult = GoogleTtsSuccess | GoogleTtsFailure;

async function synthesizeGoogleTts(
  data: z.infer<typeof GoogleTtsRequestSchema>,
): Promise<GoogleTtsResult> {
  const apiKey = process.env.GOOGLE_CLOUD_TTS_API_KEY;

  if (!apiKey) {
    return {
      ok: false as const,
      message: "Premium voice is not configured.",
    };
  }

  try {
    console.info("Google TTS request starting", {
      hasSsml: Boolean(data.ssml),
      textLength: data.text?.length ?? 0,
      ssmlLength: data.ssml?.length ?? 0,
      includeTimepoints: Boolean(data.includeTimepoints),
      voiceName: DEFAULT_VOICE,
    });

    const response = await fetch(`${GOOGLE_TTS_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: data.ssml ? { ssml: data.ssml } : { text: data.text },
        voice: {
          languageCode: "en-US",
          name: DEFAULT_VOICE,
        },
        audioConfig: {
          audioEncoding: "MP3",
          speakingRate: data.speakingRate ?? DEFAULT_RATE,
          pitch: data.pitch ?? DEFAULT_PITCH,
          volumeGainDb: 0,
        },
        ...(data.includeTimepoints ? { enableTimePointing: ["SSML_MARK"] } : {}),
      }),
    });

    console.info("Google TTS response received", {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      voiceName: DEFAULT_VOICE,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google TTS failed:", errorText);
      await logGoogleTtsDiagnostic({
        message: "Google TTS request failed",
        metadata: {
          voiceName: DEFAULT_VOICE,
          status: response.status,
          statusText: response.statusText,
          hasSsml: Boolean(data.ssml),
          textLength: data.text?.length ?? 0,
          ssmlLength: data.ssml?.length ?? 0,
          includeTimepoints: Boolean(data.includeTimepoints),
          providerError: errorText.slice(0, 4000),
        },
      });
      return {
        ok: false as const,
        message: "High-quality voice is unavailable right now.",
      };
    }

    const payload = await response.json();

    if (!payload.audioContent) {
      console.error("Google TTS returned no audio.");
      await logGoogleTtsDiagnostic({
        message: "Google TTS returned no audio",
        metadata: {
          voiceName: DEFAULT_VOICE,
          hasSsml: Boolean(data.ssml),
          textLength: data.text?.length ?? 0,
          ssmlLength: data.ssml?.length ?? 0,
          includeTimepoints: Boolean(data.includeTimepoints),
          payloadKeys: Object.keys(payload ?? {}),
        },
      });
      return {
        ok: false as const,
        message: "High-quality voice returned no audio.",
      };
    }

    console.info("Google TTS success", {
      voiceName: DEFAULT_VOICE,
      audioBytesBase64: payload.audioContent.length,
      timepointCount: Array.isArray(payload.timepoints) ? payload.timepoints.length : 0,
    });

    return {
      ok: true as const,
      audioContent: payload.audioContent as string,
      mimeType: "audio/mpeg",
      voiceName: DEFAULT_VOICE,
      timepoints: Array.isArray(payload.timepoints)
        ? payload.timepoints.map((point: { markName?: string; timeSeconds?: number }) => ({
            markName: point.markName ?? "",
            timeSeconds: Number(point.timeSeconds ?? 0),
          }))
        : [],
    };
  } catch (error) {
    console.error("Google TTS request crashed:", error);
    await logGoogleTtsDiagnostic({
      message: "Google TTS request crashed",
      stackTrace: error instanceof Error ? error.stack : undefined,
      metadata: {
        voiceName: DEFAULT_VOICE,
        hasSsml: Boolean(data.ssml),
        textLength: data.text?.length ?? 0,
        ssmlLength: data.ssml?.length ?? 0,
        includeTimepoints: Boolean(data.includeTimepoints),
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });
    return {
      ok: false as const,
      message: "High-quality voice is unavailable right now.",
    };
  }
}

export const getGoogleTTSAudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(GoogleTtsRequestSchema)
  .handler(async ({ data }): Promise<GoogleTtsResult> => {
    try {
      return await synthesizeGoogleTts(data);
    } catch (error) {
      // Auth middleware throws raw Response objects on missing/invalid tokens.
      // Convert any thrown failure into a structured shape so callers don't
      // see an unhandled "[object Response]" rejection (blank screen).
      if (error instanceof Response) {
        return {
          ok: false,
          message:
            error.status === 401
              ? "Sign in again to use the premium voice."
              : `Premium voice request failed (${error.status}).`,
        };
      }
      const message =
        error instanceof Error ? error.message : "Premium voice is unavailable right now.";
      return { ok: false, message };
    }
  });
