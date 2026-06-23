/**
 * Extracts YouTube video ID from various URL formats
 */
export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Checks if text contains a YouTube URL
 */
export function containsYouTubeUrl(text: string): boolean {
  return /(?:youtube\.com|youtu\.be)/.test(text);
}

/**
 * Gets the embed URL for a YouTube video
 */
export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * Gets the thumbnail URL for a YouTube video
 */
export function getYouTubeThumbnail(videoId: string, quality: 'default' | 'medium' | 'high' | 'max' = 'medium'): string {
  const qualityMap = {
    default: 'default',
    medium: 'mqdefault',
    high: 'hqdefault',
    max: 'maxresdefault',
  };
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}

/**
 * Renders text with YouTube links converted to embeds
 */
export function parseYouTubeLinks(text: string): { text: string; videoIds: string[] } {
  const videoIds: string[] = [];
  const urlPattern = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})(?:\S*)?/g;
  
  let match;
  while ((match = urlPattern.exec(text)) !== null) {
    if (!videoIds.includes(match[1])) {
      videoIds.push(match[1]);
    }
  }

  // Remove the URLs from text for cleaner display
  const cleanText = text.replace(urlPattern, '').trim();
  
  return { text: cleanText, videoIds };
}
