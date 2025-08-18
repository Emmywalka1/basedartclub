// scripts/test-individual-nft-prices.js
// Test individual NFT listings (for 1/1 art)
// Run with: node scripts/test-individual-nft-prices.js

const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

// Get all NFTs from a contract and check each one for listings
async function checkAllNFTsInContract(contractAddress, contractName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎨 Checking all NFTs in ${contractName}`);
  console.log(`Contract: ${contractAddress}`);
  console.log(`${'='.repeat(60)}\n`);
  
  const listedNFTs = [];
  
  try {
    // First, get all NFTs in the contract
    const nftsResponse = await axios.get(
      `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForContract`,
      {
        params: {
          contractAddress: contractAddress,
          withMetadata: false, // Don't need full metadata for initial scan
          limit: 100, // Get more NFTs
        },
        timeout: 10000,
      }
    );
    
    const nfts = nftsResponse.data?.nfts || [];
    console.log(`Found ${nfts.length} NFTs in contract\n`);
    
    // Check each NFT for listings
    for (const nft of nfts.slice(0, 20)) { // Check first 20 to avoid rate limits
      try {
        // Check Reservoir for this specific token
        const response = await axios.get(
          `https://api-base.reservoir.tools/tokens/v7`,
          {
            params: {
              tokens: `${contractAddress}:${nft.tokenId}`,
              includeTopBid: true,
              includeLastSale: true,
            },
            headers: {
              'accept': 'application/json',
            },
            timeout: 5000,
          }
        );
        
        const token = response.data?.tokens?.[0];
        
        if (token?.market?.floorAsk?.price?.amount?.decimal) {
          // Found a listing!
          const listing = {
            tokenId: nft.tokenId,
            name: token.name || `Token #${nft.tokenId}`,
            price: token.market.floorAsk.price.amount.decimal,
            currency: token.market.floorAsk.price.currency?.symbol || 'ETH',
            source: token.market.floorAsk.source?.name || 'Unknown',
            maker: token.market.floorAsk.maker,
            validUntil: token.market.floorAsk.validUntil,
          };
          
          listedNFTs.push(listing);
          
          console.log(`✅ Token #${nft.tokenId} LISTED:`);
          console.log(`   Price: ${listing.price} ${listing.currency}`);
          console.log(`   Marketplace: ${listing.source}`);
          console.log(`   Seller: ${listing.maker?.slice(0, 8)}...`);
          console.log('');
        } else if (token?.lastSale?.price?.amount?.decimal) {
          // Has last sale data
          console.log(`💰 Token #${nft.tokenId} - Last Sale: ${token.lastSale.price.amount.decimal} ETH`);
        } else {
          // No listing or sale data
          console.log(`❌ Token #${nft.tokenId} - Not listed`);
        }
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.log(`❌ Token #${nft.tokenId} - Error checking: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error(`Error fetching NFTs from contract: ${error.message}`);
  }
  
  return listedNFTs;
}

// Check specific tokens we know might be listed
async function checkSpecificTokens() {
  console.log('\n🔍 Checking specific tokens for listings...\n');
  
  // You can add specific token IDs here if you know them
  const specificTokens = [
    { contract: '0x972f31D4E140F0d09b154Bb395a070ED5ee9fccA', tokenId: '1', name: 'emmywalka #1' },
    { contract: '0x972f31D4E140F0d09b154Bb395a070ED5ee9fccA', tokenId: '2', name: 'emmywalka #2' },
    { contract: '0x972f31D4E140F0d09b154Bb395a070ED5ee9fccA', tokenId: '3', name: 'emmywalka #3' },
    // Add more specific tokens
  ];
  
  for (const token of specificTokens) {
    try {
      // Check all active orders for this token
      const ordersResponse = await axios.get(
        `https://api-base.reservoir.tools/orders/asks/v5`,
        {
          params: {
            token: `${token.contract}:${token.tokenId}`,
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
        console.log(`✅ ${token.name} has ${orders.length} active listing(s):`);
        orders.forEach(order => {
          console.log(`   Price: ${order.price.amount.decimal} ${order.price.currency.symbol}`);
          console.log(`   Marketplace: ${order.source.name}`);
          console.log(`   Valid Until: ${new Date(order.validUntil * 1000).toLocaleString()}`);
        });
        console.log('');
      } else {
        console.log(`❌ ${token.name} - No active listings`);
      }
      
    } catch (error) {
      console.log(`Error checking ${token.name}: ${error.message}`);
    }
  }
}

