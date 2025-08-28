// app/api/process-wallet/route.ts
// Dynamic wallet processor with multiple fallback methods
import { NextRequest, NextResponse } from 'next/server';
import { RedisStorage } from '../../../lib/kv-storage';
import axios from 'axios';

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || 'VC101OeDXt98wh97JznfZ7KCbaglnN-G';

// Try multiple RPC endpoints as fallbacks
const RPC_ENDPOINTS = [
  `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  'https://mainnet.base.org',
  'https://base.llamarpc.com',
  'https://base-rpc.publicnode.com',
  'https://1rpc.io/base',
];

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, name, fallbackContracts } = await request.json();
    
    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet address required' },
        { status: 400 }
      );
    }

    console.log(`🔄 Processing wallet: ${walletAddress}`);
    
    let contracts: string[] = [];
    let method = 'unknown';
    
    // Method 1: Try Alchemy NFT API
    try {
      contracts = await fetchContractsViaAlchemy(walletAddress);
      method = 'alchemy';
      console.log(`✅ Found ${contracts.length} contracts via Alchemy`);
    } catch (error) {
      console.log('⚠️ Alchemy API failed, trying alternative methods...');
    }
    
    // Method 2: Try alternative RPC endpoints
    if (contracts.length === 0) {
      try {
        contracts = await fetchContractsViaRPC(walletAddress);
        method = 'rpc';
        console.log(`✅ Found ${contracts.length} contracts via RPC`);
      } catch (error) {
        console.log('⚠️ RPC method failed');
      }
    }
    
    // Method 3: Try public APIs (no key required)
    if (contracts.length === 0) {
      try {
        contracts = await fetchContractsViaPublicAPIs(walletAddress);
        method = 'public';
        console.log(`✅ Found ${contracts.length} contracts via public APIs`);
      } catch (error) {
        console.log('⚠️ Public API method failed');
      }
    }
    
    // Method 4: Use user-provided fallback contracts
    if (contracts.length === 0 && fallbackContracts && fallbackContracts.length > 0) {
      contracts = fallbackContracts;
      method = 'user-provided';
      console.log(`✅ Using ${contracts.length} user-provided contracts`);
    }
    
    // If we found contracts, add them to KV
    if (contracts.length > 0) {
      const { added, existing } = await KVStorage.addMultipleContracts(
        contracts,
        {
          name: name || `Wallet ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
          type: 'wallet',
          metadata: { 
            sourceWallet: walletAddress,
            method: method,
            timestamp: new Date().toISOString()
          },
        }
      );
      
      console.log(`✅ Successfully added ${added.length} new contracts`);
      
      return NextResponse.json({
        success: true,
        message: `Added ${added.length} new contracts from wallet`,
        method,
        contractsFound: contracts.length,
        newContracts: added.length,
        existingContracts: existing.length,
        contracts: contracts.slice(0, 10), // Return first 10 as preview
        totalContracts: await KVStorage.getContractCount(),
      });
    }
    
    // No contracts found by any method
    return NextResponse.json({
      success: false,
      error: 'No NFT contracts found in wallet',
      message: 'This wallet may not have NFTs on Base network. Try adding contract addresses directly.',
      walletAddress,
      methodsTried: ['alchemy', 'rpc', 'public', 'user-provided'],
    });
    
  } catch (error: any) {
    console.error('Error processing wallet:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process wallet',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// Method 1: Fetch via Alchemy NFT API
async function fetchContractsViaAlchemy(walletAddress: string): Promise<string[]> {
  const ALCHEMY_BASE_URL = `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}`;
  
  const response = await axios.get(
    `${ALCHEMY_BASE_URL}/getNFTsForOwner`,
    {
      params: {
        owner: walletAddress,
        pageSize: 100,
        withMetadata: false, // Faster without metadata
      },
      timeout: 10000,
    }
  );
  
  const contracts = new Set<string>();
  response.data.ownedNfts?.forEach((nft: any) => {
    if (nft.contract?.address) {
      contracts.add(nft.contract.address.toLowerCase());
    }
  });
  
  return Array.from(contracts);
}

// Method 2: Fetch via RPC calls
async function fetchContractsViaRPC(walletAddress: string): Promise<string[]> {
  // Try each RPC endpoint until one works
  for (const rpcUrl of RPC_ENDPOINTS) {
    try {
      const response = await axios.post(
        rpcUrl,
        {
          jsonrpc: '2.0',
          method: 'eth_getLogs',
          params: [{
            fromBlock: '0x0',
            toBlock: 'latest',
            address: null,
            topics: [
              '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', // Transfer event
              null,
              `0x000000000000000000000000${walletAddress.slice(2)}`, // To address
            ],
          }],
          id: 1,
        },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (response.data.result) {
        const contracts = new Set<string>();
        response.data.result.forEach((log: any) => {
          if (log.address) {
            contracts.add(log.address.toLowerCase());
          }
        });
        
        if (contracts.size > 0) {
          return Array.from(contracts);
        }
      }
    } catch (error) {
      console.log(`RPC endpoint ${rpcUrl} failed, trying next...`);
      continue;
    }
  }
  
  throw new Error('All RPC endpoints failed');
}

// Method 3: Try public APIs that don't require keys
async function fetchContractsViaPublicAPIs(walletAddress: string): Promise<string[]> {
  const contracts = new Set<string>();
  
  // Try SimpleHash API (free tier)
  try {
    const response = await axios.get(
      `https://api.simplehash.com/api/v0/nfts/owners?chains=base&wallet_addresses=${walletAddress}&limit=50`,
      {
        headers: {
          'X-API-KEY': 'simplehash_demo_key', // Demo key for testing
        },
        timeout: 10000,
      }
    );
    
    response.data.nfts?.forEach((nft: any) => {
      if (nft.contract_address) {
        contracts.add(nft.contract_address.toLowerCase());
      }
    });
  } catch (error) {
    console.log('SimpleHash API failed');
  }
  
  // Try Covalent API (has free tier)
  try {
    const response = await axios.get(
      `https://api.covalenthq.com/v1/base-mainnet/address/${walletAddress}/balances_nft/`,
      {
        params: {
          'no-spam': true,
        },
        auth: {
          username: 'covalent_demo', // Demo credentials
          password: '',
        },
        timeout: 10000,
      }
    );
    
    response.data.data?.items?.forEach((item: any) => {
      if (item.contract_address) {
        contracts.add(item.contract_address.toLowerCase());
      }
    });
  } catch (error) {
    console.log('Covalent API failed');
  }
  
  return Array.from(contracts);
}

// GET method to check wallet without adding
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const walletAddress = searchParams.get('wallet');
  
  if (!walletAddress) {
    return NextResponse.json({
      error: 'Wallet address required',
      usage: '/api/process-wallet?wallet=0x...',
    });
  }
  
  try {
    let contracts: string[] = [];
    let method = 'none';
    
    // Try to fetch contracts
    try {
      contracts = await fetchContractsViaAlchemy(walletAddress);
      method = 'alchemy';
    } catch {
      try {
        contracts = await fetchContractsViaRPC(walletAddress);
        method = 'rpc';
      } catch {
        try {
          contracts = await fetchContractsViaPublicAPIs(walletAddress);
          method = 'public';
        } catch {
          method = 'failed';
        }
      }
    }
    
    return NextResponse.json({
      wallet: walletAddress,
      method,
      contractsFound: contracts.length,
      contracts: contracts.slice(0, 10), // First 10 as preview
      message: contracts.length > 0 
        ? `Found ${contracts.length} contracts using ${method} method`
        : 'No contracts found. Wallet may be empty on Base network.',
    });
    
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check wallet',
      wallet: walletAddress,
    });
  }
}
