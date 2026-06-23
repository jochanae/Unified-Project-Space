import { toBlob } from 'html-to-image';
import QRCode from 'qrcode';

/**
 * Render a DOM node to a PNG Blob at a target pixel resolution.
 * Uses html-to-image with a pixelRatio scaled to hit the requested width.
 */
export async function renderNodeToBlob(
  node: HTMLElement,
  targetWidth: number,
): Promise<Blob> {
  const measured = node.getBoundingClientRect().width || targetWidth;
  const pixelRatio = Math.max(1, Math.min(4, targetWidth / measured));
  const blob = await toBlob(node, {
    pixelRatio,
    cacheBust: true,
    backgroundColor: '#0a0a0f',
  });
  if (!blob) throw new Error('Render failed');
  return blob;
}

/**
 * Generate a QR code as a data URL with brand-styled colors.
 */
export async function generateQrDataUrl(
  url: string,
  options: { dark?: string; light?: string; size?: number } = {},
): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: options.size ?? 512,
    color: {
      dark: options.dark ?? '#0a0a0f',
      light: options.light ?? '#ffffff',
    },
  });
}

/** Trigger a browser download for a Blob. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}
