import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Generates a signed URL for a private storage file.
 * Accepts either a storage path or a legacy public URL.
 */
export function useSignedUrl(pathOrUrl: string | null | undefined, bucket = 'receipts', expiresIn = 3600) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!pathOrUrl) {
      setSignedUrl(null);
      return;
    }

    // Extract storage path from legacy public URLs
    let storagePath = pathOrUrl;
    const publicUrlMarker = `/storage/v1/object/public/${bucket}/`;
    if (pathOrUrl.includes(publicUrlMarker)) {
      storagePath = pathOrUrl.split(publicUrlMarker)[1];
    }

    const getUrl = async () => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(storagePath!, expiresIn);

      if (!error && data?.signedUrl) {
        setSignedUrl(data.signedUrl);
      } else {
        // Fallback: try using the original URL (for backward compat)
        setSignedUrl(pathOrUrl);
      }
    };

    getUrl();
  }, [pathOrUrl, bucket, expiresIn]);

  return signedUrl;
}

/**
 * Imperatively create a signed URL (for non-component contexts).
 */
export async function createSignedReceiptUrl(pathOrUrl: string, bucket = 'receipts', expiresIn = 3600): Promise<string> {
  let storagePath = pathOrUrl;
  const publicUrlMarker = `/storage/v1/object/public/${bucket}/`;
  if (pathOrUrl.includes(publicUrlMarker)) {
    storagePath = pathOrUrl.split(publicUrlMarker)[1];
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, expiresIn);

  if (!error && data?.signedUrl) return data.signedUrl;
  return pathOrUrl; // fallback
}
