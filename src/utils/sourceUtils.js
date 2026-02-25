export function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function normalizeIframeSource(source) {
  if (!source) {
    return '';
  }

  if (isHttpUrl(source)) {
    return source;
  }

  const match = source.match(/src=["']([^"']+)["']/i);
  const candidate = match?.[1] || '';

  return isHttpUrl(candidate) ? candidate : '';
}

function isIPv4(hostname) {
  const parts = hostname.split('.');

  if (parts.length !== 4) {
    return false;
  }

  return parts.every((part) => {
    if (!/^\d+$/.test(part)) {
      return false;
    }

    const value = Number(part);
    return value >= 0 && value <= 255;
  });
}

function isIPv6(hostname) {
  return hostname.includes(':');
}

export function isIpHostname(hostname) {
  if (!hostname) {
    return false;
  }

  return isIPv4(hostname) || isIPv6(hostname);
}

export function normalizeStreamSource(source) {
  if (!source || !source.startsWith('http://')) {
    return source;
  }

  try {
    const parsed = new URL(source);

    if (isIpHostname(parsed.hostname)) {
      return source;
    }

    return `https://${source.slice(7)}`;
  } catch {
    return source;
  }
}
