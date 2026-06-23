import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  DEFAULT_READER_VOICE_ENGINE,
  READER_VOICE_ENGINE_SETTING_KEY,
  normalizeReaderVoiceEngine,
} from "@/lib/readerVoiceEngine";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

export const Route = createFileRoute("/api/public/reader-voice-engine")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => {
        try {
          const { data } = await supabaseAdmin
            .from("app_settings")
            .select("setting_value")
            .eq("setting_key", READER_VOICE_ENGINE_SETTING_KEY)
            .maybeSingle();

          const setting = data?.setting_value as { engine?: unknown } | null;
          const engine = normalizeReaderVoiceEngine(setting?.engine);

          return new Response(JSON.stringify({ engine: engine ?? DEFAULT_READER_VOICE_ENGINE }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        } catch (error) {
          console.error("reader-voice-engine lookup failed", error);
          return new Response(JSON.stringify({ engine: DEFAULT_READER_VOICE_ENGINE }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }
      },
    },
  },
});
