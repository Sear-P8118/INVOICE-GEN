import type { Metadata, Viewport } from 'next';
import './globals.css';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

export const metadata: Metadata = {
  title: 'Battery Invoices',
  description: 'Invoicing for Car Battery Perth, Battery Factory Direct and Fremantle Batteries',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Invoices',
  },
  icons: {
    apple: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#f2f2f7',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // stops iOS zooming when a field is focused
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* The font comes from --font-sans: real SF on Apple devices. */}
      <body suppressHydrationWarning className="min-h-dvh bg-group font-sans text-label antialiased">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
