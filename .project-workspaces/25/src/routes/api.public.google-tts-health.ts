import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

const GOOGLE_TTS_ENDPOINT = "https://texttospeech.googleapis.com/v1beta1/text:synthesize";

type HealthStatus = "online" | "unconfigured" | "degraded" | "offline";

type HealthPayload = {
  status: HealthStatus;
  message: string;
  latencyMs: number | null;
  checkedAt: string;
};

function jsonResponse(payload: HealthPayload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export const Route = createFileRoute("/api/public/google-tts-health")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => {
        const checkedAt = new Date().toISOString();
        const apiKey = process.env.GOOGLE_CLOUD_TTS_API_KEY;

        if (!apiKey) {
          return jsonResponse({
            status: "unconfigured",
            message: "Google Cloud TTS API key is not configured.",
            latencyMs: null,
            checkedAt,
          });
        }

        const started = Date.now();

        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);

          const response = await fetch(`${GOOGLE_TTS_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              input: { text: "ok" },
              voice: { languageCode: "en-US", name: "en-US-Neural2-F" },
              audioConfig: { audioEncoding: "MP3" },
            }),
            signal: controller.signal,
          });

          clearTimeout(timeout);
          const latencyMs = Date.now() - started;

          if (!response.ok) {
            return jsonResponse({
              status: "degraded",
              message: `Google responded with ${response.status}.`,
              latencyMs,
              checkedAt,
            });
          }

          const payload = (await response.json()) as { audioContent?: string };

          if (!payload.audioContent) {
            return jsonResponse({
              status: "degraded",
              message: "Google responded without audio content.",
              latencyMs,
              checkedAt,
            });
          }

          return jsonResponse({
            status: "online",
            message: "Google Cloud TTS is responding.",
            latencyMs,
            checkedAt,
          });
        } catch (error) {
          const latencyMs = Date.now() - started;
          return jsonResponse({
            status: "offline",
            message:
              error instanceof Error ? error.message : "Google TTS is unreachable right now.",
            latencyMs,
            checkedAt,
          });
        }
      },
    },
  },
});
