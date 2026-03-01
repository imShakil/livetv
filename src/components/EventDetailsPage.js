'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import AdSlot from '@/components/AdSlot';
import InlineLoader from '@/components/InlineLoader';
import useAdsConfig from '@/hooks/useAdsConfig';
import useDailySportsEvents from '@/hooks/useDailySportsEvents';
import useChannelCatalog from '@/hooks/useChannelCatalog';
import { getEventStatus } from '@/utils/sportsEvents';
import { findBestChannelMatches } from '@/utils/channelLookup';

const EVENT_DETAILS_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short'
});

function formatDateTime(utcString) {
  return EVENT_DETAILS_DATE_FORMATTER.format(new Date(utcString));
}

export default function EventDetailsPage() {
  const searchParams = useSearchParams();
  const adsConfig = useAdsConfig();
  const showAds = adsConfig?.enabled || false;
  const eventId = searchParams.get('id') || '';
  const { events, isLoading, source, error } = useDailySportsEvents({ internationalOnly: false });
  const event = useMemo(
    () => events.find((entry) => String(entry.id) === eventId),
    [eventId, events]
  );
  const shouldLoadCatalog = Boolean(event?.channels?.length);
  const { channels: catalogChannels } = useChannelCatalog({ enabled: shouldLoadCatalog });

  const channelMatches = useMemo(() => {
    if (!event || !Array.isArray(event.channels)) {
      return [];
    }
    return findBestChannelMatches(event.channels, catalogChannels, { minScore: 50 });
  }, [event, catalogChannels]);

  const status = event ? getEventStatus(event) : null;
  const statusText = status === 'live' ? 'Live' : status === 'finished' ? 'Finished' : 'Upcoming';
  const statusClass = status === 'live'
    ? 'bg-ember/20 text-ember'
    : status === 'finished'
      ? 'bg-steel/20 text-steel'
      : 'bg-sea/20 text-sea';

  return (
    <main className="space-y-4">
      <section className="rounded-2xl border border-steel/20 bg-white/90 p-4 shadow-card">
        <Link href="/events" className="text-xs font-semibold text-sea hover:underline">
          ← Back to events
        </Link>
        {isLoading ? (
          <div className="flex justify-center pt-4">
            <InlineLoader />
          </div>
        ) : null}
        {!isLoading && source === 'unavailable' ? (
          <p className="pt-3 text-sm text-rose-700">
            Live API unavailable{error ? `: ${error}` : '.'}
          </p>
        ) : null}
        {!isLoading && !eventId ? (
          <p className="pt-3 text-sm text-steel">Missing event id.</p>
        ) : null}
        {!isLoading && eventId && !event && source !== 'unavailable' ? (
          <p className="pt-3 text-sm text-steel">Event not found for id: {eventId}</p>
        ) : null}
      </section>

      {showAds && adsConfig?.slots?.eventTop?.enabled ? (
        <AdSlot
          slot="eventTop"
          adsConfig={adsConfig}
          className="rounded-2xl border border-steel/20 bg-white/90 p-3 shadow-card"
        />
      ) : null}

      {isLoading ? (
        <section className="space-y-3 rounded-2xl border border-steel/20 bg-white/90 p-4 shadow-card">
          <div className="h-3 w-28 animate-pulse rounded bg-steel/20" />
          <div className="h-7 w-4/5 animate-pulse rounded bg-steel/20" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-steel/15" />
          <div className="h-24 animate-pulse rounded-lg bg-steel/10" />
        </section>
      ) : null}

      {event ? (
        <section className="space-y-3 rounded-2xl border border-steel/20 bg-white/90 p-4 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-steel/80">{event.league}</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${statusClass}`}>
              {statusText}
            </span>
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-ink md:text-3xl">
            {event.homeTeam} vs {event.awayTeam}
          </h1>

          <div className="space-y-1 text-sm text-steel">
            <p>Sport: {event.sport}</p>
            <p>Start: {formatDateTime(event.startTimeUtc)}</p>
            <p>Event ID: {event.id}</p>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-ink">Channels</h2>
            {channelMatches.length > 0 ? (
              <ul className="space-y-2 text-sm text-steel">
                {channelMatches.map(({ name, matches }) => (
                  <li
                    key={`${event.id}-${name}`}
                    className="space-y-2 rounded-lg border border-steel/15 bg-white/80 px-3 py-2"
                  >
                    <p className="font-medium text-ink">{name}</p>
                    {Array.isArray(matches) && matches.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {matches.map((match, index) => (
                          <Link
                            key={`${event.id}-${name}-${match.id || match.source}`}
                            href={`/play?url=${encodeURIComponent(match.source)}&type=${encodeURIComponent(match.type || 'auto')}&name=${encodeURIComponent(match.name)}`}
                            className="rounded-full border border-sea/30 bg-sea/10 px-2.5 py-1 text-xs font-semibold text-sea hover:bg-sea/15"
                          >
                            {`Play Server ${index + 1}`}
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-steel/70">NA</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-steel">Not Available!</p>
            )}
          </div>
        </section>
      ) : null}

      {showAds && adsConfig?.slots?.eventBottom?.enabled ? (
        <AdSlot
          slot="eventBottom"
          adsConfig={adsConfig}
          className="rounded-2xl border border-steel/20 bg-white/90 p-3 shadow-card"
        />
      ) : null}
    </main>
  );
}
