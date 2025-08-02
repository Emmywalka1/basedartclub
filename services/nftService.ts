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
  
  // Main function to fetch 1/1 art from Base
 static async fetchCuratedNFTs(limit: number = 20): Promise<NFTAsset[]> {
  console.log('🎨 Fetching real 1/1 art from Base blockchain...');
  console.log(`🎯 Target limit: ${limit} artworks`);
  
  try {
    const allArtworks: NFTAsset[] = [];
    
    // Focus on contract NFTs first since we know they exist
    console.log('📋 Step 1: Fetching from contracts...');
    const contractArt = await this.fetchFromArtContracts(limit);
    console.log(`✅ Contract fetch result: ${contractArt.length} artworks`);
    allArtworks.push(...contractArt);
    
    // Only fetch from other sources if we need more
    if (allArtworks.length < limit) {
      console.log('📋 Step 2: Fetching from artist wallet...');
      const discoveredArt = await this.discoverArtByMetadata(limit - allArtworks.length);
      console.log(`✅ Artist wallet result: ${discoveredArt.length} artworks`);
      allArtworks.push(...discoveredArt);
    }
    
    // Remove duplicates but don't filter for art (we trust emmywalka's contract)
    const uniqueArt = this.removeDuplicates(allArtworks);
    console.log(`🔄 After removing duplicates: ${uniqueArt.length} artworks`);
    
    // Shuffle and limit
    const finalArt = this.shuffleArray(uniqueArt).slice(0, limit);
    
    console.log(`🎉 FINAL SUCCESS: Returning ${finalArt.length} artworks to app`);
    finalArt.forEach((art, i) => {
      console.log(`   ${i + 1}. "${art.name}" by ${art.artist} (${art.platform})`);
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
          .slice(0, limit)
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
  
  // Fetch from known art platform contracts
 private static async fetchFromArtContracts(limit: number): Promise<NFTAsset[]> {
  try {
    console.log('🖼️ Fetching from known art platforms on Base...');
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
              limit: Math.min(perContract * 2, 20), // Limit to prevent timeouts
              startToken: '0', // Start from beginning
            },
            timeout: 15000,
          }
        );
        
        console.log(`📊 Raw API response for ${contractAddress}:`, {
          success: !!response.data,
          nftCount: response.data?.nfts?.length || 0,
          totalSupply: response.data?.totalSupply || 'unknown'
        });
        
        if (response.data && response.data.nfts && response.data.nfts.length > 0) {
          console.log(`📝 First NFT sample:`, response.data.nfts[0]);
          
          // REMOVE STRICT FILTERING - Just take all NFTs from emmywalka's contract
          const allContractNfts = response.data.nfts.slice(0, perContract);
          
          console.log(`✅ Processing ${allContractNfts.length} NFTs from emmywalka contract (no art filtering)`);
          
          const artworks = allContractNfts.map((nft: any) => {
            console.log(`🎨 Processing NFT: ${nft.name || 'Untitled'} (${nft.tokenId})`);
            return this.formatAlchemyNFT(nft, 'Foundation');
          });
          
          nfts.push(...artworks);
          console.log(`📦 Added ${artworks.length} total artworks from contract`);
          
          // Log what we're adding
          artworks.forEach((artwork, i) => {
            console.log(`   ${i + 1}. "${artwork.name}" by ${artwork.artist} (${artwork.tokenId})`);
          });
          
        } else {
          console.log(`❌ No NFTs found in contract response for ${contractAddress}`);
          console.log('Full response:', response.data);
        }
      } catch (error) {
        console.error(`❌ Error fetching from ${contractAddress}:`, error);
        console.error('Error details:', error.response?.data);
      }
    }
    
    console.log(`🎯 FINAL RESULT: ${nfts.length} total artworks found from all contracts`);
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
                pageSize: 10,
              },
              timeout: 10000,
            }
          );
          
          if (artistResponse.data && artistResponse.data.ownedNfts) {
            const artworks = artistResponse.data.ownedNfts
              .filter((nft: any) => this.isLikelyOneOfOneArt(nft))
              .map((nft: any) => this.formatAlchemyNFT(nft));
            
            nfts.push(...artworks);
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
  
  // Check if NFT metadata suggests it's 1/1 art
  private static isLikelyOneOfOneArt(nft: any): boolean {
    // Check if it has an image
    if (!nft.image && !nft.metadata?.image && !nft.rawMetadata?.image) {
      return false;
    }
    
    // Check token type and supply
    if (nft.tokenType === 'ERC1155' && nft.balance && parseInt(nft.balance) > 1) {
      return false; // Not a 1/1 if multiple editions
    }
    
    // Check name and description for art keywords
    const name = (nft.name || nft.title || nft.metadata?.name || '').toLowerCase();
    const description = (nft.description || nft.metadata?.description || '').toLowerCase();
    const combined = name + ' ' + description;
    
    // Check for art keywords
    const hasArtKeywords = ART_KEYWORDS.some(keyword => combined.includes(keyword));
    
    // Check for non-art indicators (PFPs, gaming, etc.)
    const nonArtKeywords = ['punk', 'ape', 'avatar', 'pfp', 'game', 'badge', 'ticket', 'pass'];
    const hasNonArtKeywords = nonArtKeywords.some(keyword => combined.includes(keyword));
    
    // Check collection size (1/1s often have small collections)
    const collectionName = nft.contract?.name || '';
    const looksLikeCollection = /^.+\s#\d+$/.test(name); // "Name #123" pattern
    
    return hasArtKeywords && !hasNonArtKeywords && !looksLikeCollection;
  }
  
  // Simple check for transfers that might be art
  private static looksLikeArt(transfer: any): boolean {
    // You can enhance this with more checks
    return transfer.category === 'erc721' || 
           (transfer.category === 'erc1155' && transfer.erc1155Metadata?.tokenId);
  }
  
  // Format Alchemy NFT response for our app
  private static formatAlchemyNFT(nft: any, platform?: string): NFTAsset {
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
      price: this.estimatePrice(nft, detectedPlatform),
    };
  }
  
  // Check if truly a 1/1
 private static isLikelyOneOfOneArt(nft: any): boolean {
  // For emmywalka's contract, just check basic requirements
  const hasImage = !!(nft.image?.cachedUrl || nft.image?.originalUrl || nft.metadata?.image || nft.rawMetadata?.image);
  const isERC721 = nft.tokenType === 'ERC721';
  
  console.log(`🔍 Art check for "${nft.name}": hasImage=${hasImage}, isERC721=${isERC721}`);
  
  // Very loose requirements - just needs image and be ERC721
  return hasImage && isERC721;
  
  // Get platform name from contract address
  private static getPlatformName(contractAddress: string): string {
    const address = contractAddress.toLowerCase();
    
    if (address.includes('972f31d4e140f0d09b154bb395a070ed5ee9fcca')) return 'Foundation';
    if (address.includes('3b3ee1931dc30c1957379fac9aba94d1c48a5405')) return 'Foundation';
    if (address.includes('0a1bbd59d1c3d0587ee909e41acdd83c99b19bf5')) return 'Manifold';
    if (address.includes('76e2a96714f1681a0ac7c27816d4e71c38d44a8e')) return 'Zora';
    
    return 'Independent';
  }
  
  // Estimate price based on platform (real prices would come from marketplace APIs)
  private static estimatePrice(nft: any, platform: string): { value: string; currency: string } {
    // You could integrate with real pricing APIs here
    const basePrices: Record<string, number> = {
      'Foundation': 0.05,
      'Manifold': 0.02,
      'Zora': 0.01,
      'Independent': 0.03,
    };
    
    const basePrice = basePrices[platform] || 0.01;
    const variance = 0.5 + Math.random(); // 0.5x to 1.5x
    const price = (basePrice * variance).toFixed(4);
    
    return {
      value: price,
      currency: 'ETH'
    };
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
