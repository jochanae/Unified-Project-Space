import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { gender, category, search, age, page_size = 30, page = 0 } = await req.json();

    // Build query params for ElevenLabs shared voices endpoint
    const params = new URLSearchParams();
    params.set("page_size", String(Math.min(page_size, 100)));
    if (page > 0) params.set("page", String(page));
    if (gender) params.set("gender", gender);
    if (category) params.set("category", category);
    if (search) params.set("search", search);
    if (age) params.set("age", age); // young, middle_aged, old
    // Only high-quality voices
    params.set("sort", "usage_character_count_1y");
    params.set("language", "en");

    const url = `https://api.elevenlabs.io/v1/shared-voices?${params.toString()}`;

    const resp = await fetch(url, {
      headers: { "xi-api-key": ELEVENLABS_API_KEY },
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("[get-voices] ElevenLabs API error:", resp.status, errText);

      // If shared-voices isn't available, fall back to user's own voices
      if (resp.status === 403 || resp.status === 401) {
        try {
          const fallbackResp = await fetch("https://api.elevenlabs.io/v1/voices", {
            headers: { "xi-api-key": ELEVENLABS_API_KEY },
          });

          if (fallbackResp.ok) {
            const fallbackData = await fallbackResp.json();
            const voices = (fallbackData.voices || []).map((v: any) => ({
              voice_id: v.voice_id,
              name: v.name,
              gender: v.labels?.gender || "neutral",
              accent: v.labels?.accent || null,
              age: v.labels?.age || null,
              descriptive: v.labels?.descriptive || null,
              use_case: v.labels?.use_case || null,
              preview_url: v.preview_url || null,
              category: v.category || "premade",
            }));

            const filtered = gender
              ? voices.filter((v: any) => v.gender === gender)
              : voices;

            return new Response(
              JSON.stringify({ voices: filtered, has_more: false, source: "account" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } catch (e) {
          console.error("[get-voices] Fallback also failed:", e);
        }
      }

      // Ultimate fallback: curated built-in voices
      const builtIn = [
        { voice_id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger", gender: "male", accent: "American", age: "middle_aged", preview_url: null, category: "premade" },
        { voice_id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", gender: "female", accent: "American", age: "young", preview_url: null, category: "premade" },
        { voice_id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", gender: "male", accent: "American", age: "young", preview_url: null, category: "premade" },
        { voice_id: "SAz9YHcvj6GT2YYXdXww", name: "River", gender: "neutral", accent: "American", age: "young", preview_url: null, category: "premade" },
        { voice_id: "JBFqnCBsd6RMkjVDRZzb", name: "George", gender: "male", accent: "British", age: "middle_aged", preview_url: null, category: "premade" },
        { voice_id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", gender: "female", accent: "American", age: "middle_aged", preview_url: null, category: "premade" },
        { voice_id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", gender: "female", accent: "British", age: "middle_aged", preview_url: null, category: "premade" },
        { voice_id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", gender: "male", accent: "British", age: "middle_aged", preview_url: null, category: "premade" },
        { voice_id: "cgSgspJ2msm6clMCkdW9", name: "Jessica", gender: "female", accent: "American", age: "young", preview_url: null, category: "premade" },
        { voice_id: "IKne3meq5aSn9XLyUdCD", name: "Charlie", gender: "male", accent: "Australian", age: "middle_aged", preview_url: null, category: "premade" },
        { voice_id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura", gender: "female", accent: "American", age: "young", preview_url: null, category: "premade" },
        { voice_id: "nPczCjzI2devNBz1zQrb", name: "Brian", gender: "male", accent: "American", age: "middle_aged", preview_url: null, category: "premade" },
      ];
      const filtered = gender ? builtIn.filter((v) => v.gender === gender) : builtIn;

      return new Response(
        JSON.stringify({ voices: filtered, has_more: false, source: "builtin" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await resp.json();

    // Map to a clean shape
    const voices = (data.voices || []).map((v: any) => ({
      voice_id: v.public_owner_id ? v.voice_id : v.voice_id,
      name: v.name,
      gender: v.gender || "neutral",
      accent: v.accent || null,
      age: v.age || null,
      descriptive: v.descriptive || null,
      use_case: v.use_case || null,
      preview_url: v.preview_url || null,
      category: v.category || "community",
      rate: v.rate,
    }));

    return new Response(
      JSON.stringify({
        voices,
        has_more: data.has_more ?? false,
        last_sort_id: data.last_sort_id ?? null,
        source: "library",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[get-voices] Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
