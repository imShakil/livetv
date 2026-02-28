'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import useDailySportsEvents from '@/hooks/useDailySportsEvents';
import { getEventStatus, isPopularFootballEvent } from '@/utils/sportsEvents';

const FILTERS = [
  { key: 'cricket', label: 'Cricket' },
  { key: 'football', label: 'Football' }
];

function matchesSportFilter(event, activeFilter) {
  const sport = String(event?.sport || '').toLowerCase();
  if (activeFilter === 'football') {
    return sport === 'football' || sport === 'soccer';
  }
  return sport === activeFilter;
}

function formatTime(utcString) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(utcString));
}

function formatStatus(event, now = new Date()) {
  const status = getEventStatus(event, now);
  if (status === 'live') {
    return 'Live';
  }
  if (status === 'finished') {
    return 'FT';
  }

  const start = new Date(event.startTimeUtc);
  const diffMinutes = Math.max(1, Math.round((start - now) / 60000));
  if (diffMinutes < 60) {
    return `Starts in ${diffMinutes}m`;
  }

  const hours = Math.floor(diffMinutes / 60);
  return `Starts in ${hours}h`;
}

export default function DailySportsEventsCarousel({
  limit = 8
}) {
  const [activeFilter, setActiveFilter] = useState('cricket');
  const trackRef = useRef(null);
  const { events, isLoading } = useDailySportsEvents();

  const filteredEvents = useMemo(() => {
    const sportFiltered = events.filter((event) => (
      matchesSportFilter(event, activeFilter) && getEventStatus(event) !== 'finished'
    ));
    if (activeFilter === 'football') {
      const popularOnly = sportFiltered.filter((event) => isPopularFootballEvent(event));
      const finalFootballEvents = popularOnly.length > 0 ? popularOnly : sportFiltered;
      return finalFootballEvents.slice(0, limit);
    }
    return sportFiltered.slice(0, limit);
  }, [activeFilter, events, limit]);

  const scrollTrack = (direction) => {
    if (!trackRef.current) {
      return;
    }

    const amount = trackRef.current.clientWidth * 0.85;
    trackRef.current.scrollBy({
      left: direction === 'next' ? amount : -amount,
      behavior: 'smooth'
    });
  };

  return (
    <section className="space-y-3 rounded-2xl border border-steel/20 bg-white/90 p-3.5 shadow-card md:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-ink md:text-2xl">Today's Events</h1>
        </div>
        <Link
          href="/events"
          className="rounded-full border border-sea/25 bg-sea/10 px-3 py-1.5 text-xs font-semibold text-sea hover:bg-sea/15"
        >
          View full schedule
        </Link>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setActiveFilter(filter.key)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                activeFilter === filter.key
                  ? 'bg-sea text-white'
                  : 'border border-steel/20 bg-white text-steel hover:bg-slate-50'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scrollTrack('prev')}
            className="rounded-full border border-steel/20 bg-white px-2.5 py-1 text-sm font-bold text-steel hover:bg-slate-50"
            aria-label="Show previous events"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => scrollTrack('next')}
            className="rounded-full border border-steel/20 bg-white px-2.5 py-1 text-sm font-bold text-steel hover:bg-slate-50"
            aria-label="Show next events"
          >
            ›
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-steel/15 bg-white/75 p-3 text-sm text-steel">
          Loading today&apos;s events...
        </div>
      ) : null}

      <div ref={trackRef} className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
        {filteredEvents.map((event) => {
          const status = formatStatus(event);
          const isLive = status === 'Live';
          const statusClass = isLive
            ? 'bg-rose-100 text-rose-700'
            : status === 'FT'
              ? 'bg-slate-100 text-slate-600'
              : 'bg-amber-100 text-amber-700';

          return (
            <article
              key={event.id}
              className="min-w-[250px] snap-start rounded-xl border border-steel/20 bg-white p-3 md:min-w-[280px]"
            >
              <Link href={`/event?id=${encodeURIComponent(event.id)}`} className="block">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-steel/80">{event.league}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${statusClass}`}>
                    {status}
                  </span>
                </div>
                <p className="pt-2 text-sm font-semibold leading-snug text-ink break-words">
                  {event.homeTeam} <span className="text-steel">vs</span> {event.awayTeam}
                </p>
                <p className="pt-2 text-xs text-steel">{formatTime(event.startTimeUtc)}</p>
                {Array.isArray(event.channels) && event.channels.length > 0 ? (
                  <p className="text-xs text-steel break-words">
                    Channels: {event.channels.slice(0, 2).join(', ')}
                    {event.channels.length > 2 ? ` +${event.channels.length - 2} more` : ''}
                  </p>
                ) : (
                  <p className="text-xs text-steel/70">Channels: TBA</p>
                )}
                <p className="pt-1 text-xs font-semibold text-sea">View details</p>
              </Link>
            </article>
          );
        })}
        {!isLoading && filteredEvents.length === 0 ? (
          <article className="min-w-full rounded-xl border border-steel/15 bg-white p-3 text-sm text-steel">
            No events found for today in this category.
          </article>
        ) : null}
      </div>
    </section>
  );
}
