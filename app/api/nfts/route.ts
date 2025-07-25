// app/api/nfts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

interface NFTCollection {
  contract: string;
  name: string;
  description: string;
}

// Popular Base NFT collections
const BASE_NFT_COLLECTIONS: NFTCollection[] = [
  {
    contract: '0x036721e5A681E02A730b05e2B56e9b7189f2A3F8',
    name: 'Based Ghouls',
    description: 'A collection of spooky ghouls on Base'
  },
  {
    contract: '0x4F89Bbe2c2C896819f246F3dce8A33F5B1aB4586',
    name: 'Base Punks',
    description: 'Punk NFTs on Base blockchain'
  },
  {
    contract: '0x1538C5c8FbE7c1F0FF63F5b3F59cbad74B41db87',
    name: 'Base Names',
    description: 'Domain names on Base'
  },
  {
    contract: '0x03c4738Ee98aE44591e1A4A4F3CaB6641d95DD9a',
    name: 'Tiny Based Frogs',
    description: 'Cute frog NFTs on Base'
  },
  {
    contract: '0x7F7f3aFc9eA11b8e3b6a89071c94ce3155fb4Ccb',
    name: 'Based Vitalik',
    description: 'Vitalik-inspired NFTs on Base'
  }
];

class ServerNFTService {
  private alchemyApiKey: string;
  private alchemyBaseUrl: string;

  constructor() {
    this.alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || '';
    this.alchemyBaseUrl = `https://base-mainnet.g.alchemy.com/nft/v3/${this.alchemyApiKey}`;
  }

  private async makeAlchemyRequest(endpoint: string, params: Record<string, any> = {}) {
    try {
      const response = await axios.get(`${this.alchemyBaseUrl}${endpoint}`, {
        params,
        headers: {
          'Accept': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      });
      return response.data;
    } catch (error) {
      console.error('Alchemy API request failed:', error);
      throw error;
    }
  }

  async getCuratedNFTs(limit: number = 50) {
    const allNFTs = [];
    const collectionsToFetch = BASE_NFT_COLLECTIONS.slice(0, 5);
    const nftsPerCollection = Math.ceil(limit / collectionsToFetch.length);

    for (const collection of collectionsToFetch) {
      try {
        const response = await this.makeAlchemyRequest('/getNFTsForCollection', {
          contractAddress: collection.contract,
          limit: nftsPerCollection,
          withMetadata: true,
        });

        if (response.nfts && response.nfts.length > 0) {
          // Filter and enhance NFTs
          const validNFTs = response.nfts.filter((nft: any) => 
            nft.name && 
            (nft.image?.cachedUrl || nft.image?.originalUrl) &&
            nft.raw?.metadata
          ).map((nft: any) => ({
            ...nft,
            collectionInfo: collection,
            // Add mock pricing for demo purposes
            isForSale: Math.random() > 0.3, // 70% chance of being for sale
            salePrice: {
              value: (Math.random() * 0.5 + 0.1).toFixed(3), // Random price between 0.1-0.6 ETH
              currency: 'ETH',
            },
            marketplace: 'OpenSea',
          }));

          allNFTs.push(...validNFTs);
        }
      } catch (error) {
        console.error(`Failed to fetch NFTs from collection ${collection.contract}:`, error);
        // Continue with other collections even if one fails
      }
    }

    // Shuffle and limit results
    const shuffled = allNFTs.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, limit);
  }

  async getNFTMetadata(contractAddress: string, tokenId: string) {
    try {
      const response = await this.makeAlchemyRequest('/getNFTMetadata', {
        contractAddress,
        tokenId,
        refreshCache: false,
      });

      return response;
    } catch (error) {
      console.error(`Failed to get NFT metadata for ${contractAddress}:${tokenId}:`, error);
      throw error;
    }
  }

  async getCollectionFloorPrice(contractAddress: string) {
    try {
      const response = await this.makeAlchemyRequest('/getFloorPrice', {
        contractAddress,
      });

      return response.openSea?.floorPrice || response.looksRare?.floorPrice || null;
    } catch (error) {
      console.error(`Failed to get floor price for ${contractAddress}:`, error);
      return null;
    }
  }
}

// Cache for storing NFT data
let nftCache: any = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'curated';
    const limit = parseInt(searchParams.get('limit') || '20');
    const contractAddress = searchParams.get('contract');
    const tokenId = searchParams.get('tokenId');

    const nftService = new ServerNFTService();

    // Handle different API actions
    switch (action) {
      case 'curated':
        // Check cache first
        const now = Date.now();
        if (nftCache && (now - cacheTimestamp) < CACHE_DURATION) {
          return NextResponse.json({
            success: true,
            data: nftCache.slice(0, limit),
            cached: true,
            timestamp: cacheTimestamp
          });
        }

        // Fetch fresh data
        const curatedNFTs = await nftService.getCuratedNFTs(limit);
        
        // Update cache
        nftCache = curatedNFTs;
        cacheTimestamp = now;

        return NextResponse.json({
          success: true,
          data: curatedNFTs,
          cached: false,
          timestamp: now
        });

      case 'metadata':
        if (!contractAddress || !tokenId) {
          return NextResponse.json(
            { success: false, error: 'Contract address and token ID are required' },
            { status: 400 }
          );
        }

        const metadata = await nftService.getNFTMetadata(contractAddress, tokenId);
        return NextResponse.json({
          success: true,
          data: metadata
        });

      case 'floor-price':
        if (!contractAddress) {
          return NextResponse.json(
            { success: false, error: 'Contract address is required' },
            { status: 400 }
          );
        }

        const floorPrice = await nftService.getCollectionFloorPrice(contractAddress);
        return NextResponse.json({
          success: true,
          data: { floorPrice }
        });

      case 'collections':
        return NextResponse.json({
          success: true,
          data: BASE_NFT_COLLECTIONS
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
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
