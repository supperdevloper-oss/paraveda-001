import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SITE, siteUrl } from '@/lib/site-config';
import { Header, Footer } from '@/components/site-shell';

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} — Free File Converter`, template: `%s | ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  alternates: { canonical: siteUrl('/') },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: SITE.name,
    title: `${SITE.name} — Free File Converter`,
    description: SITE.description,
    url: siteUrl('/'),
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: `${SITE.name} — free file tools` }],
  },
  twitter: { card: 'summary_large_image', title: `${SITE.name} — Free File Converter`, description: SITE.description, images: ['/og-image.png'] },
  icons: { icon: '/favicon.svg', shortcut: '/favicon.svg' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#2563eb' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><Header/><main>{children}</main><Footer/></body></html>;
}
