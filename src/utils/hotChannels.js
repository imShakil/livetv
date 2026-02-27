const HOT_CHANNEL_KEYWORDS = [
  'sport',
  'star',
  'crick',
  'football',
  'soccer',
  'futbol',
  'world cup',
  'icc',
  'fifa',
  'uefa',
  'champions league',
  'premier league',
  'laliga',
  'serie a',
  'bundesliga',
  'ipl',
  'bpl',
  'psl',
  't20',
  'odi',
  'big bash',
  'test match',
  'star sport',
  'ten sport',
  'sony sport',
  'sky sport',
  'espn',
  'eurosport',
  'willow',
  'ptv sport',
  't sports',
  'gtv',
  'gazi'
];

const HOT_CATEGORY_HINTS = ['sport', 'cricket', 'football', 'soccer', 'world cup', 'icc', 'ipl', 'bpl', 'psl'];

function getHotScore(channel) {
  const name = String(channel?.name || '').toLowerCase();
  const category = String(channel?.category || '').toLowerCase();
  const haystack = `${name} ${category}`.replace(/\s+/g, ' ').trim();

  let score = 0;

  for (const keyword of HOT_CHANNEL_KEYWORDS) {
    if (haystack.includes(keyword)) {
      score += 1;
    }
  }

  for (const hint of HOT_CATEGORY_HINTS) {
    if (category.includes(hint)) {
      score += 2;
      break;
    }
  }

  return score;
}

export function getHotChannels(channels, { limit = Number.POSITIVE_INFINITY } = {}) {
  if (!Array.isArray(channels) || channels.length === 0) {
    return [];
  }

  return channels
    .map((channel, index) => ({ channel, index, score: getHotScore(channel) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Number.isFinite(limit) ? limit : undefined)
    .map((entry) => entry.channel);
}
