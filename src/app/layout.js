import './globals.css';
import SiteFooter from '@/components/SiteFooter';
import ConsentBanner from '@/components/ConsentBanner';
import SiteHeader from '@/components/SiteHeader';
import { SITE_BRANDING } from '@/config/site';

const siteUrl = SITE_BRANDING.siteUrl;
const absoluteOgImageUrl = new URL(SITE_BRANDING.ogImagePath, siteUrl).toString();

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: SITE_BRANDING.metadataTitle,
    template: `%s | ${SITE_BRANDING.title}`
  },
  description: SITE_BRANDING.description,
  applicationName: SITE_BRANDING.title,
  keywords: SITE_BRANDING.keywords,
  alternates: {
    canonical: '/'
  },
  category: 'entertainment',
  robots: {
    index: true,
    follow: true
  },
  icons: {
    icon: [
      { url: SITE_BRANDING.iconPath, sizes: '512x512', type: 'image/png' },
      { url: '/uploads/dekho-prime-icon-192.png', sizes: '192x192', type: 'image/png' }
    ],
    apple: [{ url: '/uploads/dekho-prime-icon-180.png', sizes: '180x180', type: 'image/png' }],
    shortcut: [SITE_BRANDING.iconPath]
  },
  openGraph: {
    title: SITE_BRANDING.metadataTitle,
    description: SITE_BRANDING.description,
    url: siteUrl,
    siteName: SITE_BRANDING.title,
    type: 'website',
    images: [
      {
        url: absoluteOgImageUrl,
        width: 1200,
        height: 630,
        alt: `${SITE_BRANDING.title} logo`
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_BRANDING.metadataTitle,
    description: SITE_BRANDING.description,
    images: [absoluteOgImageUrl]
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
};

export default function RootLayout({ children }) {
  const schemaOrg = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_BRANDING.title,
    alternateName: SITE_BRANDING.tagline,
    description: SITE_BRANDING.description,
    url: siteUrl
  };

  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#050B1C" />
        <meta name="apple-mobile-web-app-title" content={SITE_BRANDING.title} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }} />
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
            var cap = window.Capacitor;
            var isNative = !!(cap && (
              (typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) ||
              (typeof cap.getPlatform === 'function' && cap.getPlatform() !== 'web') ||
              cap.platform === 'android' ||
              cap.platform === 'ios'
            ));
            if (isNative) return;

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
