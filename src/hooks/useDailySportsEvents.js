'use client';

import { useEffect, useState } from 'react';
import { filterInternationalSportsEvents, readGeneratedSportsEvents } from '@/utils/sportsEvents';

const REMOTE_EVENTS_URL = 'https://daily-sports-events.mhshakil555.workers.dev/events.json';
const CACHE_TTL_MS = 5 * 60 * 1000;
const SESSION_CACHE_KEY = 'bdiptv_events_cache';
const LOCAL_CACHE_KEY = 'bdiptv_events_cache_v2';
const LOCAL_CACHE_TTL_MS = 30 * 60 * 1000;

let cachedParsedEvents = null;
let cachedAt = 0;
let inFlightRequest = null;

function readSessionCache() {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.sessionStorage.getItem(SESSION_CACHE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (
      Array.isArray(parsed?.events) &&
      typeof parsed?.cachedAt === 'number' &&
      Date.now() - parsed.cachedAt <= CACHE_TTL_MS
    ) {
      return parsed.events;
    }
  } catch {
    // ignore corrupted cache
  }

  return null;
}

function readLocalCache() {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(LOCAL_CACHE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (
      Array.isArray(parsed?.events) &&
      typeof parsed?.cachedAt === 'number' &&
      Date.now() - parsed.cachedAt <= LOCAL_CACHE_TTL_MS
    ) {
      return parsed.events;
    }
  } catch {
    // ignore corrupted cache
  }

  return null;
}

function writeSessionCache(events) {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(
    SESSION_CACHE_KEY,
    JSON.stringify({
      events,
      cachedAt: Date.now()
    })
  );
}

function writeLocalCache(events) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    LOCAL_CACHE_KEY,
    JSON.stringify({
      events,
      cachedAt: Date.now()
    })
  );
}

function readBestEffortCachedEvents() {
  return readSessionCache() || readLocalCache() || [];
}

async function loadRemoteEventsPayload() {
  const now = Date.now();
  if (cachedParsedEvents && now - cachedAt < CACHE_TTL_MS) {
    return { events: cachedParsedEvents, source: 'remote', error: '' };
  }

  const sessionCachedEvents = readSessionCache();
  if (sessionCachedEvents) {
    cachedParsedEvents = sessionCachedEvents;
    cachedAt = Date.now();
    return { events: sessionCachedEvents, source: 'remote', error: '' };
  }

  const localCachedEvents = readLocalCache();
  if (localCachedEvents) {
    cachedParsedEvents = localCachedEvents;
    cachedAt = Date.now();
    writeSessionCache(localCachedEvents);
    return { events: localCachedEvents, source: 'remote', error: '' };
  }

  if (!inFlightRequest) {
    inFlightRequest = (async () => {
      const response = await fetch(REMOTE_EVENTS_URL, {
        cache: 'default',
        mode: 'cors',
        credentials: 'omit',
        headers: {
          Accept: 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to load remote sports events: ${response.status}`);
      }

      const payload = await response.json();
      const parsedEvents = readGeneratedSportsEvents(payload);
      cachedParsedEvents = parsedEvents;
      cachedAt = Date.now();
      writeSessionCache(parsedEvents);
      writeLocalCache(parsedEvents);
      return parsedEvents;
    })()
      .finally(() => {
        inFlightRequest = null;
      });
  }

  try {
    const events = await inFlightRequest;
    return { events, source: 'remote', error: '' };
  } catch (error) {
    return {
      events: [],
      source: 'unavailable',
      error: error instanceof Error ? error.message : 'Unknown fetch error'
    };
  }
}

export default function useDailySportsEvents({ internationalOnly = true } = {}) {
  const [events, setEvents] = useState(() => {
    const cachedEvents = readBestEffortCachedEvents();
    return internationalOnly
      ? filterInternationalSportsEvents(cachedEvents)
      : cachedEvents;
  });
  const [isLoading, setIsLoading] = useState(events.length === 0);
  const [source, setSource] = useState('remote');
  const [error, setError] = useState('');

  useEffect(() => {
    let isActive = true;

    async function loadEvents() {
      const result = await loadRemoteEventsPayload();
      if (!isActive) {
        return;
      }

      const nextEvents = internationalOnly
        ? filterInternationalSportsEvents(result.events)
        : result.events;

      setEvents(nextEvents);
      setSource(result.source);
      setError(result.error);
      if (result.source === 'unavailable') {
        console.error('Failed to fetch events payload', result.error);
      }
      if (isActive) {
        setIsLoading(false);
      }
    }

    loadEvents();

    return () => {
      isActive = false;
    };
  }, [internationalOnly]);

  return { events, isLoading, source, error };
}
