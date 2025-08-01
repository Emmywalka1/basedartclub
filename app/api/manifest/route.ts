// app/api/manifest/route.ts - Real Data Only
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://basedartclub.vercel.app';
  
  // Check if request is from Farcaster preview/debug tool
  const userAgent = request.headers.get('user-agent') || '';
  const referer = request.headers.get('referer') || '';
  const isDebugMode = referer.includes('debug') || userAgent.includes('Farcaster');
  
  // IMPORTANT: You must generate real account association values!
  // Visit: https://warpcast.com/~/developers/mini-apps/new
  // 1. Enter your domain
  // 2. Generate the signed account association
  // 3. Replace the values below with your actual values
  const accountAssociationConfigured = false; // Change to true after adding real values
  
  const manifest = {
    accountAssociation: {
      // ⚠️ THESE ARE PLACEHOLDERS - YOU MUST REPLACE WITH REAL VALUES!
      // Generate at: https://warpcast.com/~/developers/mini-apps/new
      header: accountAssociationConfigured ? "YOUR_ACTUAL_HEADER_HERE" : "PLACEHOLDER_HEADER_NOT_CONFIGURED",
      payload: accountAssociationConfigured ? "YOUR_ACTUAL_PAYLOAD_HERE" : "PLACEHOLDER_PAYLOAD_NOT_CONFIGURED", 
      signature: accountAssociationConfigured ? "YOUR_ACTUAL_SIGNATURE_HERE" : "PLACEHOLDER_SIGNATURE_NOT_CONFIGURED"
    },
    frame: {
      version: "1",
      name: "Base Art Club",
      iconUrl: `${baseUrl}/icon.png`,
      homeUrl: baseUrl,
      splashImageUrl: `${baseUrl}/splash.png`,
      splashBackgroundColor: "#0052FF",
      subtitle: "Discover 1/1 art on Base",
      description: "Swipe through curated 1/1 artworks on Base blockchain. Like, pass, or collect unique digital art from independent artists and platforms.",
      screenshotUrls: [
        `${baseUrl}/screenshot1.png`,
        `${baseUrl}/screenshot2.png`,
        `${baseUrl}/screenshot3.png`
      ],
      primaryCategory: "art-creativity",
      secondaryCategory: "marketplace",
      tags: ["art", "nft", "base", "1/1", "digital-art", "foundation", "zora", "manifold", "artists"],
      heroImageUrl: `${baseUrl}/hero.png`,
      tagline: "Discover real 1/1 art on Base",
      ogTitle: "Base Art Club - Discover 1/1 Art on Base",
      ogDescription: "The easiest way to discover and collect unique 1/1 digital art from independent artists on Base blockchain.",
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
        "1/1-art-discovery",
        "artist-support",
        "real-blockchain-data"
      ],
      permissions: [
        "wallet_address",
        "fid"
      ]
    }
  };

  // Warn if not configured
  if (!accountAssociationConfigured) {
    console.warn('⚠️ MANIFEST WARNING: Account association not configured! The app will not work in production.');
    console.warn('Visit https://warpcast.com/~/developers/mini-apps/new to generate real values.');
  }

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
    headers['X-Account-Association-Status'] = accountAssociationConfigured ? 'configured' : 'not-configured';
  }

  // Ensure no restrictive headers
  const response = NextResponse.json(manifest, { headers });
  
  // Remove any potentially problematic headers
  response.headers.delete('X-Frame-Options');
  
  return response;
}
