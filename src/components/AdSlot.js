'use client';

import { useEffect } from 'react';

export default function AdSlot({ slot, adsConfig, className = '' }) {
  const slotConfig = adsConfig?.slots?.[slot];
  const isAdsterra = slotConfig?.provider === 'adsterra';

  useEffect(() => {
    if (!slotConfig?.slot && !isAdsterra) {
      return undefined;
    }

    if (isAdsterra) {
      const key = slotConfig?.key;
      if (!key) {
        return undefined;
      }

      const container = document.getElementById(`ad-slot-${slot}`);
      if (!container) {
        return undefined;
      }

      container.innerHTML = '';

      const setupScript = document.createElement('script');
      setupScript.type = 'text/javascript';
      setupScript.text = `
        atOptions = {
          key: '${key}',
          format: '${slotConfig.format || 'iframe'}',
          height: ${Number(slotConfig.height || 90)},
          width: ${Number(slotConfig.width || 728)},
          params: {}
        };
      `;
      container.appendChild(setupScript);

      const invokeScript = document.createElement('script');
      invokeScript.type = 'text/javascript';
      invokeScript.src = slotConfig.src || `https://ceasepancreas.com/${key}/invoke.js`;
      invokeScript.async = false;
      container.appendChild(invokeScript);

      return () => {
        container.innerHTML = '';
      };
    }

    const adClient = adsConfig?.adClient || 'ca-pub-2449944472030683';
    try {
      if (window.adsbygoogle && slotConfig?.slot) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (err) {
      console.error('[AdSlot] Error:', slot, err);
    }
    return undefined;
  }, [adsConfig?.adClient, isAdsterra, slot, slotConfig]);

  if (!slotConfig || (!slotConfig.slot && !isAdsterra)) return null;

  if (isAdsterra) {
    const wrapperClass = slotConfig.hideOnMobile ? `hidden md:flex ${className}` : className;
    return (
      <div className={`flex items-center justify-center overflow-hidden ${wrapperClass}`}>
        <div id={`ad-slot-${slot}`} />
      </div>
    );
  }

  const adClient = adsConfig?.adClient || 'ca-pub-2449944472030683';

  // In-feed ad (fluid layout)
  if (slotConfig.format === 'fluid') {
    return (
      <div className={className}>
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-format="fluid"
          data-ad-layout-key={slotConfig.layoutKey}
          data-ad-client={adClient}
          data-ad-slot={slotConfig.slot}
        />
      </div>
    );
  }

  const isRectangle = slotConfig?.size === '300x250';
  const standardStyle = isRectangle
    ? { display: 'inline-block', width: '300px', maxWidth: '100%', minHeight: '250px' }
    : { display: 'block', width: '100%', maxWidth: '728px', minHeight: '50px' };

  // Standard ads
  return (
    <div className={`flex items-center justify-center overflow-hidden ${className}`}>
      <ins
        className="adsbygoogle"
        style={standardStyle}
        data-ad-client={adClient}
        data-ad-slot={slotConfig.slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
