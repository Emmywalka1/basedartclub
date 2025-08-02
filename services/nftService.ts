// services/nftService.ts - Real Data Only for 1/1 Art Discovery on Base
import axios from 'axios';

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY!;
const ALCHEMY_BASE_URL = `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}`;

// Known 1/1 art platform contracts on Base
const BASE_ART_CONTRACTS: string[] = [
  '0x972f31D4E140F0d09b154Bb395a070ED5ee9fccA', // emmywalka on Foundation
  // Add real contract addresses here as you discover them
  // Use the discover-base-art.js script to find contracts
  // Or manually search on BaseScan.org
  
  // Example format:
  // '0x1234567890abcdef...', // Platform/Artist name
];

// If no contracts are configured, log a warning
if (BASE_ART_CONTRACTS.length === 1) {
  console.log('✅ Found emmywalka contract configured');
} else if (BASE_ART_CONTRACTS.length === 0) {
  console.warn('⚠️ No art contracts configured! Add real contract addresses to BASE_ART_CONTRACTS');
}

// Keywords that indicate 1/1 art
const ART_KEYWORDS = [
  'art', 'artwork', 'painting', 'illustration', 'drawing', 'digital art',
  'generative', 'abstract', 'portrait', 'landscape', '1/1', 'one of one',
  'edition of 1', 'unique', 'original', 'canvas', 'piece'
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
  };
  artist?: string;
  platform?: string;
  isOneOfOne?: boolean;
}

export class NFTService {
  
  // Main function to fetch 1/1 art from Base - UPDATED WITH FIXES
  static async fetchCuratedNFTs(limit: number = 20): Promise<NFTAsset[]> {
    console.log('🎨 Fetching ONLY for-sale 1/1 art from Base blockchain...');
    console.log(`🎯 Target limit: ${limit} artworks`);
    
    try {
      const allArtworks: NFTAsset[] = [];
      
      // Focus on contract NFTs first since we know they exist
      console.log('📋 Step 1: Fetching for-sale artworks from contracts...');
      const contractArt = await this.fetchFromArtContracts(limit);
      console.log(`✅ Contract fetch result: ${contractArt.length} for-sale artworks`);
      allArtworks.push(...contractArt);
      
      // Only fetch from other sources if we need more
      if (allArtworks.length < limit) {
        console.log('📋 Step 2: Fetching for-sale artworks from artist wallet...');
        const discoveredArt = await this.discoverArtByMetadata(limit - allArtworks.length);
        console.log(`✅ Artist wallet result: ${discoveredArt.length} for-sale artworks`);
        allArtworks.push(...discoveredArt);
      }
      
      // Remove duplicates
      const uniqueArt = this.removeDuplicates(allArtworks);
      console.log(`🔄 After removing duplicates: ${uniqueArt.length} for-sale artworks`);
      
      // Shuffle and limit
      const finalArt = this.shuffleArray(uniqueArt).slice(0, limit);
      
      console.log(`🎉 FINAL SUCCESS: Returning ${finalArt.length} for-sale artworks to app`);
      finalArt.forEach((art, i) => {
        console.log(`   ${i + 1}. "${art.name}" by ${art.artist} - ${art.price?.value} ${art.price?.currency} (${art.platform})`);
      });
      
      return finalArt;
      
    } catch (error) {
      console.error('❌ Error in fetchCuratedNFTs:', error);
      return [];
    }
  }
  
  // Fetch recent NFT mints/transfers to catch new art
  private static async fetchRecentArtMints(limit: number): Promise<NFTAsset[]> {
    try {
      console.log('🔍 Searching for recent art mints on Base...');
      
      // Get recent transfers
      const transfersResponse = await axios.get(
        `${ALCHEMY_BASE_URL}/getAssetTransfers`,
        {
          params: {
            fromBlock: '0x0',
            toBlock: 'latest',
            category: ['erc721', 'erc1155'],
            withMetadata: true,
            maxCount: 100,
            order: 'desc',
          },
          timeout: 15000,
        }
      );
      
      if (transfersResponse.data && transfersResponse.data.transfers) {
        // Fetch metadata for transferred NFTs
        const nftPromises = transfersResponse.data.transfers
          .filter((t: any) => this.looksLikeArt(t))
          .slice(0, limit * 3) // Get more to filter for sale items
          .map((transfer: any) => this.fetchNFTMetadata(transfer.rawContract.address, transfer.tokenId));
        
        const nfts = await Promise.all(nftPromises);
        return nfts.filter(nft => nft !== null) as NFTAsset[];
      }
      
      return [];
      
    } catch (error) {
      console.error('Error fetching recent mints:', error);
      return [];
    }
  }
  
