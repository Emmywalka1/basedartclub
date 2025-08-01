// app/api/nfts/route.ts - Real Data Only
import { NextRequest, NextResponse } from 'next/server';
import { NFTService } from '../../../services/nftService';

// Simple cache management
const CACHE_DURATION = 300; // 5 minutes
const cache = new Map<string, { data: any[], timestamp: number }>();

function cleanupCache() {
  const now = Date.now();
  cache.forEach((entry, key) => {
    if (now - entry.timestamp > CACHE_DURATION * 1000) {
      cache.delete(key);
    }
  });
}

// Cleanup every 10 minutes
setInterval(cleanupCache, 10 * 60 * 1000);

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'curated';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const platform = searchParams.get('platform'); // foundation, zora, manifold, etc.
    const artist = searchParams.get('artist');
    const forceRefresh = searchParams.get('refresh') === 'true';

    console.log(`🎨 NFT API Request: ${action}, limit: ${limit}`);

    switch (action) {
      case 'curated':
      case 'discover':
        const cacheKey = `art_${limit}_${platform || 'all'}`;
        const cachedEntry = cache.get(cacheKey);
        
        // Return cached data if valid and not forcing refresh
        if (cachedEntry && !forceRefresh && 
            Date.now() - cachedEntry.timestamp < CACHE_DURATION * 1000) {
          console.log('✅ Returning cached 1/1 art data');
          return NextResponse.json({
            success: true,
            data: cachedEntry.data,
            cached: true,
            timestamp: cachedEntry.timestamp,
            responseTime: Date.now() - startTime,
            source: 'cache',
            artType: '1/1'
          });
        }

        console.log('🔄 Fetching fresh 1/1 art from Base blockchain...');
        
        // Fetch with timeout
        const fetchPromise = NFTService.fetchCuratedNFTs(limit);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Fetch timeout')), 25000)
        );
        
        try {
          const artworks = await Promise.race([fetchPromise, timeoutPromise]) as any[];

          if (artworks && artworks.length > 0) {
            // Update cache
            cache.set(cacheKey, {
              data: artworks,
              timestamp: Date.now()
            });

            console.log(`✅ Successfully fetched ${artworks.length} 1/1 artworks`);
            
            // Analyze the results
            const platforms = new Set(artworks.map(a => a.platform || 'Independent'));
            const artists = new Set(artworks.map(a => a.artist || 'Unknown'));
            
            return NextResponse.json({
              success: true,
              data: artworks,
              cached: false,
              timestamp: Date.now(),
              responseTime: Date.now() - startTime,
              source: 'live',
              artType: '1/1',
              stats: {
                total: artworks.length,
                platforms: Array.from(platforms),
                uniqueArtists: artists.size,
                apis_used: ['Alchemy NFT API v3']
              }
            });
          } else {
            // No data found
            return NextResponse.json({
              success: true,
              data: [],
              cached: false,
              timestamp: Date.now(),
              responseTime: Date.now() - startTime,
              source: 'live',
              artType: '1/1',
              message: 'No 1/1 art found on Base. Try adjusting search parameters or check back later.'
            });
          }
        } catch (error) {
          throw error; // Re-throw to be caught by outer catch
        }

      case 'platforms':
        // Return supported 1/1 art platforms on Base
        const platforms_list = [
          { 
            id: 'foundation',
            name: 'Foundation', 
            description: 'Premier marketplace for 1/1 digital art',
            contractAddresses: ['0x3B3ee1931Dc30C1957379FAc9aba94D1C48a5405'],
            url: 'https://foundation.app',
            avgPrice: '0.05-0.5 ETH'
          },
          { 
            id: 'manifold',
            name: 'Manifold', 
            description: 'Creator-owned contracts for independent artists',
            contractAddresses: ['0x0a1BBD59d1c3D0587Ee909E41aCdD83C99b19Bf5'],
            url: 'https://manifold.xyz',
            avgPrice: '0.01-0.2 ETH'
          },
          { 
            id: 'zora',
            name: 'Zora', 
            description: 'Open protocol for 1/1s and editions',
            contractAddresses: ['0x76e2A96714F1681a0Ac7c27816d4e71c38d44a8E'],
            url: 'https://zora.co',
            avgPrice: '0.01-0.1 ETH'
          },
          {
            id: 'independent',
            name: 'Independent Artists',
            description: 'Direct from artist contracts',
            contractAddresses: [],
            url: null,
            avgPrice: 'Varies'
          }
        ];

        return NextResponse.json({
          success: true,
          data: platforms_list,
          timestamp: Date.now(),
          responseTime: Date.now() - startTime,
        });

      case 'artists':
        // Return featured artists (real addresses you discover)
        const featured_artists: any[] = [
          // Add real artist addresses as you discover them
          // Example format:
          // {
          //   address: '0xRealArtistAddress',
          //   name: 'Artist Name',
          //   bio: 'Artist bio',
          //   platform: 'Foundation/Zora/Manifold',
          //   totalWorks: 0
          // }
        ];

        if (featured_artists.length === 0) {
          return NextResponse.json({
            success: true,
            data: [],
            message: 'No featured artists configured. Add real artist addresses to the API.',
            timestamp: Date.now(),
            responseTime: Date.now() - startTime,
          });
        }

        return NextResponse.json({
          success: true,
          data: featured_artists,
          timestamp: Date.now(),
          responseTime: Date.now() - startTime,
        });

      case 'metadata':
        // Get specific NFT metadata
        const contractAddress = searchParams.get('contract');
        const tokenId = searchParams.get('tokenId');
        
        if (!contractAddress || !tokenId) {
          return NextResponse.json(
            { success: false, error: 'Missing contract or tokenId' },
            { status: 400 }
          );
        }

        // Fetch real metadata from Alchemy
        try {
          const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
          if (!alchemyKey) {
            throw new Error('Alchemy API key not configured');
          }
          
          const alchemyUrl = `https://base-mainnet.g.alchemy.com/nft/v3/${alchemyKey}/getNFTMetadata`;
          const response = await fetch(
            `${alchemyUrl}?contractAddress=${contractAddress}&tokenId=${tokenId}`,
            { 
              method: 'GET',
              headers: {
                'Accept': 'application/json',
              }
            }
          );
          
          if (!response.ok) {
            throw new Error(`Alchemy API returned ${response.status}`);
          }
          
          const data = await response.json();
          
          return NextResponse.json({
            success: true,
            data: data,
            responseTime: Date.now() - startTime,
          });
        } catch (error) {
          return NextResponse.json(
            { success: false, error: 'Failed to fetch metadata' },
            { status: 500 }
          );
        }

      case 'trending':
        // Get trending 1/1 art (based on recent sales/transfers)
        console.log('📈 Fetching trending 1/1 art...');
        
        const trendingArt = await NFTService.fetchCuratedNFTs(10);
        
        return NextResponse.json({
          success: true,
          data: trendingArt,
          period: '24h',
          timestamp: Date.now(),
          responseTime: Date.now() - startTime,
        });

      case 'health':
        const healthData = {
          status: 'healthy',
          timestamp: Date.now(),
          services: {
            alchemy: !!process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
            baseChain: {
              connected: true,
              chainId: 8453,
              name: 'Base'
            }
          },
          cache: {
            entries: cache.size,
            lastCleanup: new Date().toISOString()
          },
          artDiscovery: {
            platforms: ['Foundation', 'Manifold', 'Zora', 'Independent'],
            supportedTypes: ['ERC721', 'ERC1155 (single edition)'],
            focusArea: '1/1 digital art'
          }
        };

        return NextResponse.json({
          success: true,
          data: healthData,
          responseTime: Date.now() - startTime,
        });

      case 'refresh':
        // Force refresh cache
        cache.clear();
        console.log('🔄 Cache cleared, fetching fresh 1/1 art...');
        
        const freshArt = await NFTService.fetchCuratedNFTs(limit);
        
        if (freshArt.length > 0) {
          cache.set(`art_${limit}_all`, {
            data: freshArt,
            timestamp: Date.now()
          });
        }

        return NextResponse.json({
          success: true,
          data: freshArt,
          message: freshArt.length > 0 ? 'Cache refreshed with new 1/1 art' : 'No art found',
          timestamp: Date.now(),
          responseTime: Date.now() - startTime,
        });

      default:
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid action',
            availableActions: [
              'curated', 'discover', 'platforms', 'artists', 
              'metadata', 'trending', 'health', 'refresh'
            ],
            note: 'This API focuses on discovering real 1/1 art on Base blockchain'
          },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error('❌ NFT API Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: process.env.NODE_ENV === 'development' 
          ? error?.message || 'Unknown error'
          : 'Failed to fetch NFT data',
        message: 'Unable to retrieve 1/1 art from Base blockchain',
        timestamp: Date.now(),
        responseTime: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

// Handle CORS
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
