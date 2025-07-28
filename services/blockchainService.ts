// services/blockchainService.ts
import { createPublicClient, http, Block, formatEther } from 'viem';
import { base } from 'viem/chains';

// Initialize the Alchemy client
const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || 'VC101OeDXt98wh97JznfZ7KCbaglnN-G';

export const baseClient = createPublicClient({
  chain: base,
  transport: http(`https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`),
});

export class BlockchainService {
  // Get current block number
  static async getCurrentBlock(): Promise<bigint> {
    try {
      const blockNumber = await baseClient.getBlockNumber();
      console.log('Current block:', blockNumber);
      return blockNumber;
    } catch (error) {
      console.error('Error getting block number:', error);
      throw error;
    }
  }

  // Get block details
  static async getBlock(blockNumber?: bigint): Promise<Block> {
    try {
      const block = await baseClient.getBlock({
        blockNumber: blockNumber,
      });
      return block;
    } catch (error) {
      console.error('Error getting block:', error);
      throw error;
    }
  }

  // Get NFT owner
  static async getNFTOwner(contractAddress: string, tokenId: string): Promise<string> {
    try {
      const owner = await baseClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: [
          {
            name: 'ownerOf',
            type: 'function',
            inputs: [{ name: 'tokenId', type: 'uint256' }],
            outputs: [{ name: 'owner', type: 'address' }],
            stateMutability: 'view',
          },
        ],
        functionName: 'ownerOf',
        args: [BigInt(tokenId)],
      });
      
      return owner as string;
    } catch (error) {
      console.error('Error getting NFT owner:', error);
      throw error;
    }
  }

  // Get NFT metadata URI
  static async getNFTMetadataURI(contractAddress: string, tokenId: string): Promise<string> {
    try {
      const uri = await baseClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: [
          {
            name: 'tokenURI',
            type: 'function',
            inputs: [{ name: 'tokenId', type: 'uint256' }],
            outputs: [{ name: 'uri', type: 'string' }],
            stateMutability: 'view',
          },
        ],
        functionName: 'tokenURI',
        args: [BigInt(tokenId)],
      });
      
      return uri as string;
    } catch (error) {
      console.error('Error getting NFT metadata URI:', error);
      throw error;
    }
  }

  // Get contract name
  static async getContractName(contractAddress: string): Promise<string> {
    try {
      const name = await baseClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: [
          {
            name: 'name',
            type: 'function',
            inputs: [],
            outputs: [{ name: 'name', type: 'string' }],
            stateMutability: 'view',
          },
        ],
        functionName: 'name',
      });
      
      return name as string;
    } catch (error) {
      console.error('Error getting contract name:', error);
      return 'Unknown Collection';
    }
  }

  // Get ETH balance
  static async getBalance(address: string): Promise<string> {
    try {
      const balance = await baseClient.getBalance({
        address: address as `0x${string}`,
      });
      
      return formatEther(balance);
    } catch (error) {
      console.error('Error getting balance:', error);
      throw error;
    }
  }

  // Get transaction receipt
  static async getTransactionReceipt(txHash: string) {
    try {
      const receipt = await baseClient.getTransactionReceipt({
        hash: txHash as `0x${string}`,
      });
      
      return receipt;
    } catch (error) {
      console.error('Error getting transaction receipt:', error);
      throw error;
    }
  }

  // Watch for NFT transfer events
  static async watchNFTTransfers(
    contractAddress: string,
    onTransfer: (from: string, to: string, tokenId: string) => void
  ) {
    const unwatch = baseClient.watchContractEvent({
      address: contractAddress as `0x${string}`,
      abi: [
        {
          name: 'Transfer',
          type: 'event',
          inputs: [
            { indexed: true, name: 'from', type: 'address' },
            { indexed: true, name: 'to', type: 'address' },
            { indexed: true, name: 'tokenId', type: 'uint256' },
          ],
        },
      ],
      eventName: 'Transfer',
      onLogs: (logs) => {
        logs.forEach((log) => {
          const { from, to, tokenId } = log.args as any;
          onTransfer(from, to, tokenId.toString());
        });
      },
    });

    return unwatch;
  }

  // Get collection floor price (simplified - you'd need to query marketplace contracts)
  static async getFloorPrice(contractAddress: string): Promise<string | null> {
    // This is a placeholder - in reality, you'd query marketplace contracts
    // or use Alchemy's NFT API for floor price data
    try {
      // For now, return mock data
      return '0.1';
    } catch (error) {
      console.error('Error getting floor price:', error);
      return null;
    }
  }
}