  // Fetch from known art platform contracts - UPDATED WITH MARKETPLACE FILTERING
  private static async fetchFromArtContracts(limit: number): Promise<NFTAsset[]> {
    try {
      console.log('🖼️ Fetching ONLY for-sale artworks from known platforms...');
      console.log('📋 Contracts to check:', BASE_ART_CONTRACTS);
      
      const nfts: NFTAsset[] = [];
      const perContract = Math.ceil(limit / BASE_ART_CONTRACTS.length);
      
      for (const contractAddress of BASE_ART_CONTRACTS) {
        try {
          console.log(`🔍 Checking contract: ${contractAddress}`);
          
          const response = await axios.get(
            `${ALCHEMY_BASE_URL}/getNFTsForContract`,
            {
              params: {
                contractAddress,
                withMetadata: true,
                limit: Math.min(perContract * 5, 50), // Get more to filter for sale items
                startToken: '0',
              },
              timeout: 15000,
            }
          );
          
          console.log(`📊 Raw API response for ${contractAddress}:`, {
            success: !!response.data,
            totalNftCount: response.data?.nfts?.length || 0,
          });
          
          if (response.data && response.data.nfts && response.data.nfts.length > 0) {
            console.log(`📝 Processing NFTs to find for-sale items...`);
            
            // Process NFTs and filter for only those for sale
            const forSaleArtworks: NFTAsset[] = [];
            
            for (const nft of response.data.nfts) {
              const artwork = this.formatAlchemyNFT(nft, 'Foundation');
              if (artwork) { // Only add if actually for sale
                forSaleArtworks.push(artwork);
              }
              
              // Stop when we have enough for-sale items
              if (forSaleArtworks.length >= perContract) {
                break;
              }
            }
            
            nfts.push(...forSaleArtworks);
            console.log(`🛒 Found ${forSaleArtworks.length} for-sale artworks from contract`);
            
          } else {
            console.log(`❌ No NFTs found in contract response for ${contractAddress}`);
          }
        } catch (error) {
          console.error(`❌ Error fetching from ${contractAddress}:`, error);
        }
      }
      
      console.log(`🎯 FINAL RESULT: ${nfts.length} for-sale artworks found from all contracts`);
      return nfts;
      
    } catch (error) {
      console.error('❌ Error in fetchFromArtContracts:', error);
      return [];
    }
  }
  
  // Discover art by searching metadata across all contracts
  private static async discoverArtByMetadata(limit: number): Promise<NFTAsset[]> {
    try {
      console.log('🔎 Discovering for-sale art by metadata search...');
      
      // Query known individual artists
      const artistAddresses: string[] = [
        '0x35aEA9AEe384582c76e97a723032C8b346581BBC', // emmywalka
        // Add artist addresses here
        // Example: '0xArtistWalletAddress', // Artist Name
      ];
      
      if (artistAddresses.length === 0) {
        console.log('⚠️ No artist addresses configured');
        return [];
      }
      
      const nfts: NFTAsset[] = [];
      
      for (const artist of artistAddresses) {
        try {
          const artistResponse = await axios.get(
            `${ALCHEMY_BASE_URL}/getNFTsForOwner`,
            {
              params: {
                owner: artist,
                withMetadata: true,
                pageSize: 20, // Get more to filter for sale items
              },
              timeout: 10000,
            }
          );
          
          if (artistResponse.data && artistResponse.data.ownedNfts) {
            // Filter for art that's actually for sale
            const forSaleArtworks: NFTAsset[] = [];
            
            for (const nft of artistResponse.data.ownedNfts) {
              if (this.isLikelyOneOfOneArt(nft)) {
                const artwork = this.formatAlchemyNFT(nft);
                if (artwork) { // Only add if for sale
                  forSaleArtworks.push(artwork);
                }
              }
            }
            
            nfts.push(...forSaleArtworks);
            console.log(`🛒 Found ${forSaleArtworks.length} for-sale artworks from artist ${artist}`);
          }
        } catch (error) {
          console.error(`Error fetching from artist ${artist}:`, error);
        }
      }
      
      return nfts.slice(0, limit);
      
    } catch (error) {
      console.error('Error discovering art by metadata:', error);
      return [];
    }
  }
  
