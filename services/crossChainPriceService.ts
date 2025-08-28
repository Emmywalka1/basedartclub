// services/crossChainPriceService.ts
// Service to check prices across multiple chains (Base + Ethereum mainnet)

import axios from 'axios';

interface CrossChainPrice {
  value: string;
  currency: string;
  marketplace: string;
  chain: 'base' | 'ethereum';
  isRealPrice: boolean;
}

export class CrossChainPriceService {
  private static ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
  
  // Check both Base and Ethereum for the best price
  static async getBestPrice(
    contractAddress: string,
    tokenId: string
  ): Promise<CrossChainPrice | null> {
    console.log(`🔍 Checking cross-chain prices for ${contractAddress}/${tokenId}`);
    
    // Check both chains in parallel
    const [basePrice, mainnetPrice] = await Promise.all([
      this.checkBasePrice(contractAddress, tokenId),
      this.checkMainnetPrice(contractAddress, tokenId)
    ]);
    
    // Prefer mainnet price for Foundation contracts
    if (this.isFoundationContract(contractAddress) && mainnetPrice) {
      console.log(`✅ Found Foundation price on mainnet: ${mainnetPrice.value} ETH`);
      return mainnetPrice;
    }
    
    // Return whichever has a real price
    return mainnetPrice || basePrice;
  }
  
  // Check Base chain for prices
  private static async checkBasePrice(
    contractAddress: string,
    tokenId: string
  ): Promise<CrossChainPrice | null> {
    try {
      // 1. Try Reservoir on Base
      const reservoirResponse = await axios.get(
        `https://api-base.reservoir.tools/tokens/v7`,
        {
          params: {
            tokens: `${contractAddress}:${tokenId}`,
            includeTopBid: true,
            includeAttributes: false,
          },
          headers: { 'accept': 'application/json' },
          timeout: 5000,
        }
      );

      const token = reservoirResponse.data?.tokens?.[0];
      if (token?.market?.floorAsk?.price?.amount?.decimal) {
        return {
          value: token.market.floorAsk.price.amount.decimal.toString(),
          currency: 'ETH',
          marketplace: token.market.floorAsk.source?.name || 'Base Market',
          chain: 'base',
          isRealPrice: true,
        };
      }
    } catch (error) {
      console.log('Base Reservoir check failed');
    }
    
    return null;
  }
  
  // Check Ethereum mainnet for prices (Foundation, OpenSea mainnet, etc.)
  private static async checkMainnetPrice(
    contractAddress: string,
    tokenId: string
  ): Promise<CrossChainPrice | null> {
    try {
      // 1. Check Foundation Graph on mainnet
      const foundationPrice = await this.checkFoundationGraph(contractAddress, tokenId);
      if (foundationPrice) return foundationPrice;
      
      // 2. Check Reservoir on mainnet
      const mainnetReservoirPrice = await this.checkMainnetReservoir(contractAddress, tokenId);
      if (mainnetReservoirPrice) return mainnetReservoirPrice;
      
      // 3. Check Foundation API directly
      const foundationAPIPrice = await this.checkFoundationAPI(contractAddress, tokenId);
      if (foundationAPIPrice) return foundationAPIPrice;
      
    } catch (error) {
      console.log('Mainnet price check failed');
    }
    
    return null;
  }
  
