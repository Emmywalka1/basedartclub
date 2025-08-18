// scripts/find-all-base-art.js
// Comprehensive script to find ALL art on Base - both listed and unlisted
// Run with: node scripts/find-all-base-art.js

const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

// Your existing contracts (may not have listings)
const EXISTING_CONTRACTS = [
  '0x972f31D4E140F0d09b154Bb395a070ED5ee9fccA', // Blu World 2 (emmywalka)
  '0x58FD65a42D33F080543b5f98A1Cfa9fBCe9FbB4A', // juujuumama
  '0x524cab2ec69124574082676e6f654a18df49a048', // Your contract
];

// Step 1: Find ALL active listings on Base
async function findAllActiveListings() {
  console.log('🔍 Step 1: Finding ALL active listings on Base...\n');
  
  const listings = [];
  
  try {
    // Get active orders from Reservoir
    const response = await axios.get(
      `https://api-base.reservoir.tools/orders/asks/v5`,
      {
        params: {
          status: 'active',
          limit: 200, // Get more results
          sortBy: 'price',
          normalizeRoyalties: true,
        },
        headers: {
          'accept': 'application/json',
        },
        timeout: 15000,
      }
    );
    
    const orders = response.data?.orders || [];
    console.log(`Found ${orders.length} total active listings\n`);
    
    // Process and categorize listings
    const contractMap = new Map();
    
    for (const order of orders) {
      const contract = order.criteria?.data?.collection?.id;
      const tokenId = order.criteria?.data?.token?.tokenId;
      
      if (contract && tokenId) {
        if (!contractMap.has(contract)) {
          contractMap.set(contract, []);
        }
        
        contractMap.get(contract).push({
          tokenId,
          price: order.price.amount.decimal,
          currency: order.price.currency.symbol,
          marketplace: order.source.name,
          maker: order.maker,
        });
      }
    }
    
    // Get collection info for contracts with listings
    console.log('📊 Contracts with active listings:\n');
    
    for (const [contract, tokens] of contractMap.entries()) {
      try {
        // Get collection metadata
        const collectionResponse = await axios.get(
          `https://api-base.reservoir.tools/collections/v7`,
          {
            params: {
              contract: contract,
            },
            headers: {
              'accept': 'application/json',
            },
            timeout: 5000,
          }
        );
        
        const collection = collectionResponse.data?.collections?.[0];
        
        if (collection) {
          listings.push({
            contract,
            name: collection.name || 'Unknown',
            tokenCount: tokens.length,
            floorPrice: collection.floorAsk?.price?.amount?.decimal || tokens[0].price,
            tokens: tokens.slice(0, 5), // First 5 tokens
          });
          
          console.log(`✅ ${collection.name || 'Unknown Collection'}`);
          console.log(`   Contract: ${contract}`);
          console.log(`   Listed tokens: ${tokens.length}`);
          console.log(`   Floor price: ${collection.floorAsk?.price?.amount?.decimal || tokens[0].price} ETH`);
          console.log(`   Marketplaces: ${[...new Set(tokens.map(t => t.marketplace))].join(', ')}`);
          console.log('');
        }
      } catch (error) {
        // Skip if can't get collection info
      }
      
      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return listings;
    
  } catch (error) {
    console.error('Error finding listings:', error.message);
    return [];
  }
}

// Step 2: Check your existing contracts
async function checkExistingContracts() {
  console.log('\n🔍 Step 2: Checking your existing contracts...\n');
  
  for (const contract of EXISTING_CONTRACTS) {
    try {
      // Get contract metadata
      const metadataResponse = await axios.get(
        `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getContractMetadata`,
        {
          params: { contractAddress: contract },
          timeout: 10000,
        }
      );
      
      const metadata = metadataResponse.data;
      console.log(`📌 ${metadata.name || 'Unknown'} (${contract})`);
      console.log(`   Symbol: ${metadata.symbol || 'N/A'}`);
      console.log(`   Total Supply: ${metadata.totalSupply || 'Unknown'}`);
      
      // Check for listings
      const ordersResponse = await axios.get(
        `https://api-base.reservoir.tools/orders/asks/v5`,
        {
          params: {
            contracts: contract,
            status: 'active',
          },
          headers: {
            'accept': 'application/json',
          },
          timeout: 5000,
        }
      );
      
      const orders = ordersResponse.data?.orders || [];
      
      if (orders.length > 0) {
        console.log(`   ✅ ${orders.length} active listings found!`);
        orders.slice(0, 3).forEach(order => {
          console.log(`      Token #${order.criteria?.data?.token?.tokenId}: ${order.price.amount.decimal} ETH on ${order.source.name}`);
        });
      } else {
        console.log(`   ❌ No active listings`);
      }
      
      console.log('');
      
    } catch (error) {
      console.log(`❌ Error checking ${contract}: ${error.message}\n`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// Step 3: Find art-specific platforms
async function findArtPlatforms() {
  console.log('\n🔍 Step 3: Finding Base-native art platforms...\n');
  
  const artContracts = [];
  
  // Check Zora
  try {
    console.log('Checking Zora on Base...');
    const zoraResponse = await axios.get(
      `https://api.zora.co/discover/feeds/onchain/recent?chains=BASE&limit=20`,
      {
        headers: { 'Accept': 'application/json' },
        timeout: 10000,
      }
    );
    
    if (zoraResponse.data?.tokens) {
      const zoraCollections = new Set();
      zoraResponse.data.tokens.forEach(token => {
        if (token.collection?.address) {
          zoraCollections.add(token.collection.address);
        }
      });
      
      console.log(`✅ Found ${zoraCollections.size} Zora collections on Base`);
      Array.from(zoraCollections).slice(0, 5).forEach(contract => {
        artContracts.push({ contract, platform: 'Zora' });
      });
    }
  } catch (error) {
    console.log('❌ Could not fetch Zora data');
  }
  
  // Check for Manifold contracts
  try {
    console.log('\nChecking for Manifold contracts...');
    // Manifold uses specific contract patterns
    // You can identify them by checking contract metadata
  } catch (error) {
    console.log('❌ Could not check Manifold');
  }
  
  return artContracts;
}

// Step 4: Generate recommendations
async function generateRecommendations(activeListings, artPlatforms) {
  console.log('\n\n📋 FINAL RECOMMENDATIONS');
  console.log('========================\n');
  
  console.log('1. CONTRACTS TO ADD FOR REAL PRICES:\n');
  
  // Prioritize contracts with most listings
  const sortedListings = activeListings
    .sort((a, b) => b.tokenCount - a.tokenCount)
    .slice(0, 10);
  
  console.log('Add these to your BASE_ART_CONTRACTS:\n');
  console.log('const BASE_ART_CONTRACTS = [');
  console.log('  // Your existing contracts (may not have active listings)');
  EXISTING_CONTRACTS.forEach(contract => {
    console.log(`  '${contract}',`);
  });
  console.log('  ');
  console.log('  // Contracts with REAL active listings on Base');
  sortedListings.forEach(listing => {
    console.log(`  '${listing.contract}', // ${listing.name} - ${listing.tokenCount} listings, floor: ${listing.floorPrice} ETH`);
  });
  console.log('];');
  
  console.log('\n2. HOW TO HANDLE PRICES:\n');
  console.log('- For contracts WITH listings: Show real marketplace prices');
  console.log('- For contracts WITHOUT listings: Show estimated prices or "Not for sale"');
  console.log('- Always check Reservoir API first for real-time prices');
  
  console.log('\n3. DISPLAY STRATEGY:\n');
  console.log('- Mix listed and unlisted artworks for variety');
  console.log('- Clearly indicate which are for sale vs. display only');
  console.log('- For unlisted items, show "View on Foundation" or similar');
  
  console.log('\n4. USER EXPERIENCE:\n');
  console.log('- "Collect" button only for items with real listings');
  console.log('- "Make Offer" for unlisted items');
  console.log('- Show marketplace source (OpenSea, Blur, etc.)');
}

// Main function
async function main() {
  console.log('🚀 Comprehensive Base Art Discovery');
  console.log('====================================\n');
  
  // Step 1: Find all active listings
  const activeListings = await findAllActiveListings();
  
  // Step 2: Check existing contracts
  await checkExistingContracts();
  
  // Step 3: Find art platforms
  const artPlatforms = await findArtPlatforms();
  
  // Step 4: Generate recommendations
  await generateRecommendations(activeListings, artPlatforms);
  
  console.log('\n✅ Discovery complete!');
  console.log('\nNext steps:');
  console.log('1. Update your BASE_ART_CONTRACTS with the recommended contracts');
  console.log('2. Your app will show real prices for listed items');
  console.log('3. Unlisted items will show estimated prices');
  console.log('4. Users can discover both listed and unlisted art!');
}

main().catch(console.error);
