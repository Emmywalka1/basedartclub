// app/api/nfts/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Mock NFT data for demonstration
const MOCK_NFTS = [
  {
    tokenId: '1',
    tokenType: 'ERC721',
    name: 'Digital Dreams #1',
    description: 'A vibrant digital landscape exploring the intersection of technology and nature.',
    image: {
      cachedUrl: '/artwork1.jpg',
      originalUrl: '/artwork1.jpg'
    },
    raw: {
      metadata: {
        name: 'Digital Dreams #1',
        description: 'A vibrant digital landscape exploring the intersection of technology and nature.',
        image: '/artwork1.jpg'
      }
    },
    contract: {
      address: '0x036721e5A681E02A730b05e2B56e9b7189f2A3F8',
      name: 'Based Ghouls',
      tokenType: 'ERC721'
    },
    timeLastUpdated: new Date().toISOString(),
  },
  {
    tokenId: '2',
    tokenType: 'ERC721',
    name: 'Neon Genesis #42',
    description: 'Cyberpunk-inspired artwork with electric blues and magentas.',
    image: {
      cachedUrl: '/artwork2.jpg',
      originalUrl: '/artwork2.jpg'
    },
    raw: {
      metadata: {
        name: 'Neon Genesis #42',
        description: 'Cyberpunk-inspired artwork with electric blues and magentas.',
        image: '/artwork2.jpg'
      }
    },
    contract: {
      address: '0x4F89Bbe2c2C896819f246F3dce8A33F5B1aB4586',
      name: 'Base Punks',
      tokenType: 'ERC721'
    },
    timeLastUpdated: new Date().toISOString(),
  },
  {
    tokenId: '3',
    tokenType: 'ERC721',
    name: 'Abstract Emotions',
    description: 'An emotional journey through color and form.',
    image: {
      cachedUrl: '/artwork3.jpg',
      originalUrl: '/artwork3.jpg'
    },
    raw: {
      metadata: {
        name: 'Abstract Emotions',
        description: 'An emotional journey through color and form.',
        image: '/artwork3.jpg'
      }
    },
    contract: {
      address: '0x1538C5c8FbE7c1F0FF63F5b3F59cbad74B41db87',
      name: 'Base Names',
      tokenType: 'ERC721'
    },
    timeLastUpdated: new Date().toISOString(),
  },
  {
    tokenId: '4',
    tokenType: 'ERC721',
    name: 'Cosmic Journey',
    description: 'A breathtaking view of distant galaxies and star formations.',
    image: {
      cachedUrl: '/artwork4.jpg',
      originalUrl: '/artwork4.jpg'
    },
    raw: {
      metadata: {
        name: 'Cosmic Journey',
        description: 'A breathtaking view of distant galaxies and star formations.',
        image: '/artwork4.jpg'
      }
    },
    contract: {
      address: '0x03c4738Ee98aE44591e1A4A4F3CaB6641d95DD9a',
      name: 'Tiny Based Frogs',
      tokenType: 'ERC721'
    },
    timeLastUpdated: new Date().toISOString(),
  },
  {
    tokenId: '5',
    tokenType: 'ERC721',
    name: 'Urban Poetry',
    description: 'Street art meets digital innovation in this urban masterpiece.',
    image: {
      cachedUrl: '/artwork5.jpg',
      originalUrl: '/artwork5.jpg'
    },
    raw: {
      metadata: {
        name: 'Urban Poetry',
        description: 'Street art meets digital innovation in this urban masterpiece.',
        image: '/artwork5.jpg'
      }
    },
    contract: {
      address: '0x7F7f3aFc9eA11b8e3b6a89071c94ce3155fb4Ccb',
      name: 'Based Vitalik',
      tokenType: 'ERC721'
    },
    timeLastUpdated: new Date().toISOString(),
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'curated';
    const limit = parseInt(searchParams.get('limit') || '20');

    switch (action) {
      case 'curated':
        // Return mock NFTs for now
        const shuffledNFTs = [...MOCK_NFTS].sort(() => 0.5 - Math.random());
        const limitedNFTs = shuffledNFTs.slice(0, Math.min(limit, MOCK_NFTS.length));
        
        return NextResponse.json({
          success: true,
          data: limitedNFTs,
          cached: false,
          timestamp: Date.now()
        });

      case 'collections':
        return NextResponse.json({
          success: true,
          data: [
            { contract: '0x036721e5A681E02A730b05e2B56e9b7189f2A3F8', name: 'Based Ghouls', description: 'Spooky ghouls on Base' },
            { contract: '0x4F89Bbe2c2C896819f246F3dce8A33F5B1aB4586', name: 'Base Punks', description: 'Punk NFTs on Base' },
            { contract: '0x1538C5c8FbE7c1F0FF63F5b3F59cbad74B41db87', name: 'Base Names', description: 'Domain names on Base' },
            { contract: '0x03c4738Ee98aE44591e1A4A4F3CaB6641d95DD9a', name: 'Tiny Based Frogs', description: 'Cute frogs on Base' },
            { contract: '0x7F7f3aFc9eA11b8e3b6a89071c94ce3155fb4Ccb', name: 'Based Vitalik', description: 'Vitalik-inspired NFTs' }
          ]
        });

      default:
        return NextResponse.json({
          success: true,
          data: MOCK_NFTS,
          message: 'Using mock data for demonstration'
        });
    }
  } catch (error) {
    console.error('NFT API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch NFT data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
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
