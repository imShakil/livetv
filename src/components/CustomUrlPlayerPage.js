'use client';

import { useEffect, useMemo, useState } from 'react';
import ChannelFiltersBar from '@/components/ChannelFiltersBar';
import PaginationFooter from '@/components/PaginationFooter';
import PlayerWithSidebar from '@/components/PlayerWithSidebar';
import ChannelGrid from '@/components/ChannelGrid';
import AdSlot from '@/components/AdSlot';
import useAdsConfig from '@/hooks/useAdsConfig';
import { isHttpUrl, normalizeIframeSource } from '@/utils/sourceUtils';
import { loadPlaylistChannelsFromUrl } from '@/utils/channels';
import { logEvent } from '@/utils/telemetry';

const PAGE_SIZE = 12;

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

export default function CustomUrlPlayerPage() {
  const [customUrl, setCustomUrl] = useState('');
  const [customType, setCustomType] = useState('auto');
  const [customError, setCustomError] = useState('');
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [playlistChannels, setPlaylistChannels] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false);
  const adsConfig = useAdsConfig();

  const showAds = adsConfig?.enabled || false;
  const categories = useMemo(() => {
    const values = new Set(playlistChannels.map((item) => item.category).filter(Boolean));
    return ['all', ...Array.from(values).sort((a, b) => a.localeCompare(b))];
  }, [playlistChannels]);

  const filteredPlaylistChannels = useMemo(() => {
    return playlistChannels.filter((channel) => {
      const matchedQuery = channel.name.toLowerCase().includes(query.toLowerCase().trim());
      const matchedCategory = category === 'all' || channel.category === category;
      return matchedQuery && matchedCategory;
    });
  }, [playlistChannels, query, category]);
  const totalPages = Math.max(1, Math.ceil(filteredPlaylistChannels.length / PAGE_SIZE));
  const pagedPlaylistChannels = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredPlaylistChannels.slice(start, start + PAGE_SIZE);
  }, [filteredPlaylistChannels, page]);

  const rangeStart = filteredPlaylistChannels.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd = filteredPlaylistChannels.length
    ? Math.min(page * PAGE_SIZE, filteredPlaylistChannels.length)
    : 0;

  useEffect(() => {
    setPage(1);
  }, [query, category]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handlePlayCustomUrl = async () => {
    const value = customUrl.trim();
    if (!value) {
      setCustomError('Enter a stream URL first.');
      return;
    }

    const resolvedType = resolveType(value, customType);

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

    if (resolvedType === 'm3u8') {
      setIsLoadingPlaylist(true);
      try {
        const parsedChannels = await loadPlaylistChannelsFromUrl(value);

        if (parsedChannels.length > 0) {
          setPlaylistChannels(parsedChannels);
          setQuery('');
          setCategory('all');
          setPage(1);
          setSelectedChannel(parsedChannels[0]);
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
      name: 'Custom URL Stream',
      logo: '',
      type: resolvedType,
      source: value,
      category: 'User Stream',
      language: '',
      origin: 'custom'
    });

    setCustomError('');
    logEvent('custom_url_played', { type: resolvedType });
  };

  const handleSelectPlaylistChannel = (channel) => {
    setSelectedChannel(channel);
    logEvent('custom_playlist_channel_selected', { id: channel.id, name: channel.name });
  };

  return (
    <main>
      <div className="space-y-5 md:space-y-7">
        <section className="space-y-3 md:space-y-4">
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
                className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-steel"
              >
                {isLoadingPlaylist ? 'Loading playlist...' : 'Play URL'}
              </button>
            </div>
            {customError ? <p className="text-xs text-rose-700">{customError}</p> : null}
          </div>

          {/* Ad Slot 1: Header Banner */}
          {showAds && adsConfig?.slots?.header?.enabled && <AdSlot slot="header" adsConfig={adsConfig} />}

          <PlayerWithSidebar
            selectedChannel={selectedChannel}
            autoplay={Boolean(selectedChannel)}
            showAds={showAds}
            adsConfig={adsConfig}
            emptyTitle="No stream loaded"
            emptySubtitle="Enter a URL to start streaming."
            getMetaText={(channel) => `${channel.type.toUpperCase()} stream`}
          />
        </section>

        {playlistChannels.length > 0 ? (
          <section className="space-y-4 rounded-2xl border border-steel/20 bg-white/90 p-3.5 shadow-card md:p-4">
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
              showAds={false}
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
