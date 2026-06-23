// Required env vars:
//   LINKEDIN_CLIENT_ID       - LinkedIn app client ID
//   LINKEDIN_CLIENT_SECRET   - LinkedIn app client secret (used by callback)
//   SITE_URL                 - Production app URL, e.g. https://intoiq.app
//   SUPABASE_URL             - Supabase project URL (auto)
//   SUPABASE_ANON_KEY        - Supabase anon key (auto)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userAuthErr } = await supabase.auth.getUser(token);
    if (userAuthErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = userData.user.id;

    // Look up org_id for this user
    const { data: userRow, error: userErr } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', userId)
      .maybeSingle();
    if (userErr || !userRow?.org_id) {
      return new Response(JSON.stringify({ error: 'No organization found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const clientId = Deno.env.get('LINKEDIN_CLIENT_ID');
    const siteUrl = Deno.env.get('SITE_URL');
    if (!clientId || !siteUrl) {
      return new Response(
        JSON.stringify({ error: 'LinkedIn integration is not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // state encodes org_id + user_id + a random nonce
    const nonce = crypto.randomUUID();
    const statePayload = { org_id: userRow.org_id, user_id: userId, nonce };
    const state = btoa(JSON.stringify(statePayload));

    const redirectUri = `${siteUrl.replace(/\/$/, '')}/functions/v1/linkedin-oauth-callback`;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
      scope: 'openid profile email w_member_social',
    });

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;

    return new Response(JSON.stringify({ authUrl }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('linkedin-oauth-init error', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
