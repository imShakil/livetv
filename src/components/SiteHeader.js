'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SITE_BRANDING } from '@/config/site';

const MENU_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'Featuring', href: '/featuring' },
  { label: 'World IPTV', href: '/world' },
  { label: 'IPTV Player', href: '/play' }
];

export default function SiteHeader() {
  const pathname = usePathname();
  const isItemActive = (href) => {
    if (href === '/') {
      return pathname === '/';
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-steel/15 bg-white/75 backdrop-blur-md">
      <nav className="mx-auto flex w-full max-w-[1440px] flex-col gap-2.5 px-3 py-3 md:flex-row md:items-center md:justify-between md:gap-4 md:px-4 xl:px-5">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <img src="/icon.svg" alt="BDIX IPTV logo" className="h-7 w-7 shrink-0 rounded-lg border border-steel/20 md:h-8 md:w-8" />
          <span className="truncate text-sm font-extrabold tracking-tight text-ink sm:text-base md:text-lg">
            {SITE_BRANDING.title}
          </span>
        </Link>

        <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:items-center md:gap-2">
          {MENU_ITEMS.map((item) => {
            const isActive = isItemActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`rounded-full px-3 py-1.5 text-center text-sm font-semibold transition ${
                  isActive
                    ? 'border border-sea bg-sea text-white shadow-sm'
                    : 'border border-steel/20 bg-white text-ink hover:bg-slate-50'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
