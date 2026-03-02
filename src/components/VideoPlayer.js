'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Hls from 'hls.js';
import { AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';
import InlineLoader from '@/components/InlineLoader';
import { isLikelyM3uSource, normalizeIframeSource } from '@/utils/sourceUtils';
import { logEvent } from '@/utils/telemetry';

const MAX_AUTO_RETRIES = 3;
const RETRY_DELAYS_MS = [1500, 3000, 5000];

const MEDIA_ERROR_TEXT = {
  1: 'Playback was interrupted before the stream finished loading.',
  2: 'The browser hit a network issue while fetching this stream.',
  3: 'The stream data appears corrupted or partially unreadable.',
  4: 'This stream format is not supported by this browser.'
};

function readStatusCode(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'number') {
    return value;
  }

  const match = String(value).match(/\b([45]\d{2})\b/);
  return match ? Number(match[1]) : null;
}

function classifyPlayerError({ code = null, status = null, message = '' } = {}) {
  const normalized = String(message || '').toLowerCase();
  const httpStatus = status || readStatusCode(message);

  if (
    httpStatus === 401 ||
    httpStatus === 403 ||
    normalized.includes('forbidden') ||
    normalized.includes('unauthorized') ||
    normalized.includes('geo') ||
    normalized.includes('region') ||
    normalized.includes('country')
  ) {
    return 'region';
  }

  if (
    httpStatus === 404 ||
    httpStatus === 410 ||
    normalized.includes('not found') ||
    normalized.includes('dead') ||
    normalized.includes('manifestloaderror')
  ) {
    return 'broken';
  }

  if (
    normalized.includes('network') ||
    normalized.includes('timeout') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('fragloaderror') ||
    normalized.includes('levelloaderror')
  ) {
    return 'network';
  }

  if (
    code === 4 ||
    normalized.includes('not supported') ||
    normalized.includes('decode') ||
    normalized.includes('demux') ||
    normalized.includes('codec')
  ) {
    return 'unsupported';
  }

  if (
    normalized.includes('cors') ||
    normalized.includes('mixed content') ||
    normalized.includes('cross-origin') ||
    normalized.includes('blocked')
  ) {
    return 'blocked';
  }

  return 'unknown';
}

function buildNativeError(event) {
  const mediaError = event?.target?.error || event?.currentTarget?.error;
  const code = mediaError?.code || null;
  const message = mediaError?.message || MEDIA_ERROR_TEXT[code] || 'Native player failed to load the media stream.';
  return {
    source: 'native',
    code,
    message,
    status: readStatusCode(message)
  };
}

