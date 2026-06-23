// Publishes a text post (optionally with one image) to LinkedIn as the connected member.
// Body: { text: string, imageUrl?: string }

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

    const body = await req.json().catch(() => ({}));
    const text: string = (body?.text ?? '').toString().trim();
    const imageUrl: string | undefined = body?.imageUrl;
    if (!text) {
      return new Response(JSON.stringify({ error: 'text is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find the user's org and their LinkedIn connection
    const { data: userRow } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', userId)
      .maybeSingle();
    if (!userRow?.org_id) {
      return new Response(JSON.stringify({ error: 'No organization' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: conn } = await supabase
      .from('connected_social_accounts')
      .select('access_token, platform_user_id, token_expires_at')
      .eq('org_id', userRow.org_id)
      .eq('platform', 'linkedin')
      .maybeSingle();

    if (!conn?.access_token || !conn?.platform_user_id) {
      return new Response(
        JSON.stringify({ error: 'LinkedIn account not connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (conn.token_expires_at && new Date(conn.token_expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'LinkedIn token expired — please reconnect' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const author = `urn:li:person:${conn.platform_user_id}`;

    // If we have an image URL, register an upload, upload bytes, then attach
    let mediaAsset: string | null = null;
    if (imageUrl) {
      try {
        const regRes = await fetch(
          'https://api.linkedin.com/v2/assets?action=registerUpload',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${conn.access_token}`,
              'Content-Type': 'application/json',
              'X-Restli-Protocol-Version': '2.0.0',
            },
            body: JSON.stringify({
              registerUploadRequest: {
                recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
                owner: author,
                serviceRelationships: [
                  {
                    relationshipType: 'OWNER',
                    identifier: 'urn:li:userGeneratedContent',
                  },
                ],
              },
            }),
          }
        );
        if (regRes.ok) {
          const reg = await regRes.json();
          const uploadUrl =
            reg?.value?.uploadMechanism?.[
              'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
            ]?.uploadUrl;
          mediaAsset = reg?.value?.asset ?? null;

          if (uploadUrl && mediaAsset) {
            const imgRes = await fetch(imageUrl);
            if (imgRes.ok) {
              const bytes = new Uint8Array(await imgRes.arrayBuffer());
              const upRes = await fetch(uploadUrl, {
                method: 'POST',
                headers: { Authorization: `Bearer ${conn.access_token}` },
                body: bytes,
              });
              if (!upRes.ok) {
                console.warn('Image upload failed', upRes.status, await upRes.text());
                mediaAsset = null;
              }
            } else {
              mediaAsset = null;
            }
          }
        } else {
          console.warn('registerUpload failed', regRes.status, await regRes.text());
        }
      } catch (e) {
        console.warn('Image attach error (continuing as text-only)', e);
        mediaAsset = null;
      }
    }

    const ugcBody: Record<string, unknown> = {
      author,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          shareMediaCategory: mediaAsset ? 'IMAGE' : 'NONE',
          ...(mediaAsset
            ? {
                media: [
                  {
                    status: 'READY',
                    media: mediaAsset,
                  },
                ],
              }
            : {}),
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    };

    const postRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${conn.access_token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(ugcBody),
    });

    if (!postRes.ok) {
      const errTxt = await postRes.text();
      console.error('LinkedIn publish failed', postRes.status, errTxt);
      return new Response(
        JSON.stringify({ error: `Publish failed: ${postRes.status}`, detail: errTxt }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const postId = postRes.headers.get('x-restli-id') || (await postRes.json()).id || null;
    return new Response(JSON.stringify({ ok: true, postId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('linkedin-publish error', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
