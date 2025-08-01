// types/nft.ts

export interface NFTMetadata {
  name?: string
  description?: string
  image?: string
  attributes?: Array<{
    trait_type: string
    value: string | number
  }>
}

export interface NFTContract {
  address: string
  name?: string
  symbol?: string
  tokenType: 'ERC721' | 'ERC1155'
}

export interface NFTImage {
  cachedUrl?: string
  thumbnailUrl?: string
  originalUrl?: string
}

export interface NFTPrice {
  value: string
  currency: string
  usdValue?: number
}

export interface NFTSale {
  value: string
  currency: string
  timestamp: string
}

export interface BaseNFT {
  tokenId: string
  tokenType: 'ERC721' | 'ERC1155'
  name?: string
  description?: string
  image: NFTImage
  contract: NFTContract
  metadata?: any
  marketplace?: string
  platform?: string
  artist?: string
  price?: NFTPrice
  lastSale?: NFTSale
  isOneOfOne?: boolean
}

export interface CollectibleNFT extends BaseNFT {
  isForSale?: boolean
  category?: string
}

export interface NFTCollection {
  contract: string
  name: string
  description: string
  marketplace?: string
}

export interface SwipeStats {
  liked: number
  passed: number
  collected: number
}

export const NFT_CATEGORIES = [
  'Photography',
  'Editions', 
  'One-of-Ones',
  'AI Art',
  'Digital',
] as const;

export const PRICE_RANGES = [
  'Freemint',
  'Under 0.1 ETH',
  'Under 1 ETH',
  'Over 1 ETH'
] as const;

export const MARKETPLACES = {
  FOUNDATION: 'Foundation',
  OPENSEA: 'OpenSea',
  ZORA: 'Zora',
  MANIFOLD: 'Manifold',
} as const;

export type NFTCategory = typeof NFT_CATEGORIES[number];
export type PriceRange = typeof PRICE_RANGES[number];
export type Marketplace = typeof MARKETPLACES[keyof typeof MARKETPLACES];
