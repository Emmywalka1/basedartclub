// app/api/nfts/route.ts - With Vercel KV Redis integration
import { NextRequest, NextResponse } from 'next/server';
import { NFTService } from '../../../services/nftService';
import { KVStorage } from '../../../lib/kv-storage';

// Simple response cache (in-memory for API responses)
const CACHE_DURATION = 300; // 5 minutes
const responseCache = new Map<string, { data: any[], timestamp: number }>();

function cleanupCache() {
  const now = Date.now();
  responseCache.forEach((entry, key) => {
    if (now - entry.timestamp > CACHE_DURATION * 1000) {
      responseCache.delete(key);
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

    console.log(`🎨 NFT API Request: ${action}, limit: ${limit}`);

    switch (action) {
      case 'curated':
      case 'discover': {
        // Get all contracts from KV storage
        const contracts = await KVStorage.getAllContracts();
        
        console.log(`📝 Loading NFTs from ${contracts.length} contracts in KV storage`);
        
        if (contracts.length === 0) {
          return NextResponse.json({
            success: true,
            data: [],
            message: 'No contracts added yet. Add your contract to get started!',
            timestamp: Date.now(),
            totalContracts: 0,
          });
        }

        // Check response cache
        const cacheKey = `art_${limit}_${contracts.sort().join('_')}`;
        const cachedEntry = responseCache.get(cacheKey);
        
        if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_DURATION * 1000) {
          console.log('✅ Returning cached NFT data');
          return NextResponse.json({
            success: true,
            data: cachedEntry.data,
            cached: true,
            timestamp: cachedEntry.timestamp,
            responseTime: Date.now() - startTime,
            source: 'cache',
            totalContracts: contracts.length,
          });
        }

        console.log('🔄 Fetching fresh NFT data from Base blockchain...');
        
        // Fetch NFTs from all contracts
        const artworks = await NFTService.fetchCuratedNFTs(limit, contracts);

        if (artworks && artworks.length > 0) {
          // Update response cache
          responseCache.set(cacheKey, {
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
            totalContracts: contracts.length,
          });
        } else {
          return NextResponse.json({
            success: true,
            data: [],
            message: 'No artworks found in the added contracts',
            timestamp: Date.now(),
            totalContracts: contracts.length,
          });
        }
      }

      case 'add-contract': {
        const contractAddress = searchParams.get('address');
        const name = searchParams.get('name') || undefined;
        const addedBy = searchParams.get('addedBy') || undefined;
        
        if (!contractAddress) {
          return NextResponse.json(
            { success: false, error: 'Contract address required' },
            { status: 400 }
          );
        }

        // Validate contract format
        if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
          return NextResponse.json(
            { success: false, error: 'Invalid contract address format' },
            { status: 400 }
          );
        }

        // Add to KV storage
        const result = await KVStorage.addContract(contractAddress, {
          name,
          addedBy,
          type: 'contract',
        });
        
        // Clear response cache to force refresh
        responseCache.clear();

        const totalContracts = await KVStorage.getContractCount();
        const allContracts = await KVStorage.getAllContracts();

        console.log(`✅ Contract ${result.isNew ? 'added' : 'already exists'}: ${contractAddress}`);

        return NextResponse.json({
          success: true,
          message: result.isNew ? 'Contract added successfully' : 'Contract already exists',
          isNew: result.isNew,
          address: contractAddress,
          totalContracts,
          allContracts,
        });
      }

      case 'remove-contract': {
        const removeAddress = searchParams.get('address');
        
        if (!removeAddress) {
          return NextResponse.json(
            { success: false, error: 'Contract address required' },
            { status: 400 }
          );
        }

        const wasRemoved = await KVStorage.removeContract(removeAddress);
        
        // Clear response cache
        responseCache.clear();

        const totalContracts = await KVStorage.getContractCount();

        return NextResponse.json({
          success: true,
          message: wasRemoved ? 'Contract removed successfully' : 'Contract not found',
          removed: wasRemoved,
          address: removeAddress,
          totalContracts,
        });
      }

      case 'list-contracts': {
        const contracts = await KVStorage.getAllContracts();
        const contractDetails = await KVStorage.getAllContractDetails();
        const stats = await KVStorage.getStats();
        
        return NextResponse.json({
          success: true,
          contracts,
          contractDetails,
          totalContracts: contracts.length,
          stats,
        });
      }

      case 'from-wallet': {
        const walletAddress = searchParams.get('wallet');
        const walletName = searchParams.get('name') || undefined;
        const addedBy = searchParams.get('addedBy') || undefined;
        
        if (!walletAddress) {
          return NextResponse.json(
            { success: false, error: 'Wallet address required' },
            { status: 400 }
          );
        }

        console.log(`📝 Fetching NFTs from wallet: ${walletAddress}`);
        
        // Fetch NFTs from wallet
        const walletNFTs = await NFTService.fetchWalletNFTs(walletAddress, limit);
        
        // Extract unique contract addresses and add them to KV
        const contractsFromWallet = new Set<string>();
        walletNFTs.forEach(nft => {
          if (nft.contract?.address) {
            contractsFromWallet.add(nft.contract.address.toLowerCase());
          }
        });

        const contractsArray = Array.from(contractsFromWallet);
        
        if (contractsArray.length > 0) {
          // Add all contracts to KV storage
          const { added, existing } = await KVStorage.addMultipleContracts(
            contractsArray,
            {
              name: walletName || `Contracts from ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
              addedBy,
              type: 'wallet',
              metadata: { sourceWallet: walletAddress },
            }
          );
          
          console.log(`📝 Added ${added.length} new contracts, ${existing.length} already existed`);
          
          // Clear response cache
          responseCache.clear();
        }
        
        const totalContracts = await KVStorage.getContractCount();
        
        return NextResponse.json({
          success: true,
          data: walletNFTs,
          wallet: walletAddress,
          contractsAdded: contractsArray,
          newContracts: contractsArray.length,
          totalContracts,
          timestamp: Date.now(),
          responseTime: Date.now() - startTime,
        });
      }

      case 'search': {
        const query = searchParams.get('q');
        
        if (!query) {
          return NextResponse.json(
            { success: false, error: 'Search query required' },
            { status: 400 }
          );
        }

        const results = await KVStorage.searchContracts(query);
        
        return NextResponse.json({
          success: true,
          results,
          query,
        });
      }

      case 'stats': {
        const stats = await KVStorage.getStats();
        const contractCount = await KVStorage.getContractCount();
        
        return NextResponse.json({
          success: true,
          stats: {
            ...stats,
            currentContracts: contractCount,
          },
        });
      }

      default:
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid action',
            availableActions: [
              'curated', 
              'discover', 
              'add-contract', 
              'remove-contract', 
              'list-contracts', 
              'from-wallet',
              'search',
              'stats'
            ]
          },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error('❌ NFT API Error:', error);
    
    // Check if it's a KV connection error
    if (error?.message?.includes('KV')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database connection error. Please ensure Vercel KV is properly configured.',
          details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: process.env.NODE_ENV === 'development' 
          ? error?.message || 'Unknown error'
          : 'Failed to process request',
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
