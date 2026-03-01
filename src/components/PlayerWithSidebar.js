'use client';

import VideoPlayer from '@/components/VideoPlayer';
import AdSlot from '@/components/AdSlot';
import LiveVisitorCount from '@/components/LiveVisitorCount';
import { Capacitor } from '@capacitor/core';

export default function PlayerWithSidebar({
  selectedChannel,
  autoplay,
  showAds = false,
  adsConfig = null,
  showRewardedCta = false,
  rewardedCtaLabel = 'Watch ad for ad-free time',
  onRewardedCtaClick,
  isRewardedCtaLoading = false,
  emptyTitle = 'No channel selected',
  emptySubtitle = 'Select a channel from the list below.',
  getMetaText
}) {
  const metaText = selectedChannel
    ? (getMetaText?.(selectedChannel) || '')
    : emptySubtitle;
  const isNativeRuntime = Capacitor.getPlatform() !== 'web';

  return (
    <div className="grid gap-3 md:gap-4 lg:grid-cols-[minmax(0,2.3fr)_minmax(0,1fr)] lg:grid-rows-[1fr]">
      <div className="min-w-0">
        <VideoPlayer channel={selectedChannel} autoplay={autoplay} />
      </div>

      {/* Outer wrapper takes the grid cell height, inner div clips */}
      <div className="min-w-0 lg:h-0 lg:min-h-full overflow-hidden rounded-2xl">
        <div className="flex h-full min-w-0 flex-col gap-3 overflow-hidden rounded-2xl border border-steel/20 bg-white/85 shadow-card">
          <div className="border-sea/30 bg-cyan-50 p-3.5 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-steel/80">Now Playing</p>
              <div className="flex items-center gap-1.5">
                {selectedChannel ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-ember/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ember">
                    <span className="relative inline-flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ember opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-ember" />
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
              {selectedChannel ? selectedChannel.name : emptyTitle}
            </p>
            <p className="truncate text-xs text-steel">
              {metaText}
            </p>
            {showRewardedCta ? (
              <button
                type="button"
                onClick={onRewardedCtaClick}
                disabled={isRewardedCtaLoading}
                className="mt-2 inline-flex items-center rounded-full bg-ember px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-[#e57d00] disabled:opacity-70"
              >
                {isRewardedCtaLoading ? 'Loading ad...' : rewardedCtaLabel}
              </button>
            ) : null}
          </div>
          {showAds && adsConfig?.slots?.sidebar?.enabled ? (
            <AdSlot slot="sidebar" adsConfig={adsConfig} className="min-w-0 w-full overflow-hidden rounded-lg" />
          ) : null}

          {!isNativeRuntime ? (
            <div className="w-full min-w-0 overflow-hidden shrink-0">
              <a
                href="https://beta.publishers.adsterra.com/referral/1XU1UuDLQw"
                rel="nofollow sponsored noopener noreferrer"
                target="_blank"
                aria-label="Visit Adsterra referral partner page"
                className="mx-auto block w-full"
              >
                <img
                  alt="Adsterra sponsored referral banner"
                  src="https://landings-cdn.adsterratech.com/referralBanners/png/600%20x%20250%20px.png"
                  width="600"
                  height="250"
                  loading="lazy"
                  decoding="async"
                  className="h-auto w-full rounded-lg shadow-sm ring-1 ring-black/5"
                />
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
