// Public endpoint — LinkedIn redirects the user's browser here.
// Exchanges the code for tokens, looks up the LinkedIn profile,
// upserts the connection row keyed by org_id+platform, then redirects
// the user back to /settings with a success or error flag.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

function redirectBack(siteUrl: string, params: Record<string, string>) {
  const url = new URL('/settings', siteUrl);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Response(null, {
    status: 302,
    headers: { Location: url.toString() },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const siteUrl = Deno.env.get('SITE_URL') ?? 'https://intoiq.app';

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const errParam = url.searchParams.get('error');

    if (errParam) {
      return redirectBack(siteUrl, { linkedin: 'error', reason: errParam });
    }
    if (!code || !state) {
      return redirectBack(siteUrl, { linkedin: 'error', reason: 'missing_code' });
    }

    let parsedState: { org_id: string; user_id: string; nonce: string };
    try {
      parsedState = JSON.parse(atob(state));
    } catch {
      return redirectBack(siteUrl, { linkedin: 'error', reason: 'bad_state' });
    }

    const clientId = Deno.env.get('LINKEDIN_CLIENT_ID');
    const clientSecret = Deno.env.get('LINKEDIN_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      return redirectBack(siteUrl, { linkedin: 'error', reason: 'not_configured' });
    }

    const redirectUri = `${siteUrl.replace(/\/$/, '')}/functions/v1/linkedin-oauth-callback`;

    // Exchange code for access token
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (!tokenRes.ok) {
      const txt = await tokenRes.text();
      console.error('LinkedIn token exchange failed', tokenRes.status, txt);
      return redirectBack(siteUrl, { linkedin: 'error', reason: 'token_exchange' });
    }
    const tokenJson = await tokenRes.json();
    const accessToken: string = tokenJson.access_token;
    const expiresIn: number = tokenJson.expires_in ?? 0;
    const refreshToken: string | undefined = tokenJson.refresh_token;
    const scope: string | undefined = tokenJson.scope;

    // Fetch profile via OpenID userinfo
    let liUserId = '';
    let liName = '';
    let liAvatar = '';
    try {
      const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (profileRes.ok) {
        const p = await profileRes.json();
        liUserId = p.sub ?? '';
        liName = p.name ?? `${p.given_name ?? ''} ${p.family_name ?? ''}`.trim();
        liAvatar = p.picture ?? '';
      }
    } catch (e) {
      console.warn('userinfo fetch failed (non-fatal)', e);
    }

    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    // Upsert via service role — RLS would otherwise require an authenticated session here
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error: upsertErr } = await admin
      .from('connected_social_accounts')
      .upsert(
        {
          org_id: parsedState.org_id,
          platform: 'linkedin',
          access_token: accessToken,
          refresh_token: refreshToken ?? null,
          token_expires_at: expiresAt,
          platform_user_id: liUserId || null,
          platform_display_name: liName || null,
          platform_avatar_url: liAvatar || null,
          scopes: scope ?? null,
        },
        { onConflict: 'org_id,platform' }
      );
    if (upsertErr) {
      console.error('Upsert connection failed', upsertErr);
      return redirectBack(siteUrl, { linkedin: 'error', reason: 'db_upsert' });
    }

    return redirectBack(siteUrl, { linkedin: 'connected' });
  } catch (err) {
    console.error('linkedin-oauth-callback error', err);
    return redirectBack(siteUrl, { linkedin: 'error', reason: 'unknown' });
  }
});
