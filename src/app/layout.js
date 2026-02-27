import './globals.css';
import SiteFooter from '@/components/SiteFooter';
import ConsentBanner from '@/components/ConsentBanner';
import SiteHeader from '@/components/SiteHeader';
import { SITE_BRANDING } from '@/config/site';

export const metadata = {
  title: SITE_BRANDING.metadataTitle,
  description: SITE_BRANDING.description,
  keywords: ['IPTV', 'live tv', 'm3u8', 'streaming', 'bdix tv'],
  other: {
    'google-adsense-account': 'ca-pub-2449944472030683'
  },
  openGraph: {
    title: SITE_BRANDING.metadataTitle,
    description: SITE_BRANDING.description,
    type: 'website'
  },
  twitter: {
    card: 'summary',
    title: SITE_BRANDING.metadataTitle,
    description: SITE_BRANDING.description
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2449944472030683"
          crossOrigin="anonymous"
        />
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-YY76ZPGRHG"
        />
        <script>{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-YY76ZPGRHG');
        `}</script>
        <script>{`
          (function () {
            var host = window.location.hostname;
            var adScriptByHost = {
              'bdixtv.mhosen.com': 'https://ceasepancreas.com/c7/21/73/c721736c340f6ebd2f5dc866ecf0d945.js',
              'livetv.imshakil.online': 'https://ceasepancreas.com/30/6c/d6/306cd6330dd79993a3b6b37c01f7dfd3.js'
            };
            var adSrc = adScriptByHost[host];
            if (!adSrc) return;
            var script = document.createElement('script');
            script.src = adSrc;
            script.async = true;
            document.head.appendChild(script);
          })();
        `}</script>
      </head>
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
        <ConsentBanner />
      </body>
    </html>
  );
}
