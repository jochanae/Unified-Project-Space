import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username } = await req.json();

    if (!username || typeof username !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Username is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedUsername = username.trim().toLowerCase();

    if (normalizedUsername.length < 3) {
      return new Response(
        JSON.stringify({ error: 'Username must be at least 3 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the authorization header to verify the caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create user client to verify the user is authenticated
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User ${user.id} validating username: ${normalizedUsername}`);

    // Search for exact username match (case insensitive)
    const { data: kidProfile, error: searchError } = await supabaseAdmin
      .from('kids_profiles')
      .select('id, display_name, username, avatar_emoji, age_tier')
      .ilike('username', normalizedUsername)
      .single();

    if (searchError || !kidProfile) {
      console.log(`Username not found: ${normalizedUsername}`);
      return new Response(
        JSON.stringify({ 
          found: false, 
          error: 'No account found with that username. Make sure your child has signed up first.' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already linked to this parent
    const { data: existingLink } = await supabaseAdmin
      .from('family_links')
      .select('id, status')
      .eq('parent_user_id', user.id)
      .eq('kid_profile_id', kidProfile.id)
      .single();

    if (existingLink) {
      const message = existingLink.status === 'active' 
        ? 'This child is already linked to your account.'
        : 'A pending link request already exists for this child.';
      
      console.log(`Existing link found for kid ${kidProfile.id}`);
      return new Response(
        JSON.stringify({ found: false, error: message }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return minimal safe info for confirmation
    console.log(`Found kid profile: ${kidProfile.display_name}`);
    return new Response(
      JSON.stringify({
        found: true,
        kid: {
          id: kidProfile.id,
          display_name: kidProfile.display_name,
          username: kidProfile.username,
          avatar_emoji: kidProfile.avatar_emoji,
          age_tier: kidProfile.age_tier
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error validating username:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to validate username' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
