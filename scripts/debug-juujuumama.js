// scripts/debug-juujuumama.js
// Run with: node scripts/debug-juujuumama.js

const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

// juujuumama contracts to test
const JUUJUUMAMA_CONTRACTS = [
  '0x58FD65a42D33F080543b5f98A1Cfa9fBCe9FbB4A',
  '0xd3963E400cF668BFD082Ae2Cd5E10a399aAcd839',
  '0x8E7326Fc4ff10C50058F5a46f65E2d6E070B9310',
  '0xf740F7C0c479F5aE21eA7e1f017cb371584d4B38',
  '0xe5cDb17069e1c4622A6101dB985DaaF004e14F79',
];

async function checkContract(contractAddress, chain = 'base') {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔍 Checking ${contractAddress} on ${chain.toUpperCase()}`);
  console.log(`${'='.repeat(60)}`);
  
  const baseUrl = chain === 'base' 
    ? `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}`
    : `https://eth-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}`;
  
  try {
    // First, check if contract exists and get metadata
    console.log('\n📋 Getting contract metadata...');
    const metadataResponse = await axios.get(
      `${baseUrl}/getContractMetadata`,
      {
        params: { contractAddress },
        timeout: 10000,
      }
    );
    
    const contractMeta = metadataResponse.data;
    console.log('Contract Name:', contractMeta.name || 'Not found');
    console.log('Symbol:', contractMeta.symbol || 'Not found');
    console.log('Token Type:', contractMeta.tokenType || 'Not found');
    console.log('Total Supply:', contractMeta.totalSupply || 'Unknown');
    
    // Get some NFTs from this contract
    console.log('\n🎨 Fetching NFTs from contract...');
    const nftsResponse = await axios.get(
      `${baseUrl}/getNFTsForContract`,
      {
        params: {
          contractAddress,
          withMetadata: true,
          limit: 3, // Just get a few for testing
        },
        timeout: 10000,
      }
    );
    
    if (!nftsResponse.data?.nfts?.length) {
      console.log('❌ No NFTs found in this contract on ' + chain.toUpperCase());
      return false;
    }
    
    console.log(`✅ Found ${nftsResponse.data.nfts.length} NFTs\n`);
    
    // Analyze the first NFT in detail
    const nft = nftsResponse.data.nfts[0];
    console.log('📌 Analyzing first NFT:');
    console.log('Token ID:', nft.tokenId);
    console.log('Name:', nft.name || 'No name');
    console.log('Description:', nft.description ? nft.description.substring(0, 100) + '...' : 'No description');
    
    // Check all possible image locations
    console.log('\n🖼️ Image URL Locations:');
    console.log('nft.image?.cachedUrl:', nft.image?.cachedUrl || 'NOT FOUND');
    console.log('nft.image?.thumbnailUrl:', nft.image?.thumbnailUrl || 'NOT FOUND');
    console.log('nft.image?.originalUrl:', nft.image?.originalUrl || 'NOT FOUND');
    console.log('nft.image?.pngUrl:', nft.image?.pngUrl || 'NOT FOUND');
    console.log('nft.media?.[0]?.gateway:', nft.media?.[0]?.gateway || 'NOT FOUND');
    console.log('nft.media?.[0]?.raw:', nft.media?.[0]?.raw || 'NOT FOUND');
    console.log('nft.media?.[0]?.thumbnail:', nft.media?.[0]?.thumbnail || 'NOT FOUND');
    
    // Check metadata fields
    const metadata = nft.metadata || nft.rawMetadata || {};
    console.log('\n📄 Metadata Image Fields:');
    console.log('metadata.image:', metadata.image || 'NOT FOUND');
    console.log('metadata.image_url:', metadata.image_url || 'NOT FOUND');
    console.log('metadata.imageUrl:', metadata.imageUrl || 'NOT FOUND');
    console.log('metadata.image_data:', metadata.image_data ? 'SVG/Base64 data present' : 'NOT FOUND');
    console.log('metadata.animation_url:', metadata.animation_url || 'NOT FOUND');
    
    // Check if it's raw/unprocessed metadata
    if (nft.raw || nft.rawMetadata) {
      console.log('\n📦 Raw Metadata Present:');
      const raw = nft.raw || nft.rawMetadata;
      console.log('Raw metadata keys:', Object.keys(raw).join(', '));
      
      // Look for any field containing 'image' or 'url'
      const imageRelatedFields = Object.keys(raw).filter(key => 
        key.toLowerCase().includes('image') || 
        key.toLowerCase().includes('url') ||
        key.toLowerCase().includes('uri')
      );
      
      if (imageRelatedFields.length > 0) {
        console.log('\n🔍 Image-related fields in raw metadata:');
        imageRelatedFields.forEach(field => {
          console.log(`${field}:`, raw[field]);
        });
      }
    }
    
    // Log the entire NFT object for manual inspection
    console.log('\n📊 Full NFT Object (first 2000 chars):');
    console.log(JSON.stringify(nft, null, 2).substring(0, 2000));
    
    return true;
    
  } catch (error) {
    console.error(`❌ Error checking contract:`, error.response?.data || error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 juujuumama NFT Debug Tool');
  console.log('================================\n');
  
  if (!ALCHEMY_API_KEY) {
    console.error('❌ NEXT_PUBLIC_ALCHEMY_API_KEY not found in .env.local');
    return;
  }
  
  let foundOnBase = 0;
  let foundOnEth = 0;
  
  // First, try all contracts on Base
  console.log('🔍 CHECKING ON BASE CHAIN:');
  for (const contract of JUUJUUMAMA_CONTRACTS) {
    const found = await checkContract(contract, 'base');
    if (found) foundOnBase++;
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
  }
  
  // If not found on Base, try Ethereum mainnet
  if (foundOnBase === 0) {
    console.log('\n\n🔍 No NFTs found on Base. CHECKING ON ETHEREUM MAINNET:');
    for (const contract of JUUJUUMAMA_CONTRACTS) {
      const found = await checkContract(contract, 'eth');
      if (found) foundOnEth++;
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
    }
  }
  
  // Summary
  console.log('\n\n📊 SUMMARY:');
  console.log('='.repeat(40));
  console.log(`Contracts with NFTs on Base: ${foundOnBase}/${JUUJUUMAMA_CONTRACTS.length}`);
  console.log(`Contracts with NFTs on Ethereum: ${foundOnEth}/${JUUJUUMAMA_CONTRACTS.length}`);
  
  if (foundOnBase === 0 && foundOnEth === 0) {
    console.log('\n❌ No NFTs found in any of the juujuumama contracts.');
    console.log('Possible issues:');
    console.log('1. Contract addresses might be incorrect');
    console.log('2. Contracts might be on a different chain');
    console.log('3. Contracts might not be NFT contracts');
  } else if (foundOnEth > 0 && foundOnBase === 0) {
    console.log('\n⚠️ NFTs found on Ethereum mainnet, not Base!');
    console.log('You need to update your service to use Ethereum endpoints.');
  } else {
    console.log('\n✅ NFTs found! Check the output above to see the image URL structure.');
  }
}

// Run the debug script
main().catch(console.error);
