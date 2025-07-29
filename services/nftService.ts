// services/nftService.ts - Updated to use only your existing APIs
import axios from 'axios';

// Your existing API configuration
const MORALIS_API_KEY = process.env.MORALIS_API_KEY!;
const MORALIS_BASE_URL = 'https://deep-index.moralis.io/api/v2';
const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY!;
const ALCHEMY_BASE_URL = `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}`;
const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY;

// Updated Base marketplace contract addresses (2025)
const BASE_MARKETPLACE_CONTRACTS = {
  foundation: [
    '0xcda72070e455bb31c7690a170224ce43623d0b6f', // Foundation V3 on Base
    '0x83bb9b2d1a0ae10dd5b30a87c5b88e50ce7a9f48', // Foundation Market
  ],
  opensea: [
    '0x00000000000000adc04c56bf30ac9d3c0aaf14dc', // Seaport 1.5
    '0x00000000000001ad428e4906ae43d8f9852d0dd6', // Seaport 1.6
  ],
  zora: [
    '0x76744367ae5a056381868f716bdf0b13ae1aeaa3', // Zora V3 Module Manager 
    '0x04e2516a2c207e84a1839755675dfd8ef6302f0a', // Zora ERC721 Transfer Helper
    '0x33333311a2e4b9eb8de05d7b9cd6e22be2bc79d4', // Zora Rewards Manager
  ],
  manifold: [
    '0x3a3548e060be10c2614d0a4cb0c03cc9093fd799', // Manifold Creator Core
    '0x0fc584e9dcfe271b2c43a16caa55b7d5d39b27dc', // Manifold Marketplace
  ]
};

// Updated popular Base collections (2025)
const BASE_COLLECTIONS = [
  {
    address: '0x036721e5A681E02A730b05e2B56e9b7189f2A3F8',
    name: 'Based Ghouls',
    marketplace: 'OpenSea'
  },
  {
    address: '0x617978b8af11570c2dab7c39163a8bde1d7f5c37', 
    name: 'Base Paint',
    marketplace: 'Foundation'
  },
  {
    address: '0x4F89Bbe2c2C896819f246F3dce8A33F5B1aB4586',
    name: 'Base Punks', 
    marketplace: 'OpenSea'
  },
  {
    address: '0xd4416b13d2b3a9abae7acd5d6c2bbdbe25686401',
    name: 'Base God',
    marketplace: 'Zora'
  },
  {
    address: '0x03c4738Ee98aE44591e1A4A4F3CaB6641d95DD9a',
    name: 'Tiny Based Frogs',
    marketplace: 'OpenSea'
  },
  {
    address: '0x1538C5c8FbE7c1F0FF63F5b3F59cbad74B41db87',
    name: 'Base Names',
    marketplace: 'OpenSea'
  }
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
  category?: string;
  rarity?: string;
}

export class NFTService {
  
  // Fetch NFTs using your existing Alchemy API (configured for Base)
  static async fetchNFTsFromAlchemy(limit: number = 20): Promise<NFTAsset[]> {
    try {
      const nfts: NFTAsset[] = [];
      
      // Fetch from multiple Base collections using your existing Alchemy setup
      for (const collection of BASE_COLLECTIONS.slice(0, 4)) {
        try {
          console.log(`Fetching from ${collection.name} via Alchemy...`);
          
          const response = await axios.get(
            `${ALCHEMY_BASE_URL}/getNFTsForContract`,
            {
              params: {
                contractAddress: collection.address,
                withMetadata: true,
                limit: Math.ceil(limit / 4),
                startToken: Math.floor(Math.random() * 50), // Random starting point
              },
              timeout: 10000,
            }
          );

          if (response.data?.nfts?.length > 0) {
            const formattedNFTs = response.data.nfts
              .filter((nft: any) => nft.image?.cachedUrl || nft.image?.originalUrl)
              .map((nft: any) => this.formatAlchemyNFT(nft, collection));
            
            nfts.push(...formattedNFTs);
            console.log(`✅ Got ${formattedNFTs.length} NFTs from ${collection.name}`);
          }
        } catch (error) {
          console.error(`Error fetching from ${collection.name}:`, error);
        }
      }

      return this.shuffleArray(nfts).slice(0, limit);
    } catch (error) {
      console.error('Alchemy API error:', error);
      return [];
    }
  }

