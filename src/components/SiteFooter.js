import Link from 'next/link';
import LiveVisitorCount from '@/components/LiveVisitorCount';

export default function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-steel/15 bg-white/60 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-[1440px] px-3 py-5 sm:px-4 md:py-6 xl:px-5">
        <div className="mx-auto grid w-full max-w-4xl gap-5 text-steel md:grid-cols-[1.7fr_1fr] md:items-start md:gap-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink md:text-sm">Disclaimer</p>

            <div className="space-y-1 text-xs leading-relaxed md:text-sm">
              <p>BDIX IPTV indexes publicly available stream links from third-party sources.
                We do not host, own, rebroadcast, or control any stream content.
                All channel names, logos, and media rights belong to their respective owners.
              </p>
            </div>
          </div>

          <div className="space-y-3 md:justify-self-end">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink md:text-sm">Live Visitors</p>
            <LiveVisitorCount />
            <div className="max-w-[170px]">
              <img
                src="https://hitwebcounter.com/counter/counter.php?page=21479324&style=0030&nbdigits=5&type=ip&initCount=0"
                title="HitWebCounter"
                alt="HitWebCounter visitor counter"
                loading="lazy"
                decoding="async"
                className="h-auto w-full"
              />
            </div>
          </div>

          <div className="border-t border-steel/15 pt-2.5 text-[11px] leading-relaxed md:col-span-2 md:text-xs">
            <p className="text-center md:text-left">
              © {new Date().getFullYear()} <a href="/">BDIX IPTV</a> · Use at your own discretion ·{' '}
              <Link href="/privacy" className="text-sea hover:underline">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
