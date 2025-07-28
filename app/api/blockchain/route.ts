// app/api/blockchain/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { BlockchainService } from '../../../services/blockchainService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const contractAddress = searchParams.get('contract');
    const tokenId = searchParams.get('tokenId');
    const address = searchParams.get('address');

    switch (action) {
      case 'current-block':
        const blockNumber = await BlockchainService.getCurrentBlock();
        return NextResponse.json({
          success: true,
          blockNumber: blockNumber.toString(),
          timestamp: Date.now(),
        });

      case 'nft-owner':
        if (!contractAddress || !tokenId) {
          return NextResponse.json(
            { success: false, error: 'Missing contract address or token ID' },
            { status: 400 }
          );
        }
        
        const owner = await BlockchainService.getNFTOwner(contractAddress, tokenId);
        return NextResponse.json({
          success: true,
          owner,
          contract: contractAddress,
          tokenId,
        });

      case 'nft-metadata':
        if (!contractAddress || !tokenId) {
          return NextResponse.json(
            { success: false, error: 'Missing contract address or token ID' },
            { status: 400 }
          );
        }
        
        const metadataURI = await BlockchainService.getNFTMetadataURI(contractAddress, tokenId);
        return NextResponse.json({
          success: true,
          metadataURI,
          contract: contractAddress,
          tokenId,
        });

      case 'contract-info':
        if (!contractAddress) {
          return NextResponse.json(
            { success: false, error: 'Missing contract address' },
            { status: 400 }
          );
        }
        
        const name = await BlockchainService.getContractName(contractAddress);
        return NextResponse.json({
          success: true,
          name,
          address: contractAddress,
        });

      case 'balance':
        if (!address) {
          return NextResponse.json(
            { success: false, error: 'Missing wallet address' },
            { status: 400 }
          );
        }
        
        const balance = await BlockchainService.getBalance(address);
        return NextResponse.json({
          success: true,
          balance: `${balance} ETH`,
          address,
        });

      case 'floor-price':
        if (!contractAddress) {
          return NextResponse.json(
            { success: false, error: 'Missing contract address' },
            { status: 400 }
          );
        }
        
        const floorPrice = await BlockchainService.getFloorPrice(contractAddress);
        return NextResponse.json({
          success: true,
          floorPrice,
          contract: contractAddress,
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Blockchain API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Blockchain operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
