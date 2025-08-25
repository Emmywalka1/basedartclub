// app/api/debug-nft/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || 'VC101OeDXt98wh97JznfZ7KCbaglnN-G';
const ALCHEMY_BASE_URL = `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const type = searchParams.get('type') || 'contract';

  if (!address) {
    return NextResponse.json({ error: 'Address required' });
  }

  const results: any = {
    address,
    type,
    timestamp: new Date().toISOString(),
    checks: {}
  };

  // Check 1: Validate format
  results.checks.validFormat = /^0x[a-fA-F0-9]{40}$/i.test(address);

  if (type === 'contract') {
    // Check 2: Try to get NFTs from contract
    try {
      const response = await axios.get(
        `${ALCHEMY_BASE_URL}/getNFTsForContract`,
        {
          params: {
            contractAddress: address,
            withMetadata: true,
            limit: 5
          },
          timeout: 10000
        }
      );
      
      results.checks.contractNFTs = {
        success: true,
        nftCount: response.data.nfts?.length || 0,
        sample: response.data.nfts?.[0] ? {
          tokenId: response.data.nfts[0].tokenId,
          name: response.data.nfts[0].name,
          hasImage: !!(response.data.nfts[0].image?.cachedUrl || response.data.nfts[0].image?.originalUrl)
        } : null
      };
    } catch (error: any) {
      results.checks.contractNFTs = {
        success: false,
        error: error.message,
        status: error.response?.status
      };
    }

    // Check 3: Try to get contract metadata
    try {
      const response = await axios.get(
        `${ALCHEMY_BASE_URL}/getContractMetadata`,
        {
          params: { contractAddress: address },
          timeout: 10000
        }
      );
      
      results.checks.contractMetadata = {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      results.checks.contractMetadata = {
        success: false,
        error: error.message
      };
    }

  } else if (type === 'wallet') {
    // Check 4: Try to get NFTs from wallet
    try {
      const response = await axios.get(
        `${ALCHEMY_BASE_URL}/getNFTsForOwner`,
        {
          params: {
            owner: address,
            pageSize: 100
          },
          timeout: 15000
        }
      );
      
      const contracts = new Set<string>();
      response.data.ownedNfts?.forEach((nft: any) => {
        if (nft.contract?.address) {
          contracts.add(nft.contract.address.toLowerCase());
        }
      });
      
      results.checks.walletNFTs = {
        success: true,
        totalNFTs: response.data.totalCount || response.data.ownedNfts?.length || 0,
        uniqueContracts: contracts.size,
        contracts: Array.from(contracts).slice(0, 10), // First 10 contracts
        sample: response.data.ownedNfts?.[0] ? {
          contract: response.data.ownedNfts[0].contract?.address,
          tokenId: response.data.ownedNfts[0].tokenId,
          name: response.data.ownedNfts[0].name
        } : null
      };
    } catch (error: any) {
      results.checks.walletNFTs = {
        success: false,
        error: error.message,
        status: error.response?.status
      };
    }

    // Check 5: Try without spam filter
    try {
      const response = await axios.get(
        `${ALCHEMY_BASE_URL}/getNFTsForOwner`,
        {
          params: {
            owner: address,
            pageSize: 100,
            excludeFilters: ['SPAM']
          },
          timeout: 15000
        }
      );
      
      results.checks.walletNFTsNoSpam = {
        success: true,
        totalNFTs: response.data.totalCount || response.data.ownedNfts?.length || 0
      };
    } catch (error: any) {
      results.checks.walletNFTsNoSpam = {
        success: false,
        error: error.message
      };
    }
  }

  // Check 6: Alchemy API key validity
  try {
    const response = await axios.get(
      `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getBlockNumber`,
      { timeout: 5000 }
    );
    results.checks.alchemyAPIKey = {
      valid: true,
      blockNumber: response.data
    };
  } catch (error) {
    results.checks.alchemyAPIKey = {
      valid: false,
      error: 'API key might be invalid or rate limited'
    };
  }

  // Summary
  results.summary = {
    canAdd: results.checks.validFormat,
    hasNFTs: type === 'contract' 
      ? results.checks.contractNFTs?.nftCount > 0
      : results.checks.walletNFTs?.totalNFTs > 0,
    recommendation: generateRecommendation(results)
  };

  return NextResponse.json(results, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    }
  });
}

function generateRecommendation(results: any): string {
  if (!results.checks.validFormat) {
    return 'Invalid address format. Check the address.';
  }
  
  if (!results.checks.alchemyAPIKey?.valid) {
    return 'Alchemy API key issue. Check your API key.';
  }
  
  if (results.type === 'contract') {
    if (results.checks.contractNFTs?.success && results.checks.contractNFTs?.nftCount > 0) {
      return 'Contract is valid and has NFTs. Should work!';
    }
    if (results.checks.contractNFTs?.error?.includes('404')) {
      return 'Contract not found on Base. Check if it\'s on the correct network.';
    }
    return 'Contract might be empty or not an NFT contract. Try adding anyway.';
  } else {
    if (results.checks.walletNFTs?.totalNFTs > 0) {
      return `Wallet has ${results.checks.walletNFTs.totalNFTs} NFTs from ${results.checks.walletNFTs.uniqueContracts} contracts. Should work!`;
    }
    return 'Wallet appears empty on Base. It might have NFTs on other chains.';
  }
}
