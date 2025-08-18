// services/foundationPriceService.ts
// Service to fetch real Foundation prices using The Graph and IPFS

import axios from 'axios';

interface FoundationPrice {
  value: string;
  currency: string;
  marketplace: string;
  isRealPrice: boolean;
  seller?: string;
  auctionType?: string;
}

export class FoundationPriceService {
  // Foundation's Graph endpoints
  private static FOUNDATION_GRAPH_MAINNET = 'https://api.thegraph.com/subgraphs/name/foundation-app/foundation';
  private static FOUNDATION_GRAPH_BASE = 'https://api.thegraph.com/subgraphs/name/foundation-app/foundation-base'; // If exists
  
  // IPFS gateways
  private static IPFS_GATEWAYS = [
    'https://ipfs.io/ipfs/',
    'https://gateway.pinata.cloud/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://gateway.ipfs.io/ipfs/',
  ];

  // Main method to get Foundation price
  static async getFoundationPrice(
    contractAddress: string,
    tokenId: string
  ): Promise<FoundationPrice | null> {
    console.log(`🎨 Checking Foundation for ${contractAddress}/${tokenId}`);
    
    // Try multiple methods in parallel
    const pricePromises = [
      this.getFoundationGraphPrice(contractAddress, tokenId),
      this.getFoundationAPIPrice(contractAddress, tokenId),
      this.getIPFSMetadataPrice(contractAddress, tokenId),
      this.getFoundationMarketContract(contractAddress, tokenId),
    ];

    const results = await Promise.allSettled(pricePromises);
    
    // Return first successful result
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value && result.value.isRealPrice) {
        console.log(`✅ Found Foundation price: ${result.value.value} ${result.value.currency}`);
        return result.value;
      }
    }
    
    return null;
  }

  // 1. Query Foundation's Graph Protocol
  private static async getFoundationGraphPrice(
    contractAddress: string,
    tokenId: string
  ): Promise<FoundationPrice | null> {
    try {
      // Query for active auctions and buy now prices
      const query = `
        query GetNFTPrice($contractAddress: String!, $tokenId: String!) {
          nftMarketAuctions(
            where: {
              nftContract: $contractAddress,
              tokenId: $tokenId,
              status: "Open"
            }
          ) {
            id
            reservePrice
            highestBid
            seller
            auctionType
            status
            dateEnding
          }
          
          nftMarketBuyPrices(
            where: {
              nftContract: $contractAddress,
              tokenId: $tokenId,
              status: "Open"
            }
          ) {
            id
            price
            seller
            status
          }
          
          nftMarketOffers(
            where: {
              nftContract: $contractAddress,
              tokenId: $tokenId,
              status: "Open"
            }
            orderBy: amount
            orderDirection: desc
            first: 1
          ) {
            id
            amount
            buyer
            status
          }
        }
      `;

      // Try mainnet first
      const response = await axios.post(
        this.FOUNDATION_GRAPH_MAINNET,
        {
          query,
          variables: {
            contractAddress: contractAddress.toLowerCase(),
            tokenId: tokenId
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      const data = response.data?.data;
      
      // Check for active auction
      if (data?.nftMarketAuctions?.length > 0) {
        const auction = data.nftMarketAuctions[0];
        const priceInEth = (BigInt(auction.highestBid || auction.reservePrice) / BigInt(10 ** 18)).toString();
        
        return {
          value: parseFloat(priceInEth).toFixed(4),
          currency: 'ETH',
          marketplace: 'Foundation Auction',
          isRealPrice: true,
          seller: auction.seller,
          auctionType: auction.auctionType,
        };
      }

      // Check for buy now price
      if (data?.nftMarketBuyPrices?.length > 0) {
        const listing = data.nftMarketBuyPrices[0];
        const priceInEth = (BigInt(listing.price) / BigInt(10 ** 18)).toString();
        
        return {
          value: parseFloat(priceInEth).toFixed(4),
          currency: 'ETH',
          marketplace: 'Foundation Buy Now',
          isRealPrice: true,
          seller: listing.seller,
        };
      }

      // Check for offers
      if (data?.nftMarketOffers?.length > 0) {
        const offer = data.nftMarketOffers[0];
        const priceInEth = (BigInt(offer.amount) / BigInt(10 ** 18)).toString();
        
        return {
          value: parseFloat(priceInEth).toFixed(4),
          currency: 'ETH',
          marketplace: 'Foundation Offer',
          isRealPrice: true,
        };
      }

      return null;
    } catch (error) {
      console.error('Foundation Graph error:', error);
      
      // Try Base subgraph if mainnet fails
      try {
        const response = await axios.post(
          this.FOUNDATION_GRAPH_BASE,
          {
            query: `
              query {
                nfts(where: {tokenId: "${tokenId}", contract: "${contractAddress.toLowerCase()}"}) {
                  id
                  activeMarket {
                    reservePrice
                    status
                  }
                }
              }
            `
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000,
          }
        );

        const nft = response.data?.data?.nfts?.[0];
        if (nft?.activeMarket?.reservePrice) {
          const priceInEth = (BigInt(nft.activeMarket.reservePrice) / BigInt(10 ** 18)).toString();
          return {
            value: parseFloat(priceInEth).toFixed(4),
            currency: 'ETH',
            marketplace: 'Foundation Base',
            isRealPrice: true,
          };
        }
      } catch (baseError) {
        // Base subgraph might not exist
      }
      
      return null;
    }
  }

  // 2. Direct Foundation API call
  private static async getFoundationAPIPrice(
    contractAddress: string,
    tokenId: string
  ): Promise<FoundationPrice | null> {
    try {
      // Foundation's REST API endpoint
      const response = await axios.get(
        `https://api.foundation.app/v1/artworks/${contractAddress}/${tokenId}`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0', // Sometimes needed
          },
          timeout: 10000,
        }
      );

      const artwork = response.data;
      
      // Check for active listing
      if (artwork?.market?.status === 'active') {
        const price = artwork.market.buyNowPrice || artwork.market.reservePrice;
        if (price) {
          return {
            value: (parseFloat(price) / 1e18).toFixed(4),
            currency: 'ETH',
            marketplace: 'Foundation',
            isRealPrice: true,
            seller: artwork.market.seller,
          };
        }
      }

      // Check current auction
      if (artwork?.auction?.status === 'active') {
        const price = artwork.auction.currentBid || artwork.auction.reservePrice;
        if (price) {
          return {
            value: (parseFloat(price) / 1e18).toFixed(4),
            currency: 'ETH',
            marketplace: 'Foundation Auction',
            isRealPrice: true,
            seller: artwork.auction.seller,
          };
        }
      }

      return null;
    } catch (error) {
      // API might be restricted or changed
      return null;
    }
  }

  // 3. Get price from IPFS metadata
  private static async getIPFSMetadataPrice(
    contractAddress: string,
    tokenId: string
  ): Promise<FoundationPrice | null> {
    try {
      // First, get the token URI from the contract
      const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
      
      const metadataResponse = await axios.get(
        `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTMetadata`,
        {
          params: {
            contractAddress,
            tokenId,
            refreshCache: true,
          },
          timeout: 10000,
        }
      );

      const tokenURI = metadataResponse.data?.tokenUri?.gateway || 
                      metadataResponse.data?.tokenUri?.raw;
      
      if (!tokenURI) return null;

      // If it's an IPFS URI, fetch from IPFS
      let metadataUrl = tokenURI;
      
      if (tokenURI.startsWith('ipfs://')) {
        const ipfsHash = tokenURI.replace('ipfs://', '');
        
        // Try multiple IPFS gateways
        for (const gateway of this.IPFS_GATEWAYS) {
          try {
            metadataUrl = gateway + ipfsHash;
            const ipfsResponse = await axios.get(metadataUrl, {
              timeout: 5000,
            });
            
            const metadata = ipfsResponse.data;
            
            // Check for price in metadata
            if (metadata.price || metadata.listing_price || metadata.sale_price) {
              const price = metadata.price || metadata.listing_price || metadata.sale_price;
              
              // Handle different price formats
              let ethPrice: string;
              if (typeof price === 'object' && price.amount) {
                ethPrice = (parseFloat(price.amount) / 1e18).toFixed(4);
              } else if (typeof price === 'string' && price.includes('ETH')) {
                ethPrice = price.replace(/[^0-9.]/g, '');
              } else if (typeof price === 'number') {
                // Assume wei if very large number
                ethPrice = price > 1000 ? (price / 1e18).toFixed(4) : price.toFixed(4);
              } else {
                ethPrice = price.toString();
              }
              
              return {
                value: ethPrice,
                currency: 'ETH',
                marketplace: 'IPFS Metadata',
                isRealPrice: true,
              };
            }
            
            // Check Foundation-specific fields
            if (metadata.foundation_price || metadata.foundation_auction) {
              const foundationData = metadata.foundation_price || metadata.foundation_auction;
              return {
                value: (parseFloat(foundationData.price || foundationData.reservePrice) / 1e18).toFixed(4),
                currency: 'ETH',
                marketplace: 'Foundation (IPFS)',
                isRealPrice: true,
              };
            }
            
            break; // Success, don't try other gateways
            
          } catch (ipfsError) {
            console.log(`IPFS gateway ${gateway} failed, trying next...`);
            continue;
          }
        }
      } else {
        // Direct HTTP metadata
        const response = await axios.get(metadataUrl, {
          timeout: 5000,
        });
        
        const metadata = response.data;
        
        // Check for embedded price data
        if (metadata.market_data || metadata.listing_data) {
          const marketData = metadata.market_data || metadata.listing_data;
          if (marketData.price) {
            return {
              value: (parseFloat(marketData.price) / 1e18).toFixed(4),
              currency: marketData.currency || 'ETH',
              marketplace: 'Metadata',
              isRealPrice: true,
            };
          }
        }
      }

      return null;
    } catch (error) {
      console.error('IPFS metadata error:', error);
      return null;
    }
  }

  // 4. Query Foundation's market contract directly
  private static async getFoundationMarketContract(
    contractAddress: string,
    tokenId: string
  ): Promise<FoundationPrice | null> {
    try {
      // Foundation market contracts
      const FOUNDATION_MARKET_V1 = '0xcDA72070E455bb31C7690a170224Ce43623d0B6f';
      const FOUNDATION_MARKET_V2 = '0xa7d94560f2b0E73Eb8E8D2b50bCE40CD2bA1B5a8';
      
      // This would require reading the contract directly
      // We'll use Alchemy's eth_call to read the contract
      const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
      
      // Try to get auction data from the contract
      const auctionDataCall = {
        to: FOUNDATION_MARKET_V1,
        data: `0x${this.encodeGetReserveAuction(contractAddress, tokenId)}`,
      };
      
      const response = await axios.post(
        `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
        {
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [auctionDataCall, 'latest'],
          id: 1,
        },
        {
          timeout: 5000,
        }
      );
      
      if (response.data?.result && response.data.result !== '0x') {
        // Parse the result (would need proper ABI decoding)
        // This is a simplified example
        const result = response.data.result;
        
        // Extract price from the hex result (simplified)
        const priceHex = result.slice(0, 66); // First 32 bytes
        const price = BigInt(priceHex);
        
        if (price > 0n) {
          return {
            value: (Number(price) / 1e18).toFixed(4),
            currency: 'ETH',
            marketplace: 'Foundation Contract',
            isRealPrice: true,
          };
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  // Helper to encode contract call (simplified)
  private static encodeGetReserveAuction(contractAddress: string, tokenId: string): string {
    // Function signature for getReserveAuction(address,uint256)
    const functionSig = 'ee1fe091'; // First 4 bytes of keccak256
    const paddedAddress = contractAddress.toLowerCase().replace('0x', '').padStart(64, '0');
    const paddedTokenId = BigInt(tokenId).toString(16).padStart(64, '0');
    
    return functionSig + paddedAddress + paddedTokenId;
  }

  // Get all Foundation listings for a contract
  static async getAllFoundationListings(contractAddress: string): Promise<any[]> {
    try {
      const query = `
        query GetContractListings($contractAddress: String!) {
          nftMarketAuctions(
            where: {
              nftContract: $contractAddress,
              status: "Open"
            }
          ) {
            tokenId
            reservePrice
            highestBid
            seller
            status
          }
          
          nftMarketBuyPrices(
            where: {
              nftContract: $contractAddress,
              status: "Open"
            }
          ) {
            tokenId
            price
            seller
            status
          }
        }
      `;

      const response = await axios.post(
        this.FOUNDATION_GRAPH_MAINNET,
        {
          query,
          variables: {
            contractAddress: contractAddress.toLowerCase()
          }
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );

      const data = response.data?.data;
      const listings = [];
      
      // Process auctions
      if (data?.nftMarketAuctions) {
        data.nftMarketAuctions.forEach((auction: any) => {
          listings.push({
            tokenId: auction.tokenId,
            price: (BigInt(auction.highestBid || auction.reservePrice) / BigInt(10 ** 18)).toString(),
            type: 'auction',
            seller: auction.seller,
          });
        });
      }
      
      // Process buy now listings
      if (data?.nftMarketBuyPrices) {
        data.nftMarketBuyPrices.forEach((listing: any) => {
          listings.push({
            tokenId: listing.tokenId,
            price: (BigInt(listing.price) / BigInt(10 ** 18)).toString(),
            type: 'buyNow',
            seller: listing.seller,
          });
        });
      }
      
      return listings;
    } catch (error) {
      console.error('Error fetching all Foundation listings:', error);
      return [];
    }
  }
}
