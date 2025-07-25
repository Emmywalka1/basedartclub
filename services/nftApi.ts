// services/nftApi.ts
import axios from 'axios'

export interface NFTMetadata {
  name?: string
  description?: string
  image?: string
  attributes?: Array<{
    trait_type: string
    value: string | number
  }>
  external_url?: string
}

export interface NFTContract {
  address: string
  name?: string
  symbol?: string
  totalSupply?: string
  tokenType: 'ERC721' | 'ERC1155'
  contractDeployer?: string
  deployedBlockNumber?: number
  openSeaMetadata?: {
    floorPrice?: number
    collectionName?: string
    collectionSlug?: string
    imageUrl?: string
    description?: string
    externalUrl?: string
  }
}

export interface NFTListing {
  marketplace: string
  price: {
    value: string
    currency: string
    decimals: number
  }
  seller: string
  listingUrl?: string
}

export interface BaseNFT {
  tokenId: string
  tokenType: 'ERC721' | 'ERC1155'
  name?: string
  description?: string
  tokenUri?: string
  image: {
    cachedUrl?: string
    thumbnailUrl?: string
    pngUrl?: string
    contentType?: string
    size?: number
    originalUrl?: string
  }
  raw: {
    tokenUri?: string
    metadata?: NFTMetadata
    error?: string
  }
  contract: NFTContract
  timeLastUpdated: string
  balance?: string
  acquiredAt?: {
    blockTimestamp: string
    blockNumber: number
  }
  collection?: {
    name: string
    slug: string
    externalUrl?: string
    bannerImageUrl?: string
  }
  mint?: {
    mintAddress?: string
    blockNumber?: number
    timestamp?: string
    transactionHash?: string
  }
  owners?: string[]
  listings?: NFTListing[]
  floorPrice?: {
    value: number
    currency: string
  }
}

class NFTApiService {
  private alchemyApiKey: string
  private alchemyBaseUrl: string
  private openSeaApiKey?: string

  constructor() {
    this.alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || ''
    this.alchemyBaseUrl = `https://base-mainnet.g.alchemy.com/nft/v3/${this.alchemyApiKey}`
    this.openSeaApiKey = process.env.OPENSEA_API_KEY
  }

  private async makeAlchemyRequest(endpoint: string, params: Record<string, any> = {}) {
    try {
      const response = await axios.get(`${this.alchemyBaseUrl}${endpoint}`, {
        params,
        headers: {
          'Accept': 'application/json',
        }
      })
      return response.data
    } catch (error) {
      console.error('Alchemy API request failed:', error)
      throw error
    }
  }

  private async makeOpenSeaRequest(endpoint: string, params: Record<string, any> = {}) {
    if (!this.openSeaApiKey) {
      throw new Error('OpenSea API key not configured')
    }

    try {
      const response = await axios.get(`https://api.opensea.io/api/v2${endpoint}`, {
        params,
        headers: {
          'X-API-KEY': this.openSeaApiKey,
          'Accept': 'application/json',
        }
      })
      return response.data
    } catch (error) {
      console.error('OpenSea API request failed:', error)
      throw error
    }
  }

  // Get trending NFT collections on Base
  async getTrendingCollections(limit: number = 10): Promise<string[]> {
    try {
      // Get some popular Base NFT collections
      const knownBaseCollections = [
        '0x036721e5A681E02A730b05e2B56e9b7189f2A3F8', // Based Ghouls
        '0x4F89Bbe2c2C896819f246F3dce8A33F5B1aB4586', // Base Punks
        '0x1538C5c8FbE7c1F0FF63F5b3F59cbad74B41db87', // Base Names
        '0x03c4738Ee98aE44591e1A4A4F3CaB6641d95DD9a', // Tiny Based Frogs
        '0x7F7f3aFc9eA11b8e3b6a89071c94ce3155fb4Ccb', // Based Vitalik
        '0x7a7cf821b20293baE1fEe5e7b07Cd19F8E0d2B20', // Based Nouns
      ]
      
      return knownBaseCollections.slice(0, limit)
    } catch (error) {
      console.error('Failed to get trending collections:', error)
      return []
    }
  }

