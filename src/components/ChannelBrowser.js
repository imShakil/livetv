'use client';

import { useEffect, useMemo, useState } from 'react';
import ChannelGrid from '@/components/ChannelGrid';
import ChannelFiltersBar from '@/components/ChannelFiltersBar';
import DailySportsEventsCarousel from '@/components/DailySportsEventsCarousel';
import PaginationFooter from '@/components/PaginationFooter';
import VideoPlayer from '@/components/VideoPlayer';
import PlayerWithSidebar from '@/components/PlayerWithSidebar';
import AdSlot from '@/components/AdSlot';
import useChannelFilteringPagination from '@/hooks/useChannelFilteringPagination';
import { logEvent } from '@/utils/telemetry';
import { getHotChannels } from '@/utils/hotChannels';

const ENABLE_STICKY_PLAYER = false; // Toggle sticky player feature

export default function ChannelBrowser({
  channels,
  adsConfig,
  showDailyEvents = false
}) {
  const [selectedChannel, setSelectedChannel] = useState(channels[0] || null);
  const [autoplay, setAutoplay] = useState(true);
  const [isSticky, setIsSticky] = useState(false);
  const [showStickyPlayer, setShowStickyPlayer] = useState(true);

  const showAds = adsConfig?.enabled || false;
  const hotChannels = useMemo(() => getHotChannels(channels), [channels]);
  const [hotPage, setHotPage] = useState(1);
  const hotPageSize = 6;
  const hotTotalPages = Math.max(1, Math.ceil(hotChannels.length / hotPageSize));
  const hotPagedChannels = useMemo(() => {
    const start = (hotPage - 1) * hotPageSize;
    return hotChannels.slice(start, start + hotPageSize);
  }, [hotChannels, hotPage]);
  const hotRangeStart = hotChannels.length ? (hotPage - 1) * hotPageSize + 1 : 0;
  const hotRangeEnd = hotChannels.length ? Math.min(hotPage * hotPageSize, hotChannels.length) : 0;

  const {
    query,
    setQuery,
    category,
    setCategory,
    page,
    setPage,
    categories,
    filteredChannels,
    pagedChannels,
    totalPages,
    rangeStart,
    rangeEnd
  } = useChannelFilteringPagination({ channels });

  const shouldShowHotChannels = hotChannels.length > 0;
  const totalChannels = channels.length;
  const filteredCount = filteredChannels.length;
  const hasActiveFilters = query.trim().length > 0 || category !== 'all';

  useEffect(() => {
    if (!selectedChannel && channels.length) {
      setSelectedChannel(channels[0]);
      setAutoplay(false); // Disable autoplay for initial channel
    }
  }, [channels, selectedChannel]);

  useEffect(() => {
    setHotPage(1);
  }, [channels]);

  useEffect(() => {
    if (hotPage > hotTotalPages) {
      setHotPage(hotTotalPages);
    }
  }, [hotPage, hotTotalPages]);

  const handleSelect = (channel) => {
    setSelectedChannel(channel);
    setAutoplay(true); // Enable autoplay when user clicks
    if (ENABLE_STICKY_PLAYER) {
      setShowStickyPlayer(true);
    }
    logEvent('channel_selected', { id: channel.id, name: channel.name, origin: channel.origin });
  };

  useEffect(() => {
    if (ENABLE_STICKY_PLAYER) {
      const handleScroll = () => {
        setIsSticky(window.scrollY > 400);
      };
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, []);

  return (
    <div className="space-y-5 md:space-y-7">

      <section className="space-y-3 md:space-y-4">
        {showDailyEvents ? <DailySportsEventsCarousel limit={8} /> : null}

        {/* Ad Slot 1: Header Banner */}
        {showAds && adsConfig?.slots?.header?.enabled && <AdSlot slot="header" adsConfig={adsConfig} />}

        <PlayerWithSidebar
          selectedChannel={selectedChannel}
          autoplay={autoplay}
          showAds={showAds}
          adsConfig={adsConfig}
          getMetaText={(channel) => {
            const primary = channel.category || 'Uncategorized';
            return channel.language ? `${primary} · ${channel.language}` : primary;
          }}
        />
      </section>

      {shouldShowHotChannels ? (
        <section className="space-y-4 rounded-2xl border border-steel/20 bg-white/90 p-3.5 shadow-card md:p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-ink sm:text-base">Hot Channels</h2>
              <p className="text-[11px] text-steel sm:text-xs">Sports and major event picks</p>
            </div>
            <ChannelGrid
              channels={hotPagedChannels}
              selectedChannel={selectedChannel}
              onSelect={handleSelect}
            />
            <PaginationFooter
              page={hotPage}
              totalPages={hotTotalPages}
              rangeStart={hotRangeStart}
              rangeEnd={hotRangeEnd}
              totalCount={hotChannels.length}
              onPrevious={() => setHotPage((value) => Math.max(1, value - 1))}
              onNext={() => setHotPage((value) => Math.min(hotTotalPages, value + 1))}
            />
          </div>
        </section>
      ) : null}
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
          queryPlaceholder="Search channels"
        />

        <ChannelGrid
          channels={pagedChannels}
          selectedChannel={selectedChannel}
          onSelect={handleSelect}
          showAds={showAds && adsConfig?.slots?.inFeed?.enabled}
          adsConfig={adsConfig}
        />

        <PaginationFooter
          page={page}
          totalPages={totalPages}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          totalCount={filteredChannels.length}
          onPrevious={() => setPage((value) => Math.max(1, value - 1))}
          onNext={() => setPage((value) => Math.min(totalPages, value + 1))}
        />
      </section>

      {/* Ad Slot 3: Below Player */}
      {showAds && adsConfig?.slots?.belowPlayer?.enabled && <AdSlot slot="belowPlayer" adsConfig={adsConfig} />}

      {/* Sticky Player */}
      {ENABLE_STICKY_PLAYER && isSticky && showStickyPlayer && selectedChannel && (
        <div className="fixed bottom-4 right-4 z-50 w-80 overflow-hidden rounded-xl border-2 border-steel/30 bg-black shadow-2xl">
          <div className="relative">
            <button
              onClick={() => setShowStickyPlayer(false)}
              className="absolute right-2 top-2 z-10 rounded-full bg-black/70 p-1.5 text-white hover:bg-black"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <VideoPlayer channel={selectedChannel} autoplay={false} />
          </div>
          <div className="bg-white p-2">
            <p className="truncate text-xs font-semibold text-ink">{selectedChannel.name}</p>
          </div>
        </div>
      )}
    </div>
  );
}
