/**
 * Client-side helper to call the moderate-image edge function.
 * Only called for minor users on direct image uploads.
 */

interface ModerationResult {
  approved: boolean;
  reason?: string;
}

export async function moderateImage(
  imageUrl: string,
  isMinor: boolean
): Promise<ModerationResult> {
  try {
    const resp = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/moderate-image`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ imageUrl, isMinor }),
      }
    );

    if (!resp.ok) {
      // Fail open for adults, fail closed for minors
      return { approved: !isMinor, reason: isMinor ? 'Safety check unavailable' : undefined };
    }

    return await resp.json();
  } catch {
    return { approved: !isMinor, reason: isMinor ? 'Safety check unavailable' : undefined };
  }
}
