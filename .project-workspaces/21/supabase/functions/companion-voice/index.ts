import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await sb.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text, voiceId, companionGender, stream, namePronunciation, userName } = await req.json();
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    if (!text || text.length > 500) {
      return new Response(
        JSON.stringify({ error: "Text required (max 500 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Gender-aware voice fallback
    const GENDER_VOICES: Record<string, string> = {
      male: 'TX3LPaxmHKxFdv7VOQHJ',     // Liam
      female: 'EXAVITQu4vr4xnSDxMaL',    // Sarah
      neutral: 'SAz9YHcvj6GT2YYXdXww',   // River
    };
    const selectedVoice = voiceId || GENDER_VOICES[companionGender || 'neutral'] || GENDER_VOICES.neutral;

    // Apply pronunciation fix: replace the user's name with phonetic spelling
    let processedText = text;
    if (userName && namePronunciation) {
      // Replace all occurrences of the user's name with the phonetic version
      const nameRegex = new RegExp(`\\b${userName}\\b`, 'gi');
      processedText = processedText.replace(nameRegex, namePronunciation);
    }

    // Use streaming endpoint for lower latency and better quality
    const endpoint = stream
      ? `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}/stream?output_format=mp3_44100_128`
      : `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}?output_format=mp3_44100_128`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: processedText,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.50,
          similarity_boost: 0.75,
          style: 0.45,
          use_speaker_boost: true,
          speed: 0.85,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("ElevenLabs error:", response.status, errText);
      throw new Error(`ElevenLabs API failed [${response.status}]`);
    }

    // Stream: pass through the audio stream directly
    if (stream && response.body) {
      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "audio/mpeg",
          "Transfer-Encoding": "chunked",
        },
      });
    }

    // Non-stream: return base64
    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = base64Encode(audioBuffer);

    return new Response(
      JSON.stringify({ audioContent: audioBase64 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Companion voice error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
