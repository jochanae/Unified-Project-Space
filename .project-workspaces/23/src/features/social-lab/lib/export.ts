import JSZip from 'jszip';
import type { SocialCampaign } from '../types';
import { PLATFORM_META } from '../types';

function fmtHashtags(tags: string[]): string {
  return tags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ');
}

function fullText(p: SocialCampaign): string {
  const tags = p.hashtags?.length ? `\n\n${fmtHashtags(p.hashtags)}` : '';
  const cta = p.cta ? `\n\nCTA: ${p.cta}` : '';
  return `${p.hook}\n\n${p.body}${tags}${cta}`;
}

function safeSlug(s: string): string {
  return (s || 'post').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

/** Build a clean Markdown document of all posts, grouped by platform. */
export function buildMarkdown(posts: SocialCampaign[]): string {
  if (!posts.length) return '# Social Lab Export\n\n_No posts to export._\n';
  const stamp = new Date().toISOString().split('T')[0];
  const byPlatform = new Map<string, SocialCampaign[]>();
  posts.forEach((p) => {
    const arr = byPlatform.get(p.platform) ?? [];
    arr.push(p);
    byPlatform.set(p.platform, arr);
  });

  const lines: string[] = [
    `# Social Lab Export`,
    ``,
    `_Generated ${stamp} · ${posts.length} post${posts.length === 1 ? '' : 's'}_`,
    ``,
  ];

  for (const [platform, items] of byPlatform) {
    const meta = PLATFORM_META[platform as keyof typeof PLATFORM_META];
    lines.push(`## ${meta?.icon ?? ''} ${meta?.label ?? platform}`, '');
    items
      .slice()
      .sort((a, b) => (a.narrative_day ?? 99) - (b.narrative_day ?? 99))
      .forEach((p, i) => {
        const dayLabel = p.narrative_day ? `Day ${p.narrative_day}` : `Post ${i + 1}`;
        const role = p.narrative_role ? ` — ${p.narrative_role}` : '';
        lines.push(`### ${dayLabel}${role}`, '');
        lines.push(`**Hook:** ${p.hook}`, '');
        lines.push(p.body, '');
        if (p.hashtags?.length) lines.push(`*${fmtHashtags(p.hashtags)}*`, '');
        if (p.cta) lines.push(`**CTA:** ${p.cta}`, '');
        if (p.media_suggestion) lines.push(`> 🎬 ${p.media_suggestion}`, '');
        if (p.audio_suggestion) lines.push(`> 🎵 ${p.audio_suggestion}`, '');
        lines.push('---', '');
      });
  }

  return lines.join('\n');
}

/** Build a CSV compatible with Buffer / Hootsuite / Later bulk-import patterns. */
export function buildSchedulerCsv(posts: SocialCampaign[]): string {
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const columns = [
    'platform',
    'content_type',
    'narrative_day',
    'narrative_role',
    'content',
    'hashtags',
    'cta',
    'media_suggestion',
    'audio_suggestion',
    'scheduled_date',
    'status',
  ];
  const header = columns.join(',');
  const rows = posts.map((p) => {
    const content = `${p.hook}\n\n${p.body}`;
    const row: Record<string, unknown> = {
      platform: p.platform,
      content_type: p.content_type,
      narrative_day: p.narrative_day ?? '',
      narrative_role: p.narrative_role ?? '',
      content,
      hashtags: p.hashtags?.length ? fmtHashtags(p.hashtags) : '',
      cta: p.cta ?? '',
      media_suggestion: p.media_suggestion ?? '',
      audio_suggestion: p.audio_suggestion ?? '',
      scheduled_date: p.scheduled_at ?? '',
      status: p.status,
    };
    return columns.map((c) => escape(row[c])).join(',');
  });
  return `${header}\n${rows.join('\n')}`;
}

/** Build a ZIP with one .txt per post, organised by platform/. */
export async function buildPlatformBundleZip(posts: SocialCampaign[]): Promise<Blob> {
  const zip = new JSZip();
  const counters = new Map<string, number>();

  posts.forEach((p) => {
    const folder = p.platform;
    const dayPart = p.narrative_day ? `day-${String(p.narrative_day).padStart(2, '0')}` : null;
    const slug = safeSlug(p.hook);
    const key = `${folder}/${dayPart ?? slug}`;
    const n = (counters.get(key) ?? 0) + 1;
    counters.set(key, n);
    const suffix = n > 1 ? `-${n}` : '';
    const filename = dayPart
      ? `${folder}/${dayPart}-${slug}${suffix}.txt`
      : `${folder}/${slug}${suffix}.txt`;
    zip.file(filename, fullText(p));
  });

  const stamp = new Date().toISOString().split('T')[0];
  zip.file(
    'README.txt',
    `IntoIQ Social Lab Export — ${stamp}\n${posts.length} post${posts.length === 1 ? '' : 's'} across ${new Set(posts.map((p) => p.platform)).size} platform(s).\n\nFiles are grouped by platform. Each .txt contains the hook, body, hashtags, and CTA ready to paste.\n`,
  );

  return zip.generateAsync({ type: 'blob' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 200);
}

export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}
