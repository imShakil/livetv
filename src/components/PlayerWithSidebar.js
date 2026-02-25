'use client';

import VideoPlayer from '@/components/VideoPlayer';
import AdSlot from '@/components/AdSlot';
import LiveVisitorCount from '@/components/LiveVisitorCount';

export default function PlayerWithSidebar({
  selectedChannel,
  autoplay,
  showAds = false,
  adsConfig = null,
  emptyTitle = 'No channel selected',
  emptySubtitle = 'Select a channel from the list below.',
  getMetaText
}) {
  const metaText = selectedChannel
    ? (getMetaText?.(selectedChannel) || '')
    : emptySubtitle;

  return (
    <div className="grid gap-3 md:gap-4 lg:grid-cols-[minmax(0,2.3fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <VideoPlayer channel={selectedChannel} autoplay={autoplay} />
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
            {selectedChannel ? selectedChannel.name : emptyTitle}
          </p>
          <p className="truncate text-xs text-steel">
            {metaText}
          </p>
        </div>
        {showAds && adsConfig?.slots?.sidebar?.enabled ? (
          <div className="min-w-0 overflow-hidden">
            <AdSlot slot="sidebar" adsConfig={adsConfig} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
