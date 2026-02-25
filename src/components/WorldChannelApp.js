'use client';

import ChannelBrowser from '@/components/ChannelBrowser';
import LoadStatePanel from '@/components/LoadStatePanel';
import useAdsConfig from '@/hooks/useAdsConfig';
import useCachedChannelLoader from '@/hooks/useCachedChannelLoader';
import {
  WORLD_PLAYLIST_URL,
  loadPlaylistChannelsFromUrl
} from '@/utils/channels';

const CACHE_KEY = 'bdiptv_world_channels_cache';
const METRIC_CONTEXT = { page: 'world' };
const LOG_CONTEXT = { page: 'world' };
const loadWorldChannels = () => loadPlaylistChannelsFromUrl(WORLD_PLAYLIST_URL);

export default function WorldChannelApp() {
  const adsConfig = useAdsConfig();
  const { status, channels, retry } = useCachedChannelLoader({
    cacheKey: CACHE_KEY,
    loadChannels: loadWorldChannels,
    metricContext: METRIC_CONTEXT,
    logContext: LOG_CONTEXT,
    getLoadedEventData: (loadedChannels) => ({
      playlistCount: loadedChannels.length,
      customCount: 0
    })
  });

  if (status !== 'ready') {
    return (
      <LoadStatePanel
        status={status}
        onRetry={retry}
        errorMessage="Check your network on this device and try again."
      />
    );
  }

  return (
    <main>
      <ChannelBrowser
        channels={channels}
        adsConfig={adsConfig}
        eyebrow="Global Playlist"
        title="World IPTV"
      />
    </main>
  );
}
