// services/marketplacePriceService.ts
// Enhanced service for fetching REAL marketplace prices for 1/1 art

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
  private static RESERVOIR_API_KEY = process.env.RESERVOIR_API_KEY; // Optional but gives better rate limits
  
  // Main method to get the best available price for 1/1 art
  static async getBestPrice(
    contractAddress: string, 
    tokenId: string
  ): Promise<MarketplacePrice> {
    console.log(`💰 Fetching real price for ${contractAddress}/${tokenId}`);
    
    // Try multiple sources in parallel, focusing on individual token listings
    const pricePromises = [
      this.getReservoirTokenPrice(contractAddress, tokenId), // Best for individual tokens
      this.getFoundationPrice(contractAddress, tokenId), // Direct Foundation API
      this.getNFTXPrice(contractAddress, tokenId), // NFTX liquidity pools
      this.getAlchemyTokenPrice(contractAddress, tokenId), // Alchemy's token-specific data
      this.getZoraPrice(contractAddress, tokenId), // Zora protocol
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
            // Add API key if you have one for better rate limits
            ...(process.env.RESERVOIR_API_KEY && {
              'x-api-key': process.env.RESERVOIR_API_KEY
            })
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

  // 2. Foundation-specific API
  private static async getFoundationPrice(
    contractAddress: string,
    tokenId: string
  ): Promise<MarketplacePrice | null> {
    try {
      // Foundation uses GraphQL, but we can try their REST endpoints
      // Foundation contract on Base: 0x972f31D4E140F0d09b154Bb395a070ED5ee9fccA
      
      // Try Foundation's API (they may have moved to a GraphQL-only system)
      const response = await axios.post(
        'https://api.thegraph.com/subgraphs/name/f8n/fnd',
        {
          query: `
            query GetNFT($contractAddress: String!, $tokenId: String!) {
              nft(id: "${contractAddress.toLowerCase()}-${tokenId}") {
                id
                tokenId
                activeOffer {
                  amount
                  buyer {
                    id
                  }
                }
                currentAuction {
                  reservePrice
                  currentBid
                  seller {
                    id
                  }
                }
                lastSalePrice
              }
            }
          `,
          variables: {
            contractAddress: contractAddress.toLowerCase(),
            tokenId: tokenId
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        }
      );

      const nft = response.data?.data?.nft;
      
      if (nft?.currentAuction?.reservePrice) {
        // Convert from wei to ETH
        const priceInEth = (parseInt(nft.currentAuction.reservePrice) / 1e18).toFixed(4);
        return {
          value: priceInEth,
          currency: 'ETH',
          marketplace: 'Foundation',
          isRealPrice: true,
        };
      }

      if (nft?.activeOffer?.amount) {
        const priceInEth = (parseInt(nft.activeOffer.amount) / 1e18).toFixed(4);
        return {
          value: priceInEth,
          currency: 'ETH',
          marketplace: 'Foundation (Offer)',
          isRealPrice: true,
        };
      }

      return null;
    } catch (error) {
      // Foundation API might not be available or might need authentication
      return null;
    }
  }

  // 3. Zora Protocol API
  private static async getZoraPrice(
    contractAddress: string,
    tokenId: string
  ): Promise<MarketplacePrice | null> {
    try {
      // Zora's new API for Base
      const response = await axios.get(
        `https://api.zora.co/discover/tokens/base/${contractAddress}/${tokenId}`,
        {
          headers: {
            'Accept': 'application/json',
          },
          timeout: 5000,
        }
      );

      const token = response.data?.token;
      
      // Check for active market
      if (token?.marketsSummary?.primaryAsk?.price) {
        return {
          value: token.marketsSummary.primaryAsk.price.toString(),
          currency: 'ETH',
          marketplace: 'Zora',
          isRealPrice: true,
        };
      }

      // Check for auction
      if (token?.auction?.current?.price) {
        return {
          value: token.auction.current.price.toString(),
          currency: 'ETH',
          marketplace: 'Zora Auction',
          isRealPrice: true,
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  // 4. NFTX - Liquidity pools for NFTs
  private static async getNFTXPrice(
    contractAddress: string,
    tokenId: string
  ): Promise<MarketplacePrice | null> {
    try {
      // NFTX provides instant liquidity for NFTs
      const response = await axios.get(
        `https://api.nftx.io/v2/base/tokens/${contractAddress}/${tokenId}`,
        {
          timeout: 5000,
        }
      );

      if (response.data?.price) {
        return {
          value: response.data.price.toString(),
          currency: 'ETH',
          marketplace: 'NFTX',
          isRealPrice: true,
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  // 5. Alchemy NFT API - Enhanced token-specific endpoint
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

  // 6. OpenSea V2 API - Token-specific endpoint
  private static async getOpenSeaTokenPrice(
    contractAddress: string,
    tokenId: string
  ): Promise<MarketplacePrice | null> {
    if (!this.OPENSEA_API_KEY) return null;

    try {
      // OpenSea's NFT-specific endpoint
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

  // 7. Check multiple aggregators for better coverage
  static async getAggregatedPrice(
    contractAddress: string,
    tokenId: string
  ): Promise<MarketplacePrice | null> {
    try {
      // Try Gem.xyz API (now part of OpenSea)
      const gemResponse = await axios.get(
        `https://api.gem.xyz/tokens/base/${contractAddress}/${tokenId}`,
        {
          headers: {
            'accept': 'application/json',
          },
          timeout: 5000,
        }
      );

      if (gemResponse.data?.price) {
        return {
          value: gemResponse.data.price.toString(),
          currency: 'ETH',
          marketplace: 'Gem',
          isRealPrice: true,
        };
      }
    } catch (error) {
      // Gem might not support Base yet
    }

    return null;
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
    
    if (address.includes('972f31d4e140f0d09b154bb395a070ed5ee9fcca')) {
      // Foundation tends to be higher for 1/1s
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

  // Get all active listings for a specific token
  static async getAllListings(
    contractAddress: string,
    tokenId: string
  ): Promise<any[]> {
    try {
      // Get all orders from Reservoir
      const response = await axios.get(
        `https://api-base.reservoir.tools/orders/asks/v5`,
        {
          params: {
            token: `${contractAddress}:${tokenId}`,
            status: 'active',
            includePrivate: false,
          },
          headers: {
            'accept': 'application/json',
          },
          timeout: 5000,
        }
      );

      return response.data?.orders || [];
    } catch (error) {
      console.error('Error fetching all listings:', error);
      return [];
    }
  }
}
