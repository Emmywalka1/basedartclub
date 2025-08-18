// scripts/find-base-native-art.js
// Find art that's ACTUALLY for sale on Base (not mainnet)
// Run with: node scripts/find-base-native-art.js

const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

// Known Base-native art platforms and contracts
const BASE_NATIVE_PLATFORMS = {
  // Zora on Base
  ZORA: [
    '0x76744367ae5a056381868f716bdf0b13ae1aeaa3', // Zora Network
  ],
  
  // Mint.fun collections
  MINT_FUN: [
    '0x1234567890abcdef1234567890abcdef12345678', // Add actual Mint.fun contracts
  ],
  
  // Sound.xyz on Base
  SOUND_XYZ: [
    '0xabcdef1234567890abcdef1234567890abcdef12', // Add Sound.xyz contracts
  ],
  
  // Manifold on Base
  MANIFOLD: [
    '0x0a1bbd59d1c3d0587ee909e41acdd83c99b19bf5', // Example Manifold contract
  ],
  
  // Independent artists on Base
  INDEPENDENT: [
    '0x524cab2ec69124574082676e6f654a18df49a048', // Your contract
    // Add more as you find them
  ]
};

// Search for listings on Base-native platforms
async function findBaseNativeListings() {
  console.log('🔍 Searching for Base-native art listings...\n');
  
  const allListings = [];
  
  try {
    // Query Reservoir for ALL active listings on Base
    const response = await axios.get(
      `https://api-base.reservoir.tools/orders/asks/v5`,
      {
        params: {
          status: 'active',
          limit: 100,
          sortBy: 'createdAt',
          includePrivate: false,
        },
        headers: {
          'accept': 'application/json',
        },
        timeout: 10000,
      }
    );
    
    const orders = response.data?.orders || [];
    
    console.log(`Found ${orders.length} active listings on Base\n`);
    
    // Filter for 1/1 art (single token listings, not collection offers)
    const artListings = [];
    
    for (const order of orders) {
      const tokenData = order.criteria?.data?.token;
      
      if (tokenData?.tokenId) {
        // This is a specific token listing (likely 1/1)
        const contract = order.criteria?.data?.collection?.id;
        
        // Get more info about this NFT
        try {
          const tokenResponse = await axios.get(
            `https://api-base.reservoir.tools/tokens/v7`,
            {
              params: {
                tokens: `${contract}:${tokenData.tokenId}`,
                includeAttributes: false,
              },
              headers: {
                'accept': 'application/json',
              },
              timeout: 5000,
            }
          );
          
          const token = tokenResponse.data?.tokens?.[0];
          
          if (token) {
            const listing = {
              contract: contract,
              tokenId: tokenData.tokenId,
              name: token.name || `Token #${tokenData.tokenId}`,
              collection: token.collection?.name || 'Unknown',
              price: order.price.amount.decimal,
              currency: order.price.currency.symbol,
              marketplace: order.source.name,
              image: token.image,
              seller: order.maker,
            };
            
            artListings.push(listing);
            
            console.log(`✅ Found Base-native listing:`);
            console.log(`   Collection: ${listing.collection}`);
            console.log(`   Token: ${listing.name}`);
            console.log(`   Price: ${listing.price} ${listing.currency}`);
            console.log(`   Marketplace: ${listing.marketplace}`);
            console.log(`   Contract: ${listing.contract}`);
            console.log('');
          }
        } catch (error) {
          // Skip if can't get token details
        }
        
        // Rate limit
        if (artListings.length % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    
    return artListings;
    
  } catch (error) {
    console.error('Error searching for Base listings:', error.message);
    return [];
  }
}

// Find Zora listings specifically
async function findZoraListings() {
  console.log('\n🔍 Checking Zora on Base...\n');
  
  try {
    // Zora API for Base
    const response = await axios.get(
      `https://api.zora.co/discover/feeds/onchain/recent?chains=BASE`,
      {
        headers: {
          'Accept': 'application/json',
        },
        timeout: 10000,
      }
    );
    
    if (response.data?.tokens) {
      console.log(`✅ Found ${response.data.tokens.length} recent Zora mints on Base`);
      
      const zoraContracts = new Set();
      response.data.tokens.slice(0, 10).forEach(token => {
        if (token.collection?.address) {
          zoraContracts.add(token.collection.address);
          console.log(`   ${token.collection.name || 'Unknown'}: ${token.collection.address}`);
        }
      });
      
      return Array.from(zoraContracts);
    }
  } catch (error) {
    console.log('❌ Could not fetch Zora data:', error.message);
  }
  
  return [];
}

// Main function
async function main() {
  console.log('🚀 Finding Base-Native Art with Real Prices');
  console.log('===========================================\n');
  
  // Find all Base-native listings
  const baseListings = await findBaseNativeListings();
  
  // Find Zora contracts
  const zoraContracts = await findZoraListings();
  
  // Summary
  console.log('\n\n📊 SUMMARY');
  console.log('==========');
  
  if (baseListings.length > 0) {
    console.log(`✅ Found ${baseListings.length} artworks with REAL Base prices!\n`);
    
    // Get unique contracts
    const uniqueContracts = [...new Set(baseListings.map(l => l.contract))];
    
    console.log('Add these contracts to your BASE_ART_CONTRACTS in nftService.ts:\n');
    uniqueContracts.slice(0, 10).forEach(contract => {
      const listings = baseListings.filter(l => l.contract === contract);
      const collection = listings[0]?.collection || 'Unknown';
      console.log(`  '${contract}', // ${collection} - ${listings.length} listings`);
    });
    
    console.log('\n\nSample listings with real prices:');
    baseListings.slice(0, 5).forEach(listing => {
      console.log(`\n${listing.collection} - ${listing.name}`);
      console.log(`Price: ${listing.price} ${listing.currency}`);
      console.log(`Marketplace: ${listing.marketplace}`);
      console.log(`Contract: ${listing.contract}`);
      console.log(`Token ID: ${listing.tokenId}`);
    });
  }
  
  if (zoraContracts.length > 0) {
    console.log('\n\nZora contracts on Base to add:');
    zoraContracts.forEach(contract => {
      console.log(`  '${contract}', // Zora on Base`);
    });
  }
  
  console.log('\n\n✅ These are REAL listings on Base with Base ETH prices!');
  console.log('Add these contracts to your app to show real marketplace prices.');
}

main().catch(console.error);
