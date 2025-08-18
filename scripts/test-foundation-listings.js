// scripts/test-foundation-listings.js
// Test Foundation listings using The Graph and IPFS
// Run with: node scripts/test-foundation-listings.js

const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

// Foundation Graph endpoint
const FOUNDATION_GRAPH = 'https://api.thegraph.com/subgraphs/name/foundation-app/foundation';

// Test Foundation contracts
const FOUNDATION_CONTRACTS = [
  '0x972f31D4E140F0d09b154Bb395a070ED5ee9fccA', // emmywalka on Foundation
  '0x3B3ee1931Dc30C1957379FAc9aba94D1C48a5405', // Foundation main contract
];

// 1. Query Foundation's Graph for all listings
async function queryFoundationGraph(contractAddress) {
  console.log(`\n🔍 Querying Foundation Graph for ${contractAddress}...\n`);
  
  try {
    const query = `
      query GetContractListings {
        nftMarketAuctions(
          where: {
            nftContract: "${contractAddress.toLowerCase()}"
            status: "Open"
          }
          first: 10
        ) {
          id
          tokenId
          reservePrice
          highestBid
          seller
          status
          dateEnding
          auctionType
        }
        
        nftMarketBuyPrices(
          where: {
            nftContract: "${contractAddress.toLowerCase()}"
            status: "Open"
          }
          first: 10
        ) {
          id
          tokenId
          price
          seller
          status
        }
        
        nfts(
          where: {
            nftContract: "${contractAddress.toLowerCase()}"
          }
          first: 10
        ) {
          id
          tokenId
          creator
          owner
        }
      }
    `;

    const response = await axios.post(
      FOUNDATION_GRAPH,
      {
        query: query
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    const data = response.data?.data;
    
    if (!data) {
      console.log('❌ No data returned from Graph');
      return [];
    }
    
    const listings = [];
    
    // Process auctions
    if (data.nftMarketAuctions && data.nftMarketAuctions.length > 0) {
      console.log(`✅ Found ${data.nftMarketAuctions.length} active auctions:`);
      
      data.nftMarketAuctions.forEach(auction => {
        const priceInEth = (BigInt(auction.highestBid || auction.reservePrice) / BigInt(10 ** 18)).toString();
        console.log(`   Token #${auction.tokenId}: ${parseFloat(priceInEth).toFixed(4)} ETH`);
        console.log(`   Type: ${auction.auctionType}`);
        console.log(`   Seller: ${auction.seller}`);
        console.log(`   Ends: ${auction.dateEnding ? new Date(auction.dateEnding * 1000).toLocaleString() : 'N/A'}`);
        console.log('');
        
        listings.push({
          tokenId: auction.tokenId,
          price: parseFloat(priceInEth).toFixed(4),
          type: 'auction',
          marketplace: 'Foundation'
        });
      });
    } else {
      console.log('❌ No active auctions found');
    }
    
    // Process buy now listings
    if (data.nftMarketBuyPrices && data.nftMarketBuyPrices.length > 0) {
      console.log(`✅ Found ${data.nftMarketBuyPrices.length} buy now listings:`);
      
      data.nftMarketBuyPrices.forEach(listing => {
        const priceInEth = (BigInt(listing.price) / BigInt(10 ** 18)).toString();
        console.log(`   Token #${listing.tokenId}: ${parseFloat(priceInEth).toFixed(4)} ETH`);
        console.log(`   Seller: ${listing.seller}`);
        console.log('');
        
        listings.push({
          tokenId: listing.tokenId,
          price: parseFloat(priceInEth).toFixed(4),
          type: 'buyNow',
          marketplace: 'Foundation'
        });
      });
    } else {
      console.log('❌ No buy now listings found');
    }
    
    // Show NFTs in contract
    if (data.nfts && data.nfts.length > 0) {
      console.log(`📌 Contract has ${data.nfts.length} NFTs total`);
    }
    
    return listings;
    
  } catch (error) {
    console.error('Graph query error:', error.response?.data || error.message);
    return [];
  }
}

// 2. Check IPFS metadata for price info
async function checkIPFSMetadata(contractAddress, tokenId) {
  console.log(`\n🔍 Checking IPFS metadata for token #${tokenId}...`);
  
  try {
    // Get token metadata
    const response = await axios.get(
      `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTMetadata`,
      {
        params: {
          contractAddress,
          tokenId,
          refreshCache: true,
        },
        timeout: 10000,
      }
    );

    const nft = response.data;
    const metadata = nft.metadata;
    
    if (!metadata) {
      console.log('❌ No metadata found');
      return null;
    }
    
    // Check for price in metadata
    const priceFields = [
      'price',
      'listing_price',
      'sale_price',
      'foundation_price',
      'market_price',
      'current_price',
      'reserve_price',
    ];
    
    let foundPrice = null;
    
    for (const field of priceFields) {
      if (metadata[field]) {
        console.log(`✅ Found ${field}: ${JSON.stringify(metadata[field])}`);
        foundPrice = metadata[field];
        break;
      }
    }
    
    // Check nested Foundation data
    if (metadata.foundation) {
      console.log(`✅ Found Foundation data: ${JSON.stringify(metadata.foundation)}`);
      foundPrice = metadata.foundation;
    }
    
    // Check for market data
    if (metadata.market || metadata.marketplace) {
      const marketData = metadata.market || metadata.marketplace;
      console.log(`✅ Found market data: ${JSON.stringify(marketData)}`);
      foundPrice = marketData;
    }
    
    if (!foundPrice) {
      console.log('❌ No price data in metadata');
      
      // Show what fields are available
      console.log('Available metadata fields:', Object.keys(metadata).join(', '));
    }
    
    return foundPrice;
    
  } catch (error) {
    console.error('Metadata error:', error.message);
    return null;
  }
}

// 3. Try Foundation's direct API
async function checkFoundationAPI(contractAddress, tokenId) {
  console.log(`\n🔍 Checking Foundation API for token #${tokenId}...`);
  
  try {
    const response = await axios.get(
      `https://api.foundation.app/v1/artworks/${contractAddress}/${tokenId}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0',
        },
        timeout: 10000,
      }
    );
    
    const artwork = response.data;
    
    if (artwork) {
      console.log('✅ Found artwork data:');
      
      if (artwork.market) {
        console.log('Market:', JSON.stringify(artwork.market, null, 2));
      }
      
      if (artwork.auction) {
        console.log('Auction:', JSON.stringify(artwork.auction, null, 2));
      }
      
      if (artwork.price || artwork.reservePrice) {
        console.log('Price:', artwork.price || artwork.reservePrice);
      }
      
      return artwork;
    }
    
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('❌ Artwork not found on Foundation');
    } else {
      console.log('❌ Foundation API error:', error.response?.status || error.message);
    }
    return null;
  }
}

// Main test function
async function main() {
  console.log('🚀 Testing Foundation Listings with Graph + IPFS');
  console.log('================================================\n');
  
  const allListings = [];
  
  // Test each Foundation contract
  for (const contract of FOUNDATION_CONTRACTS) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing contract: ${contract}`);
    console.log(`${'='.repeat(60)}`);
    
    // Query the Graph
    const graphListings = await queryFoundationGraph(contract);
    allListings.push(...graphListings);
    
    // If we found listings, check their metadata
    if (graphListings.length > 0) {
      for (const listing of graphListings.slice(0, 3)) { // Check first 3
        await checkIPFSMetadata(contract, listing.tokenId);
        await checkFoundationAPI(contract, listing.tokenId);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
      }
    }
    
    // Also check some specific tokens
    console.log('\n📋 Checking specific tokens...');
    for (let tokenId = 1; tokenId <= 5; tokenId++) {
      console.log(`\nToken #${tokenId}:`);
      await checkIPFSMetadata(contract, tokenId.toString());
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Summary
  console.log('\n\n📊 SUMMARY');
  console.log('==========');
  
  if (allListings.length > 0) {
    console.log(`✅ Found ${allListings.length} Foundation listings!\n`);
    
    console.log('Listed tokens:');
    allListings.forEach(listing => {
      console.log(`  Token #${listing.tokenId}: ${listing.price} ETH (${listing.type})`);
    });
    
    console.log('\n✅ The Graph integration is working!');
    console.log('Update your nftService.ts to use FoundationPriceService');
  } else {
    console.log('❌ No Foundation listings found via Graph');
    console.log('\nPossible issues:');
    console.log('1. The Graph might be indexing mainnet, not Base');
    console.log('2. Foundation might use different contracts on Base');
    console.log('3. The listings might be on mainnet Foundation');
    
    console.log('\nNext steps:');
    console.log('1. Check if Foundation has a Base-specific subgraph');
    console.log('2. Try querying mainnet Graph for these contracts');
    console.log('3. Check Foundation.app to confirm where listings are');
  }
}

main().catch(console.error);
