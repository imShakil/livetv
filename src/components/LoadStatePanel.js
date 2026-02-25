'use client';

export default function LoadStatePanel({
  status,
  onRetry,
  loadingMessage = 'Loading channels...',
  errorTitle = 'Unable to load channels',
  errorMessage = 'Check your network on this device and try again.'
}) {
  if (status === 'loading') {
    return (
      <main>
        <div className="rounded-2xl border border-steel/20 bg-white/80 p-8 text-center text-steel shadow-card">
          {loadingMessage}
        </div>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main>
        <div className="space-y-4 rounded-2xl border border-amber-300 bg-amber-50 p-8 text-amber-900 shadow-card">
          <h1 className="text-xl font-semibold">{errorTitle}</h1>
          <p className="text-sm">{errorMessage}</p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg bg-amber-900 px-4 py-2 text-sm font-medium text-white"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return null;
}
