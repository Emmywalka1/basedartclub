// services/marketplacePriceService.ts
// Updated service with Foundation + IPFS integration

import axios from 'axios';
import { FoundationPriceService } from './foundationPriceService';

interface MarketplacePrice {
  value: string;
  currency: string;
  marketplace: string;
  isRealPrice: boolean;
}

export class MarketplacePriceService {
  private static ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
  private static OPENSEA_API_KEY = process.env.OPENSEA_API_KEY;
  
  // Main method to get the best available price
  static async getBestPrice(
    contractAddress: string, 
    tokenId: string
  ): Promise<MarketplacePrice> {
    console.log(`💰 Fetching real price for ${contractAddress}/${tokenId}`);
    
    // Check if this is a Foundation contract first
    const isFoundationContract = this.isFoundationContract(contractAddress);
    
    if (isFoundationContract) {
      // Prioritize Foundation for Foundation contracts
      const foundationPrice = await FoundationPriceService.getFoundationPrice(
        contractAddress,
        tokenId
      );
      
      if (foundationPrice && foundationPrice.isRealPrice) {
        console.log(`✅ Found Foundation price: ${foundationPrice.value} ${foundationPrice.currency}`);
        return foundationPrice;
      }
    }
    
    // Try multiple sources in parallel
    const pricePromises = [
      // Always try Foundation for any contract (might be cross-listed)
      !isFoundationContract ? FoundationPriceService.getFoundationPrice(contractAddress, tokenId) : null,
      this.getReservoirTokenPrice(contractAddress, tokenId),
      this.getAlchemyTokenPrice(contractAddress, tokenId),
      this.getIPFSDirectPrice(contractAddress, tokenId),
    ];

    // If we have OpenSea API key, add it
    if (this.OPENSEA_API_KEY) {
      pricePromises.push(this.getOpenSeaTokenPrice(contractAddress, tokenId));
    }

    const results = await Promise.allSettled(pricePromises);
    
    // Find the first successful result with a real price
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value && result.value.isRealPrice) {
        console.log(`✅ Found real price: ${result.value.value} ${result.value.currency} on ${result.value.marketplace}`);
        return result.value;
      }
    }
    
    // No real price found, return estimated
    console.log('⚠️ No real marketplace price found, using estimate');
    return this.generateEstimatedPrice(contractAddress, tokenId);
  }

  // Check if this is a Foundation contract
  private static isFoundationContract(contractAddress: string): boolean {
    const address = contractAddress.toLowerCase();
    const foundationContracts = [
      '0x972f31d4e140f0d09b154bb395a070ed5ee9fcca', // emmywalka on Foundation
      '0x3b3ee1931dc30c1957379fac9aba94d1c48a5405', // Foundation on mainnet
      // Add other known Foundation contracts
    ];
    
    return foundationContracts.includes(address);
  }

  // Get price directly from IPFS metadata
  private static async getIPFSDirectPrice(
    contractAddress: string,
    tokenId: string
  ): Promise<MarketplacePrice | null> {
    try {
      // Get token metadata URI
      const metadataResponse = await axios.get(
        `https://base-mainnet.g.alchemy.com/nft/v3/${this.ALCHEMY_API_KEY}/getNFTMetadata`,
        {
          params: {
            contractAddress,
            tokenId,
            refreshCache: true,
          },
          timeout: 10000,
        }
      );

      const metadata = metadataResponse.data?.metadata;
      
      // Check for price in metadata
      if (metadata) {
        // Check various price fields
        const priceValue = 
          metadata.price ||
          metadata.listing_price ||
          metadata.sale_price ||
          metadata.foundation_price ||
          metadata.market_price ||
          metadata.current_price;
        
        if (priceValue) {
          // Parse price based on format
          let ethPrice: string;
          
          if (typeof priceValue === 'object') {
            // Handle object format {amount: "1000000000000000000", currency: "ETH"}
            ethPrice = priceValue.amount 
              ? (parseFloat(priceValue.amount) / 1e18).toFixed(4)
              : priceValue.value || '0';
          } else if (typeof priceValue === 'string') {
            // Handle string format "0.1 ETH" or just "0.1"
            ethPrice = priceValue.replace(/[^0-9.]/g, '');
          } else if (typeof priceValue === 'number') {
            // If it's a large number, assume wei
            ethPrice = priceValue > 1000 
              ? (priceValue / 1e18).toFixed(4) 
              : priceValue.toFixed(4);
          } else {
            ethPrice = '0';
          }
          
          if (parseFloat(ethPrice) > 0) {
            return {
              value: ethPrice,
              currency: 'ETH',
              marketplace: 'Metadata',
              isRealPrice: true,
            };
          }
        }
        
        // Check for Foundation-specific metadata
        if (metadata.foundation) {
          const foundationData = metadata.foundation;
          if (foundationData.auction || foundationData.buyNow) {
            const auctionData = foundationData.auction || foundationData.buyNow;
            const price = auctionData.reservePrice || auctionData.price || auctionData.currentBid;
            
            if (price) {
              return {
                value: (parseFloat(price) / 1e18).toFixed(4),
                currency: 'ETH',
                marketplace: 'Foundation (Metadata)',
                isRealPrice: true,
              };
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.error('IPFS Direct price error:', error);
      return null;
    }
  }

  // 1. Reservoir API - Best for individual token data
  private static async getReservoirTokenPrice(
    contractAddress: string,
    tokenId: string
  ): Promise<MarketplacePrice | null> {
    try {
      // Get specific token data with all order information
      const response = await axios.get(
        `https://api-base.reservoir.tools/tokens/v7`,
        {
          params: {
            tokens: `${contractAddress}:${tokenId}`,
            includeTopBid: true,
            includeAttributes: false,
            includeLastSale: true,
          },
          headers: {
            'accept': 'application/json',
          },
          timeout: 5000,
        }
      );

      const token = response.data?.tokens?.[0];
      
      // Check for active ask (listing)
      if (token?.market?.floorAsk?.price?.amount?.decimal) {
        return {
          value: token.market.floorAsk.price.amount.decimal.toString(),
          currency: token.market.floorAsk.price.currency?.symbol || 'ETH',
          marketplace: token.market.floorAsk.source?.name || 'Reservoir',
          isRealPrice: true,
        };
      }

      // Check for last sale as reference
      if (token?.lastSale?.price?.amount?.decimal) {
        return {
          value: token.lastSale.price.amount.decimal.toString(),
          currency: token.lastSale.price.currency?.symbol || 'ETH',
          marketplace: `${token.lastSale.marketplace || 'Unknown'} (Last Sale)`,
          isRealPrice: true,
        };
      }

      return null;
    } catch (error) {
      console.error('Reservoir token API error:', error);
      return null;
    }
  }

  // 2. Alchemy NFT API - Enhanced token-specific endpoint
  private static async getAlchemyTokenPrice(
    contractAddress: string,
    tokenId: string
  ): Promise<MarketplacePrice | null> {
    try {
      // Use Alchemy's NFT metadata endpoint which includes sales data
      const response = await axios.get(
        `https://base-mainnet.g.alchemy.com/nft/v3/${this.ALCHEMY_API_KEY}/getNFTMetadata`,
        {
          params: {
            contractAddress: contractAddress,
            tokenId: tokenId,
            refreshCache: true, // Force refresh to get latest data
          },
          timeout: 5000,
        }
      );

      const nft = response.data;
      
      // Check if Alchemy has marketplace data
      if (nft?.contract?.openSeaMetadata?.floorPrice) {
        return {
          value: nft.contract.openSeaMetadata.floorPrice.toString(),
          currency: 'ETH',
          marketplace: 'OpenSea (Floor)',
          isRealPrice: true,
        };
      }

      // Check for last sale data
      if (nft?.lastSale?.price) {
        return {
          value: nft.lastSale.price.toString(),
          currency: nft.lastSale.currency || 'ETH',
          marketplace: `${nft.lastSale.marketplace || 'Unknown'} (Last Sale)`,
          isRealPrice: true,
        };
      }

      return null;
    } catch (error) {
      console.error('Alchemy token price error:', error);
      return null;
    }
  }

  // 3. OpenSea V2 API - Token-specific endpoint
  private static async getOpenSeaTokenPrice(
    contractAddress: string,
    tokenId: string
  ): Promise<MarketplacePrice | null> {
    if (!this.OPENSEA_API_KEY) return null;

    try {
      // Check for active listings
      const listingsResponse = await axios.get(
        `https://api.opensea.io/api/v2/orders/base/seaport/listings`,
        {
          params: {
            asset_contract_address: contractAddress,
            token_ids: tokenId,
            limit: 1,
          },
          headers: {
            'accept': 'application/json',
            'x-api-key': this.OPENSEA_API_KEY,
          },
          timeout: 5000,
        }
      );

      if (listingsResponse.data?.orders?.length > 0) {
        const listing = listingsResponse.data.orders[0];
        const priceInWei = BigInt(listing.current_price);
        const priceInEth = Number(priceInWei) / 1e18;
        
        return {
          value: priceInEth.toFixed(4),
          currency: 'ETH',
          marketplace: 'OpenSea',
          isRealPrice: true,
        };
      }

      return null;
    } catch (error) {
      console.error('OpenSea token API error:', error);
      return null;
    }
  }

  // Generate estimated price as fallback
  private static generateEstimatedPrice(
    contractAddress: string,
    tokenId: string
  ): MarketplacePrice {
    const address = contractAddress.toLowerCase();
    
    // Platform-specific price ranges for 1/1 art
    let min = 0.01;
    let max = 0.1;
    
    if (this.isFoundationContract(contractAddress)) {
      // Foundation 1/1s tend to be higher
      min = 0.1;
      max = 0.5;
    } else if (address.includes('58fd65a42d33f080543b5f98a1cfa9fbce9fbb4a')) {
      // juujuumama
      min = 0.05;
      max = 0.25;
    }
    
    // Generate deterministic but varied price
    const seed = (parseInt(tokenId) || 1) * 37 % 100;
    const price = min + (max - min) * (seed / 100);
    
    return {
      value: price.toFixed(4),
      currency: 'ETH',
      marketplace: 'Estimated',
      isRealPrice: false,
    };
  }
}
