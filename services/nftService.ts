// services/nftService.ts - Generic version without estimated prices
import axios from 'axios';

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY!;
const ALCHEMY_BASE_URL = `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}`;

// OpenSea API for real marketplace data
const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY;
const OPENSEA_BASE_URL = 'https://api.opensea.io/api/v2';

// Default contracts to check - users can add more
const DEFAULT_BASE_CONTRACTS: string[] = [
  // Add any default contracts here if needed
  // Users will add their own contracts through the UI
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
  price?: {
    value: string;
    currency: string;
  };
  artist?: string;
  platform?: string;
  isOneOfOne?: boolean;
  isForSale: boolean;
}

export class NFTService {
  
  // Main function - fetches NFTs with REAL marketplace data only
  static async fetchCuratedNFTs(limit: number = 20, additionalContracts: string[] = []): Promise<NFTAsset[]> {
    console.log('⚡ Loading artworks from Base blockchain...');
    
    // Combine default contracts with user-added contracts
    const allContracts = [...DEFAULT_BASE_CONTRACTS, ...additionalContracts];
    
    if (allContracts.length === 0) {
      console.log('⚠️ No contracts to fetch from');
      return [];
    }
    
    const cacheKey = `curated-nfts-${limit}-${allContracts.join('-')}`;
    const cached = NFT_CACHE.get(cacheKey);
    
    // Return cached data if fresh
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('⚡ Returning cached artworks');
      return cached.data;
    }
    
