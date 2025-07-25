// hooks/useMarketplace.ts
import { useState, useCallback } from 'react';
import { useAccount, useSendTransaction, useWriteContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { sdk } from '@farcaster/frame-sdk';

export interface MarketplaceListing {
  contractAddress: string;
  tokenId: string;
  price: {
    value: string;
    currency: string;
    wei: bigint;
  };
  seller: string;
  marketplace: string;
  listingUrl?: string;
}

export interface PurchaseResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

// OpenSea Seaport contract addresses
const SEAPORT_CONTRACTS = {
  base: '0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC', // Seaport 1.5 on Base
  baseSepolia: '0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC', // Seaport 1.5 on Base Sepolia
};

// Basic ERC721 Purchase interface (for direct sales)
const ERC721_PURCHASE_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "tokenId", "type": "uint256" }
    ],
    "name": "purchase",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "tokenId", "type": "uint256" }
    ],
    "name": "mint",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
] as const;

export function useMarketplace() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<string | null>(null);
  
  const { address, isConnected } = useAccount();
  const { sendTransaction } = useSendTransaction();
  const { writeContract } = useWriteContract();

  const purchaseNFT = useCallback(async (
    listing: MarketplaceListing
  ): Promise<PurchaseResult> => {
    if (!isConnected || !address) {
      return {
        success: false,
        error: 'Wallet not connected'
      };
    }

    setIsLoading(true);

    try {
      // Show confirmation dialog
      const confirmed = confirm(
        `Purchase "${listing.tokenId}" for ${listing.price.value} ${listing.price.currency}?\n\n` +
        `This will initiate a blockchain transaction.`
      );

      if (!confirmed) {
        setIsLoading(false);
        return {
          success: false,
          error: 'Purchase cancelled by user'
        };
      }

      // For demo purposes, we'll simulate different marketplace interactions
      let transactionHash: string | undefined;

      if (listing.marketplace === 'OpenSea') {
        // For OpenSea listings, we would need to interact with the Seaport protocol
        // This is a simplified version - in production you'd need the full order data
        transactionHash = await handleOpenSeaPurchase(listing);
      } else if (listing.marketplace === 'Foundation') {
        // For Foundation, handle their specific contract interaction
        transactionHash = await handleFoundationPurchase(listing);
      } else if (listing.marketplace === 'Zora') {
        // For Zora, handle their specific contract interaction
        transactionHash = await handleZoraPurchase(listing);
      } else {
        // Generic ERC721 purchase (direct from contract)
        transactionHash = await handleDirectPurchase(listing);
      }

      if (transactionHash) {
        setLastTransaction(transactionHash);
        
        // Show success notification via Farcaster if available
        try {
          await sdk.actions.openUrl(`https://basescan.org/tx/${transactionHash}`);
        } catch (error) {
          console.log('Could not open transaction in Farcaster');
        }

        return {
          success: true,
          transactionHash
        };
      } else {
        throw new Error('Transaction failed or was rejected');
      }

    } catch (error) {
      console.error('Purchase failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Purchase failed'
      };
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address, sendTransaction, writeContract]);

  // Handle OpenSea/Seaport purchases
  const handleOpenSeaPurchase = async (listing: MarketplaceListing): Promise<string> => {
    // In a real implementation, you would:
    // 1. Fetch the full order data from OpenSea API
    // 2. Construct the Seaport fulfillment transaction
    // 3. Execute the transaction
    
    // For demo purposes, we'll simulate a direct payment
    const result = await sendTransaction({
      to: listing.seller as `0x${string}`,
      value: listing.price.wei,
    });

    return result || '';
  };

  // Handle Foundation purchases
  const handleFoundationPurchase = async (listing: MarketplaceListing): Promise<string> => {
    // Foundation has their own marketplace contract
    // This would need to interact with their specific buy function
    
    try {
      const result = await writeContract({
        address: listing.contractAddress as `0x${string}`,
        abi: ERC721_PURCHASE_ABI,
        functionName: 'purchase',
        args: [BigInt(listing.tokenId)],
        value: listing.price.wei,
      });

      return result || '';
    } catch (error) {
      throw new Error('Foundation purchase failed');
    }
  };

  // Handle Zora purchases
  const handleZoraPurchase = async (listing: MarketplaceListing): Promise<string> => {
    // Zora has their own protocol for purchases
    // This would interact with their marketplace contracts
    
    try {
      const result = await writeContract({
        address: listing.contractAddress as `0x${string}`,
        abi: ERC721_PURCHASE_ABI,
        functionName: 'mint',
        args: [address as `0x${string}`, BigInt(listing.tokenId)],
        value: listing.price.wei,
      });

      return result || '';
    } catch (error) {
      throw new Error('Zora purchase failed');
    }
  };

  // Handle direct contract purchases
  const handleDirectPurchase = async (listing: MarketplaceListing): Promise<string> => {
    try {
      const result = await writeContract({
        address: listing.contractAddress as `0x${string}`,
        abi: ERC721_PURCHASE_ABI,
        functionName: 'purchase',
        args: [BigInt(listing.tokenId)],
        value: listing.price.wei,
      });

      return result || '';
    } catch (error) {
      throw new Error('Direct purchase failed');
    }
  };

  // Get transaction details
  const getTransactionUrl = useCallback((hash: string) => {
    return `https://basescan.org/tx/${hash}`;
  }, []);

  // Check if NFT is affordable
  const canAfford = useCallback((price: bigint, balance?: bigint) => {
    if (!balance) return false;
    return balance >= price;
  }, []);

  // Format price for display
  const formatPrice = useCallback((price: bigint) => {
    return formatEther(price);
  }, []);

  return {
    purchaseNFT,
    isLoading,
    lastTransaction,
    getTransactionUrl,
    canAfford,
    formatPrice,
    isConnected,
    address,
  };
}

// Utility function to create marketplace listing from NFT data
export function createMarketplaceListing(
  nft: any,
  price: string,
  currency: string = 'ETH',
  marketplace: string = 'OpenSea'
): MarketplaceListing {
  return {
    contractAddress: nft.contract.address,
    tokenId: nft.tokenId,
    price: {
      value: price,
      currency,
      wei: parseEther(price),
    },
    seller: nft.owner || '0x0000000000000000000000000000000000000000',
    marketplace,
    listingUrl: `https://opensea.io/assets/base/${nft.contract.address}/${nft.tokenId}`,
  };
}