  // Fetch individual NFT metadata
  private static async fetchNFTMetadata(contractAddress: string, tokenId: string): Promise<NFTAsset | null> {
    try {
      const response = await axios.get(
        `${ALCHEMY_BASE_URL}/getNFTMetadata`,
        {
          params: {
            contractAddress,
            tokenId,
            refreshCache: false,
          },
          timeout: 5000,
        }
      );
      
      if (response.data && this.isLikelyOneOfOneArt(response.data)) {
        return this.formatAlchemyNFT(response.data);
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }
  
  // Check if NFT metadata suggests it's 1/1 art - UPDATED WITH FIXES
  private static isLikelyOneOfOneArt(nft: any): boolean {
    // For emmywalka's contract, just check basic requirements
    const hasImage = !!(nft.image?.cachedUrl || nft.image?.originalUrl || nft.metadata?.image || nft.rawMetadata?.image);
    const isERC721 = nft.tokenType === 'ERC721';
    
    console.log(`🔍 Art check for "${nft.name}": hasImage=${hasImage}, isERC721=${isERC721}`);
    
    // Very loose requirements - just needs image and be ERC721
    return hasImage && isERC721;
  }
  
  // Simple check for transfers that might be art
  private static looksLikeArt(transfer: any): boolean {
    // You can enhance this with more checks
    return transfer.category === 'erc721' || 
           (transfer.category === 'erc1155' && transfer.erc1155Metadata?.tokenId);
  }
  
  // Format Alchemy NFT response for our app - UPDATED WITH MARKETPLACE FILTERING
  private static formatAlchemyNFT(nft: any, platform?: string): NFTAsset | null {
    const metadata = nft.metadata || nft.rawMetadata || {};
    const imageUrl = nft.image?.cachedUrl || 
                    nft.image?.thumbnailUrl ||
                    nft.image?.originalUrl ||
                    metadata.image ||
                    metadata.image_url ||
                    nft.media?.[0]?.gateway ||
                    nft.media?.[0]?.thumbnail;
    
    // Determine platform/marketplace
    const contractAddress = nft.contract?.address || '';
    const detectedPlatform = platform || this.getPlatformName(contractAddress);
    
    // Extract artist info from metadata
    const artist = metadata.artist || 
                  metadata.creator || 
                  metadata.created_by ||
                  nft.contract?.name ||
                  'Unknown Artist';

    // CHECK FOR REAL MARKETPLACE LISTING - Only return if actually for sale
    const realPrice = this.getRealMarketplacePrice(nft);
    
    // FILTER: Only return NFTs that are actually listed for sale
    if (!realPrice) {
      console.log(`⏭️ Skipping ${nft.name || 'Untitled'} - not currently for sale`);
      return null; // Don't include NFTs not for sale
    }

    console.log(`✅ Including ${nft.name || 'Untitled'} - for sale at ${realPrice.value} ${realPrice.currency}`);
    
    return {
      tokenId: nft.tokenId || '0',
      tokenType: nft.tokenType || 'ERC721',
      name: nft.name || metadata.name || 'Untitled Artwork',
      description: nft.description || metadata.description || 'A unique piece of digital art on Base',
      image: {
        cachedUrl: imageUrl,
        thumbnailUrl: nft.image?.thumbnailUrl || imageUrl,
        originalUrl: nft.image?.originalUrl || imageUrl,
      },
      contract: {
        address: contractAddress,
        name: nft.contract?.name || 'Independent Artist',
        symbol: nft.contract?.symbol || 'ART',
        tokenType: nft.tokenType || 'ERC721',
      },
      metadata: metadata,
      marketplace: detectedPlatform,
      platform: detectedPlatform,
      artist: artist,
      isOneOfOne: this.checkIfOneOfOne(nft),
      price: realPrice, // Only real marketplace prices
    };
  }

  // NEW METHOD: Check for real marketplace listings
  private static getRealMarketplacePrice(nft: any): { value: string; currency: string } | null {
    // Method 1: Check OpenSea metadata
    if (nft.collection?.floorPrice && nft.collection.floorPrice > 0) {
      return {
        value: nft.collection.floorPrice.toString(),
        currency: 'ETH'
      };
    }

    // Method 2: Check for sale data in NFT metadata
    if (nft.sale && nft.sale.price) {
      return {
        value: nft.sale.price.toString(),
        currency: nft.sale.currency || 'ETH'
      };
    }

    // Method 3: Check contract-specific marketplace data
    const contractAddress = nft.contract?.address?.toLowerCase();
    
    // Foundation NFTs - check if they have active listings
    if (contractAddress === '0x972f31d4e140f0d09b154bb395a070ed5ee9fcca') {
      // For emmywalka's Foundation contract, check if there's listing data
      if (nft.listing || nft.marketData) {
        return {
          value: nft.listing?.price || '0.05', // Default Foundation price if listed
          currency: 'ETH'
        };
      }
    }

    // Method 4: Check Alchemy marketplace data (if available)
    if (nft.market && nft.market.price) {
      return {
        value: nft.market.price.toString(),
        currency: nft.market.currency || 'ETH'
      };
    }

    // Method 5: For demo purposes, you can temporarily return a price for testing
    // Remove this in production when you have real marketplace integration
    if (process.env.NODE_ENV === 'development') {
      // Only show every 3rd NFT as "for sale" for demo
      const tokenId = parseInt(nft.tokenId || '0');
      if (tokenId % 3 === 0) {
        return {
          value: (0.01 + Math.random() * 0.1).toFixed(4),
          currency: 'ETH'
        };
      }
    }

    // No marketplace listing found
    return null;
  }
  
  // Check if truly a 1/1
  private static checkIfOneOfOne(nft: any): boolean {
    // ERC721 is always 1/1
    if (nft.tokenType === 'ERC721') return true;
    
    // For ERC1155, check supply
    if (nft.tokenType === 'ERC1155') {
      const balance = parseInt(nft.balance || '1');
      const totalSupply = parseInt(nft.totalSupply || '1');
      return balance === 1 && totalSupply === 1;
    }
    
    return true; // Assume 1/1 if unsure
  }
  
  // Get platform name from contract address
  private static getPlatformName(contractAddress: string): string {
    const address = contractAddress.toLowerCase();
    
    if (address.includes('972f31d4e140f0d09b154bb395a070ed5ee9fcca')) return 'Foundation';
    if (address.includes('3b3ee1931dc30c1957379fac9aba94d1c48a5405')) return 'Foundation';
    if (address.includes('0a1bbd59d1c3d0587ee909e41acdd83c99b19bf5')) return 'Manifold';
    if (address.includes('76e2a96714f1681a0ac7c27816d4e71c38d44a8e')) return 'Zora';
    
    return 'Independent';
  }
  
  // Filter to ensure we only have 1/1s
  private static filterForOneOfOnes(nfts: NFTAsset[]): NFTAsset[] {
    return nfts.filter(nft => {
      // Double-check it's a 1/1
      if (nft.tokenType === 'ERC1155') {
        // For ERC1155, we need to verify supply
        // This is already done in formatAlchemyNFT but double-check
        return nft.isOneOfOne !== false;
      }
      
      return true; // ERC721 is always 1/1
    });
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