  // Get NFTs from a specific collection
  async getNFTsFromCollection(contractAddress: string, limit: number = 20): Promise<BaseNFT[]> {
    try {
      const response = await this.makeAlchemyRequest('/getNFTsForCollection', {
        contractAddress,
        limit,
        withMetadata: true,
      })

      return response.nfts || []
    } catch (error) {
      console.error(`Failed to get NFTs from collection ${contractAddress}:`, error)
      return []
    }
  }

  // Get curated NFTs from multiple sources
  async getCuratedNFTs(limit: number = 50): Promise<BaseNFT[]> {
    try {
      const collections = await this.getTrendingCollections(5)
      const allNFTs: BaseNFT[] = []

      // Fetch NFTs from each collection
      for (const contractAddress of collections) {
        try {
          const nfts = await this.getNFTsFromCollection(contractAddress, Math.ceil(limit / collections.length))
          allNFTs.push(...nfts)
        } catch (error) {
          console.error(`Failed to fetch NFTs from ${contractAddress}:`, error)
        }
      }

      // Shuffle and limit results
      const shuffled = allNFTs.sort(() => 0.5 - Math.random())
      return shuffled.slice(0, limit)
    } catch (error) {
      console.error('Failed to get curated NFTs:', error)
      return []
    }
  }

  // Get NFT metadata with marketplace data
  async getNFTWithMarketData(contractAddress: string, tokenId: string): Promise<BaseNFT | null> {
    try {
      const response = await this.makeAlchemyRequest('/getNFTMetadata', {
        contractAddress,
        tokenId,
        refreshCache: false,
      })

      // Try to get marketplace data from OpenSea if available
      try {
        if (this.openSeaApiKey) {
          const openseaData = await this.makeOpenSeaRequest(
            `/chain/base/contract/${contractAddress}/nfts/${tokenId}`
          )
          
          if (openseaData.nft) {
            response.listings = openseaData.nft.listings || []
            response.floorPrice = openseaData.collection?.floor_price || null
          }
        }
      } catch (openSeaError) {
        console.log('OpenSea data not available for this NFT')
      }

      return response
    } catch (error) {
      console.error(`Failed to get NFT metadata for ${contractAddress}:${tokenId}:`, error)
      return null
    }
  }

  // Get floor price for a collection
  async getCollectionFloorPrice(contractAddress: string): Promise<number | null> {
    try {
      const response = await this.makeAlchemyRequest('/getFloorPrice', {
        contractAddress,
      })

      return response.openSea?.floorPrice || response.looksRare?.floorPrice || null
    } catch (error) {
      console.error(`Failed to get floor price for ${contractAddress}:`, error)
      return null
    }
  }

  // Search NFTs by query
  async searchNFTs(query: string, limit: number = 20): Promise<BaseNFT[]> {
    try {
      const response = await this.makeAlchemyRequest('/searchContractMetadata', {
        query,
        limit,
      })

      const contracts = response.contracts || []
      const allNFTs: BaseNFT[] = []

      // Get NFTs from found contracts
      for (const contract of contracts.slice(0, 3)) {
        try {
          const nfts = await this.getNFTsFromCollection(contract.address, Math.ceil(limit / 3))
          allNFTs.push(...nfts)
        } catch (error) {
          console.error(`Failed to fetch NFTs from search result ${contract.address}:`, error)
        }
      }

      return allNFTs.slice(0, limit)
    } catch (error) {
      console.error('Failed to search NFTs:', error)
      return []
    }
  }

  // Get owned NFTs for an address
  async getOwnedNFTs(ownerAddress: string, limit: number = 100): Promise<BaseNFT[]> {
    try {
      const response = await this.makeAlchemyRequest('/getNFTsForOwner', {
        owner: ownerAddress,
        limit,
        withMetadata: true,
      })

      return response.ownedNfts || []
    } catch (error) {
      console.error(`Failed to get owned NFTs for ${ownerAddress}:`, error)
      return []
    }
  }
}

export const nftApiService = new NFTApiService()
