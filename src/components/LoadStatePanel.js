'use client';

import { useEffect, useRef, useState } from 'react';
import InlineLoader from '@/components/InlineLoader';

/* ─── Scanline overlay ─── */
function Scanline() {
  return (
    <div className="lsp-scanline-wrap" aria-hidden="true">
      <div className="lsp-scanline" />
    </div>
  );
}

/* ─── Main component ─── */
export default function LoadStatePanel({
  status,
  onRetry,
  loadingMessage = 'Fetching live channel data',
  errorTitle = 'Signal lost',
  errorMessage = 'Could not reach the stream server. Check your connection and try again.',
}) {
  const [shaking, setShaking] = useState(false);
  const shakeTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (shakeTimeoutRef.current) {
        clearTimeout(shakeTimeoutRef.current);
      }
    };
  }, []);

  const handleRetry = () => {
    if (shakeTimeoutRef.current) {
      clearTimeout(shakeTimeoutRef.current);
    }
    setShaking(true);
    shakeTimeoutRef.current = setTimeout(() => setShaking(false), 450);
    onRetry?.();
  };

  /* ══════════════════════════════ LOADING ══════════════════════════════ */
  if (status === 'loading') {
    return (
      <main>
        <div className="mx-auto flex min-h-[55vh] w-full max-w-md items-center justify-center px-4">
          <div className="w-full flex justify-center">
            <InlineLoader />
          </div>
        </div>
      </main>
    );
  }

  /* ═══════════════════════════════ ERROR ═══════════════════════════════ */
  if (status === 'error') {
    return (
      <main>
        <div className={`lsp-card lsp-error-card${shaking ? ' lsp-shake' : ''}`}>
          <Scanline />

          {/* Header row */}
          <div className="lsp-error-header">
            <div className="lsp-error-icon">📡</div>
            <div>
              <div className="lsp-error-label">Error · No Signal</div>
              <h1 className="lsp-error-title">{errorTitle}</h1>
            </div>
          </div>

          <p className="lsp-error-message">{errorMessage}</p>

          <div className="lsp-error-divider" />

          <button
            type="button"
            onClick={handleRetry}
            className="lsp-retry-btn"
          >
            ↺ Retry connection
          </button>
        </div>
      </main>
    );
  }

  return null;
}
