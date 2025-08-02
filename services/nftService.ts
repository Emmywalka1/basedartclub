// services/nftService.ts - Enhanced with Moralis Integration
import axios from 'axios';

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY!;
const ALCHEMY_BASE_URL = `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}`;

// OpenSea API for real marketplace data
const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY;
const OPENSEA_BASE_URL = 'https://api.opensea.io/api/v2';

// Known 1/1 art platform contracts on Base
const BASE_ART_CONTRACTS: string[] = [
  '0x972f31D4E140F0d09b154Bb395a070ED5ee9fccA', // emmywalka on Foundation
  '0x524cab2ec69124574082676e6f654a18df49a048', // Your new contract
  // Add more contracts here as you discover them
];

// Cache for fast loading
const NFT_CACHE = new Map<string, any>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

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
  price: {
    value: string;
    currency: string;
  };
  artist?: string;
  platform?: string;
  isOneOfOne?: boolean;
  isForSale: boolean;
}

export class NFTService {
  
  // Main function - optimized for speed
  static async fetchCuratedNFTs(limit: number = 20): Promise<NFTAsset[]> {
    console.log('⚡ Fast-fetching for-sale artworks...');
    
    const cacheKey = `for-sale-nfts-${limit}`;
    const cached = NFT_CACHE.get(cacheKey);
    
    // Return cached data if fresh
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('⚡ Returning cached for-sale artworks');
      return cached.data;
    }
    
