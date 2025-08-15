
const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

// Test NFTs - Add specific token IDs you want to test
const TEST_NFTS = [
  {
    contract: '0x972f31D4E140F0d09b154Bb395a070ED5ee9fccA',
    tokenId: '1',
    name: 'emmywalka on Foundation'
  },
  {
    contract: '0x58FD65a42D33F080543b5f98A1Cfa9fBCe9FbB4A',
    tokenId: '1',
    name: 'juujuumama'
  },
  // Add more test NFTs here
];

// Test Reservoir API (free, no key needed)
async function testReservoirPrice(contractAddress, tokenId) {
  try {
    console.log('\n🔍 Testing Reservoir API...');
    const response = await axios.get(
      `https://api-base.reservoir.tools/tokens/v7`,
      {
        params: {
          tokens: `${contractAddress}:${tokenId}`,
          includeTopBid: true,
          includeAttributes: false,
        },
        headers: {
          'accept': 'application/json',
        },
        timeout: 10000,
      }
    );

    const token = response.data?.tokens?.[0];
    
    if (token?.market?.floorAsk?.price?.amount?.decimal) {
      console.log('✅ Reservoir Ask Price:', token.market.floorAsk.price.amount.decimal, 'ETH');
      console.log('   Source:', token.market.floorAsk.source?.name);
      return true;
    }
    
    if (token?.market?.topBid?.price?.amount?.decimal) {
      console.log('💰 Reservoir Bid Price:', token.market.topBid.price.amount.decimal, 'ETH');
      console.log('   Source:', token.market.topBid.source?.name);
      return true;
    }
    
    console.log('❌ No price data in Reservoir');
    return false;
    
  } catch (error) {
    console.error('❌ Reservoir API error:', error.response?.data || error.message);
    return false;
  }
}

// Test Alchemy Floor Price API
async function testAlchemyFloorPrice(contractAddress) {
  try {
    console.log('\n🔍 Testing Alchemy Floor Price API...');
    const response = await axios.get(
      `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getFloorPrice`,
      {
        params: {
          contractAddress: contractAddress,
        },
        timeout: 10000,
      }
    );

    if (response.data?.openSea?.floorPrice) {
      console.log('✅ OpenSea Floor Price:', response.data.openSea.floorPrice, 'ETH');
      return true;
    }
    
    if (response.data?.blur?.floorPrice) {
      console.log('✅ Blur Floor Price:', response.data.blur.floorPrice, 'ETH');
      return true;
    }
    
    console.log('❌ No floor price in Alchemy');
    console.log('   Response:', JSON.stringify(response.data, null, 2));
    return false;
    
  } catch (error) {
    console.error('❌ Alchemy Floor Price error:', error.response?.data || error.message);
    return false;
  }
}

// Test SimpleHash API
async function testSimpleHashPrice(contractAddress, tokenId) {
  try {
    console.log('\n🔍 Testing SimpleHash API...');
    const response = await axios.get(
      `https://api.simplehash.com/api/v0/nfts/base/${contractAddress}/${tokenId}`,
      {
        headers: {
          'accept': 'application/json',
        },
        timeout: 10000,
      }
    );

    const nft = response.data;
    
    if (nft?.collection?.floor_prices?.[0]?.value) {
      console.log('✅ SimpleHash Floor Price:', nft.collection.floor_prices[0].value, 'ETH');
      console.log('   Marketplace:', nft.collection.floor_prices[0].marketplace);
      return true;
    }
    
    if (nft?.last_sale?.unit_price) {
      const ethPrice = (nft.last_sale.unit_price / 1e18).toFixed(4);
      console.log('💰 SimpleHash Last Sale:', ethPrice, 'ETH');
      console.log('   Marketplace:', nft.last_sale.marketplace);
      return true;
    }
    
    console.log('❌ No price data in SimpleHash');
    return false;
    
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('⚠️ SimpleHash requires API key for this endpoint');
    } else {
      console.error('❌ SimpleHash API error:', error.response?.status || error.message);
    }
    return false;
  }
}

// Test getting collection stats from Reservoir
async function testCollectionStats(contractAddress) {
  try {
    console.log('\n📊 Testing Collection Stats (Reservoir)...');
    const response = await axios.get(
      `https://api-base.reservoir.tools/collections/v7`,
      {
        params: {
          contract: contractAddress,
        },
        headers: {
          'accept': 'application/json',
        },
        timeout: 10000,
      }
    );

    const collection = response.data?.collections?.[0];
    
    if (collection) {
      console.log('✅ Collection Stats:');
      console.log('   Name:', collection.name);
      console.log('   Floor Price:', collection.floorAsk?.price?.amount?.decimal || 'N/A', 'ETH');
      console.log('   24h Volume:', collection.volume?.['24h'] || 0, 'ETH');
      console.log('   Total Volume:', collection.volume?.allTime || 0, 'ETH');
      console.log('   Token Count:', collection.tokenCount);
      console.log('   On Sale Count:', collection.onSaleCount || 0);
      return true;
    }
    
    console.log('❌ No collection data found');
    return false;
    
  } catch (error) {
    console.error('❌ Collection stats error:', error.response?.data || error.message);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Testing Real Marketplace Price APIs');
  console.log('=====================================\n');
  
  const results = {
    reservoir: 0,
    alchemy: 0,
    simplehash: 0,
    collections: 0,
    total: 0
  };
  
  for (const nft of TEST_NFTS) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${nft.name}`);
    console.log(`Contract: ${nft.contract}`);
    console.log(`Token ID: ${nft.tokenId}`);
    console.log(`${'='.repeat(60)}`);
    
    // Test each API
    const reservoirSuccess = await testReservoirPrice(nft.contract, nft.tokenId);
    if (reservoirSuccess) results.reservoir++;
    
    const alchemySuccess = await testAlchemyFloorPrice(nft.contract);
    if (alchemySuccess) results.alchemy++;
    
    const simplehashSuccess = await testSimpleHashPrice(nft.contract, nft.tokenId);
    if (simplehashSuccess) results.simplehash++;
    
    const collectionSuccess = await testCollectionStats(nft.contract);
    if (collectionSuccess) results.collections++;
    
    if (reservoirSuccess || alchemySuccess || simplehashSuccess) {
      results.total++;
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n\n📊 TEST RESULTS SUMMARY');
  console.log('========================');
  console.log(`✅ NFTs with real prices: ${results.total}/${TEST_NFTS.length}`);
  console.log(`   Reservoir API: ${results.reservoir}/${TEST_NFTS.length}`);
  console.log(`   Alchemy Floor: ${results.alchemy}/${TEST_NFTS.length}`);
  console.log(`   SimpleHash: ${results.simplehash}/${TEST_NFTS.length}`);
  console.log(`   Collections: ${results.collections}/${TEST_NFTS.length}`);
  
  if (results.total === 0) {
    console.log('\n❌ No real prices found from any API!');
    console.log('\n💡 Troubleshooting tips:');
    console.log('1. Check if the NFTs are actually listed for sale');
    console.log('2. Verify the contract addresses are correct');
    console.log('3. Ensure you have the correct API keys');
    console.log('4. Try different NFTs that you know are listed');
  } else if (results.reservoir > 0) {
    console.log('\n✅ Reservoir API is working! This is the best free option.');
    console.log('   Update your NFT service to use Reservoir for real prices.');
  }
}

// Run the tests
runTests().catch(console.error);
