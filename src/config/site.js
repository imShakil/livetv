export const SITE_BRANDING = {
  title: 'Dekho Prime',
  tagline: 'Just dekho!',
  metadataTitle: 'Dekho Prime | Live TV & Sports Streaming',
  description:
    'Dekho Prime lets you watch live TV channels, sports events, and custom stream URLs in one smooth streaming experience.',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://livetv.imshakil.online',
  iconPath: '/uploads/dekho-prime-512x512.png',
  ogImagePath: '/uploads/dekho-prime-og-1200x630.png',
  keywords: [
    'Dekho Prime',
    'live tv streaming',
    'iptv player',
    'sports live stream',
    'm3u8 player',
    'online tv channels',
    'bdix iptv',
    'bdix server',
    'bdix m3u8',
    'bdix streaming',
    'iptv bd',
    'bangladeshi tv channels',
    'bangladeshi iptv'
  ]
};

export const PLAY_PAGE_METADATA = {
  title: 'Play Custom URL',
  description: 'Play your own M3U8, iframe, or direct stream URL directly inside Dekho Prime.'
};

export const FEATURING_PAGE_METADATA = {
  title: 'Featuring Channels',
  description: 'Discover featured channels curated for fast and reliable watching.'
};

export const WORLD_PAGE_METADATA = {
  title: 'World IPTV',
  description: 'Browse global TV channels from public playlists in one place.'
};

export const EVENTS_PAGE_METADATA = {
  title: 'Daily Sports Events',
  description: 'Track cricket and football event schedules with quick channel access.'
};

export const EVENT_DETAILS_PAGE_METADATA = {
  title: 'Event Details',
  description: 'View full event details and available channels for each sports match.'
};
