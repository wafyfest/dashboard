/**
 * YouTube URL validation and helper utility for WafyFest Special Events System.
 */

export const YOUTUBE_UI = {
  FIELD_LABEL: 'YouTube Video Link',
  PLACEHOLDER: 'https://www.youtube.com/watch?v=...',
  BUTTON_SUBMIT: 'Submit YouTube Link',
  SUCCESS_MESSAGE: 'YouTube video link submitted successfully.',
} as const;

// Robust YouTube URL regex supporting:
// - Standard watch: youtube.com/watch?v=... (with arbitrary query parameters)
// - Shortened: youtu.be/...
// - Shorts: youtube.com/shorts/...
// - Live streams: youtube.com/live/...
// - Embeds: youtube.com/embed/...
const YOUTUBE_REGEX =
  /^(https?:\/\/)?((www|m)\.)?(youtube(-nocookie)?\.com\/(watch\?(.*&)?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})([?&]\S*)?$/;

/**
 * Validates whether the given URL is a legitimate YouTube video, shorts, live, or youtu.be link.
 */
export function isValidYouTubeUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.length === 0) return false;
  return YOUTUBE_REGEX.test(trimmed);
}

/**
 * Extracts the 11-character video ID from a YouTube URL.
 */
export function extractYouTubeVideoId(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!isValidYouTubeUrl(trimmed)) return null;

  // 1. youtu.be/<id>
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  // 2. youtube.com/(shorts|live|embed)/<id>
  const pathMatch = trimmed.match(/youtube(?:-nocookie)?\.com\/(?:shorts|live|embed)\/([a-zA-Z0-9_-]{11})/);
  if (pathMatch) return pathMatch[1];

  // 3. youtube.com/watch?v=<id> (handles parameters before or after v=)
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];

  return null;
}

/**
 * Generates an embedded YouTube player URL.
 * Uses youtube-nocookie.com to minimize third-party tracking, ad calls, and CORS warnings.
 */
export function getYouTubeEmbedUrl(url: string | null | undefined): string | null {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
}

/**
 * Formats a canonical watch URL for display.
 */
export function getCanonicalYouTubeWatchUrl(url: string | null | undefined): string | null {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;
  return `https://www.youtube.com/watch?v=${videoId}`;
}
