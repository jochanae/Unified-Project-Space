/**
 * Atomic companion photo upload.
 *
 * Guarantees:
 *  1. File is uploaded to storage
 *  2. Public URL is written to `connections.avatar_url` (and optionally `background_url`)
 *  3. If the DB write fails → the storage file is deleted (no orphans)
 *  4. The caller only receives the URL on full success
 */
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export type PhotoTarget = 'avatar' | 'backdrop' | 'reference';

interface UploadCompanionPhotoArgs {
  /** The image file or blob to upload */
  file: File | Blob;
  /** Authenticated user ID */
  userId: string;
  /** The companion's member_id in the connections table */
  memberId: string;
  /** Which field to write: avatar_url, background_url, or reference_image_url */
  target?: PhotoTarget;
  /** Storage bucket (defaults to companion-avatars, or companion-backdrops for backdrop target) */
  bucket?: string;
  /** Optional file extension override (e.g. 'png'). Auto-detected from File objects. */
  extension?: string;
}

interface UploadResult {
  success: true;
  publicUrl: string;
}

interface UploadFailure {
  success: false;
  error: string;
}

export async function uploadCompanionPhoto(
  args: UploadCompanionPhotoArgs
): Promise<UploadResult | UploadFailure> {
  const {
    file,
    userId,
    memberId,
    target = 'avatar',
    extension,
  } = args;

  // Determine bucket
  const bucket =
    args.bucket ?? (target === 'backdrop' ? 'companion-backdrops' : 'companion-avatars');

  // Build a unique filename
  const ext =
    extension ??
    (file instanceof File ? file.name.split('.').pop() ?? 'png' : 'png');
  const fileName = `${userId}/${target}-${memberId}-${Date.now()}.${ext}`;

  // ------- Step 1: Upload to storage -------
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      contentType: file instanceof File ? file.type : 'image/png',
      upsert: true,
    });

  if (uploadError) {
    console.error('[CompanionPhoto] Storage upload failed:', uploadError);
    return { success: false, error: 'Photo upload failed — please try again' };
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
  const publicUrl = urlData.publicUrl;

  if (!publicUrl) {
    // Cleanup orphaned file
    await supabase.storage.from(bucket).remove([fileName]);
    return { success: false, error: 'Photo upload failed — please try again' };
  }

  // ------- Step 2: Write URL to connections table -------
  const dbField =
    target === 'backdrop'
      ? 'background_url'
      : target === 'reference'
        ? 'reference_image_url'
        : 'avatar_url';

  const { error: dbError } = await (supabase as any)
    .from('connections')
    .update({ [dbField]: publicUrl })
    .eq('user_id', userId)
    .eq('member_id', memberId);

  if (dbError) {
    console.error('[CompanionPhoto] DB write failed, rolling back storage:', dbError);
    // ------- Step 3: Rollback — delete uploaded file -------
    await supabase.storage.from(bucket).remove([fileName]);
    return { success: false, error: 'Photo upload failed — please try again' };
  }

  logger.log(`[CompanionPhoto] ✅ ${target} saved atomically for ${memberId}`);
  return { success: true, publicUrl };
}

/**
 * Convenience: upload a companion avatar from a remote URL (e.g. AI-generated).
 * Downloads the image first, then runs the atomic upload flow.
 */
export async function uploadCompanionPhotoFromUrl(
  imageUrl: string,
  args: Omit<UploadCompanionPhotoArgs, 'file'>
): Promise<UploadResult | UploadFailure> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return { success: false, error: 'Photo upload failed — please try again' };
    }
    const blob = await response.blob();
    const ext = imageUrl.split('.').pop()?.split('?')[0] ?? 'png';
    return uploadCompanionPhoto({ ...args, file: blob, extension: ext });
  } catch (e) {
    console.error('[CompanionPhoto] Failed to fetch image URL:', e);
    return { success: false, error: 'Photo upload failed — please try again' };
  }
}
