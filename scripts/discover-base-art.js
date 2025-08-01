// scripts/discover-base-art.js
// Helper script to discover 1/1 art on Base
// Run with: node scripts/discover-base-art.js

const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const ALCHEMY_BASE_URL = `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}`;

// Test contracts to check (add any you find)
const TEST_CONTRACTS = [
  // Add contract addresses here as you find them
  // Example: '0x1234567890abcdef1234567890abcdef12345678'
];

// Known artist wallets (add as you discover them)
const KNOWN_ARTISTS = [
  // Add artist wallet addresses here
  // Example: '0xArtistWalletAddress'
];

async function checkContract(contractAddress) {
  console.log(`\n🔍 Checking contract: ${contractAddress}`);
  
  try {
    // Get contract metadata
    const metadataResponse = await axios.get(
      `${ALCHEMY_BASE_URL}/getContractMetadata`,
      {
        params: { contractAddress },
        timeout: 10000,
      }
    );
    
    const metadata = metadataResponse.data;
    console.log(`📋 Contract Name: ${metadata.name || 'Unknown'}`);
    console.log(`📋 Symbol: ${metadata.symbol || 'Unknown'}`);
    console.log(`📋 Token Type: ${metadata.tokenType || 'Unknown'}`);
    
    // Get some NFTs from this contract
    const nftsResponse = await axios.get(
      `${ALCHEMY_BASE_URL}/getNFTsForContract`,
      {
        params: {
          contractAddress,
          withMetadata: true,
          limit: 5,
        },
        timeout: 10000,
      }
    );
    
    if (nftsResponse.data && nftsResponse.data.nfts) {
      const nfts = nftsResponse.data.nfts;
      console.log(`✅ Found ${nfts.length} NFTs`);
      
      // Check if these look like 1/1 art
      let artCount = 0;
      nfts.forEach((nft, index) => {
        const name = nft.name || nft.metadata?.name || 'Untitled';
        const description = nft.description || nft.metadata?.description || '';
        const hasImage = !!(nft.image || nft.metadata?.image);
        
        // Simple art detection
        const looksLikeArt = 
          hasImage && 
          !name.toLowerCase().includes('#') && // Not numbered collection
          (name.toLowerCase().includes('art') || 
           description.toLowerCase().includes('art') ||
           description.toLowerCase().includes('piece') ||
           description.toLowerCase().includes('work'));
        
        if (looksLikeArt) {
          artCount++;
          console.log(`  🎨 Potential 1/1 Art: "${name}"`);
        }
      });
      
      if (artCount > 0) {
        console.log(`\n⭐ This contract likely contains 1/1 art! (${artCount}/${nfts.length} pieces)`);
        return true;
      } else {
        console.log(`\n❌ This appears to be a collection, not 1/1 art`);
        return false;
      }
    }
    
  } catch (error) {
    console.error(`❌ Error checking contract: ${error.message}`);
    return false;
  }
}

async function discoverRecentContracts() {
  console.log('\n🔍 Discovering recent NFT contracts on Base...\n');
  
  try {
    // Get recent NFT transfers
    const response = await axios.get(
      `${ALCHEMY_BASE_URL}/getAssetTransfers`,
      {
        params: {
          fromBlock: '0x0',
          toBlock: 'latest',
          category: ['erc721', 'erc1155'],
          withMetadata: false,
          excludeZeroValue: true,
          maxCount: 1000,
          order: 'desc',
        },
        timeout: 20000,
      }
    );
    
    if (response.data && response.data.transfers) {
      // Extract unique contract addresses
      const contracts = new Set();
      response.data.transfers.forEach(transfer => {
        if (transfer.rawContract && transfer.rawContract.address) {
          contracts.add(transfer.rawContract.address);
        }
      });
      
      console.log(`📊 Found ${contracts.size} unique NFT contracts with recent activity\n`);
      
      // Check each contract
      const artContracts = [];
      let checked = 0;
      
      for (const contract of contracts) {
        if (checked >= 10) break; // Limit to avoid rate limits
        
        const isArt = await checkContract(contract);
        if (isArt) {
          artContracts.push(contract);
        }
        
        checked++;
        
        // Rate limit prevention
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log('\n\n📋 Summary:');
      console.log('===========');
      console.log(`Contracts checked: ${checked}`);
      console.log(`Potential 1/1 art contracts found: ${artContracts.length}`);
      
      if (artContracts.length > 0) {
        console.log('\n🎨 Add these to your BASE_ART_CONTRACTS:');
        artContracts.forEach(contract => {
          console.log(`  '${contract}',`);
        });
      }
      
    }
  } catch (error) {
    console.error('Error discovering contracts:', error.message);
  }
}

async function searchForArtists() {
  console.log('\n🔍 Searching for potential artists on Base...\n');
  
  // This is a placeholder - in reality, you'd need to:
  // 1. Query known artist wallets
  // 2. Check social media APIs
  // 3. Parse on-chain data for creator addresses
  
  console.log('💡 Tips for finding artists:');
  console.log('1. Search Twitter/X for: #BaseNFT art 1/1');
  console.log('2. Check Farcaster art channels');
  console.log('3. Look at BaseScan for recent NFT contract deployments');
  console.log('4. Join Base Discord/Telegram communities');
}

async function main() {
  console.log('🚀 Base Art Discovery Tool');
  console.log('=========================\n');
  
  if (!ALCHEMY_API_KEY) {
    console.error('❌ NEXT_PUBLIC_ALCHEMY_API_KEY not found in .env.local');
    return;
  }
  
  // Check any manually added contracts
  if (TEST_CONTRACTS.length > 0) {
    console.log('📋 Checking manually added contracts...');
    for (const contract of TEST_CONTRACTS) {
      await checkContract(contract);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
    }
  }
  
  // Discover new contracts
  await discoverRecentContracts();
  
  // Search for artists
  await searchForArtists();
  
  console.log('\n\n✅ Discovery complete!');
  console.log('\n💡 Next steps:');
  console.log('1. Add discovered contracts to services/nftService.ts');
  console.log('2. Test your app with real data');
  console.log('3. Follow Base artists on social media');
  console.log('4. Run this script periodically to find new art');
  console.log('\n📝 To run this script again: node scripts/discover-base-art.js');
}

// Run the discovery
main().catch(console.error);
