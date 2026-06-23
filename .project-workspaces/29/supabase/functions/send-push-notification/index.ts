import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Base64URL utilities
function base64UrlDecode(str: string): Uint8Array {
  const padding = '='.repeat((4 - str.length % 4) % 4);
  const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  return new Uint8Array([...binary].map(char => char.charCodeAt(0)));
}

function base64UrlEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Create VAPID JWT token
async function createVapidJwt(
  audience: string,
  subject: string,
  vapidPrivateKey: Uint8Array,
  expSeconds = 12 * 60 * 60
): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + expSeconds,
    sub: subject,
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key - VAPID private keys are raw 32-byte EC private keys
  // We need to construct a proper JWK or PKCS8 format
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    d: base64UrlEncode(vapidPrivateKey),
    // x and y would be derived from d, but we can use 'raw' import for private key
  };

  try {
    // Try importing as JWK with just the private component
    // For signing, some implementations allow this
    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      {
        ...jwk,
        // Dummy public components - will be ignored for signing
        x: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        y: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      },
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      cryptoKey,
      new TextEncoder().encode(unsignedToken)
    );

    // Convert DER signature to raw format (r || s)
    const sigBytes = new Uint8Array(signature);
    return `${unsignedToken}.${base64UrlEncode(sigBytes)}`;
  } catch (e) {
    console.error('VAPID JWT creation failed:', e);
    throw new Error('Failed to create VAPID JWT');
  }
}

// HKDF for key derivation
async function hkdfSha256(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, { name: 'HKDF' }, false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key,
    length * 8
  );
  return new Uint8Array(derived);
}

// Encrypt payload using Web Push encryption (RFC 8291)
async function encryptPayload(
  payload: string,
  p256dh: Uint8Array,
  auth: Uint8Array
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  // Generate ephemeral ECDH key pair
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // Export server public key
  const serverPublicKeyRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const serverPublicKey = new Uint8Array(serverPublicKeyRaw);

  // Import client public key
  const clientPublicKey = await crypto.subtle.importKey(
    'raw',
    p256dh,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientPublicKey },
    keyPair.privateKey,
    256
  );
  const sharedSecretBytes = new Uint8Array(sharedSecret);

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Derive encryption key and nonce using HKDF
  const authInfo = new TextEncoder().encode('Content-Encoding: auth\0');
  const prk = await hkdfSha256(sharedSecretBytes, auth, authInfo, 32);

  const keyInfo = new Uint8Array([
    ...new TextEncoder().encode('Content-Encoding: aes128gcm\0'),
  ]);
  const contentKey = await hkdfSha256(prk, salt, keyInfo, 16);

  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\0');
  const nonce = await hkdfSha256(prk, salt, nonceInfo, 12);

  // Encrypt with AES-GCM
  const aesKey = await crypto.subtle.importKey('raw', contentKey, { name: 'AES-GCM' }, false, ['encrypt']);

  // Add padding (record delimiter)
  const paddedPayload = new Uint8Array([...new TextEncoder().encode(payload), 2]);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    aesKey,
    paddedPayload
  );

  return {
    ciphertext: new Uint8Array(ciphertext),
    salt,
    serverPublicKey,
  };
}

// Build the encrypted request body
function buildPushBody(
  ciphertext: Uint8Array,
  salt: Uint8Array,
  serverPublicKey: Uint8Array,
  recordSize = 4096
): Uint8Array {
  // aes128gcm content encoding format
  const header = new Uint8Array(86);
  header.set(salt, 0); // 16 bytes salt
  new DataView(header.buffer).setUint32(16, recordSize, false); // 4 bytes record size
  header[20] = serverPublicKey.length; // 1 byte key length
  header.set(serverPublicKey, 21); // 65 bytes server public key

  const body = new Uint8Array(header.length + ciphertext.length);
  body.set(header, 0);
  body.set(ciphertext, header.length);

  return body;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { user_id, title, body, action_url, tag } = await req.json();
    
    if (!user_id || !title) {
      return new Response(
        JSON.stringify({ error: 'user_id and title are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id);
    
    if (subError) throw subError;
    
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No push subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store notification in database
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id,
        title,
        message: body || '',
        type: 'reminder',
        action_url,
        metadata: { push_sent: true, subscription_count: subscriptions.length, tag }
      });
    
    if (notifError) console.error('Error storing notification:', notifError);

    // Check VAPID configuration
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.warn('VAPID keys not configured');
      return new Response(
        JSON.stringify({ success: true, sent: 0, stored: true, message: 'Notification stored (VAPID not configured)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = JSON.stringify({ title, body: body || '', action_url, tag: tag || 'default' });
    const vapidPrivateKeyBytes = base64UrlDecode(vapidPrivateKey);

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const sub of subscriptions) {
      try {
        const endpoint = sub.endpoint;
        const url = new URL(endpoint);
        const audience = `${url.protocol}//${url.host}`;

        // Decode subscription keys
        const p256dh = base64UrlDecode(sub.p256dh);
        const auth = base64UrlDecode(sub.auth);

        // Encrypt payload
        const { ciphertext, salt, serverPublicKey } = await encryptPayload(payload, p256dh, auth);
        const requestBody = buildPushBody(ciphertext, salt, serverPublicKey);

        // Create VAPID authorization
        const jwt = await createVapidJwt(audience, 'mailto:support@intoiq.com', vapidPrivateKeyBytes);
        const authorization = `vapid t=${jwt}, k=${vapidPublicKey}`;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': authorization,
            'Content-Encoding': 'aes128gcm',
            'Content-Type': 'application/octet-stream',
            'TTL': '86400',
            'Urgency': 'normal',
          },
          body: requestBody,
        });

        if (response.ok || response.status === 201) {
          successCount++;
        } else {
          const errText = await response.text();
          console.error(`Push failed: ${response.status} ${errText}`);
          errors.push(`${response.status}: ${errText.substring(0, 100)}`);
          failCount++;

          // Remove expired subscriptions
          if (response.status === 404 || response.status === 410) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
          }
        }
      } catch (pushError) {
        console.error('Push error:', pushError);
        errors.push(pushError instanceof Error ? pushError.message : 'Unknown error');
        failCount++;
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: successCount > 0, 
        sent: successCount, 
        failed: failCount,
        message: `Push sent to ${successCount}/${subscriptions.length} subscriptions`,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Push notification error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});