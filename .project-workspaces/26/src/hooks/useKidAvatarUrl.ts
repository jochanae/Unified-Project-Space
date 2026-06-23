import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const KID_AVATAR_BUCKET = "kid-avatars";

/**
 * Resolves a kid_profile.avatar_url to a displayable URL.
 *
 * Stored values can be:
 *   - A storage path in the private `kid-avatars` bucket (e.g. `{kidId}/file.png`)
 *     → resolved to a signed URL
 *   - A legacy public URL (old `avatars` bucket)
 *     → returned as-is
 *   - An external http(s) URL (Google OAuth, etc.)
 *     → returned as-is
 *   - null/empty → returns null
 */
export function useKidAvatarUrl(value: string | null | undefined, expiresIn = 3600) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!value) {
      setUrl(null);
      return;
    }

    // Already a full URL — use directly
    if (value.startsWith("http://") || value.startsWith("https://")) {
      setUrl(value);
      return;
    }

    // Treat as storage path in private kid-avatars bucket
    supabase.storage
      .from(KID_AVATAR_BUCKET)
      .createSignedUrl(value, expiresIn)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data?.signedUrl) {
          setUrl(data.signedUrl);
        } else {
          setUrl(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [value, expiresIn]);

  return url;
}
