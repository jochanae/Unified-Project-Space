/**
 * Calls the companion-image edge function in 'describe-user' mode
 * to extract a detailed appearance description from an uploaded photo.
 * Used when a user uploads a photo for their companion so that
 * future selfie/activity generation uses accurate appearance details.
 */

const IMAGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/companion-image`;

export async function describeFromImage(imageUrl: string, userId: string): Promise<string | null> {
  try {
    const resp = await fetch(IMAGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        mode: 'describe-user',
        referenceImageUrl: imageUrl,
        userId,
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.description || null;
  } catch {
    return null;
  }
}
