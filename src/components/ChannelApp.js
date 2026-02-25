'use client';

import ChannelBrowser from '@/components/ChannelBrowser';
import LoadStatePanel from '@/components/LoadStatePanel';
import useAdsConfig from '@/hooks/useAdsConfig';
import useCachedChannelLoader from '@/hooks/useCachedChannelLoader';
import { loadPlaylistChannels } from '@/utils/channels';

const CACHE_KEY = 'bdiptv_channels_cache';
const METRIC_CONTEXT = {};
const LOG_CONTEXT = {};

export default function ChannelApp() {
  const adsConfig = useAdsConfig();
  const { status, channels, retry } = useCachedChannelLoader({
    cacheKey: CACHE_KEY,
    loadChannels: loadPlaylistChannels,
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
      <ChannelBrowser channels={channels} adsConfig={adsConfig} />
    </main>
  );
}
