import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';

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
      <body className={`${outfit.variable} font-sans antialiased selection:bg-primary/30 min-h-screen bg-background text-foreground`}>
        {children}
      </body>
    </html>
  );
}
