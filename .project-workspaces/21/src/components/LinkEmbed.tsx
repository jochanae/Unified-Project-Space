import { useMemo } from 'react';
import { Play, ExternalLink, Music } from 'lucide-react';

interface LinkEmbedProps {
  url: string;
  compact?: boolean;
}

interface ParsedEmbed {
  type: 'youtube' | 'spotify' | 'generic';
  embedUrl?: string;
  title?: string;
  thumbnail?: string;
  domain: string;
}

function parseUrl(url: string): ParsedEmbed | null {
  try {
    const u = new URL(url);

    // YouTube
    const ytMatch =
      u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be');
    if (ytMatch) {
      let videoId: string | null = null;
      if (u.hostname.includes('youtu.be')) {
        videoId = u.pathname.slice(1);
      } else {
        videoId = u.searchParams.get('v');
      }
      if (videoId) {
        return {
          type: 'youtube',
          embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`,
          thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          domain: 'youtube.com',
        };
      }
    }

    // Spotify
    if (u.hostname.includes('spotify.com')) {
      // e.g. /track/abc, /album/abc, /playlist/abc
      const pathMatch = u.pathname.match(/\/(track|album|playlist)\/([a-zA-Z0-9]+)/);
      if (pathMatch) {
        const [, type, id] = pathMatch;
        return {
          type: 'spotify',
          embedUrl: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`,
          domain: 'spotify.com',
          title: `Spotify ${type}`,
        };
      }
    }

    // Generic link — just show domain
    return {
      type: 'generic',
      domain: u.hostname.replace('www.', ''),
    };
  } catch {
    return null;
  }
}

/** Extract the first URL from a text string */
export function extractUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/i);
  return match ? match[0] : null;
}

/** Get non-URL text from a message (for display alongside the embed) */
export function getTextWithoutUrl(text: string, url: string): string {
  return text.replace(url, '').trim();
}

/** Describe a shared link for AI companion context */
export function describeLinkForAI(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be'))
      return '[shared a YouTube video]';
    if (u.hostname.includes('spotify.com'))
      return '[shared a Spotify link]';
    return `[shared a link from ${u.hostname.replace('www.', '')}]`;
  } catch {
    return '[shared a link]';
  }
}

export default function LinkEmbed({ url, compact = false }: LinkEmbedProps) {
  const parsed = useMemo(() => parseUrl(url), [url]);
  if (!parsed) return null;

  if (parsed.type === 'youtube') {
    return (
      <div className="mt-2 rounded-xl overflow-hidden border border-border/30">
        <div className="relative w-full" style={{ paddingBottom: compact ? '50%' : '56.25%' }}>
          <iframe
            src={parsed.embedUrl}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            title="YouTube video"
          />
        </div>
      </div>
    );
  }

  if (parsed.type === 'spotify') {
    const height = compact ? 80 : 152;
    return (
      <div className="mt-2 rounded-xl overflow-hidden">
        <iframe
          src={parsed.embedUrl}
          width="100%"
          height={height}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="rounded-xl border-0"
          title="Spotify embed"
        />
      </div>
    );
  }

  // Generic link card
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex items-center gap-2.5 rounded-xl px-3 py-2.5 border border-border/30 bg-muted/30 hover:bg-muted/50 transition-colors group"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <ExternalLink className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate group-hover:underline">{url}</p>
        <p className="text-[10px] text-muted-foreground">{parsed.domain}</p>
      </div>
    </a>
  );
}
