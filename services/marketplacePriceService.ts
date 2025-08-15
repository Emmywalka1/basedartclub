// services/marketplacePriceService.ts
// Dedicated service for fetching REAL marketplace prices from various platforms

import axios from 'axios';

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
    
    // Try multiple sources in parallel
    const pricePromises = [
      this.getAlchemyFloorPrice(contractAddress, tokenId),
      this.getReservoirPrice(contractAddress, tokenId),
      this.getSimpleHashPrice(contractAddress, tokenId),
      this.getNFTPortPrice(contractAddress, tokenId),
    ];

    // If we have OpenSea API key, add it
    if (this.OPENSEA_API_KEY) {
      pricePromises.push(this.getOpenSeaV2Price(contractAddress, tokenId));
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

  // 1. Alchemy NFT API - Get floor price and listings
  private static async getAlchemyFloorPrice(
    contractAddress: string,
    tokenId: string
  ): Promise<MarketplacePrice | null> {
    try {
      // First try to get floor price for the collection
      const floorResponse = await axios.get(
        `https://base-mainnet.g.alchemy.com/nft/v3/${this.ALCHEMY_API_KEY}/getFloorPrice`,
        {
          params: {
            contractAddress: contractAddress,
          },
          timeout: 5000,
        }
      );

      if (floorResponse.data?.openSea?.floorPrice) {
        return {
          value: floorResponse.data.openSea.floorPrice.toString(),
          currency: 'ETH',
          marketplace: 'OpenSea (Floor)',
          isRealPrice: true,
        };
      }

      // Also check other marketplaces in the response
      if (floorResponse.data?.blur?.floorPrice) {
        return {
          value: floorResponse.data.blur.floorPrice.toString(),
          currency: 'ETH',
          marketplace: 'Blur (Floor)',
          isRealPrice: true,
        };
      }

      return null;
    } catch (error) {
      console.error('Alchemy floor price error:', error);
      return null;
    }
  }

  // 2. Reservoir API - Free and comprehensive marketplace aggregator
  private static async getReservoirPrice(
    contractAddress: string,
    tokenId: string
  ): Promise<MarketplacePrice | null> {
    try {
      // Reservoir provides free access to aggregated marketplace data
      const response = await axios.get(
        `https://api-base.reservoir.tools/tokens/v7`,
        {
          params: {
            tokens: `${contractAddress}:${tokenId}`,
            includeTopBid: true,
            includeAttributes: false,
          },
          headers: {
            'accept': 'application/json',
            // No API key required for basic queries
          },
          timeout: 5000,
        }
      );

      const token = response.data?.tokens?.[0];
      
      if (token?.market?.floorAsk?.price?.amount?.decimal) {
        return {
          value: token.market.floorAsk.price.amount.decimal.toString(),
          currency: token.market.floorAsk.price.currency?.symbol || 'ETH',
          marketplace: token.market.floorAsk.source?.name || 'Reservoir',
          isRealPrice: true,
        };
      }

      // Check for top bid as alternative
      if (token?.market?.topBid?.price?.amount?.decimal) {
        return {
          value: token.market.topBid.price.amount.decimal.toString(),
          currency: token.market.topBid.price.currency?.symbol || 'ETH',
          marketplace: `${token.market.topBid.source?.name || 'Reservoir'} (Bid)`,
          isRealPrice: true,
        };
      }

      return null;
    } catch (error) {
      console.error('Reservoir API error:', error);
      return null;
    }
  }

  // 3. SimpleHash API - Another free NFT data provider
  private static async getSimpleHashPrice(
    contractAddress: string,
    tokenId: string
  ): Promise<MarketplacePrice | null> {
    try {
      // SimpleHash offers free tier
      const response = await axios.get(
        `https://api.simplehash.com/api/v0/nfts/base/${contractAddress}/${tokenId}`,
        {
          headers: {
            'accept': 'application/json',
            // Free tier doesn't require API key for basic queries
          },
          timeout: 5000,
        }
      );

      const nft = response.data;
      
      // Check for floor price
      if (nft?.collection?.floor_prices?.[0]?.value) {
        return {
          value: nft.collection.floor_prices[0].value.toString(),
          currency: 'ETH',
          marketplace: nft.collection.floor_prices[0].marketplace || 'SimpleHash',
          isRealPrice: true,
        };
      }

      // Check for last sale
      if (nft?.last_sale?.unit_price) {
        return {
          value: (nft.last_sale.unit_price / 1e18).toFixed(4),
          currency: 'ETH',
          marketplace: `${nft.last_sale.marketplace || 'Unknown'} (Last Sale)`,
          isRealPrice: true,
        };
      }

      return null;
    } catch (error) {
      // SimpleHash might require auth, fail silently
      return null;
    }
  }

  // 4. NFTPort API - For Base chain support
  private static async getNFTPortPrice(
    contractAddress: string,
    tokenId: string
  ): Promise<MarketplacePrice | null> {
    try {
      // NFTPort has Base support
      const response = await axios.get(
        `https://api.nftport.xyz/v0/transactions/nfts/${contractAddress}/${tokenId}`,
        {
          params: {
            chain: 'base',
            type: 'list',
          },
          headers: {
            'accept': 'application/json',
            // Add your NFTPort API key if you have one
            // 'Authorization': process.env.NFTPORT_API_KEY
          },
          timeout: 5000,
        }
      );

      const transactions = response.data?.transactions;
      
      if (transactions && transactions.length > 0) {
        const listing = transactions[0];
        if (listing.price_details?.price) {
          return {
            value: listing.price_details.price.toString(),
            currency: listing.price_details.asset_type || 'ETH',
            marketplace: listing.marketplace || 'NFTPort',
            isRealPrice: true,
          };
        }
      }

      return null;
    } catch (error) {
      // NFTPort might require auth, fail silently
      return null;
    }
  }

  // 5. OpenSea V2 API with Base support
  private static async getOpenSeaV2Price(
    contractAddress: string,
    tokenId: string
  ): Promise<MarketplacePrice | null> {
    if (!this.OPENSEA_API_KEY) return null;

    try {
      // OpenSea V2 API with Base chain support
      const response = await axios.get(
        `https://api.opensea.io/api/v2/chain/base/contract/${contractAddress}/nfts/${tokenId}`,
        {
          headers: {
            'accept': 'application/json',
            'x-api-key': this.OPENSEA_API_KEY,
          },
          timeout: 5000,
        }
      );

      const nft = response.data?.nft;
      
      // Check for current listing
      if (nft?.listing?.current_price) {
        const priceInWei = BigInt(nft.listing.current_price);
        const priceInEth = Number(priceInWei) / 1e18;
        
        return {
          value: priceInEth.toFixed(4),
          currency: 'ETH',
          marketplace: 'OpenSea',
          isRealPrice: true,
        };
      }

      // Check collection floor price
      if (nft?.collection?.floor_price) {
        return {
          value: nft.collection.floor_price.toString(),
          currency: 'ETH',
          marketplace: 'OpenSea (Floor)',
          isRealPrice: true,
        };
      }

      return null;
    } catch (error) {
      console.error('OpenSea V2 API error:', error);
      return null;
    }
  }

  // 6. Direct contract read for on-chain prices (for specific marketplace contracts)
  static async getOnChainPrice(
    contractAddress: string,
    tokenId: string
  ): Promise<MarketplacePrice | null> {
    try {
      // This would require reading from specific marketplace contracts
      // For Foundation, Zora, etc. that store prices on-chain
      
      // Example for Foundation (would need actual contract ABI)
      const foundationMarketplace = '0xcda72070e455bb31c7690a170224ce43623d0b6f';
      
      // You would need to use viem or ethers to read the contract
      // This is a placeholder for the actual implementation
      
      return null;
    } catch (error) {
      return null;
    }
  }

  // Generate estimated price as fallback
  private static generateEstimatedPrice(
    contractAddress: string,
    tokenId: string
  ): MarketplacePrice {
    const address = contractAddress.toLowerCase();
    
    // Platform-specific price ranges
    let min = 0.01;
    let max = 0.1;
    
    if (address.includes('972f31d4e140f0d09b154bb395a070ed5ee9fcca')) {
      // Foundation tends to be higher
      min = 0.05;
      max = 0.3;
    } else if (address.includes('58fd65a42d33f080543b5f98a1cfa9fbce9fbb4a')) {
      // juujuumama
      min = 0.02;
      max = 0.15;
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

  // Check if an NFT is listed for sale (simplified)
  static async isListedForSale(
    contractAddress: string,
    tokenId: string
  ): Promise<boolean> {
    const price = await this.getBestPrice(contractAddress, tokenId);
    return price.isRealPrice;
  }

  // Get collection stats including floor price
  static async getCollectionStats(contractAddress: string): Promise<any> {
    try {
      // Try Reservoir for collection stats
      const response = await axios.get(
        `https://api-base.reservoir.tools/collections/v7`,
        {
          params: {
            contract: contractAddress,
          },
          headers: {
            'accept': 'application/json',
          },
          timeout: 5000,
        }
      );

      const collection = response.data?.collections?.[0];
      
      if (collection) {
        return {
          floorPrice: collection.floorAsk?.price?.amount?.decimal || null,
          volume24h: collection.volume?.['24h'] || 0,
          volumeAll: collection.volume?.allTime || 0,
          tokenCount: collection.tokenCount || 0,
          onSaleCount: collection.onSaleCount || 0,
        };
      }

      return null;
    } catch (error) {
      console.error('Collection stats error:', error);
      return null;
    }
  }
}