  // Check Foundation's Graph Protocol on mainnet
  private static async checkFoundationGraph(
    contractAddress: string,
    tokenId: string
  ): Promise<CrossChainPrice | null> {
    try {
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
        }
      `;

      const response = await axios.post(
        'https://api.thegraph.com/subgraphs/name/foundation-app/foundation',
        {
          query,
          variables: {
            contractAddress: contractAddress.toLowerCase(),
            tokenId: tokenId
          }
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000,
        }
      );

      const data = response.data?.data;
      
      // Check for active auction
      if (data?.nftMarketAuctions?.length > 0) {
        const auction = data.nftMarketAuctions[0];
        const priceWei = auction.highestBid || auction.reservePrice;
        const priceNum = parseFloat(priceWei) / Math.pow(10, 18);
        
        return {
          value: priceNum.toFixed(4),
          currency: 'ETH',
          marketplace: 'Foundation',
          chain: 'ethereum',
          isRealPrice: true,
        };
      }

      // Check for buy now price
      if (data?.nftMarketBuyPrices?.length > 0) {
        const listing = data.nftMarketBuyPrices[0];
        const priceNum = parseFloat(listing.price) / Math.pow(10, 18);
        
        return {
          value: priceNum.toFixed(4),
          currency: 'ETH',
          marketplace: 'Foundation',
          chain: 'ethereum',
          isRealPrice: true,
        };
      }

      return null;
    } catch (error) {
      console.log('Foundation Graph check failed');
      return null;
    }
  }
  
  // Check Foundation API directly
  private static async checkFoundationAPI(
    contractAddress: string,
    tokenId: string
  ): Promise<CrossChainPrice | null> {
    try {
      const response = await axios.get(
        `https://api.foundation.app/v1/artworks/${contractAddress}/${tokenId}`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0',
          },
          timeout: 5000,
        }
      );

      const artwork = response.data;
      
      if (artwork?.market?.status === 'active') {
        const price = artwork.market.buyNowPrice || artwork.market.reservePrice;
        if (price) {
          return {
            value: (parseFloat(price) / 1e18).toFixed(4),
            currency: 'ETH',
            marketplace: 'Foundation',
            chain: 'ethereum',
            isRealPrice: true,
          };
        }
      }

      if (artwork?.auction?.status === 'active') {
        const price = artwork.auction.currentBid || artwork.auction.reservePrice;
        if (price) {
          return {
            value: (parseFloat(price) / 1e18).toFixed(4),
            currency: 'ETH',
            marketplace: 'Foundation Auction',
            chain: 'ethereum',
            isRealPrice: true,
          };
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }
  
  // Check Reservoir on mainnet
  private static async checkMainnetReservoir(
    contractAddress: string,
    tokenId: string
  ): Promise<CrossChainPrice | null> {
    try {
      const response = await axios.get(
        `https://api.reservoir.tools/tokens/v7`, // Note: no "-base" in URL for mainnet
        {
          params: {
            tokens: `${contractAddress}:${tokenId}`,
            includeTopBid: true,
            includeAttributes: false,
          },
          headers: { 'accept': 'application/json' },
          timeout: 5000,
        }
      );

      const token = response.data?.tokens?.[0];
      if (token?.market?.floorAsk?.price?.amount?.decimal) {
        return {
          value: token.market.floorAsk.price.amount.decimal.toString(),
          currency: 'ETH',
          marketplace: token.market.floorAsk.source?.name || 'Ethereum Market',
          chain: 'ethereum',
          isRealPrice: true,
        };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }
  
  // Check if this is a known Foundation contract
  private static isFoundationContract(contractAddress: string): boolean {
    const address = contractAddress.toLowerCase();
    const foundationContracts = [
      '0x972f31d4e140f0d09b154bb395a070ed5ee9fcca', // emmywalka
      '0x3b3ee1931dc30c1957379fac9aba94d1c48a5405', // Foundation main
      // Add other Foundation contracts
    ];
    
    return foundationContracts.some(fc => address.includes(fc));
  }
  
  // Get artist name from Foundation metadata
  static async getArtistFromFoundation(contractAddress: string, tokenId: string): Promise<string | null> {
    try {
      // Try Foundation API
      const response = await axios.get(
        `https://api.foundation.app/v1/artworks/${contractAddress}/${tokenId}`,
        {
          headers: { 'Accept': 'application/json' },
          timeout: 5000,
        }
      );

      if (response.data?.creator?.username) {
        return response.data.creator.username;
      }
      
      if (response.data?.artist?.name) {
        return response.data.artist.name;
      }
      
      // Try getting from NFT metadata
      const alchemyResponse = await axios.get(
        `https://eth-mainnet.g.alchemy.com/nft/v3/${this.ALCHEMY_API_KEY}/getNFTMetadata`,
        {
          params: {
            contractAddress: contractAddress,
            tokenId: tokenId,
          },
          timeout: 5000,
        }
      );
      
      const metadata = alchemyResponse.data?.metadata;
      if (metadata?.artist || metadata?.creator) {
        return metadata.artist || metadata.creator;
      }
      
    } catch (error) {
      console.log('Could not fetch artist from Foundation');
    }
    
    return null;
  }
}
