'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ChannelFiltersBar from '@/components/ChannelFiltersBar';
import PaginationFooter from '@/components/PaginationFooter';
import PlayerWithSidebar from '@/components/PlayerWithSidebar';
import ChannelGrid from '@/components/ChannelGrid';
import AdSlot from '@/components/AdSlot';
import useAdsConfig from '@/hooks/useAdsConfig';
import useChannelFilteringPagination from '@/hooks/useChannelFilteringPagination';
import useNativeAdActions from '@/hooks/useNativeAdActions';
import { isHttpUrl, normalizeIframeSource } from '@/utils/sourceUtils';
import { loadPlaylistChannelsFromUrl } from '@/utils/channels';
import { logEvent } from '@/utils/telemetry';

function resolveType(url, selectedType) {
  if (selectedType !== 'auto') {
    return selectedType;
  }

  const lowered = url.toLowerCase();
  if (lowered.includes('.m3u8') || lowered.includes('.m3u')) {
    return 'm3u8';
  }

  if (lowered.includes('<iframe') || lowered.includes('youtube.com/embed')) {
    return 'iframe';
  }

  return 'custom';
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getQueryParam(search, key) {
  const query = search.startsWith('?') ? search.slice(1) : search;
  if (!query) {
    return '';
  }

  const parts = query.split('&');
  for (const part of parts) {
    if (!part) {
      continue;
    }
    const [rawKey, ...rawValueParts] = part.split('=');
    if (safeDecode(rawKey) !== key) {
      continue;
    }
    const rawValue = rawValueParts.join('=').replace(/\+/g, ' ');
    return safeDecode(rawValue);
  }

  return '';
}

function isM3uPlaylistUrl(value) {
  return /\.m3u([?#]|$)/i.test(value);
}

function isLikelyMediaSegmentUrl(value) {
  return /\.(ts|m4s|mp4|m4a|aac|vtt|webvtt)([?#]|$)/i.test(value);
}

function isLikelyChannelPlaylist(parsedChannels) {
  if (!Array.isArray(parsedChannels) || parsedChannels.length < 2) {
    return false;
  }

  return parsedChannels.every((channel) => !isLikelyMediaSegmentUrl(channel?.source || ''));
}

export default function CustomUrlPlayerPage() {
  const [customUrl, setCustomUrl] = useState('');
  const [customType, setCustomType] = useState('auto');
  const [customError, setCustomError] = useState('');
  const [hideUrlInputBar, setHideUrlInputBar] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [playlistChannels, setPlaylistChannels] = useState([]);
  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false);
  const autoLoadKeyRef = useRef('');
  const adsConfig = useAdsConfig();
  const {
    maybeShowInterstitial,
    showRewarded,
    rewardedEnabled,
    rewardedLabel,
    isRewardedLoading
  } = useNativeAdActions(adsConfig);

  const showAds = adsConfig?.enabled || false;
  const {
    query,
    setQuery,
    category,
    setCategory,
    page,
    setPage,
    categories,
    filteredChannels: filteredPlaylistChannels,
    pagedChannels: pagedPlaylistChannels,
    totalPages,
    rangeStart,
    rangeEnd
  } = useChannelFilteringPagination({ channels: playlistChannels });
  const totalChannels = playlistChannels.length;
  const filteredCount = filteredPlaylistChannels.length;
  const hasActiveFilters = query.trim().length > 0 || category !== 'all';

  const playCustomUrl = useCallback(async ({ value, selectedType, name }) => {
    if (!value) {
      setCustomError('Enter a stream URL first.');
      return;
    }

    const resolvedType = resolveType(value, selectedType);

    if (resolvedType === 'iframe') {
      const iframeSrc = normalizeIframeSource(value);
      if (!iframeSrc) {
        setCustomError('Invalid iframe source.');
        return;
      }
    } else if (!isHttpUrl(value)) {
      setCustomError('Enter a valid HTTP/HTTPS URL.');
      return;
    }

    const shouldTryPlaylistParse =
      resolvedType === 'm3u8' &&
      (isM3uPlaylistUrl(value) || selectedType === 'm3u8');

    if (shouldTryPlaylistParse) {
      setIsLoadingPlaylist(true);
      try {
        const parsedChannels = await loadPlaylistChannelsFromUrl(value);

        if (isLikelyChannelPlaylist(parsedChannels)) {
          const nameMatch = name
            ? parsedChannels.find((channel) => channel.name?.trim() === name)
            : null;
          setPlaylistChannels(parsedChannels);
          setQuery('');
          setCategory('all');
          setPage(1);
          setSelectedChannel(nameMatch || parsedChannels[0]);
          setCustomError('');
          logEvent('custom_playlist_loaded', { count: parsedChannels.length });
          return;
        }
      } finally {
        setIsLoadingPlaylist(false);
      }
    } else {
      setPlaylistChannels([]);
      setQuery('');
      setCategory('all');
      setPage(1);
      setIsLoadingPlaylist(false);
    }

    setPlaylistChannels([]);
    setSelectedChannel({
      id: `custom-url-${Date.now()}`,
      name: name || 'Custom URL Stream',
      logo: '',
      type: resolvedType,
      source: value,
      category: 'User Stream',
      language: '',
      origin: 'custom'
    });

    setCustomError('');
    logEvent('custom_url_played', { type: resolvedType });
    void maybeShowInterstitial('channelSwitch');
  }, [maybeShowInterstitial, setCategory, setPage, setQuery]);

  const handlePlayCustomUrl = async () => {
    await playCustomUrl({
      value: customUrl.trim(),
      selectedType: customType,
      name: ''
    });
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const urlParam = getQueryParam(window.location.search, 'url').trim();
    if (!urlParam) {
      return;
    }

    const typeParam = (getQueryParam(window.location.search, 'type') || 'auto').trim().toLowerCase();
    const validType = ['auto', 'm3u8', 'iframe', 'custom'].includes(typeParam) ? typeParam : 'auto';
    const nameParam = getQueryParam(window.location.search, 'name').trim();
    const key = `${urlParam}|${validType}|${nameParam}`;
    if (autoLoadKeyRef.current === key) {
      return;
    }
    autoLoadKeyRef.current = key;
    setHideUrlInputBar(true);

    // Keep redirected channel URL out of the visible input.
    setCustomUrl('');
    setCustomType(validType);
    playCustomUrl({
      value: urlParam,
      selectedType: validType,
      name: nameParam
    });
  }, [playCustomUrl]);

  const handleSelectPlaylistChannel = (channel) => {
    setSelectedChannel(channel);
    logEvent('custom_playlist_channel_selected', { id: channel.id, name: channel.name });
    void maybeShowInterstitial('channelSwitch');
  };

  return (
    <main>
      <div className="space-y-5 md:space-y-7">
        <section className="space-y-3 md:space-y-4">
          {!hideUrlInputBar ? (
            <div className="space-y-4 rounded-xl border border-steel/20 bg-white/80 px-4 py-3 shadow-card">
              <div className="grid gap-2.5 md:grid-cols-[1fr_auto_auto] md:items-center">
                <input
                  value={customUrl}
                  onChange={(event) => setCustomUrl(event.target.value)}
                  placeholder="Paste stream URL (m3u8 / iframe / mp4)"
                  className="rounded-lg border border-steel/20 bg-white px-3 py-2.5 text-sm outline-none"
                />
                <select
                  value={customType}
                  onChange={(event) => setCustomType(event.target.value)}
                  className="rounded-lg border border-steel/20 bg-white px-3 py-2.5 text-sm outline-none"
                >
                  <option value="auto">Auto type</option>
                  <option value="m3u8">M3U8</option>
                  <option value="iframe">Iframe</option>
                  <option value="custom">Custom URL</option>
                </select>
                <button
                  type="button"
                  onClick={handlePlayCustomUrl}
                  disabled={isLoadingPlaylist}
                  className="rounded-lg bg-sea px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0089d6] disabled:opacity-70"
                >
                  {isLoadingPlaylist ? 'Loading playlist...' : 'Play IPTV'}
                </button>
              </div>
              {customError ? <p className="text-xs text-rose-700">{customError}</p> : null}
            </div>
          ) : null}

          {/* Ad Slot 1: Header Banner */}
          {showAds && adsConfig?.slots?.header?.enabled && <AdSlot slot="header" adsConfig={adsConfig} />}

          <PlayerWithSidebar
            selectedChannel={selectedChannel}
            autoplay={Boolean(selectedChannel)}
            showAds={showAds}
            adsConfig={adsConfig}
            showRewardedCta={rewardedEnabled}
            rewardedCtaLabel={rewardedLabel}
            isRewardedCtaLoading={isRewardedLoading}
            onRewardedCtaClick={() => {
              void showRewarded('unlockStream');
            }}
            emptyTitle="No stream loaded"
            emptySubtitle="Enter a URL to start streaming."
            getMetaText={(channel) => `${channel.type.toUpperCase()} stream`}
          />
        </section>

        {playlistChannels.length > 0 ? (
          <section className="space-y-4 rounded-2xl border border-steel/20 bg-white/90 p-3.5 shadow-card md:p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-steel">Channel Browser</p>
              <span className="rounded-full bg-sea/15 px-3 py-1 text-xs font-semibold text-sea">
                Available: {totalChannels}
                {hasActiveFilters ? ` · Filtered: ${filteredCount}` : ''}
              </span>
            </div>

            <ChannelFiltersBar
              query={query}
              onQueryChange={setQuery}
              category={category}
              onCategoryChange={setCategory}
              categories={categories}
              queryPlaceholder="Search playlist channels"
            />

            <ChannelGrid
              channels={pagedPlaylistChannels}
              selectedChannel={selectedChannel}
              onSelect={handleSelectPlaylistChannel}
              showAds={showAds && adsConfig?.slots?.inFeed?.enabled}
              adsConfig={adsConfig}
            />

            <PaginationFooter
              page={page}
              totalPages={totalPages}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              totalCount={filteredPlaylistChannels.length}
              onPrevious={() => setPage((value) => Math.max(1, value - 1))}
              onNext={() => setPage((value) => Math.min(totalPages, value + 1))}
            />
          </section>
        ) : null}
      </div>
      {/* Ad Slot 3: Below Player */}
      {showAds && adsConfig?.slots?.belowPlayer?.enabled && <AdSlot slot="belowPlayer" adsConfig={adsConfig} />}
    </main>
  );
}
