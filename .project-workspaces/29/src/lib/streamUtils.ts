// Utility functions for parsing stream URLs (YouTube and Twitch)

export interface StreamInfo {
  platform: 'youtube' | 'twitch' | 'other';
  videoId: string | null;
  channelName: string | null;
  isLive: boolean;
  embedUrl: string | null;
  thumbnailUrl: string | null;
}

// YouTube patterns
const YOUTUBE_LIVE_REGEX = /(?:youtube\.com\/live\/|youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
const YOUTUBE_CHANNEL_LIVE_REGEX = /youtube\.com\/@([^\/\s?]+)\/live/;

// Twitch patterns
const TWITCH_CHANNEL_REGEX = /(?:twitch\.tv\/)([a-zA-Z0-9_]+)/;
const TWITCH_VIDEO_REGEX = /twitch\.tv\/videos\/(\d+)/;

export function parseStreamUrl(url: string): StreamInfo {
  const trimmedUrl = url.trim();
  
  // Check YouTube
  const youtubeMatch = trimmedUrl.match(YOUTUBE_LIVE_REGEX);
  if (youtubeMatch) {
    const videoId = youtubeMatch[1];
    return {
      platform: 'youtube',
      videoId,
      channelName: null,
      isLive: trimmedUrl.includes('/live'),
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
  }

  // Check YouTube channel live
  const youtubeChannelMatch = trimmedUrl.match(YOUTUBE_CHANNEL_LIVE_REGEX);
  if (youtubeChannelMatch) {
    return {
      platform: 'youtube',
      videoId: null,
      channelName: youtubeChannelMatch[1],
      isLive: true,
      embedUrl: null, // Can't embed channel directly
      thumbnailUrl: null,
    };
  }

  // Check Twitch video
  const twitchVideoMatch = trimmedUrl.match(TWITCH_VIDEO_REGEX);
  if (twitchVideoMatch) {
    const videoId = twitchVideoMatch[1];
    return {
      platform: 'twitch',
      videoId,
      channelName: null,
      isLive: false,
      embedUrl: `https://player.twitch.tv/?video=${videoId}&parent=${window.location.hostname}`,
      thumbnailUrl: null,
    };
  }

  // Check Twitch channel
  const twitchMatch = trimmedUrl.match(TWITCH_CHANNEL_REGEX);
  if (twitchMatch) {
    const channelName = twitchMatch[1];
    return {
      platform: 'twitch',
      videoId: null,
      channelName,
      isLive: true,
      embedUrl: `https://player.twitch.tv/?channel=${channelName}&parent=${window.location.hostname}`,
      thumbnailUrl: null,
    };
  }

  // Unknown platform
  return {
    platform: 'other',
    videoId: null,
    channelName: null,
    isLive: false,
    embedUrl: null,
    thumbnailUrl: null,
  };
}

export function getStreamPlatformIcon(platform: string): string {
  switch (platform) {
    case 'youtube':
      return '▶️';
    case 'twitch':
      return '🟣';
    default:
      return '📺';
  }
}

export function isValidStreamUrl(url: string): boolean {
  const info = parseStreamUrl(url);
  return info.platform !== 'other' && (info.videoId !== null || info.channelName !== null);
}
