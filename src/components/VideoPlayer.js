'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { normalizeIframeSource } from '@/utils/sourceUtils';
import { logEvent } from '@/utils/telemetry';

const ReactPlayer = dynamic(() => import('react-player/lazy'), { ssr: false });

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

export default function VideoPlayer({ channel, autoplay }) {
  const isMobile = useMemo(() => {
    if (typeof navigator === 'undefined') {
      return false;
    }

    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
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

  if (!channel) {
    return (
      <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-steel/20 bg-white/85 p-10 text-steel md:min-h-[420px]">
        Select a channel to start streaming.
      </div>
    );
  }

  const insecureStream =
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    // channel.type !== 'iframe' &&
    channel.source.startsWith('http://');

  // TODO: Re-enable this check once we have a better solution for mixed content
  // if (insecureStream) {
  //   return (
  //     <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-8 text-amber-900 md:min-h-[420px]">
  //       <AlertTriangle className="h-5 w-5" />
  //       <p className="text-center text-sm font-medium">
  //         This stream is HTTP and may be blocked on mobile/HTTPS.
  //       </p>
  //       <a
  //         href={channel.source}
  //         target="_blank"
  //         rel="noreferrer"
  //         className="inline-flex items-center gap-1 rounded-lg bg-amber-900 px-3 py-2 text-xs font-semibold text-white"
  //       >
  //         Open direct stream <ExternalLink className="h-3.5 w-3.5" />
  //       </a>
  //     </div>
  //   );
  // }

  if (channel.type === 'iframe') {
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
      <div className="relative overflow-hidden rounded-2xl border border-steel/20 bg-black shadow-card ring-1 ring-black/5">
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

  // Use native video on iOS for better HLS support
  const useNativePlayer = isMobile && channel.type === 'm3u8';

  if (useNativePlayer) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-steel/20 bg-black shadow-card ring-1 ring-black/5">
        {insecureStream ? <MixedContentWarning httpPlayerUrl={httpPlayerUrl} /> : null}
        <div className="aspect-video md:aspect-[16/9]">
          <video
            src={channel.source}
            controls
            playsInline
            muted
            preload="metadata"
            className="h-full w-full"
            onPlay={() => logEvent('player_play', { name: channel.name, type: 'native' })}
            onError={() => logEvent('player_error', { name: channel.name, type: 'native' })}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-steel/20 bg-black shadow-card ring-1 ring-black/5">
      {insecureStream ? <MixedContentWarning httpPlayerUrl={httpPlayerUrl} /> : null}
      <div className="aspect-video md:aspect-[16/9]">
        <ReactPlayer
          url={channel.source}
          controls
          playing={isMobile ? false : autoplay}
          muted={isMobile ? true : false}
          onPlay={() => logEvent('player_play', { name: channel.name, type: channel.type })}
          onError={(error) => {
            console.error('[Player] Error:', error, channel.name);
            logEvent('player_error', { name: channel.name, type: channel.type, mobile: isMobile });
          }}
          width="100%"
          height="100%"
          playsinline
          config={{
            file: {
              forceHLS: channel.type === 'm3u8',
              hlsOptions: {
                enableWorker: false,
                lowLatencyMode: true,
                backBufferLength: 30,
                maxBufferLength: 30,
                maxMaxBufferLength: 60,
                maxBufferSize: 60 * 1000 * 1000,
                maxBufferHole: 0.5,
                highBufferWatchdogPeriod: 2,
                nudgeMaxRetry: 3,
                manifestLoadingTimeOut: 10000,
                manifestLoadingMaxRetry: 3,
                levelLoadingTimeOut: 10000,
                levelLoadingMaxRetry: 3,
                fragLoadingTimeOut: 20000,
                fragLoadingMaxRetry: 3
              },
              attributes: {
                controlsList: 'nodownload',
                playsInline: true,
                'webkit-playsinline': true,
                'x-webkit-airplay': 'allow',
                preload: 'metadata'
              }
            }
          }}
        />
      </div>
    </div>
  );
}
