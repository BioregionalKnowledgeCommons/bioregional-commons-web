import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Providers from './providers';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || 'https://omniharmonic.github.io/bioregionalknowledgecommons'
  ),
  title: 'Bioregional Knowledge Commons',
  description:
    'Permissionless bioregional knowledge commons federation infrastructure. Explore knowledge flowing between bioregions on an interactive 3D globe.',
  openGraph: {
    title: 'Bioregional Knowledge Commons',
    description:
      'Permissionless bioregional knowledge commons federation infrastructure. Explore knowledge flowing between bioregions on an interactive 3D globe.',
    type: 'website',
    siteName: 'Bioregional Knowledge Commons',
    url: 'https://commons.opencivics.org',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Bioregional Knowledge Commons - Interactive 3D Globe',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bioregional Knowledge Commons',
    description:
      'Permissionless bioregional knowledge commons federation infrastructure.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-950 text-white overflow-hidden`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
