function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function canonicalize(value) {
  return normalize(value)
    .replace(/\bsuper\s+sports?\b/g, 'supersport')
    .replace(/\bsupersports\b/g, 'supersport')
    .replace(/\bastro\s+supersport\b/g, 'supersport')
    .replace(/\bsky\s+sport\b/g, 'sky sports')
    .replace(/\bsky\s+sports?\b/g, 'sky sports')
    .replace(/\bss\s+cricket\b/g, 'supersport cricket')
    .replace(/\bbein\s+sports?\b/g, 'beinsports')
    .replace(/\bbe\s+in\s+sports?\b/g, 'beinsports')
    .replace(/\bbt\s+sports?\b/g, 'tntsports')
    .replace(/\btnt\s+sports?\b/g, 'tntsports')
    .replace(/\bptv\s+sports?\b/g, 'ptvsports')
    .replace(/\bsony\s+sports?\b/g, 'sonysports')
    .replace(/\bten\s+sports?\b/g, 'tensports')
    .replace(/\bstar\s+sports?\b/g, 'starsports')
    .replace(/\bstar\s+sports?\s+1\b/g, 'starsports 1')
    .replace(/\bstar\s+sports?\s+2\b/g, 'starsports 2')
    .replace(/\bsports?\s+18\b/g, 'sports18')
    .replace(/\bsony\s+ten\b/g, 'sonyten')
    .replace(/\bten\s+1\b/g, 'sonyten 1')
    .replace(/\bten\s+2\b/g, 'sonyten 2')
    .replace(/\bten\s+3\b/g, 'sonyten 3')
    .replace(/\bten\s+4\b/g, 'sonyten 4')
    .replace(/\bsony\s+liv\b/g, 'sonyliv')
    .replace(/\bjiocinema\b/g, 'jiocinema')
    .replace(/\bdd\s+sports?\b/g, 'ddsports')
    .replace(/\bptc\s+sports?\b/g, 'ptcsports')
    .replace(/\bt\s*sports?\b/g, 'tsportsbd')
    .replace(/\bgazi\s+tv\b/g, 'gtv')
    .replace(/\bghazi\s+tv\b/g, 'gtv')
    .replace(/\bfox\s+sports?\b/g, 'foxsports')
    .replace(/\bcbs\s+sports?\b/g, 'cbssports')
    .replace(/\bnbc\s+sports?\b/g, 'nbcsports')
    .replace(/\beuro\s+sports?\b/g, 'eurosport')
    .replace(/\bpremier\s+sports?\b/g, 'premiersports')
    .replace(/\bviaplay\s+sports?\b/g, 'viaplaysports')
    .replace(/\bosn\s+sports?\b/g, 'osnsports')
    .replace(/\btrue\s+sports?\b/g, 'truesports')
    .replace(/\s+/g, ' ')
    .trim();
}

function compact(value) {
  return canonicalize(value).replace(/\s+/g, '');
}

const BRAND_PATTERNS = [
  'supersport',
  'sky sports',
  'willow',
  'starsports',
  'sonysports',
  'espn',
  'tensports',
  'ptvsports',
  'beinsports',
  'tntsports',
  'foxsports',
  'cbssports',
  'nbcsports',
  'eurosport',
  'premiersports',
  'viaplaysports',
  'osnsports',
  'truesports',
  'dazn',
  'tsn',
  'sports18',
  'sonyten',
  'sonyliv',
  'jiocinema',
  'ddsports',
  'ptcsports',
  'tsportsbd'
];

const GENERIC_TOKENS = new Set([
  'tv',
  'hd',
  'live',
  'channel',
  'sport',
  'sports',
  'us',
  'uk',
  'sd'
]);

function detectBrand(normalizedName) {
  for (const brand of BRAND_PATTERNS) {
    if (normalizedName.includes(brand)) {
      return brand;
    }
  }
  return '';
}

function tokenize(value) {
  return canonicalize(value).split(' ').filter(Boolean);
}

function meaningfulTokens(value) {
  return tokenize(value).filter((token) => !GENERIC_TOKENS.has(token));
}

function numericTokens(value) {
  return tokenize(value).filter((token) => /^\d+$/.test(token));
}

function overlapCount(aTokens, bTokens) {
  const bSet = new Set(bTokens);
  let count = 0;
  for (const token of aTokens) {
    if (bSet.has(token)) {
      count += 1;
    }
  }
  return count;
}