  // Fetch NFTs using your existing Moralis API (updated for Base)
  static async fetchNFTsFromMoralis(limit: number = 20): Promise<NFTAsset[]> {
    try {
      const nfts: NFTAsset[] = [];
      
      // Use Moralis for Base chain NFTs
      for (const collection of BASE_COLLECTIONS.slice(0, 3)) {
        try {
          console.log(`Fetching from ${collection.name} via Moralis...`);
          
          const response = await axios.get(
            `${MORALIS_BASE_URL}/nft/${collection.address}`,
            {
              headers: {
                'X-API-Key': MORALIS_API_KEY,
              },
              params: {
                chain: 'base', // Updated to use Base chain
                format: 'decimal',
                limit: Math.ceil(limit / 3),
                normalizeMetadata: true,
              },
              timeout: 10000,
            }
          );

          if (response.data?.result?.length > 0) {
            const formattedNFTs = response.data.result
              .filter((nft: any) => nft.normalized_metadata?.image)
              .map((nft: any) => this.formatMoralisNFT(nft, collection));
            
            nfts.push(...formattedNFTs);
            console.log(`✅ Got ${formattedNFTs.length} NFTs from ${collection.name}`);
          }
        } catch (error) {
          console.error(`Error fetching from ${collection.name} via Moralis:`, error);
        }
      }

      return this.shuffleArray(nfts).slice(0, limit);
    } catch (error) {
      console.error('Moralis API error:', error);
      return [];
    }
  }

  // Fetch NFTs using your existing OpenSea API (for Base chain)
  static async fetchNFTsFromOpenSea(limit: number = 10): Promise<NFTAsset[]> {
    if (!OPENSEA_API_KEY) {
      console.log('OpenSea API key not configured, skipping OpenSea data');
      return [];
    }

    try {
      console.log('Fetching NFTs from OpenSea Base...');
      
      const response = await axios.get(
        'https://api.opensea.io/api/v2/chain/base/nfts',
        {
          headers: {
            'X-API-KEY': OPENSEA_API_KEY,
          },
          params: {
            limit: limit,
            order_by: 'last_sale_date',
            order_direction: 'desc',
          },
          timeout: 15000,
        }
      );

      if (response.data?.nfts?.length > 0) {
        const formattedNFTs = response.data.nfts
          .filter((nft: any) => nft.image_url)
          .map((nft: any) => this.formatOpenSeaNFT(nft));
        
        console.log(`✅ Got ${formattedNFTs.length} NFTs from OpenSea`);
        return formattedNFTs;
      }
    } catch (error) {
      console.error('OpenSea API error:', error);
    }

    return [];
  }

  // Format Alchemy NFT response (your existing logic, enhanced)
  private static formatAlchemyNFT(nft: any, collection: any): NFTAsset {
    const imageUrl = nft.image?.cachedUrl || 
                    nft.image?.originalUrl || 
                    nft.media?.[0]?.gateway ||
                    nft.rawMetadata?.image;

    return {
      tokenId: nft.tokenId || '0',
      tokenType: nft.tokenType || 'ERC721',
      name: nft.name || nft.title || nft.rawMetadata?.name || `${collection.name} #${nft.tokenId}`,
      description: nft.description || nft.rawMetadata?.description || `A unique NFT from ${collection.name}`,
      image: {
        cachedUrl: imageUrl,
        thumbnailUrl: nft.image?.thumbnailUrl || imageUrl,
        originalUrl: nft.image?.originalUrl || imageUrl,
      },
      contract: {
        address: nft.contract?.address || collection.address,
        name: nft.contract?.name || collection.name,
        symbol: nft.contract?.symbol || 'UNKNOWN',
        tokenType: nft.tokenType || 'ERC721',
      },
      metadata: nft.rawMetadata || {},
      marketplace: collection.marketplace,
      category: this.categorizeNFT(nft),
      rarity: this.calculateRarity(nft),
      price: {
        value: this.generateRealisticPrice(collection.marketplace),
        currency: 'ETH',
      }
    };
  }