    try {
      // Parallel API calls for speed
      const promises = allContracts.map(contract => 
        this.fetchContractNFTs(contract, Math.ceil(limit / allContracts.length))
      );
      
      const results = await Promise.allSettled(promises);
      const allArtworks: NFTAsset[] = [];
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allArtworks.push(...result.value);
          console.log(`✅ Contract ${index + 1}: ${result.value.length} artworks`);
        } else {
          console.error(`❌ Contract ${index + 1} failed:`, result.reason);
        }
      });
      
      if (allArtworks.length === 0) {
        console.log('⚠️ No artworks found in any contracts');
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
      
      console.log(`⚡ SUCCESS: ${finalArt.length} artworks loaded`);
      return finalArt;
      
    } catch (error) {
      console.error('❌ Error fetching artworks:', error);
      return [];
    }
  }

  // Fetch NFTs from a wallet address
  static async fetchWalletNFTs(walletAddress: string, limit: number = 100): Promise<NFTAsset[]> {
    try {
      console.log(`⚡ Fetching NFTs from wallet ${walletAddress}...`);
      
      // Try with spam filter first
      let response;
      try {
        response = await axios.get(
          `${ALCHEMY_BASE_URL}/getNFTsForOwner`,
          {
            params: {
              owner: walletAddress,
              withMetadata: true,
              pageSize: limit,
              excludeFilters: ['SPAM'],
            },
            timeout: 15000,
          }
        );
      } catch (error) {
        console.log('⚠️ Retrying without spam filter...');
        // Retry without spam filter
        response = await axios.get(
          `${ALCHEMY_BASE_URL}/getNFTsForOwner`,
          {
            params: {
              owner: walletAddress,
              withMetadata: true,
              pageSize: limit,
            },
            timeout: 15000,
          }
        );
      }
      
      if (!response.data?.ownedNfts?.length) {
        console.log(`⚠️ No NFTs found in wallet ${walletAddress} on Base chain`);
        // The wallet might have NFTs on other chains
        return [];
      }
      
      const nfts: NFTAsset[] = [];
      const processedContracts = new Set<string>();
      
      for (const nft of response.data.ownedNfts) {
        // Track unique contracts
        if (nft.contract?.address) {
          processedContracts.add(nft.contract.address.toLowerCase());
        }
        
        const formatted = await this.formatNFT(nft, nft.contract.address);
        if (formatted) {
          nfts.push(formatted);
        }
      }
      
      console.log(`✅ Found ${nfts.length} NFTs from ${processedContracts.size} unique contracts in wallet`);
      return nfts;
      
    } catch (error: any) {
      console.error(`❌ Error fetching wallet NFTs:`, error?.message || error);
      return [];
    }
  }
  
  // Fetch NFTs from a contract
  private static async fetchContractNFTs(contractAddress: string, limit: number): Promise<NFTAsset[]> {
    try {
      console.log(`⚡ Fetching NFTs from contract ${contractAddress}...`);
      
      // Get NFTs from contract
      const response = await axios.get(
        `${ALCHEMY_BASE_URL}/getNFTsForContract`,
        {
          params: {
            contractAddress,
            withMetadata: true,
            limit: Math.min(limit * 2, 50), // Get extra to account for filtering
            startToken: '0',
          },
          timeout: 10000,
        }
      );
      
      if (!response.data?.nfts?.length) {
        console.log(`❌ No NFTs found in ${contractAddress}`);
        return [];
      }
      
      console.log(`📊 Found ${response.data.nfts.length} NFTs in contract`);
      
      // Process NFTs
      const processedNFTs: NFTAsset[] = [];
      
      for (const nft of response.data.nfts) {
        const formatted = await this.formatNFT(nft, contractAddress);
        if (formatted) {
          processedNFTs.push(formatted);
        }
        
        if (processedNFTs.length >= limit) break;
      }
      
      console.log(`✅ Processed ${processedNFTs.length} NFTs from ${contractAddress}`);
      return processedNFTs;
      
    } catch (error) {
      console.error(`❌ Error fetching from ${contractAddress}:`, error);
      return [];
    }
  }
  
  // Format a single NFT with optional marketplace price
  private static async formatNFT(nft: any, contractAddress: string): Promise<NFTAsset | null> {
    try {
      // Check if it's listed for sale
      const saleStatus = await this.checkIfForSale(nft, contractAddress);
      
      const metadata = nft.metadata || nft.rawMetadata || {};
      
      // Extract image URL
      const imageUrl = this.extractImageUrl(nft, metadata);
      
      if (!imageUrl) {
        console.log(`⚠️ No image found for token ${nft.tokenId}, skipping`);
        return null;
      }
      
      // Extract artist name from metadata
      const artist = this.extractArtistName(metadata, contractAddress);
      
      return {
        tokenId: nft.tokenId || '0',
        tokenType: nft.tokenType || 'ERC721',
        name: nft.name || metadata.name || `Token #${nft.tokenId}`,
        description: nft.description || metadata.description || '',
        image: {
          cachedUrl: imageUrl,
          thumbnailUrl: nft.image?.thumbnailUrl || imageUrl,
          originalUrl: nft.image?.originalUrl || imageUrl,
        },
        contract: {
          address: contractAddress,
          name: nft.contract?.name || metadata.collection?.name || 'Collection',
          symbol: nft.contract?.symbol || 'NFT',
          tokenType: nft.tokenType || 'ERC721',
        },
        metadata: metadata,
        marketplace: saleStatus.marketplace,
        price: saleStatus.price, // Will be undefined if not for sale
        artist: artist,
        platform: this.detectPlatform(contractAddress, metadata),
        isOneOfOne: this.checkIfOneOfOne(metadata),
        isForSale: saleStatus.isForSale,
      };
    } catch (error) {
      console.error('Error formatting NFT:', error);
      return null;
    }
  }
  
  // Extract image URL from various possible locations
  private static extractImageUrl(nft: any, metadata: any): string | undefined {
    // Handle different content types
    const contentType = nft.image?.contentType || '';
    const isVideo = contentType.includes('video') || contentType.includes('mp4') || contentType.includes('webm');
    const isGif = contentType.includes('gif');
    
    if (isVideo) {
      // For videos, prefer static preview
      return nft.image?.pngUrl || 
             nft.image?.thumbnailUrl || 
             nft.image?.cachedUrl || 
             nft.image?.originalUrl;
    }
    
    if (isGif) {
      // For GIFs, preserve animation
      return nft.image?.cachedUrl || 
             nft.image?.originalUrl || 
             nft.image?.thumbnailUrl;
    }
    
    // For static images - check all possible locations
    return nft.image?.cachedUrl ||
           nft.image?.thumbnailUrl ||
           nft.image?.originalUrl ||
           nft.image?.pngUrl ||
           nft.media?.[0]?.gateway ||
           nft.media?.[0]?.raw ||
           nft.media?.[0]?.thumbnail ||
           metadata.image ||
           metadata.image_url ||
           metadata.imageUrl ||
           metadata.animation_url;
  }
  
  // Extract artist name from metadata
  private static extractArtistName(metadata: any, contractAddress: string): string {
    if (!metadata) return 'Unknown Artist';
    
    // Check common artist fields
    const artistFields = ['artist', 'creator', 'created_by', 'author', 'minter'];
    
    for (const field of artistFields) {
      if (metadata[field]) {
        return metadata[field];
      }
    }
    
    // Check attributes
    if (metadata.attributes && Array.isArray(metadata.attributes)) {
      for (const attr of metadata.attributes) {
        if (artistFields.includes(attr.trait_type?.toLowerCase())) {
          return attr.value;
        }
      }
    }
    
    // Check description for "by [artist]" pattern
    if (metadata.description) {
      const match = metadata.description.match(/by\s+([^,.\n]+)/i);
      if (match) {
        return match[1].trim();
      }
    }
    
    // Check collection name
    if (metadata.collection?.name) {
      return metadata.collection.name;
    }
    
    return 'Unknown Artist';
  }
  
  // Detect platform from contract or metadata
  private static detectPlatform(contractAddress: string, metadata: any): string {
    // Check metadata for platform hints
    if (metadata.platform) return metadata.platform;
    if (metadata.marketplace) return metadata.marketplace;
    
    // Check if minted through known platforms
    if (metadata.external_url) {
      const url = metadata.external_url.toLowerCase();
      if (url.includes('foundation')) return 'Foundation';
      if (url.includes('zora')) return 'Zora';
      if (url.includes('manifold')) return 'Manifold';
      if (url.includes('opensea')) return 'OpenSea';
      if (url.includes('rarible')) return 'Rarible';
    }
    
    return 'Base';
  }
  
  // Check if NFT is a 1/1
  private static checkIfOneOfOne(metadata: any): boolean {
    // Check for edition size
    if (metadata.edition_size === 1) return true;
    if (metadata.total_supply === 1) return true;
    
    // Check attributes
    if (metadata.attributes && Array.isArray(metadata.attributes)) {
      const editionAttr = metadata.attributes.find((attr: any) => 
        attr.trait_type?.toLowerCase().includes('edition')
      );
      if (editionAttr && (editionAttr.value === 1 || editionAttr.value === '1/1')) {
        return true;
      }
    }
    
    // Default to true for art NFTs
    return true;
  }
  
  // Check if NFT is for sale with REAL marketplace data only
  private static async checkIfForSale(nft: any, contractAddress: string): Promise<{ 
    isForSale: boolean; 
    price?: { value: string; currency: string };
    marketplace?: string;
  }> {
    try {
      // Try OpenSea first (most common)
      if (OPENSEA_API_KEY) {
        const openSeaListing = await this.checkOpenSeaListing(contractAddress, nft.tokenId);
        if (openSeaListing.isListed && openSeaListing.price) {
          return {
            isForSale: true,
            price: openSeaListing.price,
            marketplace: 'OpenSea'
          };
        }
      }
      
      // Try Foundation
      const foundationListing = await this.checkFoundationListing(contractAddress, nft.tokenId);
      if (foundationListing.isListed && foundationListing.price) {
        return {
          isForSale: true,
          price: foundationListing.price,
          marketplace: 'Foundation'
        };
      }
      
      // Try Zora
      const zoraListing = await this.checkZoraListing(contractAddress, nft.tokenId);
      if (zoraListing.isListed && zoraListing.price) {
        return {
          isForSale: true,
          price: zoraListing.price,
          marketplace: 'Zora'
        };
      }
      
      // Check metadata for price (some contracts store price in metadata)
      const metadata = nft.metadata || nft.rawMetadata || {};
      if (metadata.price || metadata.listing_price || metadata.sale_price) {
        const priceValue = metadata.price || metadata.listing_price || metadata.sale_price;
        return {
          isForSale: true,
          price: {
            value: priceValue.toString(),
            currency: 'ETH'
          },
          marketplace: 'Direct'
        };
      }
      
      // Not for sale - no price displayed
      return { isForSale: false };
      
    } catch (error) {
      console.error('Error checking sale status:', error);
      return { isForSale: false };
    }
  }
  
  // Check OpenSea for listings
  private static async checkOpenSeaListing(contractAddress: string, tokenId: string): Promise<{ 
    isListed: boolean; 
    price?: { value: string; currency: string } 
  }> {
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
      return { isListed: false };
    }
  }
  
  // Check Foundation for listings
  private static async checkFoundationListing(contractAddress: string, tokenId: string): Promise<{ 
    isListed: boolean; 
    price?: { value: string; currency: string } 
  }> {
    try {
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
      return { isListed: false };
    }
  }
  
  // Check Zora for listings
  private static async checkZoraListing(contractAddress: string, tokenId: string): Promise<{ 
    isListed: boolean; 
    price?: { value: string; currency: string } 
  }> {
    try {
      const response = await axios.get(
        `https://api.zora.co/discover/tokens/base/${contractAddress}/${tokenId}`,
        {
          timeout: 5000,
          headers: {
            'Accept': 'application/json',
          }
        }
      );
      
      if (response.data?.token?.market?.price?.amount) {
        const price = response.data.token.market.price;
        const ethPrice = price.amount?.eth || price.amount?.raw;
        
        if (ethPrice) {
          return {
            isListed: true,
            price: {
              value: ethPrice.toString(),
              currency: price.currency || 'ETH'
            }
          };
        }
      }
      
      return { isListed: false };
    } catch (error) {
      return { isListed: false };
    }
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
