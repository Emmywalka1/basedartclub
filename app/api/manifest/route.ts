import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://basedartclub.vercel.app';
  
  // Check if request is from Farcaster preview/debug tool
  const userAgent = request.headers.get('user-agent') || '';
  const referer = request.headers.get('referer') || '';
  const isDebugMode = referer.includes('debug') || userAgent.includes('Farcaster');
  
  const manifest = {
    accountAssociation: {
      // This will need to be generated using the Farcaster Mini App Manifest Tool
      // Visit: https://warpcast.com/~/developers/mini-apps/new
      // Replace these placeholder values with your actual signed account association
      header: "PLACEHOLDER_HEADER",
      payload: "PLACEHOLDER_PAYLOAD", 
      signature: "PLACEHOLDER_SIGNATURE"
    },
    frame: {
      version: "1",
      name: "Base Art Club",
      iconUrl: `${baseUrl}/icon.png`,
      homeUrl: baseUrl,
      splashImageUrl: `${baseUrl}/splash.png`,
      splashBackgroundColor: "#0052FF",
      subtitle: "Discover amazing art",
      description: "Swipe through curated artworks on Base. Like, pass, or collect your favorites.",
      screenshotUrls: [
        `${baseUrl}/screenshot1.png`,
        `${baseUrl}/screenshot2.png`,
        `${baseUrl}/screenshot3.png`
      ],
      primaryCategory: "art-creativity",
      secondaryCategory: "marketplace",
      tags: ["art", "nft", "base", "discovery", "collect", "foundation", "opensea", "zora", "manifold"],
      heroImageUrl: `${baseUrl}/hero.png`,
      tagline: "Swipe. Discover. Collect.",
      ogTitle: "Base Art Club - Discover Art on Base",
      ogDescription: "The easiest way to discover and collect amazing art from Foundation, OpenSea, Zora, and Manifold on Base blockchain.",
      ogImageUrl: `${baseUrl}/og.png`,
      // Enhanced configuration for better embedding
      embedConfiguration: {
        embedUrl: `${baseUrl}/embed`,
        fallbackUrl: baseUrl,
        allowFullscreen: true,
        aspectRatio: "portrait"
      },
      // Additional metadata
      features: [
        "swipe-navigation",
        "nft-discovery",
        "wallet-connection",
        "real-time-data"
      ],
      permissions: [
        "wallet_address",
        "fid"
      ]
    }
  };

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=3600',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  
  // Add debug headers if in debug mode
  if (isDebugMode) {
    headers['X-Debug-Mode'] = 'true';
    headers['X-Frame-Options'] = 'ALLOWALL';
  }

  // Ensure no restrictive headers
  const response = NextResponse.json(manifest, { headers });
  
  // Remove any potentially problematic headers
  response.headers.delete('X-Frame-Options');
  
  return response;
}
