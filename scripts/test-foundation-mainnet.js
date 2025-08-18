// scripts/test-foundation-mainnet.js
// Test Foundation listings on ETHEREUM MAINNET (where they actually are)
// Run with: node scripts/test-foundation-mainnet.js

const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

// Foundation Graph endpoint - MAINNET
const FOUNDATION_GRAPH = 'https://api.thegraph.com/subgraphs/name/foundation-app/foundation';

// Foundation contracts are on MAINNET
const FOUNDATION_CONTRACTS = [
  '0x3B3ee1931Dc30C1957379FAc9aba94D1C48a5405', // Foundation main contract on ETH mainnet
];

// 1. Query Foundation's Graph on MAINNET
async function queryFoundationMainnet() {
  console.log(`\n🔍 Querying Foundation Graph on ETHEREUM MAINNET...\n`);
  
  try {
    // First, let's check if there are ANY active listings
    const query = `
      query GetActiveListings {
        nftMarketAuctions(
          where: {
            status: "Open"
          }
          first: 10
          orderBy: dateCreated
          orderDirection: desc
        ) {
          id
          tokenId
          nftContract
          reservePrice
          highestBid
          seller
          status
          dateEnding
          auctionType
        }
        
        nftMarketBuyPrices(
          where: {
            status: "Open"
          }
          first: 10
          orderBy: dateCreated
          orderDirection: desc
        ) {
          id
          tokenId
          nftContract
          price
          seller
          status
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
      console.log(`✅ Found ${data.nftMarketAuctions.length} active auctions on MAINNET:`);
      
      data.nftMarketAuctions.forEach(auction => {
        const priceInEth = (BigInt(auction.highestBid || auction.reservePrice) / BigInt(10 ** 18)).toString();
        console.log(`\n   Contract: ${auction.nftContract}`);
        console.log(`   Token #${auction.tokenId}: ${parseFloat(priceInEth).toFixed(4)} ETH`);
        console.log(`   Type: ${auction.auctionType}`);
        console.log(`   Seller: ${auction.seller}`);
        console.log(`   Ends: ${auction.dateEnding ? new Date(auction.dateEnding * 1000).toLocaleString() : 'N/A'}`);
        
        listings.push({
          contract: auction.nftContract,
          tokenId: auction.tokenId,
          price: parseFloat(priceInEth).toFixed(4),
          type: 'auction',
          marketplace: 'Foundation',
          chain: 'mainnet'
        });
      });
    } else {
      console.log('❌ No active auctions found');
    }
    
    // Process buy now listings
    if (data.nftMarketBuyPrices && data.nftMarketBuyPrices.length > 0) {
      console.log(`\n✅ Found ${data.nftMarketBuyPrices.length} buy now listings on MAINNET:`);
      
      data.nftMarketBuyPrices.forEach(listing => {
        const priceInEth = (BigInt(listing.price) / BigInt(10 ** 18)).toString();
        console.log(`\n   Contract: ${listing.nftContract}`);
        console.log(`   Token #${listing.tokenId}: ${parseFloat(priceInEth).toFixed(4)} ETH`);
        console.log(`   Seller: ${listing.seller}`);
        
        listings.push({
          contract: listing.nftContract,
          tokenId: listing.tokenId,
          price: parseFloat(priceInEth).toFixed(4),
          type: 'buyNow',
          marketplace: 'Foundation',
          chain: 'mainnet'
        });
      });
    } else {
      console.log('❌ No buy now listings found');
    }
    
    return listings;
    
  } catch (error) {
    console.error('Graph query error:', error.response?.data || error.message);
    return [];
  }
}

