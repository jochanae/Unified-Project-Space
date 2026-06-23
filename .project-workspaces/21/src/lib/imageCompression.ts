/**
 * Client-side image compression utility.
 * Resizes and compresses images before upload to avoid size limits.
 */

const MAX_DIMENSION = 2048;
const TARGET_SIZE_BYTES = 4 * 1024 * 1024; // 4MB target

export async function compressImage(file: File, maxSizeMB = 5): Promise<File> {
  // If already small enough, return as-is
  if (file.size <= maxSizeMB * 1024 * 1024) return file;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Scale down if too large
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas context failed')); return; }

      ctx.drawImage(img, 0, 0, width, height);

      // Try progressively lower quality until under target
      let quality = 0.85;
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('Compression failed')); return; }

            if (blob.size <= TARGET_SIZE_BYTES || quality <= 0.3) {
              const compressed = new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressed);
            } else {
              quality -= 0.15;
              tryCompress();
            }
          },
          'image/jpeg',
          quality
        );
      };

      tryCompress();
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for compression'));
    };

    img.src = url;
  });
}
