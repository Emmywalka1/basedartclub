// services/nftService.ts
import axios from 'axios';

// Moralis API configuration
const MORALIS_API_KEY = process.env.MORALIS_API_KEY!;
const MORALIS_BASE_URL = 'https://deep-index.moralis.io/api/v2';

// Alchemy configuration
const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY!;
const ALCHEMY_BASE_URL = `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}`;

// Base chain ID
const BASE_CHAIN_ID = '0x2105'; // 8453 in hex

// Marketplace contract addresses on Base
const MARKETPLACE_CONTRACTS = {
  foundation: [
    '0x0e5515aadfe6b074bb4175137683d5dc6093bbc5', // Foundation NFTs
    '0xbc337ca1615c8710ab0e6aac3e5b6800a8cbdf0e',
  ],
  opensea: [
    '0x00000000000000adc04c56bf30ac9d3c0aaf14dc', // Seaport
    '0x068958345ec6b7d1a90c3b4c937e908511e4d5f0',
  ],
  zora: [
    '0x76744367ae5a056381868f716bdf0b13ae1aeaa3', // Zora NFT Factory
    '0x62f426d97e447cf13c29055b79b01918c9f699a7',
    '0x7c74dfe39976dc395529c14e54a597809980e01c',
  ],
  manifold: [
    '0xe4e4003afe3765aca8149a82fc064c0b125b9e5a', // Manifold Creator
    '0x44f9b9f04a24e35b59f35bdddea85a5854b30581',
  ],
};

// Popular Base collections
const BASE_COLLECTIONS = [
  '0x036721e5a681e02a730b05e2b56e9b7189f2a3f8', // Based Ghouls
  '0x4f89bbe2c2c896819f246f3dce8a33f5b1ab4586', // Base Punks
  '0x1538c5c8fbE7c1f0ff63f5b3f59cbad74b41db87', // Base Names
  '0x03c4738ee98ae44591e1a4a4f3cab6641d95dd9a', // Tiny Based Frogs
  '0x7f7f3afc9ea11b8e3b6a89071c94ce3155fb4ccb', // Based Vitalik
  '0xbfc7cae0fad9b346270ae8fde24827d2d779ef07', // Base Day One
  '0xd4416b13d2b3a9abae7acd5d6c2bbdbe25686401', // Base God
  '0x617978b8af11570c2dab7c39163a8bde1d7f5c37', // Base Paint
];

interface NFTAsset {
  tokenId: string;
  tokenType: 'ERC721' | 'ERC1155';
  name?: string;
  description?: string;
  image: {
    cachedUrl?: string;
    thumbnailUrl?: string;
    originalUrl?: string;
  };
  contract: {
    address: string;
    name?: string;
    symbol?: string;
    tokenType: 'ERC721' | 'ERC1155';
  };
  metadata?: any;
  marketplace?: string;
  price?: {
    value: string;
    currency: string;
    usdValue?: number;
  };
  lastSale?: {
    value: string;
    currency: string;
    timestamp: string;
  };
}

export class NFTService {
  // Fetch NFTs using Moralis API
  static async fetchNFTsFromMoralis(limit: number = 20): Promise<NFTAsset[]> {
    try {
      const nfts: NFTAsset[] = [];
      
      // Fetch NFTs from popular Base collections
      for (const contractAddress of BASE_COLLECTIONS.slice(0, 5)) {
        try {
          const response = await axios.get(
            `${MORALIS_BASE_URL}/nft/${contractAddress}`,
            {
              headers: {
                'X-API-Key': MORALIS_API_KEY,
              },
              params: {
                chain: 'base',
                format: 'decimal',
                limit: 10,
                normalizeMetadata: true,
              },
            }
          );

          if (response.data.result) {
            const formattedNFTs = response.data.result.map((nft: any) => 
              this.formatMoralisNFT(nft, contractAddress)
            );
            nfts.push(...formattedNFTs);
          }
        } catch (error) {
          console.error(`Error fetching from collection ${contractAddress}:`, error);
        }
      }

      // Shuffle and limit results
      return this.shuffleArray(nfts).slice(0, limit);
    } catch (error) {
      console.error('Moralis API error:', error);
      return [];
    }
  }

  // Fetch NFTs using Alchemy API
  static async fetchNFTsFromAlchemy(limit: number = 20): Promise<NFTAsset[]> {
    try {
      const nfts: NFTAsset[] = [];
      
      // Fetch from multiple collections
      for (const contractAddress of BASE_COLLECTIONS.slice(0, 5)) {
        try {
          const response = await axios.get(
            `${ALCHEMY_BASE_URL}/getNFTsForContract`,
            {
              params: {
                contractAddress,
                withMetadata: true,
                limit: 10,
              },
            }
          );

          if (response.data.nfts) {
            const formattedNFTs = response.data.nfts.map((nft: any) => 
              this.formatAlchemyNFT(nft)
            );
            nfts.push(...formattedNFTs);
          }
        } catch (error) {
          console.error(`Error fetching from Alchemy for ${contractAddress}:`, error);
        }
      }

      return this.shuffleArray(nfts).slice(0, limit);
    } catch (error) {
      console.error('Alchemy API error:', error);
      return [];
    }
  }

