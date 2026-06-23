import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      throw new Error('Google OAuth credentials not configured');
    }

    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const url = new URL(req.url);

    // Handle OAuth callback (GET request from Google with code in URL params)
    if (req.method === 'GET') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      // Handle OAuth error from Google
      if (error) {
        console.error('Google OAuth error:', error, url.searchParams.get('error_description'));
        const appUrl = Deno.env.get('VITE_APP_URL') || 'https://coinsbloom.lovable.app';
        return new Response(null, {
          status: 302,
          headers: { Location: `${appUrl}/bills?gmail_error=${encodeURIComponent(error)}` }
        });
      }

      if (code && state) {
        console.log('Processing OAuth callback for user:', state);
        const redirectUri = `${SUPABASE_URL}/functions/v1/gmail-auth`;
        
        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri
          })
        });

        const tokens = await tokenResponse.json();
        
        if (!tokenResponse.ok) {
          console.error('Token exchange failed:', tokens);
          const appUrl = Deno.env.get('VITE_APP_URL') || 'https://coinsbloom.lovable.app';
          const errorMsg = tokens.error_description || tokens.error || 'Token exchange failed';
          return new Response(null, {
            status: 302,
            headers: { Location: `${appUrl}/bills?gmail_error=${encodeURIComponent(errorMsg)}` }
          });
        }

        console.log('Token exchange successful, getting user info');

        // Get user's Gmail address
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokens.access_token}` }
        });
        const userInfo = await userInfoResponse.json();
        console.log('Gmail address:', userInfo.email);

        // Store connection
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
        
        const { error: upsertError } = await supabaseAdmin
          .from('gmail_connections')
          .upsert({
            user_id: state, // state contains userId
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: expiresAt.toISOString(),
            gmail_address: userInfo.email,
            is_active: true
          }, { onConflict: 'user_id' });

        if (upsertError) {
          console.error('Error storing Gmail connection:', upsertError);
        } else {
          console.log('Gmail connection stored successfully');
        }

        // Redirect back to app
        const appUrl = Deno.env.get('VITE_APP_URL') || 'https://coinsbloom.lovable.app';
        return new Response(null, {
          status: 302,
          headers: { Location: `${appUrl}/bills?gmail_connected=true` }
        });
      }

      // GET request without code/state - show info message
      return new Response(JSON.stringify({ 
        message: 'Gmail OAuth endpoint. Use POST with action to initiate OAuth flow.',
        status: 'ready'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle POST requests (from frontend)
    if (req.method === 'POST') {
      const body = await req.json();
      const { action } = body;

      // Get user from auth header
      const authHeader = req.headers.get('Authorization');
      let userId: string | null = null;
      
      if (authHeader) {
        const supabaseClient = createClient(
          SUPABASE_URL!,
          Deno.env.get('SUPABASE_ANON_KEY')!,
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user } } = await supabaseClient.auth.getUser();
        userId = user?.id || null;
      }

      if (action === 'get_auth_url') {
        if (!userId) throw new Error('Not authenticated');

        const redirectUri = `${SUPABASE_URL}/functions/v1/gmail-auth`;
        const scopes = [
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/userinfo.email'
        ].join(' ');

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${GOOGLE_CLIENT_ID}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&response_type=code` +
          `&scope=${encodeURIComponent(scopes)}` +
          `&access_type=offline` +
          `&prompt=consent` +
          `&state=${userId}`;

        console.log('Generated auth URL for user:', userId);

        return new Response(JSON.stringify({ authUrl }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      throw new Error('Invalid action');
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Gmail auth error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
