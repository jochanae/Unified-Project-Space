/**
 * Signed URL utilities for private storage buckets.
 * After making audio-messages and chat-images private, all access
 * must go through signed URLs instead of public URLs.
 */
import { supabase } from '@/integrations/supabase/client';

const PRIVATE_BUCKETS = ['audio-messages', 'chat-images'] as const;
const SIGNED_URL_EXPIRY = 3600; // 1 hour

// In-memory cache to avoid re-signing the same path within a session
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Extract the storage path from a full public URL for a given bucket.
 * e.g. "https://xxx.supabase.co/storage/v1/object/public/chat-images/userId/file.jpg"
 * → "userId/file.jpg"
 */
export function extractStoragePath(url: string, bucket: string): string | null {
  const publicPattern = `/storage/v1/object/public/${bucket}/`;
  const signedPattern = `/storage/v1/object/sign/${bucket}/`;
  
  for (const pattern of [publicPattern, signedPattern]) {
    const idx = url.indexOf(pattern);
    if (idx >= 0) {
      return url.substring(idx + pattern.length).split('?')[0];
    }
  }
  
  // If it's already just a path (no URL prefix), return as-is
  if (!url.startsWith('http')) return url;
  return null;
}

/**
 * Check if a URL belongs to one of our private buckets.
 */
export function isPrivateBucketUrl(url: string): string | null {
  for (const bucket of PRIVATE_BUCKETS) {
    if (url.includes(`/${bucket}/`)) return bucket;
  }
  return null;
}

/**
 * Create a signed URL for a file in a storage bucket.
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = SIGNED_URL_EXPIRY,
): Promise<string | null> {
  // Check cache first
  const cacheKey = `${bucket}/${path}`;
  const cached = signedUrlCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    // Still valid for at least 1 more minute
    return cached.url;
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  
  if (error || !data?.signedUrl) {
    console.warn(`[SignedUrl] Failed for ${bucket}/${path}:`, error?.message);
    return null;
  }

  // Cache it
  signedUrlCache.set(cacheKey, {
    url: data.signedUrl,
    expiresAt: Date.now() + expiresIn * 1000,
  });

  return data.signedUrl;
}

/**
 * Resolve a public URL to a signed URL if it belongs to a private bucket.
 * Returns the original URL if it doesn't match any private bucket.
 */
export async function resolveToSignedUrl(publicUrl: string): Promise<string> {
  const bucket = isPrivateBucketUrl(publicUrl);
  if (!bucket) return publicUrl;

  const path = extractStoragePath(publicUrl, bucket);
  if (!path) return publicUrl;

  const signedUrl = await getSignedUrl(bucket, path);
  return signedUrl || publicUrl; // fallback to original if signing fails
}

/**
 * After uploading a file, get a signed URL instead of a public URL.
 */
export async function getUploadSignedUrl(
  bucket: string,
  path: string,
): Promise<string> {
  const signedUrl = await getSignedUrl(bucket, path);
  if (!signedUrl) {
    throw new Error(`Failed to create signed URL for ${bucket}/${path}`);
  }
  return signedUrl;
}
