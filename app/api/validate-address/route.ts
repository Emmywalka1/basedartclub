// app/api/validate-address/route.ts
import { NextRequest, NextResponse } from 'next/server';

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const ALCHEMY_BASE_URL = `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const type = searchParams.get('type') || 'contract';

    if (!address) {
      return NextResponse.json(
        { valid: false, message: 'Address is required' },
        { status: 400 }
      );
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { valid: false, message: 'Invalid Ethereum address format' },
        { status: 400 }
      );
    }

    if (type === 'contract') {
      // Validate contract address
      try {
        // Check if it's a valid NFT contract
        const response = await fetch(
          `${ALCHEMY_BASE_URL}/getContractMetadata?contractAddress=${address}`
        );
        const data = await response.json();

        if (!data || !data.tokenType) {
          return NextResponse.json({
            valid: false,
            message: 'Address is not a valid NFT contract on Base'
          });
        }

        // Check if contract has NFTs
        const nftsResponse = await fetch(
          `${ALCHEMY_BASE_URL}/getNFTsForContract?contractAddress=${address}&limit=1`
        );
        const nftsData = await nftsResponse.json();

        if (!nftsData.nfts || nftsData.nfts.length === 0) {
          return NextResponse.json({
            valid: false,
            message: 'Contract has no NFTs'
          });
        }

        return NextResponse.json({
          valid: true,
          message: 'Valid NFT contract',
          metadata: {
            name: data.name || 'Unknown Collection',
            symbol: data.symbol,
            tokenType: data.tokenType,
            totalSupply: data.totalSupply
          }
        });

      } catch (error) {
        console.error('Contract validation error:', error);
        return NextResponse.json({
          valid: false,
          message: 'Failed to validate contract address'
        });
      }

    } else if (type === 'wallet') {
      // Validate wallet address by checking if it owns any NFTs
      try {
        const response = await fetch(
          `${ALCHEMY_BASE_URL}/getNFTsForOwner?owner=${address}&pageSize=1`
        );
        const data = await response.json();

        if (!data.ownedNfts || data.ownedNfts.length === 0) {
          return NextResponse.json({
            valid: false,
            message: 'Wallet has no NFTs on Base'
          });
        }

        return NextResponse.json({
          valid: true,
          message: 'Valid wallet with NFTs',
          metadata: {
            nftCount: data.totalCount || data.ownedNfts.length
          }
        });

      } catch (error) {
        console.error('Wallet validation error:', error);
        return NextResponse.json({
          valid: false,
          message: 'Failed to validate wallet address'
        });
      }
    }

    return NextResponse.json({
      valid: false,
      message: 'Invalid address type'
    });

  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { valid: false, message: 'Validation failed' },
      { status: 500 }
    );
  }
}
