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
  
  // Main function - tries REAL marketplace data with fallbacks
  static async fetchCuratedNFTs(limit: number = 20): Promise<NFTAsset[]> {
    console.log('⚡ Loading artworks (prioritizing real marketplace prices)...');
    
    const cacheKey = `curated-nfts-${limit}`;
    const cached = NFT_CACHE.get(cacheKey);
    
    // Return cached data if fresh
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('⚡ Returning cached artworks');
      return cached.data;
    }
    
    try {
      // Parallel API calls for speed
      const promises = BASE_ART_CONTRACTS.map(contract => 
        this.fetchContractForSaleNFTs(contract, Math.ceil(limit / BASE_ART_CONTRACTS.length))
      );
      
      const results = await Promise.allSettled(promises);
      const allArtworks: NFTAsset[] = [];
      let realListings = 0;
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allArtworks.push(...result.value);
          // Count how many have real marketplace prices vs estimated
          const realPrices = result.value.filter(nft => 
            nft.metadata?.hasRealPrice === true
          ).length;
          realListings += realPrices;
          console.log(`✅ Contract ${index + 1}: ${result.value.length} artworks (${realPrices} with real prices)`);
        } else {
          console.error(`❌ Contract ${index + 1} failed:`, result.reason);
        }
      });
      
      if (allArtworks.length === 0) {
        console.log('⚠️ No artworks found in any contracts');
        console.log('💡 Check:');
        console.log('   - Contract addresses are valid');
        console.log('   - Alchemy API key is working');
        console.log('   - Contracts actually contain NFTs');
        return [];
      }
      
      // Remove duplicates and shuffle
      const uniqueArt = this.removeDuplicates(allArtworks);
      const finalArt = this.shuffleArray(uniqueArt).slice(0, limit);
      
      // Cache the results
      NFT_CACHE.set(cacheKey, {
        data: finalArt,
        timestamp: Date.now()
      });
      
      console.log(`⚡ SUCCESS: ${finalArt.length} artworks loaded (${realListings} with real marketplace prices)`);
      return finalArt;
      
    } catch (error) {
      console.error('❌ Error fetching artworks:', error);
      return [];
    }
  }
  
  // Fast contract fetching with REAL price attempts but fallback to show artworks
  private static async fetchContractForSaleNFTs(contractAddress: string, limit: number): Promise<NFTAsset[]> {
    try {
      console.log(`⚡ Checking ${contractAddress} for artworks (trying real prices first)...`);
      
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
          timeout: 8000,
        }
      );
      
      if (!response.data?.nfts?.length) {
        console.log(`❌ No NFTs found in ${contractAddress}`);
        return [];
      }
      
      console.log(`📊 Found ${response.data.nfts.length} total NFTs, checking for real prices...`);
      
      // Process in batches for better performance
      const forSaleNFTs: NFTAsset[] = [];
      const batchSize = 5;
      
      for (let i = 0; i < response.data.nfts.length && forSaleNFTs.length < limit; i += batchSize) {
        const batch = response.data.nfts.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (nft: any) => {
          // Try to get real marketplace price first
          const saleStatus = await this.checkIfForSale(nft, contractAddress);
          
          if (saleStatus.isForSale && saleStatus.price) {
            // Found real marketplace listing!
            console.log(`✅ Real listing found: ${nft.name || 'Token ' + nft.tokenId} at ${saleStatus.price.value} ${saleStatus.price.currency}`);
            return this.formatForSaleNFT(nft, contractAddress, saleStatus.price, true);
          } else {
            // No real listing, but still show the artwork with estimated price
            // This ensures we have artworks to display even without active marketplace listings
            const estimatedPrice = this.generateRealisticPrice(contractAddress, nft.tokenId);
            return this.formatForSaleNFT(nft, contractAddress, estimatedPrice, false);
          }
        });
        
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
            forSaleNFTs.push(result.value);
          }
        });

        // Small delay to be nice to APIs
        if (i + batchSize < response.data.nfts.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      console.log(`🛒 Found ${forSaleNFTs.length} artworks from ${contractAddress} (some with real prices, others estimated)`);
      return forSaleNFTs;
      
    } catch (error) {
      console.error(`❌ Error fetching from ${contractAddress}:`, error);
      return [];
    }
  }
  
  // Fast for-sale check with REAL price fetching
  private static async checkIfForSale(nft: any, contractAddress: string): Promise<{ isForSale: boolean; price?: { value: string; currency: string } }> {
    try {
      // Method 1: Check OpenSea API for real listings
      if (OPENSEA_API_KEY) {
        const openSeaListing = await this.checkOpenSeaListing(contractAddress, nft.tokenId);
        if (openSeaListing.isListed && openSeaListing.price) {
          return {
            isForSale: true,
            price: openSeaListing.price
          };
        }
      }
      
      // Method 2: Check Foundation API for real listings
      if (contractAddress.toLowerCase() === '0x972f31d4e140f0d09b154bb395a070ed5ee9fcca') {
        const foundationListing = await this.checkFoundationListing(contractAddress, nft.tokenId);
        if (foundationListing.isListed && foundationListing.price) {
          return {
            isForSale: true,
            price: foundationListing.price
          };
        }
      }
      
      // Method 3: Check Zora API for real listings
      const zoraListing = await this.checkZoraListing(contractAddress, nft.tokenId);
      if (zoraListing.isListed && zoraListing.price) {
        return {
          isForSale: true,
          price: zoraListing.price
        };
      }
      
      // Method 4: Check metadata for sale indicators with price
      const metadata = nft.metadata || nft.rawMetadata || {};
      
      if (metadata.listing_price || metadata.sale_price || metadata.price) {
        const priceValue = metadata.listing_price || metadata.sale_price || metadata.price;
        return {
          isForSale: true,
          price: {
            value: priceValue.toString(),
            currency: 'ETH'
          }
        };
      }
      
      // If no real price data found, not for sale
      return { isForSale: false };
      
    } catch (error) {
      console.error('Error checking for-sale status:', error);
      return { isForSale: false };
    }
  }
  
  // Check OpenSea for real listings with prices
  private static async checkOpenSeaListing(contractAddress: string, tokenId: string): Promise<{ isListed: boolean; price?: { value: string; currency: string } }> {
    if (!OPENSEA_API_KEY) return { isListed: false };
    
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
      
      if (response.data?.orders?.length > 0) {
        const listing = response.data.orders[0];
        const price = listing.current_price;
        
        if (price) {
          // Convert from wei to ETH
          const ethPrice = (parseFloat(price) / Math.pow(10, 18)).toFixed(4);
          return {
            isListed: true,
            price: {
              value: ethPrice,
              currency: 'ETH'
            }
          };
        }
      }
      
      return { isListed: false };
    } catch (error) {
      console.error('OpenSea API error:', error);
      return { isListed: false };
    }
  }

  // Check Foundation for real listings with prices
  private static async checkFoundationListing(contractAddress: string, tokenId: string): Promise<{ isListed: boolean; price?: { value: string; currency: string } }> {
    try {
      // Foundation API endpoint for getting NFT details
      const response = await axios.get(
        `https://api.foundation.app/v1/artworks/${contractAddress}/${tokenId}`,
        {
          timeout: 5000,
        }
      );
      
      if (response.data?.marketplace?.reserve_price || response.data?.marketplace?.buy_now_price) {
        const price = response.data.marketplace.buy_now_price || response.data.marketplace.reserve_price;
        return {
          isListed: true,
          price: {
            value: (parseFloat(price) / Math.pow(10, 18)).toFixed(4),
            currency: 'ETH'
          }
        };
      }
      
      return { isListed: false };
    } catch (error) {
      console.error('Foundation API error:', error);
      return { isListed: false };
    }
  }

  // Check Zora for real listings with prices
  private static async checkZoraListing(contractAddress: string, tokenId: string): Promise<{ isListed: boolean; price?: { value: string; currency: string } }> {
    try {
      // Zora API endpoint
      const response = await axios.get(
        `https://api.zora.co/v1/tokens/${contractAddress}/${tokenId}`,
        {
          timeout: 5000,
        }
      );
      
      if (response.data?.market?.status === 'ACTIVE' && response.data?.market?.current_price) {
        const price = response.data.market.current_price;
        return {
          isListed: true,
          price: {
            value: (parseFloat(price) / Math.pow(10, 18)).toFixed(4),
            currency: 'ETH'
          }
        };
      }
      
      return { isListed: false };
    } catch (error) {
      console.error('Zora API error:', error);
      return { isListed: false };
    }
  }
  
  // Format NFT with real or estimated price data
  private static formatForSaleNFT(nft: any, contractAddress: string, price: { value: string; currency: string }, isRealPrice: boolean = false): NFTAsset {
    const metadata = nft.metadata || nft.rawMetadata || {};
    const imageUrl = nft.image?.cachedUrl || 
                    nft.image?.thumbnailUrl ||
                    nft.image?.originalUrl ||
                    metadata.image ||
                    metadata.image_url ||
                    nft.media?.[0]?.gateway;
    
    // Get proper artist name
    const artist = this.extractArtistFromContract(contractAddress, metadata);
    
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
      metadata: {
        ...metadata,
        hasRealPrice: isRealPrice, // Track if this is real marketplace data
      },
      marketplace: this.getPlatformName(contractAddress),
      price: price, // Real or estimated price
      artist: artist,
      platform: this.getPlatformName(contractAddress),
      isOneOfOne: true,
      isForSale: true,
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
      
      // Check if it's actually for sale with real price
      const saleStatus = await this.checkIfForSale(alchemyData || {}, contractAddress);
      
      let finalPrice: { value: string; currency: string };
      let isRealPrice = false;
      
      if (saleStatus.isForSale && saleStatus.price) {
        // Has real marketplace listing
        finalPrice = saleStatus.price;
        isRealPrice = true;
      } else {
        // No real marketplace listing, use estimated price
        finalPrice = this.generateRealisticPrice(contractAddress, alchemyData?.tokenId || moralisData?.token_id);
        isRealPrice = false;
      }
      
      // Combine the best of both with real or estimated price
      return this.combineNFTData(alchemyData, moralisData, contractAddress, finalPrice, isRealPrice);
      
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

  // Helper to combine data from both sources with real or estimated prices
  private static combineNFTData(alchemyData: any, moralisData: any, contractAddress: string, price: { value: string; currency: string }, isRealPrice: boolean = false): NFTAsset {
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

    // Enhanced metadata combining both sources
    const combinedMetadata = {
      ...moralisData?.metadata,
      ...alchemyData?.metadata,
      // Moralis normalized metadata is often cleaner
      normalized: moralisData?.normalized_metadata,
      hasRealPrice: isRealPrice,
    };

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
      metadata: combinedMetadata,
      marketplace: this.getPlatformName(contractAddress),
      price: price, // Real or estimated price
      artist: this.extractArtistFromContract(contractAddress, combinedMetadata),
      platform: this.getPlatformName(contractAddress),
      isOneOfOne: true,
      isForSale: true,
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

  // Enhanced artist extraction based on contract address
  private static extractArtistFromContract(contractAddress: string, metadata: any): string {
    const address = contractAddress.toLowerCase();
    
    // Known artists by contract address
    if (address === '0x972f31d4e140f0d09b154bb395a070ed5ee9fcca') {
      return 'emmywalka';
    }
    
    if (address === '0x524cab2ec69124574082676e6f654a18df49a048') {
      // Try to extract from metadata first, fallback to known info
      const extractedArtist = this.extractArtistFromMetadata(metadata);
      return extractedArtist !== 'Unknown Artist' ? extractedArtist : 'Base Artist';
    }
    
    // For other contracts, try metadata extraction
    const extractedArtist = this.extractArtistFromMetadata(metadata);
    if (extractedArtist !== 'Unknown Artist') {
      return extractedArtist;
    }
    
    // Look for creator in contract name
    if (metadata.name && metadata.name.includes('by ')) {
      const parts = metadata.name.split('by ');
      if (parts.length > 1) {
        return parts[1].trim();
      }
    }
    
    // Look for artist in description
    if (metadata.description) {
      const desc = metadata.description.toLowerCase();
      const byMatch = desc.match(/by\s+([a-zA-Z0-9_\-\.]+)/);
      if (byMatch) {
        return byMatch[1];
      }
      
      const createdMatch = desc.match(/created\s+by\s+([a-zA-Z0-9_\-\.]+)/);
      if (createdMatch) {
        return createdMatch[1];
      }
    }
    
    // Default based on platform
    const platform = this.getPlatformName(contractAddress);
    switch (platform) {
      case 'Foundation':
        return 'Foundation Artist';
      case 'Zora':
        return 'Zora Creator';
      case 'Manifold':
        return 'Independent Artist';
      default:
        return 'Base Creator';
    }
  }
  
  // END NEW MORALIS METHODS
  // =======================
  
  // Generate realistic prices (fallback when no real marketplace data)
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
