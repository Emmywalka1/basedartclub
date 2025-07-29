// app/api/nfts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { EnhancedNFTService } from '../../../services/enhancedNftService';

// Enhanced cache with better management
const CACHE_DURATION = 300; // 5 minutes
const CACHE_KEY_PREFIX = 'base_art_club_';

interface CacheEntry {
  data: any;
  timestamp: number;
  key: string;
}

// In-memory cache with cleanup
const cache = new Map<string, CacheEntry>();

// Cleanup old cache entries
const cleanupCache = () => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > CACHE_DURATION * 1000) {
      cache.delete(key);
    }
  }
};

// Run cleanup every 10 minutes
setInterval(cleanupCache, 10 * 60 * 1000);

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'curated';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50); // Max 50 items
    const contractAddress = searchParams.get('contract');
    const tokenId = searchParams.get('tokenId');
    const forceRefresh = searchParams.get('refresh') === 'true';

    console.log(`🎨 NFT API Request: ${action}, limit: ${limit}`);

    switch (action) {
      case 'curated':
        const cacheKey = `${CACHE_KEY_PREFIX}curated_${limit}`;
        const cachedEntry = cache.get(cacheKey);
        
        // Return cached data if valid and not forcing refresh
        if (cachedEntry && !forceRefresh && 
            Date.now() - cachedEntry.timestamp < CACHE_DURATION * 1000) {
          console.log('✅ Returning cached data');
          return NextResponse.json({
            success: true,
            data: cachedEntry.data,
            cached: true,
            timestamp: cachedEntry.timestamp,
            responseTime: Date.now() - startTime,
            source: 'cache'
          });
        }

        console.log('🔄 Fetching fresh NFT data...');
        
        // Fetch fresh data with timeout
        const fetchTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Fetch timeout')), 25000)
        );
        
        const fetchData = EnhancedNFTService.fetchCuratedNFTs(limit);
        
        const nfts = await Promise.race([fetchData, fetchTimeout]) as any[];

        if (nfts && nfts.length > 0) {
          // Update cache
          cache.set(cacheKey, {
            data: nfts,
            timestamp: Date.now(),
            key: cacheKey
          });

          console.log(`✅ Successfully fetched ${nfts.length} NFTs`);
          
          return NextResponse.json({
            success: true,
            data: nfts,
            cached: false,
            timestamp: Date.now(),
            responseTime: Date.now() - startTime,
            source: 'live',
            stats: {
              total: nfts.length,
              marketplaces: [...new Set(nfts.map(n => n.marketplace))],
              categories: [...new Set(nfts.map(n => n.category))],
            }
          });
        } else {
          // Return enhanced fallback data
          const fallbackData = EnhancedNFTService.getEnhancedMockData(limit);
          
          return NextResponse.json({
            success: true,
            data: fallbackData,
            cached: false,
            timestamp: Date.now(),
            responseTime: Date.now() - startTime,
            source: 'fallback',
            message: 'Using enhanced demo data - APIs may be temporarily unavailable'
          });
        }

      case 'collections':
        const collections = [
          { 
            contract: '0x036721e5a681e02a730b05e2b56e9b7189f2a3f8', 
            name: 'Based Ghouls', 
            description: 'Spooky ghouls living on Base blockchain',
            marketplace: 'OpenSea',
            type: 'Collection',
            verified: true,
            floorPrice: '0.05 ETH'
          },
          { 
            contract: '0x617978b8af11570c2dab7c39163a8bde1d7f5c37', 
            name: 'Base Paint', 
            description: 'Collaborative art creation on Base',
            marketplace: 'Foundation',
            type: 'Collaborative',
            verified: true,
            floorPrice: '0.03 ETH'
          },
          { 
            contract: '0x4f89bbe2c2c896819f246f3dce8a33f5b1ab4586', 
            name: 'Base Punks', 
            description: 'Punk-inspired NFTs on Base',
            marketplace: 'OpenSea',
            type: 'PFP',
            verified: true,
            floorPrice: '0.08 ETH'
          },
          { 
            contract: '0xd4416b13d2b3a9abae7acd5d6c2bbdbe25686401', 
            name: 'Base God', 
            description: 'Divine NFTs on Base blockchain',
            marketplace: 'Zora',
            type: 'Art',
            verified: true,
            floorPrice: '0.12 ETH'
          },
          { 
            contract: '0x03c4738ee98ae44591e1a4a4f3cab6641d95dd9a', 
            name: 'Tiny Based Frogs', 
            description: 'Cute frogs hopping on Base',
            marketplace: 'OpenSea',
            type: 'Collection',
            verified: true,
            floorPrice: '0.02 ETH'
          },
          { 
            contract: '0x1538c5c8fbe7c1f0ff63f5b3f59cbad74b41db87', 
            name: 'Base Names', 
            description: 'Domain names on Base blockchain',
            marketplace: 'OpenSea',
            type: 'Domain',
            verified: true,
            floorPrice: '0.01 ETH'
          }
        ];

        return NextResponse.json({
          success: true,
          data: collections,
          timestamp: Date.now(),
          responseTime: Date.now() - startTime,
        });

      case 'health':
        // Health check endpoint
        const healthData = {
          status: 'healthy',
          timestamp: Date.now(),
          services: {
            alchemy: !!process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
            opensea: !!process.env.OPENSEA_API_KEY,
          },
          cache: {
            entries: cache.size,
            keys: Array.from(cache.keys())
          },
          uptime: process.uptime?.() || 0
        };

        return NextResponse.json({
          success: true,
          data: healthData,
          responseTime: Date.now() - startTime,
        });

      case 'marketplace':
        if (!contractAddress || !tokenId) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Missing contract address or token ID',
              code: 'MISSING_PARAMS'
            },
            { status: 400 }
          );
        }

        // Simulated marketplace data
        const marketplaceData = {
          contract: contractAddress,
          tokenId: tokenId,
          marketplace: 'OpenSea',
          listingPrice: (0.01 + Math.random() * 0.5).toFixed(4) + ' ETH',
          lastSale: {
            price: (0.005 + Math.random() * 0.3).toFixed(4) + ' ETH',
            date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
          },
          owner: '0x' + Math.random().toString(16).substr(2, 40),
          verified: Math.random() > 0.3
        };

        return NextResponse.json({
          success: true,
          data: marketplaceData,
          responseTime: Date.now() - startTime,
        });

      case 'stats':
        const stats = {
          totalCollections: 50,
          totalNFTs: 125000,
          activeMarketplaces: ['OpenSea', 'Foundation', 'Zora', 'Manifold'],
          averagePrice: '0.08 ETH',
          volume24h: '245.7 ETH',
          topCategories: ['Digital Art', 'PFP', 'Collectible', 'Gaming', 'Music'],
          networkStats: {
            chainId: 8453,
            name: 'Base',
            blockTime: '2s',
            gasPrice: '0.001 gwei'
          }
        };

        return NextResponse.json({
          success: true,
          data: stats,
          responseTime: Date.now() - startTime,
        });

      default:
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid action. Available actions: curated, collections, marketplace, health, stats',
            availableActions: ['curated', 'collections', 'marketplace', 'health', 'stats'],
            code: 'INVALID_ACTION'
          },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('❌ NFT API Error:', error);
    
    // Determine error type
    let errorType = 'UNKNOWN_ERROR';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        errorType = 'TIMEOUT_ERROR';
        statusCode = 504;
      } else if (error.message.includes('Network Error')) {
        errorType = 'NETWORK_ERROR';
        statusCode = 503;
      } else if (error.message.includes('API key')) {
        errorType = 'AUTH_ERROR';
        statusCode = 401;
      }
    }

    // Always provide fallback data for curated requests
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'curated';
    
    if (action === 'curated') {
      const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
      const fallbackData = await EnhancedNFTService.getEnhancedMockData(limit);
      
      return NextResponse.json({
        success: true,
        data: fallbackData,
        cached: false,
        timestamp: Date.now(),
        responseTime: Date.now() - startTime,
        source: 'fallback',
        error: 'API temporarily unavailable, showing demo data',
        errorType,
        originalError: process.env.NODE_ENV === 'development' ? error?.message : undefined
      });
    }

    return NextResponse.json(
      { 
        success: false, 
        error: process.env.NODE_ENV === 'development' 
          ? error?.message || 'Unknown error occurred'
          : 'Service temporarily unavailable',
        code: errorType,
        timestamp: Date.now(),
        responseTime: Date.now() - startTime,
      },
      { status: statusCode }
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
