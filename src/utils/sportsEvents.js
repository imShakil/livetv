const INTERNATIONAL_EVENT_KEYWORDS = [
  'cricket',
  'football',
  'soccer',
  'fifa',
  'fifa friendly',
  'fifa friendly match',
  'olympic',
  'world cup',
  'icc',
  'uefa',
  'afc',
  'conmebol',
  'concacaf',
  'copa',
  'euro',
  'nations league',
  'premier league',
  'la liga',
  'bundesliga',
  'serie a',
  'ligue 1',
  'champions league',
  'europa league',
  'conference league',
  'mls',
  'saudi pro league',
  't20',
  'odi',
  'test championship'
];

const POPULAR_FOOTBALL_KEYWORDS = [
  'fifa',
  'uefa',
  'afc',
  'conmebol',
  'concacaf',
  'world cup',
  'club world cup',
  'euro',
  'copa america',
  'nations league',
  'champions league',
  'europa league',
  'conference league',
  'premier league',
  'la liga',
  'bundesliga',
  'serie a',
  'ligue 1',
  'eredi',
  'primeira liga',
  'fa cup',
  'efl cup',
  'copa del rey',
  'super cup',
  'mls',
  'saudi pro league',
  'inter miami',
  'el clasico',
  'manchester',
  'liverpool',
  'arsenal',
  'chelsea',
  'barcelona',
  'real madrid',
  'bayern',
  'juventus',
  'psg'
];

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function getCricketMatchDurationHours(event) {
  const searchable = [
    event?.league,
    event?.homeTeam,
    event?.awayTeam
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (searchable.includes('test')) {
    // Use one-day live window for multi-day test matches.
    return 10;
  }
  if (searchable.includes('odi') || searchable.includes('one day')) {
    return 8;
  }
  if (searchable.includes('t10')) {
    return 3;
  }
  if (searchable.includes('t20') || searchable.includes('t 20')) {
    return 4;
  }

  return 5;
}

export function readGeneratedSportsEvents(payload) {
  const rawEvents = Array.isArray(payload?.events) ? payload.events : [];

  return rawEvents
    .map((event, index) => {
      const sport = String(event?.sport ?? event?.category ?? '').trim();
      const league = String(event?.league ?? event?.competition ?? '').trim();
      const homeTeam = String(event?.homeTeam ?? event?.home ?? event?.team1 ?? '').trim();
      const awayTeam = String(event?.awayTeam ?? event?.away ?? event?.team2 ?? '').trim();
      const startTimeUtc = String(
        event?.startTimeUtc ?? event?.start_time_utc ?? event?.startTime ?? event?.dateTimeUtc ?? ''
      ).trim();
      const id = String(event?.id ?? event?.eventId ?? `${sport}-${league}-${index}`).trim();
      const channels = Array.isArray(event?.channels)
        ? event.channels.map((channel) => String(channel).trim()).filter(Boolean)
        : [];

      return {
        id,
        sport,
        league,
        homeTeam,
        awayTeam,
        startTimeUtc,
        channels
      };
    })
    .filter((event) => (
      event.id
      && event.sport
      && event.homeTeam
      && event.awayTeam
      && event.startTimeUtc
    ))
    .sort((a, b) => new Date(a.startTimeUtc) - new Date(b.startTimeUtc));
}

export function filterInternationalSportsEvents(events) {
  return events.filter((event) => {
    const searchableText = [
      event?.sport,
      event?.league,
      event?.homeTeam,
      event?.awayTeam
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return INTERNATIONAL_EVENT_KEYWORDS.some((keyword) => searchableText.includes(keyword));
  });
}

export function isPopularFootballEvent(event) {
  const sport = String(event?.sport || '').toLowerCase();
  if (sport !== 'football' && sport !== 'soccer') {
    return false;
  }

  const searchableText = [
    event?.league,
    event?.homeTeam,
    event?.awayTeam
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return POPULAR_FOOTBALL_KEYWORDS.some((keyword) => searchableText.includes(keyword));
}

export function getEventStatus(event, now = new Date()) {
  const start = new Date(event.startTimeUtc);
  const sport = String(event?.sport || '').toLowerCase();
  const durationHours = sport === 'cricket' ? getCricketMatchDurationHours(event) : 2;
  const end = addHours(start, durationHours);

  if (now >= start && now < end) {
    return 'live';
  }
  if (now < start) {
    return 'upcoming';
  }
  return 'finished';
}
