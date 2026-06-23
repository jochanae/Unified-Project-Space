import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication - only authenticated users can use TTS
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Brian voice - warm, professional, conversational
    const body = await req.json();
    const { text, voiceId = 'nPczCjzI2devNBz1zQrb', speed = 1.0 } = body;

    // Validate voiceId format (alphanumeric, 10-30 chars)
    if (typeof voiceId !== 'string' || !/^[a-zA-Z0-9]{10,30}$/.test(voiceId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid voice ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');

    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('Text is required');
    }

    // Clean the text - remove markdown formatting for better TTS
    const cleanText = text
      .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
      .replace(/\*(.*?)\*/g, '$1')     // Italic
      .replace(/#{1,6}\s/g, '')        // Headers
      .replace(/```[\s\S]*?```/g, '')  // Code blocks
      .replace(/`(.*?)`/g, '$1')       // Inline code
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Links
      .replace(/- /g, ', ')            // List items
      .replace(/\n{2,}/g, '. ')        // Multiple newlines to periods
      .replace(/\n/g, ' ')             // Single newlines to spaces
      .trim();

    if (cleanText.length === 0) {
      throw new Error('No speakable text after cleaning');
    }

    // Truncate if too long (ElevenLabs has limits)
    const maxChars = 5000;
    const truncatedText = cleanText.length > maxChars 
      ? cleanText.substring(0, maxChars) + '... Content truncated for audio.'
      : cleanText;

    // Clamp speed to valid range (0.7-1.2)
    const clampedSpeed = Math.min(1.2, Math.max(0.7, speed));

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: truncatedText,
          model_id: 'eleven_multilingual_v2', // Higher quality model
          voice_settings: {
            stability: 0.4,         // Lower = more expressive
            similarity_boost: 0.8,  // Higher voice clarity
            style: 0.4,             // Natural expressiveness
            use_speaker_boost: true,
            speed: clampedSpeed,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error) {
    console.error('TTS error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
