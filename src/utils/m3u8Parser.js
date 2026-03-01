function parseAttributes(line) {
  const attrRegex = /([\w-]+)=("[^"]*"|[^,]*)/g;
  const attrs = {};
  let match = attrRegex.exec(line);

  while (match) {
    const key = match[1].toLowerCase();
    const rawValue = (match[2] || '').trim();
    attrs[key] = rawValue.startsWith('"') && rawValue.endsWith('"')
      ? rawValue.slice(1, -1)
      : rawValue;
    match = attrRegex.exec(line);
  }

  return attrs;
}

function normalizeSource(source, baseUrl = '') {
  if (!source) {
    return '';
  }

  const trimmed = source.trim();
  if (!trimmed) {
    return '';
  }

  // Some playlists append request hints after "|" (e.g. User-Agent).
  const withoutOptions = trimmed.split('|')[0].trim();
  if (!withoutOptions) {
    return '';
  }

  if (withoutOptions.startsWith('//')) {
    return `https:${withoutOptions}`;
  }

  try {
    return new URL(withoutOptions).toString();
  } catch {
    if (!baseUrl) {
      return withoutOptions;
    }
    try {
      return new URL(withoutOptions, baseUrl).toString();
    } catch {
      return withoutOptions;
    }
  }
}

export function parseM3U8(playlistText, options = {}) {
  const baseUrl = options?.baseUrl || '';
  const lines = playlistText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const channels = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (!line.startsWith('#EXTINF')) {
      continue;
    }

    const attrs = parseAttributes(line);
    const namePart = line.split(',').slice(1).join(',').trim();
    let source = '';
    for (let j = i + 1; j < lines.length; j += 1) {
      const candidate = lines[j];
      if (!candidate) {
        continue;
      }
      if (candidate.startsWith('#EXTINF')) {
        break;
      }
      if (candidate.startsWith('#')) {
        continue;
      }
      source = candidate;
      i = j;
      break;
    }

    const normalizedSource = normalizeSource(source, baseUrl);
    if (!normalizedSource || normalizedSource.startsWith('#')) {
      continue;
    }

    channels.push({
      id: `playlist-${channels.length + 1}`,
      name: attrs['tvg-name'] || namePart || `Channel ${channels.length + 1}`,
      logo: attrs['tvg-logo'] || '',
      type: 'm3u8',
      source: normalizedSource,
      category: attrs['group-title'] || 'Uncategorized',
      language: attrs['tvg-language'] || ''
    });
  }

  // Fallback 1: HLS master playlist variants (#EXT-X-STREAM-INF + next URI)
  if (channels.length === 0) {
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (!line.startsWith('#EXT-X-STREAM-INF')) {
        continue;
      }

      const attrs = parseAttributes(line);
      let source = '';
      for (let j = i + 1; j < lines.length; j += 1) {
        const candidate = lines[j];
        if (!candidate) {
          continue;
        }
        if (candidate.startsWith('#EXT-X-STREAM-INF')) {
          break;
        }
        if (candidate.startsWith('#')) {
          continue;
        }
        source = candidate;
        i = j;
        break;
      }

      const normalizedSource = normalizeSource(source, baseUrl);
      if (!normalizedSource || normalizedSource.startsWith('#')) {
        continue;
      }

      const name =
        attrs.name ||
        attrs.resolution ||
        (attrs.bandwidth ? `${attrs.bandwidth}bps` : '') ||
        `Variant ${channels.length + 1}`;

      channels.push({
        id: `playlist-${channels.length + 1}`,
        name,
        logo: '',
        type: 'm3u8',
        source: normalizedSource,
        category: 'Uncategorized',
        language: ''
      });
    }
  }

  // Fallback 2: plain URL list (one stream URL per line)
  if (channels.length === 0) {
    for (const line of lines) {
      if (line.startsWith('#')) {
        continue;
      }
      const normalizedSource = normalizeSource(line, baseUrl);
      if (!normalizedSource || normalizedSource.startsWith('#')) {
        continue;
      }
      channels.push({
        id: `playlist-${channels.length + 1}`,
        name: `Channel ${channels.length + 1}`,
        logo: '',
        type: 'm3u8',
        source: normalizedSource,
        category: 'Uncategorized',
        language: ''
      });
    }
  }

  return channels;
}
