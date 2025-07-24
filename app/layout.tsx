import type { Metadata } from 'next';
import './globals.css';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://baseartclub.xyz';

export const metadata: Metadata = {
  title: 'Base Art Club',
  description: 'Swipe through curated artworks on Base. Like, pass, or collect your favorites.',
  openGraph: {
    title: 'Base Art Club',
    description: 'The easiest way to discover amazing art on Base',
    images: [`${baseUrl}/og.png`],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Base Art Club',
    description: 'The easiest way to discover amazing art on Base',
    images: [`${baseUrl}/og.png`],
  },
  other: {
    'fc:miniapp': JSON.stringify({
      version: "1",
      imageUrl: `${baseUrl}/og.png`,
      button: {
        title: "Start Swiping",
        action: {
          type: "launch_frame",
          name: "Base Art Club",
          url: baseUrl,
          splashImageUrl: `${baseUrl}/splash.png`,
          splashBackgroundColor: "#0052FF"
        }
      }
    })
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
