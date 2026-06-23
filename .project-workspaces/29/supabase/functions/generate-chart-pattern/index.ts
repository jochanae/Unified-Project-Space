import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - missing authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: authError } = await supabase.auth.getClaims(token);

    if (authError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log(`Chart generation request from user: ${userId}`);

    const { pattern, style = 'clean' } = await req.json();

    if (!pattern) {
      return new Response(
        JSON.stringify({ error: 'Pattern type is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Pattern descriptions for the AI
    const patternPrompts: Record<string, string> = {
      'head-shoulders': 'A stock chart showing a head and shoulders pattern with three peaks, the middle peak (head) being the highest, and two smaller peaks (shoulders) on either side. Include a neckline connecting the lows. Clean, professional trading chart style.',
      'double-top': 'A stock chart showing a double top pattern with two peaks at approximately the same price level, indicating a bearish reversal. Include support line and price action. Clean, professional trading chart style.',
      'double-bottom': 'A stock chart showing a double bottom pattern with two troughs at approximately the same price level, indicating a bullish reversal. Include resistance line and price action. Clean, professional trading chart style.',
      'cup-handle': 'A stock chart showing a cup and handle pattern - a rounded bottom (cup) followed by a small consolidation (handle). Show the breakout point. Clean, professional trading chart style.',
      'ascending-triangle': 'A stock chart showing an ascending triangle pattern with a flat resistance line and rising support trendline, indicating bullish continuation. Clean, professional trading chart style.',
      'descending-triangle': 'A stock chart showing a descending triangle pattern with a flat support line and falling resistance trendline, indicating bearish continuation. Clean, professional trading chart style.',
      'bull-flag': 'A stock chart showing a bull flag pattern - a sharp upward move (pole) followed by a downward sloping consolidation (flag). Clean, professional trading chart style.',
      'bear-flag': 'A stock chart showing a bear flag pattern - a sharp downward move (pole) followed by an upward sloping consolidation (flag). Clean, professional trading chart style.',
      'wedge-rising': 'A stock chart showing a rising wedge pattern with converging upward sloping trendlines, typically a bearish reversal pattern. Clean, professional trading chart style.',
      'wedge-falling': 'A stock chart showing a falling wedge pattern with converging downward sloping trendlines, typically a bullish reversal pattern. Clean, professional trading chart style.',
      'support-resistance': 'A stock chart showing clear horizontal support and resistance levels with price bouncing between them. Include annotations. Clean, professional trading chart style.',
      'fibonacci': 'A stock chart showing Fibonacci retracement levels (23.6%, 38.2%, 50%, 61.8%) drawn on a price trend. Show price reactions at key levels. Clean, professional trading chart style.',
    };

    const prompt = patternPrompts[pattern] || `A stock chart showing the ${pattern} pattern. Clean, professional trading chart style with clear annotations.`;

    // Call Lovable AI for image generation
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        messages: [
          {
            role: 'user',
            content: prompt + (style === 'dark' ? ' Use a dark background with light colored lines and text.' : ' Use a white background with dark colored lines and text.'),
          }
        ],
        modalities: ['image', 'text'],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI API error: ${error}`);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error('No image generated');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl,
        pattern,
        prompt,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    console.error('Chart generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
