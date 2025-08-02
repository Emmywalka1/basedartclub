// services/nftService.ts - Debug Version with Looser Filtering
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
    console.log('🎨 Fetching artworks from Base blockchain...');
    console.log(`🎯 Target limit: ${limit} artworks`);
    
    try {
      const allArtworks: NFTAsset[] = [];
      
      // Focus on contract NFTs first since we know they exist
      console.log('📋 Step 1: Fetching artworks from contracts...');
      const contractArt = await this.fetchFromArtContracts(limit);
      console.log(`✅ Contract fetch result: ${contractArt.length} artworks`);
      allArtworks.push(...contractArt);
      
      // Only fetch from other sources if we need more
      if (allArtworks.length < limit) {
        console.log('📋 Step 2: Fetching artworks from artist wallet...');
        const discoveredArt = await this.discoverArtByMetadata(limit - allArtworks.length);
        console.log(`✅ Artist wallet result: ${discoveredArt.length} artworks`);
        allArtworks.push(...discoveredArt);
      }
      
      // Remove duplicates
      const uniqueArt = this.removeDuplicates(allArtworks);
      console.log(`🔄 After removing duplicates: ${uniqueArt.length} artworks`);
      
      // Shuffle and limit
      const finalArt = this.shuffleArray(uniqueArt).slice(0, limit);
      
      console.log(`🎉 FINAL SUCCESS: Returning ${finalArt.length} artworks to app`);
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
  
  // Fetch from known art platform contracts - UPDATED WITH DEBUG LOGGING
  private static async fetchFromArtContracts(limit: number): Promise<NFTAsset[]> {
    try {
      console.log('🖼️ Fetching artworks from known platforms...');
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
                limit: Math.min(perContract * 2, 20),
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
            console.log(`📝 Processing NFTs from contract...`);
            console.log(`🔍 Sample NFT data structure:`, response.data.nfts[0]);
            
            // Process NFTs with looser filtering
            const processedArtworks: NFTAsset[] = [];
            
            for (const nft of response.data.nfts.slice(0, perContract)) {
              const artwork = this.formatAlchemyNFT(nft, 'Foundation');
              if (artwork) {
                processedArtworks.push(artwork);
              }
            }
            
            nfts.push(...processedArtworks);
            console.log(`✅ Added ${processedArtworks.length} artworks from contract`);
            
          } else {
            console.log(`❌ No NFTs found in contract response for ${contractAddress}`);
          }
        } catch (error) {
          console.error(`❌ Error fetching from ${contractAddress}:`, error);
        }
      }
      
      console.log(`🎯 FINAL RESULT: ${nfts.length} artworks found from all contracts`);
      return nfts;
      
    } catch (error) {
      console.error('❌ Error in fetchFromArtContracts:', error);
      return [];
    }
  }
  
  // Discover art by searching metadata across all contracts
  private static async discoverArtByMetadata(limit: number): Promise<NFTAsset[]> {
    try {
      console.log('🔎 Discovering art by metadata search...');
      
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
                pageSize: 20,
              },
              timeout: 10000,
            }
          );
          
          if (artistResponse.data && artistResponse.data.ownedNfts) {
            // Filter for art with looser requirements
            const artworks: NFTAsset[] = [];
            
            for (const nft of artistResponse.data.ownedNfts.slice(0, 10)) {
              if (this.isLikelyOneOfOneArt(nft)) {
                const artwork = this.formatAlchemyNFT(nft);
                if (artwork) {
                  artworks.push(artwork);
                }
              }
            }
            
            nfts.push(...artworks);
            console.log(`✅ Found ${artworks.length} artworks from artist ${artist}`);
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
  
  // Format Alchemy NFT response for our app - UPDATED WITH LOOSER FILTERING
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
                  'emmywalka';

    // DEBUG: Log full NFT data structure to see what's available
    console.log(`🔍 DEBUG NFT Data for "${nft.name}":`, {
      hasListing: !!nft.listing,
      hasMarketData: !!nft.marketData,
      hasSale: !!nft.sale,
      hasMarket: !!nft.market,
      hasCollection: !!nft.collection,
      collectionData: nft.collection,
      rawData: Object.keys(nft),
    });

    // TEMPORARY: For now, show all artworks with estimated prices
    // This allows us to see artworks while we debug marketplace integration
    const price = this.getEstimatedPrice(nft, detectedPlatform);
    
    console.log(`✅ Including "${nft.name || 'Untitled'}" - estimated price: ${price.value} ${price.currency}`);
    
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
        name: nft.contract?.name || 'emmywalka Collection',
        symbol: nft.contract?.symbol || 'ART',
        tokenType: nft.tokenType || 'ERC721',
      },
      metadata: metadata,
      marketplace: detectedPlatform,
      platform: detectedPlatform,
      artist: artist,
      isOneOfOne: this.checkIfOneOfOne(nft),
      price: price,
    };
  }

  // TEMPORARY: Estimated prices while we work on real marketplace integration
  private static getEstimatedPrice(nft: any, platform: string): { value: string; currency: string } {
    // Base prices by platform
    const basePrices: Record<string, number> = {
      'Foundation': 0.05,
      'Manifold': 0.02,
      'Zora': 0.01,
      'Independent': 0.03,
    };
    
    const basePrice = basePrices[platform] || 0.02;
    const variance = 0.5 + Math.random(); // 0.5x to 1.5x
    const price = (basePrice * variance).toFixed(4);
    
    return {
      value: price,
      currency: 'ETH'
    };
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
