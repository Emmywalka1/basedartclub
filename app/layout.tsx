'use client'

import './globals.css';
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'
import { injected } from '@wagmi/connectors'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://baseartclub.xyz';

// Create a query client for Wagmi
const queryClient = new QueryClient()

// Simple Wagmi configuration with just Base and injected connector
const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  connectors: [
    injected(),
  ],
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>Base Art Club</title>
        <meta name="description" content="Swipe through curated artworks on Base. Like, pass, or collect your favorites." />
        
        {/* Open Graph */}
        <meta property="og:title" content="Base Art Club" />
        <meta property="og:description" content="The easiest way to discover amazing art on Base" />
        <meta property="og:image" content={`${baseUrl}/og.png`} />
        <meta property="og:type" content="website" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Base Art Club" />
        <meta name="twitter:description" content="The easiest way to discover amazing art on Base" />
        <meta name="twitter:image" content={`${baseUrl}/og.png`} />
        
        {/* Farcaster Mini App */}
        <meta name="fc:miniapp" content={JSON.stringify({
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
        })} />
        
        {/* Favicon */}
        <link rel="icon" href="/icon.png" />
        
        {/* Viewport */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
