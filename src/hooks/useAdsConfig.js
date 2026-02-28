'use client';

import { useEffect, useState } from 'react';

function resolveHostAdsConfig(config, hostname) {
  if (!config || !hostname) {
    return config;
  }

  const hostConfig = config?.hosts?.[hostname];
  if (!hostConfig) {
    return config;
  }

  return {
    ...config,
    ...hostConfig,
    slots: {
      ...(config.slots || {}),
      ...(hostConfig.slots || {})
    }
  };
}

export default function useAdsConfig() {
  const [adsConfig, setAdsConfig] = useState(null);

  useEffect(() => {
    fetch('/data/ads.json')
      .then((res) => res.json())
      .then((data) => {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
        setAdsConfig(resolveHostAdsConfig(data, hostname));
      })
      .catch(() => setAdsConfig({ enabled: false }));
  }, []);

  return adsConfig;
}