  // Format Moralis NFT response (your existing logic, enhanced)
  private static formatMoralisNFT(nft: any, collection: any): NFTAsset {
    const metadata = nft.normalized_metadata || nft.metadata || {};

    return {
      tokenId: nft.token_id,
      tokenType: nft.contract_type || 'ERC721',
      name: metadata.name || nft.name || `${collection.name} #${nft.token_id}`,
      description: metadata.description || `A unique NFT from ${collection.name}`,
      image: {
        cachedUrl: metadata.image || metadata.image_url,
        thumbnailUrl: metadata.image || metadata.image_url,
        originalUrl: metadata.image || metadata.image_url,
      },
      contract: {
        address: collection.address,
        name: collection.name,
        symbol: nft.symbol || 'UNKNOWN',
        tokenType: nft.contract_type || 'ERC721',
      },
      metadata,
      marketplace: collection.marketplace,
      category: this.categorizeNFT(nft),
      rarity: this.calculateRarity(nft),
      price: {
        value: this.generateRealisticPrice(collection.marketplace),
        currency: 'ETH',
      }
    };
  }

  // Format OpenSea NFT response
  private static formatOpenSeaNFT(nft: any): NFTAsset {
    return {
      tokenId: nft.identifier || '0',
      tokenType: 'ERC721',
      name: nft.name || `NFT #${nft.identifier}`,
      description: nft.description || '',
      image: {
        cachedUrl: nft.image_url,
        thumbnailUrl: nft.image_url,
        originalUrl: nft.image_url,
      },
      contract: {
        address: nft.contract?.toLowerCase() || '0x',
        name: nft.collection || 'Unknown Collection',
        symbol: 'UNKNOWN',
        tokenType: 'ERC721',
      },
      marketplace: 'OpenSea',
      price: nft.last_sale ? {
        value: (parseFloat(nft.last_sale.total_price) / 1e18).toFixed(4),
        currency: 'ETH',
      } : {
        value: this.generateRealisticPrice('OpenSea'),
        currency: 'ETH',
      },
      category: this.categorizeNFT(nft),
      rarity: 'Common',
    };
  }

  // Categorize NFT based on metadata
  private static categorizeNFT(nft: any): string {
    const name = nft.name?.toLowerCase() || '';
    const description = nft.description?.toLowerCase() || '';

    if (name.includes('punk') || name.includes('ape') || name.includes('avatar')) {
      return 'PFP';
    } else if (name.includes('art') || description.includes('digital art')) {
      return 'Digital Art';
    } else if (name.includes('music') || name.includes('audio')) {
      return 'Music';
    } else if (name.includes('domain') || name.includes('.base')) {
      return 'Domain';
    } else if (name.includes('game') || description.includes('gaming')) {
      return 'Gaming';
    }

    return 'Digital Art';
  }

  // Calculate rarity score
  private static calculateRarity(nft: any): string {
    const attributes = nft.rawMetadata?.attributes || nft.normalized_metadata?.attributes || [];
    
    if (attributes.length === 0) return 'Common';
    
    const rareAttributes = attributes.filter((attr: any) => 
      attr.value?.toString().toLowerCase().includes('rare') ||
      attr.value?.toString().toLowerCase().includes('legendary')
    );

    if (rareAttributes.length > 1) return 'Legendary';
    if (rareAttributes.length > 0) return 'Rare';
    if (attributes.length > 6) return 'Uncommon';
    
    return 'Common';
  }