  // Get marketplace info for an NFT
  static async getMarketplaceInfo(contractAddress: string, tokenId: string): Promise<any> {
    try {
      // Check OpenSea
      const openSeaResponse = await axios.get(
        `https://api.opensea.io/api/v2/chain/base/contract/${contractAddress}/nfts/${tokenId}`,
        {
          headers: {
            'X-API-KEY': process.env.OPENSEA_API_KEY || '',
          },
        }
      );

      if (openSeaResponse.data) {
        return {
          marketplace: 'OpenSea',
          listingPrice: openSeaResponse.data.listing_price,
          lastSale: openSeaResponse.data.last_sale,
        };
      }
    } catch (error) {
      console.error('Error fetching marketplace info:', error);
    }

    return null;
  }

  // Format Moralis NFT response
  private static formatMoralisNFT(nft: any, contractAddress: string): NFTAsset {
    const metadata = nft.normalized_metadata || nft.metadata || {};
    const marketplace = this.identifyMarketplace(contractAddress);

    return {
      tokenId: nft.token_id,
      tokenType: nft.contract_type || 'ERC721',
      name: metadata.name || nft.name || `Token #${nft.token_id}`,
      description: metadata.description || '',
      image: {
        cachedUrl: metadata.image || metadata.image_url,
        thumbnailUrl: metadata.image || metadata.image_url,
        originalUrl: metadata.image || metadata.image_url,
      },
      contract: {
        address: contractAddress,
        name: nft.name || 'Unknown Collection',
        symbol: nft.symbol || '',
        tokenType: nft.contract_type || 'ERC721',
      },
      metadata,
      marketplace,
      price: nft.amount ? {
        value: nft.amount,
        currency: 'ETH',
      } : undefined,
    };
  }

  // Format Alchemy NFT response
  private static formatAlchemyNFT(nft: any): NFTAsset {
    const marketplace = this.identifyMarketplace(nft.contract.address);

    return {
      tokenId: nft.tokenId,
      tokenType: nft.tokenType || 'ERC721',
      name: nft.name || nft.title || `Token #${nft.tokenId}`,
      description: nft.description || '',
      image: {
        cachedUrl: nft.image?.cachedUrl || nft.media?.[0]?.gateway,
        thumbnailUrl: nft.image?.thumbnailUrl || nft.media?.[0]?.thumbnail,
        originalUrl: nft.image?.originalUrl || nft.media?.[0]?.raw,
      },
      contract: {
        address: nft.contract.address,
        name: nft.contract.name || 'Unknown Collection',
        symbol: nft.contract.symbol || '',
        tokenType: nft.tokenType || 'ERC721',
      },
      metadata: nft.raw?.metadata || {},
      marketplace,
    };
  }

  // Identify marketplace based on contract or collection
  private static identifyMarketplace(contractAddress: string): string {
    const address = contractAddress.toLowerCase();
    
    for (const [marketplace, contracts] of Object.entries(MARKETPLACE_CONTRACTS)) {
      if (contracts.some(contract => contract.toLowerCase() === address)) {
        return marketplace.charAt(0).toUpperCase() + marketplace.slice(1);
      }
    }

    // Default marketplaces for known collections
    if (BASE_COLLECTIONS.includes(address)) {
      const marketplaces = ['OpenSea', 'Foundation', 'Zora', 'Manifold'];
      return marketplaces[Math.floor(Math.random() * marketplaces.length)];
    }

    return 'OpenSea'; // Default
  }

  // Utility function to shuffle array
  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Combined fetch from both APIs
  static async fetchCuratedNFTs(limit: number = 20): Promise<NFTAsset[]> {
    try {
      // Try Moralis first
      let nfts = await this.fetchNFTsFromMoralis(limit);
      
      // If Moralis doesn't return enough, try Alchemy
      if (nfts.length < limit) {
        const alchemyNFTs = await this.fetchNFTsFromAlchemy(limit - nfts.length);
        nfts = [...nfts, ...alchemyNFTs];
      }

      // Add mock pricing for demo (in production, fetch real prices)
      return nfts.map(nft => ({
        ...nft,
        price: nft.price || {
          value: (Math.random() * 0.5 + 0.05).toFixed(3),
          currency: 'ETH',
        },
      }));
    } catch (error) {
      console.error('Error fetching curated NFTs:', error);
      return [];
    }
  }
}
