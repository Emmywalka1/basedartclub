// app/api/nfts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { NFTService } from '../../../services/nftService';

// Cache duration in seconds
const CACHE_DURATION = 300; // 5 minutes

// In-memory cache (in production, use Redis or similar)
let cache: {
  data: any;
  timestamp: number;
} | null = null;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'curated';
    const limit = parseInt(searchParams.get('limit') || '20');
    const contractAddress = searchParams.get('contract');
    const tokenId = searchParams.get('tokenId');

    switch (action) {
      case 'curated':
        // Check cache first
        if (cache && Date.now() - cache.timestamp < CACHE_DURATION * 1000) {
          return NextResponse.json({
            success: true,
            data: cache.data,
            cached: true,
            timestamp: cache.timestamp,
          });
        }

        // Fetch fresh data
        const nfts = await NFTService.fetchCuratedNFTs(limit);
        
        // Update cache
        cache = {
          data: nfts,
          timestamp: Date.now(),
        };

        return NextResponse.json({
          success: true,
          data: nfts,
          cached: false,
          timestamp: Date.now(),
        });

      case 'collections':
        // Return Base NFT collections
        const collections = [
          { 
            contract: '0x036721e5A681E02A730b05e2B56e9b7189f2A3F8', 
            name: 'Based Ghouls', 
            description: 'Spooky ghouls living on Base',
            marketplace: 'OpenSea'
          },
          { 
            contract: '0x4F89Bbe2c2C896819f246F3dce8A33F5B1aB4586', 
            name: 'Base Punks', 
            description: 'Punk-inspired NFTs on Base',
            marketplace: 'Foundation'
          },
          { 
            contract: '0x1538C5c8FbE7c1F0FF63F5b3F59cbad74B41db87', 
            name: 'Base Names', 
            description: 'Domain names on Base blockchain',
            marketplace: 'Zora'
          },
          { 
            contract: '0x03c4738Ee98aE44591e1A4A4F3CaB6641d95DD9a', 
            name: 'Tiny Based Frogs', 
            description: 'Cute frogs hopping on Base',
            marketplace: 'OpenSea'
          },
          { 
            contract: '0x7F7f3aFc9eA11b8e3b6a89071c94ce3155fb4Ccb', 
            name: 'Based Vitalik', 
            description: 'Vitalik-inspired art collection',
            marketplace: 'Manifold'
          },
          {
            contract: '0xbfc7cae0fad9b346270ae8fde24827d2d779ef07',
            name: 'Base Day One',
            description: 'Commemorating Base launch',
            marketplace: 'Foundation'
          },
          {
            contract: '0xd4416b13d2b3a9abae7acd5d6c2bbdbe25686401',
            name: 'Base God',
            description: 'Divine NFTs on Base',
            marketplace: 'Zora'
          },
          {
            contract: '0x617978b8af11570c2dab7c39163a8bde1d7f5c37',
            name: 'Base Paint',
            description: 'Collaborative art on Base',
            marketplace: 'OpenSea'
          }
        ];

        return NextResponse.json({
          success: true,
          data: collections,
        });

      case 'marketplace':
        // Get marketplace info for specific NFT
        if (!contractAddress || !tokenId) {
          return NextResponse.json(
            { success: false, error: 'Missing contract address or token ID' },
            { status: 400 }
          );
        }

        const marketplaceInfo = await NFTService.getMarketplaceInfo(
          contractAddress,
          tokenId
        );

        return NextResponse.json({
          success: true,
          data: marketplaceInfo,
        });

      case 'refresh':
        // Force refresh cache
        cache = null;
        const freshNFTs = await NFTService.fetchCuratedNFTs(limit);
        
        cache = {
          data: freshNFTs,
          timestamp: Date.now(),
        };

        return NextResponse.json({
          success: true,
          data: freshNFTs,
          message: 'Cache refreshed',
          timestamp: Date.now(),
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('NFT API error:', error);
    
    // Fallback to mock data if APIs fail
    const mockFallback = [
      {
        tokenId: '1',
        tokenType: 'ERC721' as const,
        name: 'API Unavailable - Mock NFT #1',
        description: 'This is mock data shown because the NFT APIs are temporarily unavailable.',
        image: {
          cachedUrl: '/artwork1.jpg',
          thumbnailUrl: '/artwork1.jpg',
          originalUrl: '/artwork1.jpg',
        },
        contract: {
          address: '0x036721e5A681E02A730b05e2B56e9b7189f2A3F8',
          name: 'Mock Collection',
          symbol: 'MOCK',
          tokenType: 'ERC721' as const,
        },
        marketplace: 'OpenSea',
        price: {
          value: '0.1',
          currency: 'ETH',
        },
      },
    ];

    return NextResponse.json({
      success: true,
      data: mockFallback,
      error: 'Using fallback data due to API issues',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
