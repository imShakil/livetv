'use client';

import { useEffect, useMemo, useState } from 'react';
import { ListFilter, Search } from 'lucide-react';
import VideoPlayer from '@/components/VideoPlayer';
import ChannelGrid from '@/components/ChannelGrid';
import AdSlot from '@/components/AdSlot';
import LiveVisitorCount from '@/components/LiveVisitorCount';
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

export default function CustomUrlPlayerPage() {
  const [customUrl, setCustomUrl] = useState('');
  const [customType, setCustomType] = useState('auto');
  const [customError, setCustomError] = useState('');
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [playlistChannels, setPlaylistChannels] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false);
  const [adsConfig, setAdsConfig] = useState(null);

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

  useEffect(() => {
    // Load ads config
    fetch('/data/ads.json')
      .then(res => res.json())
      .then(data => setAdsConfig(data))
      .catch(() => setAdsConfig({ enabled: false }));
  }, []);

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

          <div className="grid gap-3 md:gap-4 lg:grid-cols-[minmax(0,2.3fr)_minmax(0px,1fr)]">
            <div>
              <VideoPlayer channel={selectedChannel} autoplay={Boolean(selectedChannel)} />
            </div>

            <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-steel/20 bg-white/85 p-4 shadow-card md:p-5">
              <div className="rounded-xl border border-sea/30 bg-cyan-50 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-steel/80">Now Playing</p>
                  <div className="flex items-center gap-1.5">
                    {selectedChannel ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-rose-700">
                        <span className="relative inline-flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-600" />
                        </span>
                        Live
                      </span>
                    ) : null}
                    <span className="inline-flex rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold tracking-[0.02em] text-steel">
                      <LiveVisitorCount compact />
                    </span>
                  </div>
                </div>
                <p className="truncate pt-1 text-base font-semibold text-ink">
                  {selectedChannel ? selectedChannel.name : 'No stream loaded'}
                </p>
                {selectedChannel ? (
                  <p className="truncate text-xs text-steel">
                    {selectedChannel.type.toUpperCase()} stream
                  </p>
                ) : (
                  <p className="truncate text-xs text-steel">Enter a URL to start streaming.</p>
                )}

              </div>
              {/* Ad Slot 2: Sidebar Banner */}
              {showAds && adsConfig?.slots?.sidebar?.enabled && <AdSlot slot="sidebar" adsConfig={adsConfig} />}
            </div>
          </div>
        </section>

        {playlistChannels.length > 0 ? (
          <section className="space-y-4 rounded-2xl border border-steel/20 bg-white/90 p-3.5 shadow-card md:p-4">
            <div className="grid gap-2.5 md:grid-cols-[1.6fr_1fr] md:gap-3">
              <label className="flex items-center gap-2 rounded-lg border border-steel/20 bg-white px-3 py-2.5">
                <Search className="h-4 w-4 text-steel" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search playlist channels"
                  className="w-full border-none bg-transparent text-sm outline-none placeholder:text-steel/70"
                />
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-steel/20 bg-white px-3 py-2.5">
                <ListFilter className="h-4 w-4 text-steel" />
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                >
                  {categories.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry === 'all' ? 'All categories' : entry}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <ChannelGrid
              channels={filteredPlaylistChannels}
              selectedChannel={selectedChannel}
              onSelect={handleSelectPlaylistChannel}
              showAds={false}
              adsConfig={adsConfig}
            />
          </section>
        ) : null}
      </div>
      {/* Ad Slot 3: Below Player */}
      {showAds && adsConfig?.slots?.belowPlayer?.enabled && <AdSlot slot="belowPlayer" adsConfig={adsConfig} />}
    </main>
  );
}
