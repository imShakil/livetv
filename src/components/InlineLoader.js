'use client';

import { SITE_BRANDING } from '@/config/site';

export default function InlineLoader({
  size = 'md',
  className = ''
}) {
  const logoSize = size === 'sm' ? 'h-10 w-10 p-1' : 'h-14 w-14 p-1.5';
  const ringSize = size === 'sm' ? 'h-14 w-14 border-2' : 'h-20 w-20 border-[3px]';
  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <div className="relative inline-flex items-center justify-center">
        <span
          className={`${ringSize} absolute animate-spin rounded-full border-sea/70 border-r-transparent`}
          aria-hidden="true"
        />
        <img
          src="/uploads/dekho-prime-icon-header-128.png"
          alt={`${SITE_BRANDING.title} logo`}
          className={`${logoSize} rounded-2xl bg-white shadow-sm`}
        />
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
