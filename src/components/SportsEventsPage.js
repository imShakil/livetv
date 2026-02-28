'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import useDailySportsEvents from '@/hooks/useDailySportsEvents';
import { getEventStatus } from '@/utils/sportsEvents';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'cricket', label: 'Cricket' },
  { key: 'football', label: 'Football' }
];

function matchesSportFilter(event, activeFilter) {
  if (activeFilter === 'all') {
    return true;
  }
  const sport = String(event?.sport || '').toLowerCase();
  if (activeFilter === 'football') {
    return sport === 'football' || sport === 'soccer';
  }
  return sport === activeFilter;
}

function formatDateTime(utcString) {
  const date = new Date(utcString);
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

export default function SportsEventsPage() {
  const PAGE_SIZE = 24;
  const [activeFilter, setActiveFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loadMoreRef = useRef(null);
  const { events, isLoading } = useDailySportsEvents({ internationalOnly: false });
  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim();
    return events.filter((event) => {
      if (getEventStatus(event) === 'finished') {
        return false;
      }
      if (!matchesSportFilter(event, activeFilter)) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      const searchableText = [
        event?.league,
        event?.homeTeam,
        event?.awayTeam,
        event?.sport
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchableText.includes(normalizedQuery);
    });
  }, [activeFilter, events, query]);

  const visibleEvents = useMemo(
    () => filteredEvents.slice(0, visibleCount),
    [filteredEvents, visibleCount]
  );
  const canLoadMore = visibleEvents.length < filteredEvents.length;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeFilter, query, PAGE_SIZE]);

  useEffect(() => {
    if (!canLoadMore || isLoading || !loadMoreRef.current) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((value) => value + PAGE_SIZE);
        }
      },
      { rootMargin: '250px 0px' }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [canLoadMore, isLoading, PAGE_SIZE]);

  return (
    <main className="space-y-4">
      <section className="space-y-3 rounded-2xl border border-steel/20 bg-white/90 p-4 shadow-card">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink md:text-3xl">Daily Events Schedule</h1>
          <p className="text-xs font-semibold text-steel md:text-sm">
            Total events: {events.length}
            {filteredEvents.length !== events.length ? ` · Showing: ${filteredEvents.length}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setActiveFilter(filter.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                activeFilter === filter.key
                  ? 'bg-sea text-white'
                  : 'border border-steel/20 bg-white text-steel hover:bg-slate-50'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search events, teams, league..."
            className="w-full rounded-lg border border-steel/20 bg-white px-3 py-2.5 text-sm text-ink outline-none"
          />
        </div>
      </section>

      {isLoading ? (
        <section className="rounded-xl border border-steel/15 bg-white/85 p-3.5 text-sm text-steel">
          Loading today&apos;s sports schedule...
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visibleEvents.map((event) => {
          const status = getEventStatus(event);
          const statusText = status === 'live' ? 'Live' : status === 'finished' ? 'FT' : 'Upcoming';
          const statusClass = status === 'live'
            ? 'bg-rose-100 text-rose-700'
            : status === 'finished'
              ? 'bg-slate-100 text-slate-600'
              : 'bg-amber-100 text-amber-700';

          return (
            <article
              key={event.id}
              className="space-y-2 rounded-xl border border-steel/20 bg-white/90 p-3.5 shadow-card"
            >
              <Link href={`/event?id=${encodeURIComponent(event.id)}`} className="block space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-steel/80">{event.league}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${statusClass}`}>
                    {statusText}
                  </span>
                </div>
                <p className="text-sm font-semibold leading-snug text-ink break-words">
                  {event.homeTeam} <span className="text-steel">vs</span> {event.awayTeam}
                </p>
                <p className="text-xs text-steel">{formatDateTime(event.startTimeUtc)}</p>
                {Array.isArray(event.channels) && event.channels.length > 0 ? (
                  <p className="text-xs text-steel break-words">
                    Channels: {event.channels.slice(0, 3).join(', ')}
                    {event.channels.length > 3 ? ` +${event.channels.length - 3} more` : ''}
                  </p>
                ) : (
                  <p className="text-xs text-steel/70">Channels: TBA</p>
                )}
                <p className="text-xs font-semibold text-sea">View details</p>
              </Link>
            </article>
          );
        })}
        {!isLoading && filteredEvents.length === 0 ? (
          <article className="rounded-xl border border-steel/15 bg-white/90 p-3.5 text-sm text-steel sm:col-span-2 xl:col-span-3">
            No events available for today in this filter.
          </article>
        ) : null}
      </section>

      {!isLoading && canLoadMore ? (
        <section className="flex justify-center">
          <div
            ref={loadMoreRef}
            className="rounded-lg border border-steel/20 bg-white px-4 py-2 text-sm font-semibold text-steel"
          >
            Loading more events...
          </div>
        </section>
      ) : null}
    </main>
  );
}