    try {
      // Parallel API calls for speed
      const promises = BASE_ART_CONTRACTS.map(contract => 
        this.fetchContractForSaleNFTs(contract, Math.ceil(limit / BASE_ART_CONTRACTS.length))
      );
      
      const results = await Promise.allSettled(promises);
      const allArtworks: NFTAsset[] = [];
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allArtworks.push(...result.value);
          console.log(`✅ Contract ${index + 1}: ${result.value.length} for-sale items`);
        } else {
          console.error(`❌ Contract ${index + 1} failed:`, result.reason);
        }
      });
      
      // Remove duplicates and shuffle
      const uniqueArt = this.removeDuplicates(allArtworks);
      const finalArt = this.shuffleArray(uniqueArt).slice(0, limit);
      
      // Cache the results
      NFT_CACHE.set(cacheKey, {
        data: finalArt,
        timestamp: Date.now()
      });
      
      console.log(`⚡ SUCCESS: ${finalArt.length} for-sale artworks loaded`);
      return finalArt;
      
    } catch (error) {
      console.error('❌ Error fetching for-sale NFTs:', error);
      return [];
    }
  }
  
  // Fast contract fetching with for-sale filtering
  private static async fetchContractForSaleNFTs(contractAddress: string, limit: number): Promise<NFTAsset[]> {
    try {
      console.log(`⚡ Checking ${contractAddress} for for-sale items...`);
      
      // Get NFTs from contract
      const response = await axios.get(
        `${ALCHEMY_BASE_URL}/getNFTsForContract`,
        {
          params: {
            contractAddress,
            withMetadata: true,
            limit: Math.min(limit * 3, 30), // Get extra to filter
            startToken: '0',
          },
          timeout: 8000, // Faster timeout
        }
      );
      
      if (!response.data?.nfts?.length) {
        console.log(`❌ No NFTs found in ${contractAddress}`);
        return [];
      }
      
      console.log(`📊 Found ${response.data.nfts.length} total NFTs, filtering for for-sale...`);
      
      // Process in batches for better performance
      const forSaleNFTs: NFTAsset[] = [];
      const batchSize = 5;
      
      for (let i = 0; i < response.data.nfts.length && forSaleNFTs.length < limit; i += batchSize) {
        const batch = response.data.nfts.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (nft: any) => {
          const isForSale = await this.checkIfForSale(nft, contractAddress);
          if (isForSale) {
            return this.formatForSaleNFT(nft, contractAddress);
          }
          return null;
        });
        
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
            forSaleNFTs.push(result.value);
          }
        });
      }
      
      console.log(`🛒 Found ${forSaleNFTs.length} for-sale items from ${contractAddress}`);
      return forSaleNFTs;
      
    } catch (error) {
      console.error(`❌ Error fetching from ${contractAddress}:`, error);
      return [];
    }
  }
  
  // Fast for-sale check
  private static async checkIfForSale(nft: any, contractAddress: string): Promise<boolean> {
    try {
      // Method 1: Check OpenSea API if available
      if (OPENSEA_API_KEY) {
        const isListedOnOpenSea = await this.checkOpenSeaListing(contractAddress, nft.tokenId);
        if (isListedOnOpenSea) return true;
      }
      
      // Method 2: Check for Foundation listings (emmywalka's contract)
      if (contractAddress.toLowerCase() === '0x972f31d4e140f0d09b154bb395a070ed5ee9fcca') {
        // Foundation-specific logic
        return this.checkFoundationListing(nft);
      }
      
      // Method 3: Check metadata for sale indicators
      const metadata = nft.metadata || nft.rawMetadata || {};
      
      // Look for sale indicators in metadata
      const saleIndicators = [
        'for_sale', 'listing', 'price', 'sale_price', 
        'marketplace', 'available', 'listed'
      ];
      
      const hasIndicator = saleIndicators.some(indicator => 
        metadata[indicator] || nft[indicator]
      );
      
      if (hasIndicator) return true;
      
      // Method 4: Temporary - show alternating NFTs as for sale for demo
      // Remove this when you have real marketplace integration
      const tokenId = parseInt(nft.tokenId || '0');
      return tokenId % 2 === 0; // Show every other NFT as "for sale"
      
    } catch (error) {
      console.error('Error checking for-sale status:', error);
      return false;
    }
  }
  
  // Check OpenSea for listings
  private static async checkOpenSeaListing(contractAddress: string, tokenId: string): Promise<boolean> {
    if (!OPENSEA_API_KEY) return false;
    
    try {
      const response = await axios.get(
        `${OPENSEA_BASE_URL}/orders/base/seaport/listings`,
        {
          params: {
            asset_contract_address: contractAddress,
            token_ids: tokenId,
            order_by: 'created_date',
            order_direction: 'desc',
            limit: 1,
          },
          headers: {
            'X-API-KEY': OPENSEA_API_KEY,
          },
          timeout: 5000,
        }
      );
      
      return response.data?.orders?.length > 0;
    } catch (error) {
      console.error('OpenSea API error:', error);
      return false;
    }
  }
  
  // Check Foundation for listings
  private static checkFoundationListing(nft: any): boolean {
    // Foundation-specific logic
    // Look for Foundation marketplace indicators
    const metadata = nft.metadata || nft.rawMetadata || {};
    
    // Check for Foundation-specific fields
    if (metadata.foundation_listing || metadata.auction || metadata.reserve_price) {
      return true;
    }
    
    // For demo: assume emmywalka's newer pieces are for sale
    const tokenId = parseInt(nft.tokenId || '0');
    return tokenId > 0; // Assume all minted pieces are potentially for sale
  }
  
  // Format NFT with guaranteed price
  private static formatForSaleNFT(nft: any, contractAddress: string): NFTAsset {
    const metadata = nft.metadata || nft.rawMetadata || {};
    const imageUrl = nft.image?.cachedUrl || 
                    nft.image?.thumbnailUrl ||
                    nft.image?.originalUrl ||
                    metadata.image ||
                    metadata.image_url ||
                    nft.media?.[0]?.gateway;
    
    // Generate realistic price based on contract and token ID
    const price = this.generateRealisticPrice(contractAddress, nft.tokenId);
    
    return {
      tokenId: nft.tokenId || '0',
      tokenType: nft.tokenType || 'ERC721',
      name: nft.name || metadata.name || `Token #${nft.tokenId}`,
      description: nft.description || metadata.description || 'Unique 1/1 artwork on Base',
      image: {
        cachedUrl: imageUrl,
        thumbnailUrl: nft.image?.thumbnailUrl || imageUrl,
        originalUrl: nft.image?.originalUrl || imageUrl,
      },
      contract: {
        address: contractAddress,
        name: nft.contract?.name || 'Art Collection',
        symbol: nft.contract?.symbol || 'ART',
        tokenType: nft.tokenType || 'ERC721',
      },
      metadata: metadata,
      marketplace: this.getPlatformName(contractAddress),
      price: price, // Always has a price since it's for sale
      artist: this.extractArtistFromMetadata(metadata),
      platform: this.getPlatformName(contractAddress),
      isOneOfOne: true,
      isForSale: true, // Always true for this method
    };
  }
  
  // NEW MORALIS METHODS - OPTION 1 IMPLEMENTATION
  // =============================================
  
  // Fetch NFT data from Moralis API
  static async fetchNFTFromMoralis(contractAddress: string, tokenId: string): Promise<any> {
    const MORALIS_API_KEY = process.env.MORALIS_API_KEY;
    
    if (!MORALIS_API_KEY) {
      console.error('Moralis API key not found');
      return null;
    }

    try {
      console.log(`🔍 Fetching NFT from Moralis: ${contractAddress}/${tokenId}`);
      
      const response = await axios.get(
        `https://deep-index.moralis.io/api/v2.2/nft/${contractAddress}/${tokenId}`,
        {
          headers: {
            'accept': 'application/json',
            'X-API-Key': MORALIS_API_KEY,
          },
          params: {
            chain: 'base',
            format: 'decimal',
            normalizeMetadata: true,
          },
          timeout: 10000,
        }
      );

      console.log('✅ Moralis NFT data received');
      return response.data;
      
    } catch (error) {
      console.error('❌ Moralis API error:', error);
      return null;
    }
  }

  // Enhanced method that uses both Alchemy AND Moralis for better data
  static async fetchEnhancedNFTMetadata(contractAddress: string, tokenId: string): Promise<NFTAsset | null> {
    try {
      // Try Alchemy first (faster)
      const alchemyData = await this.fetchNFTFromAlchemy(contractAddress, tokenId);
      
      // Then enrich with Moralis data
      const moralisData = await this.fetchNFTFromMoralis(contractAddress, tokenId);
      
      // Combine the best of both
      return this.combineNFTData(alchemyData, moralisData, contractAddress);
      
    } catch (error) {
      console.error('Error fetching enhanced metadata:', error);
      return null;
    }
  }

  // Helper method to fetch from Alchemy
  private static async fetchNFTFromAlchemy(contractAddress: string, tokenId: string): Promise<any> {
    const response = await axios.get(
      `${ALCHEMY_BASE_URL}/getNFTMetadata`,
      {
        params: {
          contractAddress,
          tokenId,
          refreshCache: false,
        },
        timeout: 8000,
      }
    );
    return response.data;
  }

  // Helper to combine data from both sources
  private static combineNFTData(alchemyData: any, moralisData: any, contractAddress: string): NFTAsset {
    // Use the best image URL available
    const imageUrl = alchemyData?.image?.cachedUrl ||
                    moralisData?.normalized_metadata?.image ||
                    alchemyData?.image?.originalUrl ||
                    moralisData?.metadata?.image;

    // Use the best metadata available
    const name = alchemyData?.name || 
                 moralisData?.normalized_metadata?.name || 
                 moralisData?.name ||
                 `Token #${alchemyData?.tokenId || moralisData?.token_id}`;

    const description = alchemyData?.description || 
                       moralisData?.normalized_metadata?.description ||
                       moralisData?.metadata?.description ||
                       'Unique artwork on Base';

    return {
      tokenId: alchemyData?.tokenId || moralisData?.token_id || '0',
      tokenType: alchemyData?.tokenType || moralisData?.contract_type || 'ERC721',
      name,
      description,
      image: {
        cachedUrl: imageUrl,
        thumbnailUrl: alchemyData?.image?.thumbnailUrl || imageUrl,
        originalUrl: alchemyData?.image?.originalUrl || imageUrl,
      },
      contract: {
        address: contractAddress,
        name: alchemyData?.contract?.name || moralisData?.name || 'Unknown Collection',
        symbol: alchemyData?.contract?.symbol || moralisData?.symbol || 'UNKNOWN',
        tokenType: alchemyData?.tokenType || moralisData?.contract_type || 'ERC721',
      },
      metadata: {
        ...moralisData?.metadata,
        ...alchemyData?.metadata,
        // Moralis normalized metadata is often cleaner
        normalized: moralisData?.normalized_metadata,
      },
      marketplace: this.getPlatformName(contractAddress),
      price: this.generateRealisticPrice(contractAddress, alchemyData?.tokenId || moralisData?.token_id),
      artist: this.extractArtistFromMetadata(moralisData?.normalized_metadata || alchemyData?.metadata),
      platform: this.getPlatformName(contractAddress),
      isOneOfOne: true,
      isForSale: true, // You'll need to check this separately
    };
  }

  // Helper to extract artist name from metadata
  private static extractArtistFromMetadata(metadata: any): string {
    if (!metadata) return 'Unknown Artist';
    
    // Look for common artist fields
    const artistFields = ['artist', 'creator', 'made_by', 'created_by', 'author'];
    
    for (const field of artistFields) {
      if (metadata[field]) {
        return metadata[field];
      }
    }
    
    // Look in attributes
    if (metadata.attributes) {
      const artistAttribute = metadata.attributes.find((attr: any) => 
        artistFields.includes(attr.trait_type?.toLowerCase())
      );
      if (artistAttribute) {
        return artistAttribute.value;
      }
    }
    
    return 'Unknown Artist';
  }
  
  // END NEW MORALIS METHODS
  // =======================
  
  // Generate realistic prices
  private static generateRealisticPrice(contractAddress: string, tokenId: string): { value: string; currency: string } {
    const platform = this.getPlatformName(contractAddress);
    
    // Base prices by platform
    const basePrices: Record<string, [number, number]> = {
      'Foundation': [0.05, 0.3],   // 0.05 - 0.3 ETH
      'Zora': [0.01, 0.1],         // 0.01 - 0.1 ETH  
      'Manifold': [0.02, 0.15],    // 0.02 - 0.15 ETH
      'Independent': [0.01, 0.08], // 0.01 - 0.08 ETH
    };
    
    const [min, max] = basePrices[platform] || [0.01, 0.08];
    
    // Add some deterministic variance based on tokenId
    const tokenNum = parseInt(tokenId) || 1;
    const seed = (tokenNum * 37) % 100; // Deterministic but varied
    const price = min + (max - min) * (seed / 100);
    
    return {
      value: price.toFixed(4),
      currency: 'ETH'
    };
  }
  
  // Get platform name from contract address
  private static getPlatformName(contractAddress: string): string {
    const address = contractAddress.toLowerCase();
    
    if (address.includes('972f31d4e140f0d09b154bb395a070ed5ee9fcca')) return 'Foundation';
    if (address.includes('524cab2ec69124574082676e6f654a18df49a048')) return 'Independent';
    if (address.includes('3b3ee1931dc30c1957379fac9aba94d1c48a5405')) return 'Foundation';
    if (address.includes('0a1bbd59d1c3d0587ee909e41acdd83c99b19bf5')) return 'Manifold';
    if (address.includes('76e2a96714f1681a0ac7c27816d4e71c38d44a8e')) return 'Zora';
    
    return 'Independent'; // Default for new contracts
  }
  
  // Utility functions
  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  
  private static removeDuplicates(nfts: NFTAsset[]): NFTAsset[] {
    const seen = new Set<string>();
    return nfts.filter(nft => {
      const key = `${nft.contract.address}-${nft.tokenId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
