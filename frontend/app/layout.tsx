import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/shared/providers';
import { PwaRegister } from '@/components/shared/pwa-register';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: 'Becha-Kena | Bangladesh’s First NID-Verified C2C Resale Marketplace',
  description:
    'Buy and sell authentic products securely with 100% NID-verified users, scam protection, and real-time deals in Bangladesh.',
  keywords: [
    'Becha-Kena',
    'Buy and Sell',
    'Marketplace Bangladesh',
    'NID Verified',
    'Resale BD',
    'Second Hand BD',
  ],
  authors: [{ name: 'Becha-Kena Team' }],
  openGraph: {
    title: 'Becha-Kena - Verified Resale Marketplace',
    description:
      'Buy and sell securely with NID-verified citizens across Bangladesh.',
    url: 'https://becha-kena.com',
    siteName: 'Becha-Kena',
    locale: 'bn_BD',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Becha-Kena | Bangladesh’s First NID-Verified Resale Marketplace',
    description: 'Safe and transparent C2C resale marketplace in Bangladesh.',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" className={inter.variable}>
      <body className="antialiased min-h-screen flex flex-col font-sans" suppressHydrationWarning>
        <Providers>
          <PwaRegister />
          {children}
        </Providers>
      </body>
    </html>
  );
}