function MixedContentWarning({ httpPlayerUrl }) {
  if (!httpPlayerUrl) {
    return null;
  }

  return (
    <div className="absolute right-3 top-3 z-20 max-w-[300px] rounded-lg border border-amber-300 bg-amber-50/95 p-2 text-amber-900 shadow">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="text-xs">
          <p className="font-semibold">HTTP stream on HTTPS page.</p>
          <a
            href={httpPlayerUrl}
            className="mt-1 inline-flex items-center gap-1 font-semibold underline"
          >
            Open HTTP player <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

export default function VideoPlayer({ channel, autoplay, isLoading = false }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const retryTimerRef = useRef(null);
  const retryCountRef = useRef(0);

  const [playerState, setPlayerState] = useState('idle');
  const [errorInfo, setErrorInfo] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [reloadNonce, setReloadNonce] = useState(0);

  const isMobile = useMemo(() => {
    if (typeof navigator === 'undefined') {
      return false;
    }

    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  }, []);

  const supportsNativeHls = useMemo(() => {
    if (typeof document === 'undefined') {
      return false;
    }

    const probeVideo = document.createElement('video');
    if (!probeVideo?.canPlayType) {
      return false;
    }

    return Boolean(
      probeVideo.canPlayType('application/vnd.apple.mpegurl') ||
        probeVideo.canPlayType('application/x-mpegURL')
    );
  }, []);

  const httpPlayerUrl = useMemo(() => {
    if (
      typeof window === 'undefined' ||
      !channel ||
      window.location.protocol !== 'https:' ||
      !channel.source.startsWith('http://')
    ) {
      return null;
    }

    try {
      const target = new URL('/play', window.location.href);
      target.protocol = 'http:';
      target.searchParams.set('url', channel.source);
      target.searchParams.set('type', channel.type || 'auto');
      if (channel.name) {
        target.searchParams.set('name', channel.name);
      }
      return target.toString();
    } catch {
      return window.location.href.replace(/^https:/, 'http:');
    }
  }, [channel]);

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const destroyHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  const handlePlayerPlay = useCallback(
    (typeLabel) => {
      logEvent('player_play', { name: channel?.name, type: typeLabel });
    },
    [channel?.name]
  );

  const handlePlayerError = useCallback(
    (payload) => {
      const reason = classifyPlayerError(payload);
      const message = payload?.message || 'Playback failed.';

      setErrorInfo({ reason, message, status: payload?.status || null, code: payload?.code || null });
      setPlayerState('error');

      logEvent('player_error', {
        name: channel?.name,
        type: channel?.type,
        mobile: isMobile,
        reason,
        status: payload?.status || undefined,
        code: payload?.code || undefined,
        message
      });
    },
    [channel?.name, channel?.type, isMobile]
  );

  const scheduleRetry = useCallback(() => {
    const current = retryCountRef.current;
    if (current >= MAX_AUTO_RETRIES) {
      return;
    }

    const nextCount = current + 1;
    retryCountRef.current = nextCount;
    setRetryCount(nextCount);

    const delay = RETRY_DELAYS_MS[nextCount - 1] || RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
    setPlayerState('loading');
    clearRetryTimer();
    retryTimerRef.current = window.setTimeout(() => {
      setReloadNonce((value) => value + 1);
    }, delay);

    logEvent('player_retry_scheduled', {
      name: channel?.name,
      type: channel?.type,
      retryCount: nextCount,
      delay
    });
  }, [channel?.name, channel?.type, clearRetryTimer]);

  const handleManualRetry = useCallback(() => {
    retryCountRef.current = 0;
    setRetryCount(0);
    setErrorInfo(null);
    setPlayerState('loading');
    clearRetryTimer();
    setReloadNonce((value) => value + 1);
    logEvent('player_retry_manual', {
      name: channel?.name,
      type: channel?.type
    });
  }, [channel?.name, channel?.type, clearRetryTimer]);

  useEffect(() => {
    return () => {
      clearRetryTimer();
      destroyHls();
    };
  }, [clearRetryTimer, destroyHls]);

  useEffect(() => {
    retryCountRef.current = 0;
    setRetryCount(0);
    setErrorInfo(null);
    setPlayerState('loading');
  }, [channel?.source]);

  const shouldRenderIframe = channel?.type === 'iframe' && !isLikelyM3uSource(channel?.source || '');

  useEffect(() => {
    if (!channel || shouldRenderIframe) {
      return undefined;
    }

    const videoEl = videoRef.current;
    if (!videoEl) {
      return undefined;
    }

    clearRetryTimer();
    destroyHls();
    setErrorInfo(null);
    setPlayerState('loading');

    const isHlsStream = channel.type === 'm3u8';
    const shouldUseNativeHls = isHlsStream && supportsNativeHls;

    if (!isHlsStream || shouldUseNativeHls) {
      videoEl.src = channel.source;
      videoEl.load();
      return undefined;
    }

    if (!Hls.isSupported()) {
      handlePlayerError({
        source: 'hls.js',
        code: 4,
        message: 'This browser cannot play this HLS stream.',
        status: null
      });
      return undefined;
    }

    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
      backBufferLength: 30,
      maxBufferLength: 30,
      maxMaxBufferLength: 60,
      maxBufferSize: 60 * 1000 * 1000,
      maxBufferHole: 0.5,
      highBufferWatchdogPeriod: 2,
      nudgeMaxRetry: 3,
      manifestLoadingTimeOut: 10000,
      manifestLoadingMaxRetry: 2,
      levelLoadingTimeOut: 10000,
      levelLoadingMaxRetry: 2,
      fragLoadingTimeOut: 20000,
      fragLoadingMaxRetry: 2
    });

    hlsRef.current = hls;

    hls.on(Hls.Events.MANIFEST_LOADING, () => {
      setPlayerState('loading');
    });

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      if (autoplay) {
        videoEl.play().catch(() => {});
      }
    });

    hls.on(Hls.Events.ERROR, (_, data) => {
      const details = {
        source: 'hls.js',
        code: null,
        status: readStatusCode(data?.response?.code) || readStatusCode(data?.reason),
        message: data?.reason || data?.details || 'HLS playback failed.'
      };

      const isBufferStall = data?.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR;
      if (isBufferStall) {
        setPlayerState('stalled');
      }

      if (!data?.fatal) {
        return;
      }

      handlePlayerError(details);

      if (retryCountRef.current < MAX_AUTO_RETRIES) {
        scheduleRetry();
      }
    });

    hls.loadSource(channel.source);
    hls.attachMedia(videoEl);

    return () => {
      destroyHls();
    };
  }, [
    autoplay,
    channel,
    clearRetryTimer,
    destroyHls,
    handlePlayerError,
    scheduleRetry,
    shouldRenderIframe,
    supportsNativeHls,
    reloadNonce
  ]);

  if (!channel) {
    if (isLoading) {
      return (
        <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-steel/20 bg-white/85 p-10 md:min-h-[420px]">
          <InlineLoader />
        </div>
      );
    }

    return (
      <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-steel/20 bg-white/85 p-10 text-steel md:min-h-[420px]">
        Select a channel to start streaming.
      </div>
    );
  }

  const insecureStream =
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    channel.source.startsWith('http://');

  if (shouldRenderIframe) {
    const iframeSrc = normalizeIframeSource(channel.source);

    if (!iframeSrc) {
      return (
        <div className="flex min-h-[260px] items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-10 text-amber-900 md:min-h-[420px]">
          <AlertTriangle className="h-5 w-5" />
          Invalid iframe source.
        </div>
      );
    }

    return (
      <div className="relative overflow-hidden rounded-2xl border border-steel/20 bg-slate-900 shadow-card ring-1 ring-black/5">
        {insecureStream ? <MixedContentWarning httpPlayerUrl={httpPlayerUrl} /> : null}
        <div className="aspect-video md:aspect-[16/9]">
          <iframe
            src={iframeSrc}
            title={channel.name}
            className="h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  const showBlockingOverlay = playerState === 'loading' || playerState === 'stalled' || playerState === 'error';
  const showBrandLogo = playerState === 'playing' && !showBlockingOverlay;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-steel/20 bg-slate-900 shadow-card ring-1 ring-black/5">
      {insecureStream ? <MixedContentWarning httpPlayerUrl={httpPlayerUrl} /> : null}
      <div className="aspect-video md:aspect-[16/9]">
        <video
          ref={videoRef}
          key={`video-${channel.source}-${reloadNonce}`}
          controls
          autoPlay={Boolean(autoplay)}
          playsInline
          muted={Boolean(autoplay)}
          preload="metadata"
          className="h-full w-full bg-slate-900"
          onLoadStart={() => {
            setPlayerState('loading');
          }}
          onWaiting={() => {
            if (playerState !== 'error') {
              setPlayerState('stalled');
            }
          }}
          onPlaying={() => {
            setPlayerState('playing');
            setErrorInfo(null);
            handlePlayerPlay(channel.type === 'm3u8' && !supportsNativeHls ? 'hls.js' : 'native');
          }}
          onCanPlay={() => {
            if (playerState !== 'error') {
              setPlayerState('playing');
            }
          }}
          onPause={() => {
            if (playerState !== 'error') {
              setPlayerState('idle');
            }
          }}
          onError={(event) => {
            const errorPayload = buildNativeError(event);
            handlePlayerError(errorPayload);
            if (retryCountRef.current < MAX_AUTO_RETRIES) {
              scheduleRetry();
            }
          }}
        />

        {showBrandLogo ? (
          <div className="pointer-events-none absolute left-3 top-3 z-20 md:left-4 md:top-4">
            <div className="inline-flex items-center rounded-full border border-white/25 bg-black/45 px-2 py-1.5 backdrop-blur-sm md:px-3 md:py-2">
              <Image
                src="/uploads/dekho-prime-icon-header-128.png"
                alt="Dekho Prime"
                width={36}
                height={36}
                className="h-7 w-7 rounded-full md:h-9 md:w-9"
                priority={false}
              />
              <span className="hidden pl-2 pr-1 text-xs font-semibold tracking-wide text-white md:inline md:text-sm">
                Dekho Prime
              </span>
            </div>
          </div>
        ) : null}

        {showBlockingOverlay ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/38 px-4 backdrop-blur-[1px]">
            {playerState === 'error' ? (
              <div className="w-full max-w-md rounded-xl border border-rose-200/70 bg-white/95 p-4 text-center text-slate-900 shadow-xl backdrop-blur-sm dark:border-rose-300/35 dark:bg-slate-900/90 dark:text-slate-100 md:p-5">
                <p className="text-sm font-semibold md:text-base">Playback error</p>
                <p className="mt-2 text-xs text-slate-700 dark:text-slate-200 md:text-sm">
                  {errorInfo?.message || 'Stream playback failed. Please try again.'}
                </p>
                <button
                  type="button"
                  onClick={handleManualRetry}
                  className="pointer-events-auto mt-4 inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 md:text-sm"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry stream
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-center text-white">
                <InlineLoader />
                <p className="text-xs font-medium md:text-sm">
                  {playerState === 'stalled' ? 'Rebuffering stream...' : 'Loading stream...'}
                </p>
                {retryCount > 0 ? (
                  <p className="text-[10px] text-white/80 md:text-xs">Auto-retry attempt {retryCount} / {MAX_AUTO_RETRIES}</p>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
