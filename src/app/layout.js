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
