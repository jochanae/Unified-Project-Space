// Client-side shareable PNG win-card generator.
// Renders a branded 1080x1080 (Instagram square) milestone card via canvas
// and returns a Blob + data URL ready for download or Web Share.

export type WinMilestone =
  | 'first_lead'
  | 'lead_milestone'
  | 'first_deploy'
  | 'campaign_winner'
  | 'pulse_high'
  | 'custom';

export interface WinCardInput {
  milestone: WinMilestone;
  headline: string;          // e.g. "First Lead Captured"
  metric?: string;           // e.g. "1 lead"
  subtitle?: string;         // e.g. project name
  brandName?: string;
  /** Hex color, e.g. "#22d3ee" — defaults to the IntoIQ teal */
  accent?: string;
}

export interface WinCardResult {
  blob: Blob;
  dataUrl: string;
  filename: string;
}

const DEFAULT_ACCENT = '#22d3ee';

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 3,
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = w;
      if (lines.length === maxLines - 1) {
        // last line may overflow; truncate with ellipsis if needed
        let last = current;
        for (let i = words.indexOf(w) + 1; i < words.length; i++) {
          last += ` ${words[i]}`;
        }
        while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 0) {
          last = last.slice(0, -1);
        }
        lines.push(`${last}…`);
        return lines;
      }
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

const MILESTONE_LABEL: Record<WinMilestone, string> = {
  first_lead: 'First Lead',
  lead_milestone: 'Lead Milestone',
  first_deploy: 'Funnel Live',
  campaign_winner: 'Winning Campaign',
  pulse_high: 'High Pulse',
  custom: 'Milestone',
};

/**
 * Generate a 1080x1080 PNG win card and return blob + data URL.
 */
export async function generateWinCard(input: WinCardInput): Promise<WinCardResult> {
  const size = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unsupported');

  const accent = input.accent || DEFAULT_ACCENT;

  // Background — Obsidian gradient
  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, '#0a0a0a');
  bg.addColorStop(1, '#141414');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // Accent radial glow
  const glow = ctx.createRadialGradient(size * 0.8, size * 0.2, 50, size * 0.8, size * 0.2, 700);
  glow.addColorStop(0, `${accent}55`);
  glow.addColorStop(1, '#0a0a0a00');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  // Inner card
  const pad = 64;
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  roundedRect(ctx, pad, pad, size - pad * 2, size - pad * 2, 32);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Eyebrow / milestone label
  ctx.fillStyle = accent;
  ctx.font = '600 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText(MILESTONE_LABEL[input.milestone].toUpperCase(), pad + 48, pad + 56);

  // Brand chip (top right)
  if (input.brandName) {
    ctx.font = '500 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif';
    const brandText = input.brandName;
    const brandWidth = ctx.measureText(brandText).width + 28;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    roundedRect(ctx, size - pad - 48 - brandWidth, pad + 48, brandWidth, 36, 18);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(brandText, size - pad - 48 - brandWidth + 14, pad + 56);
  }

  // Big metric
  if (input.metric) {
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 140px -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif';
    ctx.fillText(input.metric, pad + 48, pad + 120);
  }

  // Headline (wrapped)
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 64px -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif';
  const headlineLines = wrapText(ctx, input.headline, size - pad * 2 - 96, 3);
  let y = input.metric ? pad + 320 : pad + 200;
  for (const line of headlineLines) {
    ctx.fillText(line, pad + 48, y);
    y += 80;
  }

  // Subtitle
  if (input.subtitle) {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '400 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif';
    const subLines = wrapText(ctx, input.subtitle, size - pad * 2 - 96, 2);
    y += 24;
    for (const line of subLines) {
      ctx.fillText(line, pad + 48, y);
      y += 40;
    }
  }

  // Footer accent line + wordmark
  const footerY = size - pad - 88;
  ctx.fillStyle = accent;
  roundedRect(ctx, pad + 48, footerY, 64, 4, 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '500 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif';
  ctx.fillText('Built with IntoIQ', pad + 48, footerY + 24);

  // Date stamp (right)
  const dateStr = new Date().toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '400 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(dateStr, size - pad - 48, footerY + 26);
  ctx.textAlign = 'left';

  const dataUrl = canvas.toDataURL('image/png');
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('blob failed'))), 'image/png');
  });

  const filename = `intoiq-${input.milestone}-${Date.now()}.png`;
  return { blob, dataUrl, filename };
}

/**
 * Trigger a download of the generated card.
 */
export function downloadWinCard(result: WinCardResult): void {
  const url = URL.createObjectURL(result.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = result.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Use Web Share API if available (mobile/some desktops), otherwise fall
 * back to download.
 */
export async function shareWinCard(result: WinCardResult, text?: string): Promise<'shared' | 'downloaded'> {
  const file = new File([result.blob], result.filename, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        text: text || 'Built with IntoIQ',
      });
      return 'shared';
    } catch {
      // user cancelled — fall through to download
    }
  }
  downloadWinCard(result);
  return 'downloaded';
}
