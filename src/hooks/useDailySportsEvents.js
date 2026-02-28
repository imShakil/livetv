'use client';

import { useEffect, useState } from 'react';
import { filterInternationalSportsEvents, readGeneratedSportsEvents } from '@/utils/sportsEvents';

const REMOTE_EVENTS_URL = 'https://daily-sports-events.mhshakil555.workers.dev/events.json?refresh=1';
const CACHE_TTL_MS = 60 * 1000;

let cachedParsedEvents = null;
let cachedAt = 0;
let inFlightRequest = null;

async function loadRemoteEventsPayload() {
  const now = Date.now();
  if (cachedParsedEvents && now - cachedAt < CACHE_TTL_MS) {
    return { events: cachedParsedEvents, source: 'remote', error: '' };
  }

  if (!inFlightRequest) {
    inFlightRequest = (async () => {
      const response = await fetch(REMOTE_EVENTS_URL, {
        cache: 'no-store',
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
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
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
