'use client';

import { useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { AdMob } from '@capacitor-community/admob';

let admobInitPromise = null;

function isNativeRuntime() {
  return Capacitor.getPlatform() !== 'web';
}

function resolveAdUnitId(config) {
  const platform = Capacitor.getPlatform();
  if (platform === 'android') {
    return config?.androidAdUnitId || config?.adUnitId || null;
  }
  if (platform === 'ios') {
    return config?.iosAdUnitId || config?.adUnitId || null;
  }
  return config?.adUnitId || null;
}

async function ensureAdMobInitialized(config) {
  if (!admobInitPromise) {
    admobInitPromise = (async () => {
      if (Capacitor.getPlatform() === 'ios') {
        try {
          const statusResult = await AdMob.trackingAuthorizationStatus();
          if (statusResult?.status === 'notDetermined') {
            await AdMob.requestTrackingAuthorization();
          }
        } catch {
          // Ignore ATT prompt failures so ad initialization can still proceed.
        }
      }

      await AdMob.initialize({
        initializeForTesting: Boolean(config?.isTesting),
        testingDevices: Array.isArray(config?.testingDevices) ? config.testingDevices : undefined
      });
    })().catch((error) => {
      admobInitPromise = null;
      throw error;
    });
  }
  return admobInitPromise;
}

export default function useNativeAdActions(adsConfig) {
  const isNative = isNativeRuntime();
  const interstitialCounterRef = useRef({});
  const interstitialLastShownRef = useRef({});
  const interstitialBusyRef = useRef(false);
  const rewardedBusyRef = useRef(false);
  const rewardUnlockedUntilRef = useRef(0);
  const [isRewardedLoading, setIsRewardedLoading] = useState(false);
  const [rewardUnlockedUntil, setRewardUnlockedUntil] = useState(0);

  const activeRewardConfig = useMemo(() => adsConfig?.rewarded?.unlockStream || null, [adsConfig]);

  const isRewardActive = rewardUnlockedUntil > Date.now();
  const rewardMinutesLeft = isRewardActive
    ? Math.max(1, Math.ceil((rewardUnlockedUntil - Date.now()) / 60000))
    : 0;

  const maybeShowInterstitial = async (triggerName) => {
    if (!isNative) {
      return false;
    }
    if (Date.now() < rewardUnlockedUntilRef.current) {
      return false;
    }

    const config = adsConfig?.interstitial?.[triggerName];
    if (!config || config.enabled === false || config.provider !== 'admob') {
      return false;
    }

    const adId = resolveAdUnitId(config);
    if (!adId) {
      return false;
    }

    const count = (interstitialCounterRef.current[triggerName] || 0) + 1;
    interstitialCounterRef.current[triggerName] = count;

    const triggerEvery = Math.max(1, Number(config.triggerEvery || config.every || 1));
    if (count % triggerEvery !== 0) {
      return false;
    }

    const now = Date.now();
    const cooldownMs = Math.max(0, Number(config.cooldownSeconds || 0) * 1000);
    const lastShownAt = interstitialLastShownRef.current[triggerName] || 0;
    if (cooldownMs > 0 && now - lastShownAt < cooldownMs) {
      return false;
    }

    if (interstitialBusyRef.current) {
      return false;
    }

    interstitialBusyRef.current = true;
    try {
      await ensureAdMobInitialized(config);
      await AdMob.prepareInterstitial({
        adId,
        isTesting: Boolean(config.isTesting),
        npa: Boolean(config.npa)
      });
      await AdMob.showInterstitial();
      interstitialLastShownRef.current[triggerName] = now;
      return true;
    } catch (error) {
      console.error('[NativeAds] Interstitial failed:', triggerName, error);
      return false;
    } finally {
      interstitialBusyRef.current = false;
    }
  };

  const showRewarded = async (triggerName) => {
    if (!isNative) {
      return { shown: false, rewarded: false };
    }

    const config = adsConfig?.rewarded?.[triggerName];
    if (!config || config.enabled === false || config.provider !== 'admob') {
      return { shown: false, rewarded: false };
    }

    const adId = resolveAdUnitId(config);
    if (!adId || rewardedBusyRef.current) {
      return { shown: false, rewarded: false };
    }

    rewardedBusyRef.current = true;
    setIsRewardedLoading(true);

    try {
      await ensureAdMobInitialized(config);
      await AdMob.prepareRewardVideoAd({
        adId,
        isTesting: Boolean(config.isTesting),
        npa: Boolean(config.npa)
      });
      const reward = await AdMob.showRewardVideoAd();

      const rewardMinutes = Math.max(1, Number(config.rewardMinutes || 15));
      const unlockedUntil = Date.now() + rewardMinutes * 60 * 1000;
      rewardUnlockedUntilRef.current = unlockedUntil;
      setRewardUnlockedUntil(unlockedUntil);

      return { shown: true, rewarded: true, reward };
    } catch (error) {
      console.error('[NativeAds] Rewarded failed:', triggerName, error);
      return { shown: false, rewarded: false, error };
    } finally {
      rewardedBusyRef.current = false;
      setIsRewardedLoading(false);
    }
  };

  const rewardedEnabled = Boolean(
    isNative &&
    activeRewardConfig?.enabled &&
    activeRewardConfig?.provider === 'admob' &&
    resolveAdUnitId(activeRewardConfig)
  );

  const rewardedLabel = isRewardActive
    ? `Ad-free ${rewardMinutesLeft}m left`
    : (activeRewardConfig?.ctaLabel || 'Watch ad for ad-free time');

  return {
    maybeShowInterstitial,
    showRewarded,
    rewardedEnabled,
    rewardedLabel,
    isRewardedLoading,
    isRewardActive
  };
}
