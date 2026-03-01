'use client';

import InlineLoader from '@/components/InlineLoader';

export default function AppSplashScreen() {
  return (
    <main className="flex min-h-[65vh] items-center justify-center px-4">
      <section className="flex w-full max-w-xs justify-center">
        <InlineLoader />
      </section>
    </main>
  );
}