// 2. Check Base for any cross-chain Foundation activity
async function checkBaseForFoundation() {
  console.log(`\n🔍 Checking if Foundation has any contracts on BASE...\n`);
  
  try {
    // Check if the emmywalka contract exists on Base
    const response = await axios.get(
      `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getContractMetadata`,
      {
        params: {
          contractAddress: '0x972f31D4E140F0d09b154Bb395a070ED5ee9fccA'
        },
        timeout: 10000,
      }
    );
    
    if (response.data) {
      console.log('✅ Contract exists on Base:');
      console.log('   Name:', response.data.name || 'Unknown');
      console.log('   Symbol:', response.data.symbol || 'Unknown');
      console.log('   Token Type:', response.data.tokenType || 'Unknown');
      console.log('   Total Supply:', response.data.totalSupply || 'Unknown');
      
      // Get some NFTs from this contract
      const nftsResponse = await axios.get(
        `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForContract`,
        {
          params: {
            contractAddress: '0x972f31D4E140F0d09b154Bb395a070ED5ee9fccA',
            limit: 5,
            withMetadata: true
          },
          timeout: 10000,
        }
      );
      
      if (nftsResponse.data?.nfts?.length > 0) {
        console.log(`\n   Found ${nftsResponse.data.nfts.length} NFTs on Base`);
        console.log('   This means the NFTs exist on Base, but listings might be on mainnet Foundation');
      }
    }
  } catch (error) {
    console.log('❌ Contract not found on Base or error:', error.message);
  }
}

// 3. Check how to get cross-chain prices
async function explainCrossChainIssue() {
  console.log(`\n📚 UNDERSTANDING THE ISSUE:`);
  console.log('=====================================');
  console.log('\n1. Foundation marketplace operates on ETHEREUM MAINNET');
  console.log('2. The NFTs might be bridged/minted on Base for display');
  console.log('3. But the actual LISTINGS and SALES happen on mainnet Foundation');
  console.log('4. This means to get real prices, we need to:');
  console.log('   - Query Foundation Graph on MAINNET for prices');
  console.log('   - Display the NFTs from Base contracts');
  console.log('   - Show mainnet ETH prices (not Base ETH)');
  console.log('\n5. When users "collect", they would need to:');
  console.log('   - Bridge to mainnet');
  console.log('   - Purchase on Foundation mainnet');
  console.log('   - Or use a cross-chain solution');
}

// 4. Suggest a solution
async function suggestSolution() {
  console.log(`\n💡 SOLUTION FOR YOUR APP:`);
  console.log('=====================================');
  console.log('\n1. For display purposes, you can:');
  console.log('   - Show NFTs from Base contracts');
  console.log('   - Fetch prices from mainnet Foundation Graph');
  console.log('   - Display as "Listed on Foundation (Mainnet)"');
  console.log('\n2. Update your MarketplacePriceService to:');
  console.log('   - Check both Base AND Mainnet for prices');
  console.log('   - Use different Alchemy endpoints for each chain');
  console.log('\n3. For real Base-native art sales, consider:');
  console.log('   - Finding artists who list directly on Base marketplaces');
  console.log('   - Using Zora on Base');
  console.log('   - Using Mint.fun on Base');
  console.log('   - Using other Base-native platforms');
}

// Main test function
async function main() {
  console.log('🚀 Testing Foundation Cross-Chain Listings');
  console.log('==========================================\n');
  
  // Check mainnet Foundation
  const mainnetListings = await queryFoundationMainnet();
  
  // Check if contracts exist on Base
  await checkBaseForFoundation();
  
  // Explain the issue
  await explainCrossChainIssue();
  
  // Suggest solution
  await suggestSolution();
  
  // Summary
  console.log('\n\n📊 SUMMARY');
  console.log('==========');
  
  if (mainnetListings.length > 0) {
    console.log(`✅ Found ${mainnetListings.length} Foundation listings on MAINNET!\n`);
    
    console.log('To use these prices in your Base app:');
    console.log('1. Store these mainnet contract addresses');
    console.log('2. Query mainnet Foundation Graph for prices');
    console.log('3. Display with NFTs from Base');
    
    console.log('\nContracts with active listings on mainnet:');
    const uniqueContracts = [...new Set(mainnetListings.map(l => l.contract))];
    uniqueContracts.forEach(contract => {
      console.log(`  '${contract}', // Has Foundation mainnet listings`);
    });
  } else {
    console.log('❌ No Foundation listings found');
    console.log('\nThis might mean:');
    console.log('1. Foundation has very few active listings right now');
    console.log('2. Most Foundation sales are private or direct');
  }
  
  console.log('\n🎯 RECOMMENDATION:');
  console.log('Focus on Base-native marketplaces like:');
  console.log('- Zora on Base');
  console.log('- Mint.fun');
  console.log('- OpenSea on Base');
  console.log('- Sound.xyz on Base');
  console.log('\nThese will have actual Base chain listings with Base ETH prices!');
}

main().catch(console.error);
