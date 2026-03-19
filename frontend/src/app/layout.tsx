import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';

import TopNav from '@/components/TopNav';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'VSPP | Verified Social Pitch Platform',
  description: 'Copy-trade the best equity researchers with verified skin in the game.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${outfit.variable} font-sans antialiased selection:bg-yellow-400/30 min-h-screen bg-[#09090b] text-foreground relative bg-grid-vertical`}>
        <TopNav />
        <main className="relative z-10">
          {children}
        </main>
        
        {/* Global Tactical Elements */}
        <div className="fixed inset-0 pointer-events-none opacity-[0.02] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] z-[100]" />
      </body>
    </html>
  );
}
