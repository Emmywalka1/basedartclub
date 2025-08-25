// app/api/validate-address/route.ts
import { NextRequest, NextResponse } from 'next/server';

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || 'VC101OeDXt98wh97JznfZ7KCbaglnN-G';
const ALCHEMY_BASE_URL = `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const type = searchParams.get('type') || 'contract';

    console.log(`🔍 Validating ${type}: ${address}`);

    if (!address) {
      return NextResponse.json(
        { valid: false, message: 'Address is required' },
        { status: 400 }
      );
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/i.test(address)) {
      return NextResponse.json(
        { valid: false, message: 'Invalid Ethereum address format' },
        { status: 400 }
      );
    }

    if (type === 'contract') {
      try {
        // Try to get NFTs from the contract
        console.log(`📝 Checking contract for NFTs...`);
        const response = await fetch(
          `${ALCHEMY_BASE_URL}/getNFTsForContract?contractAddress=${address}&limit=1&withMetadata=false`,
          {
            headers: {
              'Accept': 'application/json',
            },
            cache: 'no-cache'
          }
        );

        if (!response.ok) {
          console.error(`❌ Alchemy API error: ${response.status}`);
          // Don't fail validation, just warn
          return NextResponse.json({
            valid: true,
            message: 'Contract accepted (API check failed)',
            metadata: {
              name: 'Custom Contract',
              warning: 'Could not verify NFTs, but contract added anyway'
            }
          });
        }

        const data = await response.json();
        console.log(`✅ Contract check complete. NFTs found: ${data.nfts?.length > 0}`);

        // Even if no NFTs found, still mark as valid
        // The contract might be new or have different characteristics
        return NextResponse.json({
          valid: true,
          message: data.nfts?.length > 0 ? 'Valid NFT contract' : 'Contract accepted',
          metadata: {
            name: 'NFT Contract',
            nftCount: data.nfts?.length || 0,
            hasNFTs: data.nfts?.length > 0
          }
        });

      } catch (error) {
        console.error('Contract validation error:', error);
        // Don't fail on API errors - accept the contract anyway
        return NextResponse.json({
          valid: true,
          message: 'Contract accepted',
          metadata: {
            name: 'Custom Contract',
            warning: 'Validation check failed but contract accepted'
          }
        });
      }

    } else if (type === 'wallet') {
      try {
        console.log(`👛 Checking wallet for NFTs...`);
        const response = await fetch(
          `${ALCHEMY_BASE_URL}/getNFTsForOwner?owner=${address}&pageSize=100&excludeFilters[]=SPAM`,
          {
            headers: {
              'Accept': 'application/json',
            },
            cache: 'no-cache'
          }
        );

        if (!response.ok) {
          console.error(`❌ Alchemy API error: ${response.status}`);
          // Try without filters
          const retryResponse = await fetch(
            `${ALCHEMY_BASE_URL}/getNFTsForOwner?owner=${address}&pageSize=100`,
            {
              headers: {
                'Accept': 'application/json',
              },
              cache: 'no-cache'
            }
          );
          
          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            console.log(`✅ Wallet check complete (retry). NFTs found: ${retryData.ownedNfts?.length || 0}`);
            
            return NextResponse.json({
              valid: true,
              message: 'Valid wallet',
              metadata: {
                nftCount: retryData.totalCount || retryData.ownedNfts?.length || 0
              }
            });
          }
          
          // Accept wallet anyway
          return NextResponse.json({
            valid: true,
            message: 'Wallet accepted',
            metadata: {
              warning: 'Could not verify NFTs'
            }
          });
        }

        const data = await response.json();
        const nftCount = data.totalCount || data.ownedNfts?.length || 0;
        
        console.log(`✅ Wallet check complete. NFTs found: ${nftCount}`);

        // Accept wallet even if no NFTs found on Base
        // They might have NFTs we can't detect
        return NextResponse.json({
          valid: true,
          message: nftCount > 0 ? 'Valid wallet with NFTs' : 'Wallet accepted',
          metadata: {
            nftCount: nftCount
          }
        });

      } catch (error) {
        console.error('Wallet validation error:', error);
        // Accept wallet anyway
        return NextResponse.json({
          valid: true,
          message: 'Wallet accepted',
          metadata: {
            warning: 'Validation check failed but wallet accepted'
          }
        });
      }
    }

    return NextResponse.json({
      valid: false,
      message: 'Invalid address type'
    });

  } catch (error) {
    console.error('Validation error:', error);
    // In case of any error, accept the address
    return NextResponse.json({
      valid: true,
      message: 'Address accepted',
      metadata: {
        warning: 'Validation failed but address accepted'
      }
    });
  }
}
