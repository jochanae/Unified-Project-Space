// AES-GCM encryption helpers for payment_accounts.encrypted_secret_key
// Key source: PAYMENT_ENCRYPTION_KEY env var (base64-encoded 32 bytes)

let cachedKey: CryptoKey | null = null;

async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const raw = Deno.env.get("PAYMENT_ENCRYPTION_KEY");
  if (!raw) throw new Error("PAYMENT_ENCRYPTION_KEY not configured");
  // Decode base64
  const bin = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  if (bin.length < 32) throw new Error("PAYMENT_ENCRYPTION_KEY must decode to >= 32 bytes");
  const keyBytes = bin.slice(0, 32);
  cachedKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
  return cachedKey;
}

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function fromBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

// Returns "v1:<iv_b64>:<ciphertext_b64>"
export async function encryptSecret(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder().encode(plaintext);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc),
  );
  return `v1:${toBase64(iv)}:${toBase64(ct)}`;
}

export async function decryptSecret(payload: string): Promise<string> {
  const key = await getKey();
  const parts = payload.split(":");
  if (parts.length !== 3 || parts[0] !== "v1") {
    throw new Error("Invalid encrypted payload format");
  }
  const iv = fromBase64(parts[1]);
  const ct = fromBase64(parts[2]);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}

// Mask key for UI display: sk_live_abcd...wxyz
export function maskKey(key: string): string {
  if (key.length <= 12) return "••••";
  return `${key.slice(0, 7)}…${key.slice(-4)}`;
}
