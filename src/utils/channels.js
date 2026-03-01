import { parseM3U8 } from '@/utils/m3u8Parser';
import {
  isHttpUrl,
  isLikelyM3uSource,
  normalizeIframeSource
} from '@/utils/sourceUtils';

export const PLAYLIST_URL = process.env.NEXT_PUBLIC_PLAYLIST_URL || '';
export const WORLD_PLAYLIST_URL = process.env.NEXT_PUBLIC_WORLD_PLAYLIST_URL || '';
export const FEATURED_JSON_PLAYLIST_URL = process.env.NEXT_PUBLIC_FEATURED_JSON_PLAYLIST || '';

function normalizePlaylistUrl(rawUrl) {
  if (!rawUrl) {
    return '';
  }

  try {
    const parsed = new URL(rawUrl);

    // Normalize GitHub raw refs URL:
    // /owner/repo/refs/heads/main/file.m3u8 -> /owner/repo/main/file.m3u8
    if (parsed.hostname === 'raw.githubusercontent.com') {
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts.length >= 6 && parts[2] === 'refs' && parts[3] === 'heads') {
        const owner = parts[0];
        const repo = parts[1];
        const branch = parts[4];
        const filePath = parts.slice(5).join('/');
        parsed.pathname = `/${owner}/${repo}/${branch}/${filePath}`;
        return parsed.toString();
      }
    }

    // Normalize github.com/blob URL to raw URL.
    if (parsed.hostname === 'github.com') {
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts.length >= 5 && parts[2] === 'blob') {
        const owner = parts[0];
        const repo = parts[1];
        const branch = parts[3];
        const filePath = parts.slice(4).join('/');
        return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
      }
    }
  } catch {
    return rawUrl;
  }

  return rawUrl;
}

function normalizeCategory(category) {
  const cat = (category || 'Uncategorized').toLowerCase().trim();
  
  // Extract primary category from compound categories (e.g., "news;public" -> "news")
  const primary = cat.split(/[;,|]/)[0].trim();
  
  // Capitalize first letter
  return primary.charAt(0).toUpperCase() + primary.slice(1);
}

function sanitizeChannel(channel, index, origin) {
  const id = channel.id || `${origin}-${index + 1}`;
  const name = (channel.name || '').trim() || `Channel ${index + 1}`;
  const logo = (channel.logo || '').trim();
  let type = (channel.type || 'custom').toLowerCase();
  let source = (channel.source || '').trim();
  const category = normalizeCategory(channel.category);
  const language = (channel.language || '').trim();

  if (!source) {
    return null;
  }

  if (type === 'iframe') {
    source = normalizeIframeSource(source);
    if (!source) {
      return null;
    }
  }

  if (isLikelyM3uSource(source)) {
    type = 'm3u8';
  }

  if ((type === 'm3u8' || type === 'iframe') && !isHttpUrl(source)) {
    return null;
  }

  return {
    id,
    name,
    logo,
    type,
    source,
    category,
    language,
    origin
  };
}

async function loadCustomFromUrl(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`Failed to load custom channels: ${response.status}`);
  }

  const payload = await response.json();
  const channels = Array.isArray(payload?.channels) ? payload.channels : [];

  return channels
    .map((channel, index) => sanitizeChannel(channel, index, 'custom'))
    .filter(Boolean);
}

export async function loadPlaylistChannels(options = {}) {
  if (!PLAYLIST_URL) {
    return [];
  }
  return loadPlaylistChannelsFromUrl(PLAYLIST_URL, options);
}

export async function loadPlaylistChannelsFromUrl(url, options = {}) {
  if (!url) {
    return [];
  }

  try {
    const normalizedUrl = normalizePlaylistUrl(url);
    const response = await fetch(normalizedUrl, options);

    if (!response.ok) {
      throw new Error(`Failed to load playlist: ${response.status}`);
    }

    const text = await response.text();
    const parsed = parseM3U8(text, { baseUrl: normalizedUrl });

    // For large playlists, filter by popular categories
    let filtered = parsed;

    if (parsed.length > 1000) {
      const popularCategories = [
        'news', 'sports', 'entertainment', 'movies', 'series', 'music',
        'kids', 'documentary', 'lifestyle', 'general', 'business', 'animation'
      ];
      
      const popularOnly = parsed.filter((channel) => {
        const cat = channel.category?.toLowerCase() || '';
        return popularCategories.some(pop => cat.includes(pop));
      });

      // If category filtering removes everything, keep original parsed list.
      filtered = popularOnly.length ? popularOnly : parsed;
    }

    return filtered
      .map((channel, index) => sanitizeChannel(channel, index, 'playlist'))
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function loadCustomChannels(options = {}) {
  try {
    return await loadCustomFromUrl(FEATURED_JSON_PLAYLIST_URL, options);
  } catch {
    return [];
  }
}

export function mergeChannels(playlistChannels, customChannels) {
  const seen = new Set();

  const merged = [...playlistChannels, ...customChannels].filter((channel) => {
    const key = `${channel.name.toLowerCase()}|${channel.source}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });

  const startsWithLetterOrDigit = (value) => /^[a-z0-9]/i.test(value.trim());
  const normalizedName = (value) => value.trim().replace(/^[^a-z0-9]+/i, '').toLowerCase();

  return merged.sort((a, b) => {
    const aPrimary = startsWithLetterOrDigit(a.name);
    const bPrimary = startsWithLetterOrDigit(b.name);

    if (aPrimary !== bPrimary) {
      return aPrimary ? -1 : 1;
    }

    const byName = normalizedName(a.name).localeCompare(normalizedName(b.name), undefined, {
      numeric: true,
      sensitivity: 'base'
    });

    if (byName !== 0) {
      return byName;
    }

    return a.name.localeCompare(b.name, undefined, {
      numeric: true,
      sensitivity: 'base'
    });
  });
}