export function scoreChannelMatch(target, candidate) {
  const targetNorm = canonicalize(target);
  const candidateNorm = canonicalize(candidate);
  const targetCompact = compact(target);
  const candidateCompact = compact(candidate);

  if (!targetNorm || !candidateNorm) {
    return 0;
  }
  if (targetNorm === candidateNorm) {
    return 100;
  }
  if (targetCompact === candidateCompact) {
    return 95;
  }

  const targetBrand = detectBrand(targetNorm);
  const candidateBrand = detectBrand(candidateNorm);
  if (targetBrand && candidateBrand && targetBrand !== candidateBrand) {
    return 0;
  }

  const targetTokens = meaningfulTokens(target);
  const candidateTokens = meaningfulTokens(candidate);
  if (!targetTokens.length || !candidateTokens.length) {
    return 0;
  }

  const overlap = overlapCount(targetTokens, candidateTokens);
  if (overlap === 0) {
    return 0;
  }

  let score = Math.round((overlap / targetTokens.length) * 85);

  if (targetBrand && candidateBrand && targetBrand === candidateBrand) {
    score += 10;
  }

  if (candidateNorm.includes(targetNorm)) {
    score += 5;
  }

  const targetNums = numericTokens(target);
  if (targetNums.length > 0) {
    const candidateNums = new Set(numericTokens(candidate));
    const matchedNums = targetNums.filter((token) => candidateNums.has(token)).length;
    if (matchedNums !== targetNums.length) {
      score -= 20;
    }
  }

  return Math.max(0, Math.min(100, score));
}

export function findBestChannelMatch(channelName, channels, { excludeKeys = new Set(), minScore = 75 } = {}) {
  if (!channelName || !Array.isArray(channels) || channels.length === 0) {
    return null;
  }

  let best = null;
  let bestScore = 0;

  for (const channel of channels) {
    const channelKey = channel?.id || `${channel?.name || ''}|${channel?.source || ''}`;
    if (excludeKeys.has(channelKey)) {
      continue;
    }

    const score = scoreChannelMatch(channelName, channel?.name);
    if (score > bestScore) {
      best = channel;
      bestScore = score;
    }
  }

  return bestScore >= minScore ? best : null;
}

function splitByDelimiters(name) {
  return String(name || '')
    .split(/[,/|;]+|\s+\+\s+|\s+and\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitByBrandBoundaries(name) {
  const raw = String(name || '').trim();
  if (!raw) {
    return [];
  }

  const canonical = canonicalize(raw);
  const tokens = canonical.split(' ').filter(Boolean);
  if (tokens.length < 2) {
    return [raw];
  }

  const brandStarts = [];
  for (let i = 0; i < tokens.length; i += 1) {
    if (tokens[i] === 'supersport') {
      brandStarts.push(i);
      continue;
    }
    if (tokens[i] === 'sky' && tokens[i + 1] === 'sports') {
      brandStarts.push(i);
      continue;
    }
    if (tokens[i] === 'beinsports') {
      brandStarts.push(i);
      continue;
    }
    if (tokens[i] === 'starsports') {
      brandStarts.push(i);
      continue;
    }
  }

  if (brandStarts.length <= 1) {
    return [raw];
  }

  const expanded = [];
  for (let i = 0; i < brandStarts.length; i += 1) {
    const start = brandStarts[i];
    const end = i + 1 < brandStarts.length ? brandStarts[i + 1] : tokens.length;
    const part = tokens.slice(start, end).join(' ').trim();
    if (part) {
      expanded.push(part);
    }
  }

  return expanded.length ? expanded : [raw];
}

function expandChannelNames(channelNames) {
  const expanded = [];
  for (const name of channelNames) {
    const fromDelimiters = splitByDelimiters(name);
    const baseParts = fromDelimiters.length ? fromDelimiters : [name];
    for (const part of baseParts) {
      const fragments = splitByBrandBoundaries(part);
      for (const fragment of fragments) {
        expanded.push(fragment);
      }
    }
  }
  return expanded;
}

export function findBestChannelMatches(channelNames, channels, { minScore = 75 } = {}) {
  if (!Array.isArray(channelNames) || channelNames.length === 0) {
    return [];
  }

  const expandedNames = expandChannelNames(channelNames);

  if (!Array.isArray(channels) || channels.length === 0) {
    return expandedNames.map((name) => ({ name, matches: [] }));
  }

  return expandedNames.map((name) => {
    const matches = channels
      .map((channel) => ({
        channel,
        score: scoreChannelMatch(name, channel?.name)
      }))
      .filter((entry) => entry.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.channel);

    return { name, matches };
  });
}
