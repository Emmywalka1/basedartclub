import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://baseartclub.xyz';
  
  const manifest = {
    accountAssociation: {
      // This will need to be generated using the Farcaster Mini App Manifest Tool
      // Visit: https://warpcast.com/~/developers/new
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
      tags: ["art", "nft", "base", "discovery", "collect"],
      heroImageUrl: `${baseUrl}/hero.png`,
      tagline: "Swipe. Discover. Collect.",
      ogTitle: "Base Art Club",
      ogDescription: "The easiest way to discover amazing art on Base",
      ogImageUrl: `${baseUrl}/og.png`
    }
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
