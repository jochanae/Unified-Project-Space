import { useSignedUrl } from '@/hooks/useSignedUrl';

interface ReceiptImageProps {
  src: string | null | undefined;
  alt?: string;
  className?: string;
}

/**
 * Displays a receipt image using a signed URL from the private receipts bucket.
 * Handles both legacy public URLs and new storage paths.
 */
export function ReceiptImage({ src, alt = "Receipt", className = "w-full h-32 object-cover rounded-lg border" }: ReceiptImageProps) {
  const signedUrl = useSignedUrl(src, 'receipts');

  if (!signedUrl) return null;

  return <img src={signedUrl} alt={alt} className={className} />;
}