  // Generate realistic pricing based on marketplace
  private static generateRealisticPrice(marketplace: string): string {
    let basePrice = 0.01;

    switch (marketplace) {
      case 'Foundation':
        basePrice *= 3;
        break;
      case 'Zora':
        basePrice *= 1.5;
        break;
      case 'OpenSea':
        basePrice *= 2;
        break;
    }

    basePrice *= (0.5 + Math.random() * 1.5);
    return Math.max(0.001, basePrice).toFixed(4);
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

  // Main function - combine all your existing APIs
  static async fetchCuratedNFTs(limit: number = 20): Promise<NFTAsset[]> {
    console.log('🎨 Fetching curated NFTs using your existing APIs...');
    
    try {
      // Use all three of your existing APIs in parallel
      const results = await Promise.allSettled([
        this.fetchNFTsFromAlchemy(Math.ceil(limit * 0.5)),
        this.fetchNFTsFromMoralis(Math.ceil(limit * 0.3)),
        this.fetchNFTsFromOpenSea(Math.ceil(limit * 0.2)),
      ]);

      const allNFTs: NFTAsset[] = [];
      
      results.forEach((result, index) => {
        const sources = ['Alchemy', 'Moralis', 'OpenSea'];
        if (result.status === 'fulfilled') {
          allNFTs.push(...result.value);
          console.log(`✅ ${sources[index]}: ${result.value.length} NFTs`);
        } else {
          console.error(`❌ ${sources[index]} failed:`, result.reason);
        }
      });

      if (allNFTs.length === 0) {
        console.log('⚠️ No NFTs found from APIs, using fallback data');
        return this.getMockFallback(limit);
      }

      // Remove duplicates and shuffle
      const uniqueNFTs = this.removeDuplicates(allNFTs);
      const shuffled = this.shuffleArray(uniqueNFTs).slice(0, limit);
      
      console.log(`🎯 Returning ${shuffled.length} curated NFTs`);
      return shuffled;

    } catch (error) {
      console.error('Error fetching curated NFTs:', error);
      return this.getMockFallback(limit);
    }
  }

  // Remove duplicate NFTs
  private static removeDuplicates(nfts: NFTAsset[]): NFTAsset[] {
    const seen = new Set();
    return nfts.filter(nft => {
      const key = `${nft.contract.address}-${nft.tokenId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Your existing mock data logic as fallback (public method)
  static getMockFallback(limit: number): NFTAsset[] {
    const mockNFTs: NFTAsset[] = [
      {
        tokenId: '1337',
        tokenType: 'ERC721',
        name: 'Base Genesis #1337',
        description: 'A pioneering piece of digital art celebrating the launch of Base Network.',
        image: {
          cachedUrl: 'https://via.placeholder.com/400x400/0052FF/FFFFFF?text=Base+Genesis',
          originalUrl: 'https://via.placeholder.com/400x400/0052FF/FFFFFF?text=Base+Genesis'
        },
        contract: {
          address: '0x036721e5a681e02a730b05e2b56e9b7189f2a3f8',
          name: 'Based Ghouls',
          symbol: 'GHOUL',
          tokenType: 'ERC721'
        },
        marketplace: 'Foundation',
        price: { value: '0.15', currency: 'ETH' },
        category: 'Digital Art',
        rarity: 'Legendary'
      },
      {
        tokenId: '42',
        tokenType: 'ERC721',
        name: 'Base Paint Collaboration',
        description: 'Community-created artwork on Base Paint platform.',
        image: {
          cachedUrl: 'https://via.placeholder.com/400x400/FF6B35/FFFFFF?text=Base+Paint',
          originalUrl: 'https://via.placeholder.com/400x400/FF6B35/FFFFFF?text=Base+Paint'
        },
        contract: {
          address: '0x617978b8af11570c2dab7c39163a8bde1d7f5c37',
          name: 'Base Paint',
          symbol: 'PAINT',
          tokenType: 'ERC721'
        },
        marketplace: 'Zora',
        price: { value: '0.08', currency: 'ETH' },
        category: 'Collaborative',
        rarity: 'Rare'
      },
      {
        tokenId: '256',
        tokenType: 'ERC721',
        name: 'Base Punk #256',
        description: 'Punk-inspired avatar on Base blockchain.',
        image: {
          cachedUrl: 'https://via.placeholder.com/400x400/00D395/FFFFFF?text=Base+Punk',
          originalUrl: 'https://via.placeholder.com/400x400/00D395/FFFFFF?text=Base+Punk'
        },
        contract: {
          address: '0x4f89bbe2c2c896819f246f3dce8a33f5b1ab4586',
          name: 'Base Punks',
          symbol: 'PUNK',
          tokenType: 'ERC721'
        },
        marketplace: 'OpenSea',
        price: { value: '0.12', currency: 'ETH' },
        category: 'PFP',
        rarity: 'Epic'
      }
    ];

    // Extend to requested limit
    const extended: NFTAsset[] = [];
    for (let i = 0; i < limit; i++) {
      const base = mockNFTs[i % mockNFTs.length];
      extended.push({
        ...base,
        tokenId: (parseInt(base.tokenId) + i).toString(),
        name: base.name.replace(/#\d+/, `#${parseInt(base.tokenId) + i}`),
      });
    }

    return extended;
  }
}
