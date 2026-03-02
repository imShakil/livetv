'use client';

import { SITE_BRANDING } from '@/config/site';

export default function InlineLoader({
  size = 'md',
  className = ''
}) {
  const logoSize = size === 'sm' ? 'h-10 w-10 p-1' : 'h-14 w-14 p-1.5';
  const ringSize = size === 'sm' ? 'h-14 w-14' : 'h-20 w-20';
  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <div className="relative inline-flex items-center justify-center">
        <svg
          className={`${ringSize} absolute animate-spin`}
          viewBox="0 0 50 50"
          aria-hidden="true"
        >
          <circle
            cx="25"
            cy="25"
            r="22"
            fill="none"
            stroke="#1f8ceb"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="112 42"
          />
        </svg>
        <img
          src="/uploads/dekho-prime-icon-only-600x500.png"
          alt={`${SITE_BRANDING.title} logo`}
          className={`${logoSize} rounded-2xl`}
        />
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
