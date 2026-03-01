'use client';

import { useEffect, useState } from 'react';
import {
  WORLD_PLAYLIST_URL,
  loadCustomChannels,
  loadPlaylistChannels,
  loadPlaylistChannelsFromUrl,
  mergeChannels
} from '@/utils/channels';

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_KEYS = [
  'bdiptv_channels_cache',
  'bdiptv_featuring_channels_cache',
  'bdiptv_world_channels_cache'
];

let cachedCatalog = null;
let cachedAt = 0;
let inFlight = null;

function readSessionCacheChannels() {
  if (typeof window === 'undefined') {
    return [];
  }

  const buckets = [];
  for (const key of CACHE_KEYS) {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) {
      continue;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.channels) && parsed.channels.length > 0) {
        buckets.push(parsed.channels);
      }
    } catch {
      // ignore corrupted cache
    }
  }

  if (buckets.length === 0) {
    return [];
  }

  const [first, ...rest] = buckets;
  return rest.reduce((acc, current) => mergeChannels(acc, current), first);
}

async function loadCatalog() {
  const now = Date.now();
  if (cachedCatalog && now - cachedAt < CACHE_TTL_MS) {
    return cachedCatalog;
  }

  if (!inFlight) {
    inFlight = (async () => {
      const [playlist, featuring, world] = await Promise.all([
        loadPlaylistChannels(),
        loadCustomChannels(),
        WORLD_PLAYLIST_URL ? loadPlaylistChannelsFromUrl(WORLD_PLAYLIST_URL) : Promise.resolve([])
      ]);

      const mergedBase = mergeChannels(playlist, featuring);
      const mergedAll = mergeChannels(mergedBase, world);
      cachedCatalog = mergedAll;
      cachedAt = Date.now();
      return mergedAll;
    })().finally(() => {
      inFlight = null;
    });
  }

  return inFlight;
}

export default function useChannelCatalog({ enabled = true } = {}) {
  const [channels, setChannels] = useState(() => readSessionCacheChannels());
  const [isLoading, setIsLoading] = useState(enabled && channels.length === 0);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return undefined;
    }

    let isActive = true;

    async function run() {
      try {
        const loadedChannels = await loadCatalog();
        if (!isActive) {
          return;
        }
        setChannels(loadedChannels);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    run();
    return () => {
      isActive = false;
    };
  }, [enabled]);

  return { channels, isLoading };
}