// Search for ANY listed 1/1 art on Base
async function findAnyListed1of1s() {
  console.log('\n🔍 Searching for ANY listed 1/1 art on Base...\n');
  
  try {
    // Get recent active listings
    const response = await axios.get(
      `https://api-base.reservoir.tools/orders/asks/v5`,
      {
        params: {
          status: 'active',
          limit: 50,
          sortBy: 'price',
          normalizeRoyalties: true,
        },
        headers: {
          'accept': 'application/json',
        },
        timeout: 10000,
      }
    );
    
    const orders = response.data?.orders || [];
    const oneOfOnes = [];
    
    console.log(`Found ${orders.length} active listings, filtering for 1/1s...\n`);
    
    for (const order of orders) {
      const tokenInfo = order.criteria?.data?.token;
      
      if (tokenInfo?.tokenId) {
        // Check if it's likely a 1/1 (single token listing, not collection offer)
        const contract = order.criteria?.data?.collection?.id;
        
        // Get token details to check if it's art
        try {
          const tokenResponse = await axios.get(
            `https://api-base.reservoir.tools/tokens/v7`,
            {
              params: {
                tokens: `${contract}:${tokenInfo.tokenId}`,
              },
              headers: {
                'accept': 'application/json',
              },
              timeout: 5000,
            }
          );
          
          const token = tokenResponse.data?.tokens?.[0];
          
          // Check if it looks like 1/1 art (no rarity rank, single supply, etc.)
          if (token && (!token.rarityRank || token.supply === '1')) {
            oneOfOnes.push({
              contract: contract,
              tokenId: tokenInfo.tokenId,
              name: token.name || `Token #${tokenInfo.tokenId}`,
              collection: token.collection?.name || 'Unknown',
              price: order.price.amount.decimal,
              currency: order.price.currency.symbol,
              marketplace: order.source.name,
              maker: order.maker,
            });
            
            console.log(`✅ Found 1/1 Art:`);
            console.log(`   Collection: ${token.collection?.name || 'Unknown'}`);
            console.log(`   Token: #${tokenInfo.tokenId}`);
            console.log(`   Price: ${order.price.amount.decimal} ${order.price.currency.symbol}`);
            console.log(`   Marketplace: ${order.source.name}`);
            console.log(`   Contract: ${contract}`);
            console.log('');
          }
        } catch (error) {
          // Skip if can't get token details
        }
        
        await new Promise(resolve => setTimeout(resolve, 100)); // Rate limit
      }
    }
    
    return oneOfOnes;
    
  } catch (error) {
    console.error('Error searching for 1/1s:', error.message);
    return [];
  }
}

// Main test function
async function main() {
  console.log('🚀 Testing 1/1 Art Marketplace Prices on Base');
  console.log('============================================\n');
  
  // Test your known contracts
  const contracts = [
    { address: '0x972f31D4E140F0d09b154Bb395a070ED5ee9fccA', name: 'emmywalka on Foundation' },
    { address: '0x58FD65a42D33F080543b5f98A1Cfa9fBCe9FbB4A', name: 'juujuumama' },
    { address: '0x524cab2ec69124574082676e6f654a18df49a048', name: 'Your Contract' },
  ];
  
  const allListings = [];
  
  // Check each contract
  for (const contract of contracts) {
    const listings = await checkAllNFTsInContract(contract.address, contract.name);
    allListings.push(...listings);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit between contracts
  }
  
  // Check specific tokens
  await checkSpecificTokens();
  
  // Find any listed 1/1s
  const found1of1s = await findAnyListed1of1s();
  
  // Summary
  console.log('\n\n📊 SUMMARY');
  console.log('==========');
  
  if (allListings.length > 0 || found1of1s.length > 0) {
    console.log(`✅ Found ${allListings.length + found1of1s.length} listed NFTs!\n`);
    
    if (allListings.length > 0) {
      console.log('From your contracts:');
      allListings.forEach(nft => {
        console.log(`  - Token #${nft.tokenId}: ${nft.price} ${nft.currency} on ${nft.source}`);
      });
    }
    
    if (found1of1s.length > 0) {
      console.log('\nOther 1/1 art with listings:');
      console.log('Add these contracts to your BASE_ART_CONTRACTS:');
      const uniqueContracts = [...new Set(found1of1s.map(n => n.contract))];
      uniqueContracts.forEach(contract => {
        console.log(`  '${contract}', // Has listed 1/1 art`);
      });
    }
  } else {
    console.log('❌ No listed 1/1 art found');
    console.log('\nPossible reasons:');
    console.log('1. The NFTs in these contracts are not currently listed for sale');
    console.log('2. They might be listed on platforms not indexed by Reservoir');
    console.log('3. The listings might be on Ethereum mainnet, not Base');
    console.log('\nSuggestions:');
    console.log('1. Try listing one of your own NFTs to test');
    console.log('2. Look for Base-native art platforms');
    console.log('3. Check if Foundation has a separate Base deployment');
  }
}

main().catch(console.error);
