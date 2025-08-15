// app/api/nfts/route.ts - Updated to support user addresses
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
    const userAddresses = searchParams.get('userAddresses'); // New parameter

    console.log(`🎨 NFT API Request: ${action}, limit: ${limit}`);

    switch (action) {
      case 'curated':
      case 'discover':
        // Parse user addresses if provided
        let additionalContracts: string[] = [];
        if (userAddresses) {
          try {
            const parsed = JSON.parse(decodeURIComponent(userAddresses));
            additionalContracts = parsed
              .filter((addr: any) => addr.enabled && addr.type === 'contract')
              .map((addr: any) => addr.address);
            console.log(`📝 Including ${additionalContracts.length} user-added contracts`);
          } catch (e) {
            console.error('Failed to parse user addresses');
          }
        }

        const cacheKey = `art_${limit}_${additionalContracts.join('_') || 'default'}`;
        const cachedEntry = cache.get(cacheKey);
        
        // Return cached data if valid and not forcing refresh
        if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_DURATION * 1000) {
          console.log('✅ Returning cached art data');
          return NextResponse.json({
            success: true,
            data: cachedEntry.data,
            cached: true,
            timestamp: cachedEntry.timestamp,
            responseTime: Date.now() - startTime,
            source: 'cache',
          });
        }

        console.log('🔄 Fetching fresh art from Base blockchain...');
        
        // Fetch with user contracts included
        const artworks = await NFTService.fetchCuratedNFTs(limit, additionalContracts);

        if (artworks && artworks.length > 0) {
          // Update cache
          cache.set(cacheKey, {
            data: artworks,
            timestamp: Date.now()
          });

          console.log(`✅ Successfully fetched ${artworks.length} artworks`);
          
          return NextResponse.json({
            success: true,
            data: artworks,
            cached: false,
            timestamp: Date.now(),
            responseTime: Date.now() - startTime,
            source: 'live',
            includesUserContent: additionalContracts.length > 0
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
            message: 'No art found. Try adding your own contracts!'
          });
        }

      case 'from-wallet':
        // Get NFTs owned by a specific wallet
        const walletAddress = searchParams.get('wallet');
        if (!walletAddress) {
          return NextResponse.json(
            { success: false, error: 'Wallet address required' },
            { status: 400 }
          );
        }

        const walletNFTs = await NFTService.fetchWalletNFTs(walletAddress, limit);
        
        return NextResponse.json({
          success: true,
          data: walletNFTs,
          wallet: walletAddress,
          timestamp: Date.now(),
          responseTime: Date.now() - startTime,
        });

      default:
        // ... rest of the cases remain the same
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid action',
            availableActions: [
              'curated', 'discover', 'from-wallet'
            ]
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
