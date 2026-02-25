'use client';

import { useEffect, useState } from 'react';

export default function useAdsConfig() {
  const [adsConfig, setAdsConfig] = useState(null);

  useEffect(() => {
    fetch('/data/ads.json')
      .then((res) => res.json())
      .then((data) => setAdsConfig(data))
      .catch(() => setAdsConfig({ enabled: false }));
  }, []);

  return adsConfig;
}
