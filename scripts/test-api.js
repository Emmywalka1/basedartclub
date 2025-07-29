// scripts/test-api.js
// Test script to verify Moralis and Alchemy API connections
// Run with: node scripts/test-api.js

const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const MORALIS_API_KEY = process.env.MORALIS_API_KEY;
const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

const BASE_COLLECTIONS = [
  '0x036721e5a681e02a730b05e2b56e9b7189f2a3f8', // Based Ghouls
  '0x4f89bbe2c2c896819f246f3dce8a33f5b1ab4586', // Base Punks
];

async function testMoralisAPI() {
  console.log('\n🔍 Testing Moralis API...');
  
  if (!MORALIS_API_KEY) {
    console.error('❌ MORALIS_API_KEY not found in environment variables');
    return false;
  }

  try {
    const response = await axios.get(
      `https://deep-index.moralis.io/api/v2/nft/${BASE_COLLECTIONS[0]}`,
      {
        headers: {
          'X-API-Key': MORALIS_API_KEY,
        },
        params: {
          chain: 'base',
          format: 'decimal',
          limit: 5,
          normalizeMetadata: true,
        },
      }
    );

    console.log('✅ Moralis API connected successfully');
    console.log(`📊 Found ${response.data.result.length} NFTs`);
    
    if (response.data.result[0]) {
      const nft = response.data.result[0];
      console.log('\n📋 Sample NFT:');
      console.log(`- Token ID: ${nft.token_id}`);
      console.log(`- Name: ${nft.normalized_metadata?.name || 'N/A'}`);
      console.log(`- Contract Type: ${nft.contract_type}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Moralis API error:', error.response?.data || error.message);
    return false;
  }
}

async function testAlchemyAPI() {
  console.log('\n🔍 Testing Alchemy API...');
  
  if (!ALCHEMY_API_KEY) {
    console.error('❌ NEXT_PUBLIC_ALCHEMY_API_KEY not found in environment variables');
    return false;
  }

  try {
    const response = await axios.get(
      `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForContract`,
      {
        params: {
          contractAddress: BASE_COLLECTIONS[0],
          withMetadata: true,
          limit: 5,
        },
      }
    );

    console.log('✅ Alchemy API connected successfully');
    console.log(`📊 Found ${response.data.nfts.length} NFTs`);
    
    if (response.data.nfts[0]) {
      const nft = response.data.nfts[0];
      console.log('\n📋 Sample NFT:');
      console.log(`- Token ID: ${nft.tokenId}`);
      console.log(`- Name: ${nft.name || 'N/A'}`);
      console.log(`- Token Type: ${nft.tokenType}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Alchemy API error:', error.response?.data || error.message);
    return false;
  }
}

async function testLocalAPI() {
  console.log('\n🔍 Testing Local API endpoint...');
  
  try {
    const response = await axios.get('http://localhost:3000/api/nfts?action=curated&limit=5');
    
    if (response.data.success) {
      console.log('✅ Local API working');
      console.log(`📊 Retrieved ${response.data.data.length} NFTs`);
      console.log(`⏱️  Cached: ${response.data.cached ? 'Yes' : 'No'}`);
    } else {
      console.error('❌ Local API returned error:', response.data.error);
    }
    
    return response.data.success;
  } catch (error) {
    console.error('❌ Local API error:', error.message);
    console.log('💡 Make sure your Next.js dev server is running (npm run dev)');
    return false;
  }
}

async function runTests() {
  console.log('🚀 Base Art Club API Test Suite');
  console.log('================================');
  
  const results = {
    moralis: await testMoralisAPI(),
    alchemy: await testAlchemyAPI(),
    local: await testLocalAPI(),
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  console.log(`Moralis API: ${results.moralis ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Alchemy API: ${results.alchemy ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Local API: ${results.local ? '✅ PASS' : '❌ FAIL'}`);
  
  if (Object.values(results).every(r => r)) {
    console.log('\n🎉 All tests passed! Your app is ready to fetch real NFTs.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check your API keys and configuration.');
  }
}

// Run tests
runTests().catch(console.error);
