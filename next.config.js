/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      // IPFS and NFT storage providers
      'ipfs.io',
      'gateway.pinata.cloud',
      'arweave.net',
      'res.cloudinary.com',
      
      // NFT marketplaces
      'opensea.io',
      'lh3.googleusercontent.com',
      'openseauserdata.com',
      'storage.googleapis.com',
      
      // Alchemy CDN
      'nft-cdn.alchemy.com',
      
      // Base ecosystem
      'assets.base.org',
      'static-assets.base.org',
      
      // Foundation
      'foundation.app',
      'f8n-ipfs-production.imgix.net',
      
      // Zora
      'zora.co',
      'api.zora.co',
      
      // Rarible
      'rarible.com',
      'img.rarible.com',
      
      // Manifold
      'manifold.xyz',
      
      // Other common NFT hosts
      'metadata.ens.domains',
      'i.seadn.io',
      'cdn.simplehash.com',
    ],
  },
  
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://*.farcaster.xyz https://*.warpcast.com;",
          },
        ],
      },
    ];
  },
  
  async rewrites() {
    return [
      {
        // Rewrite for Farcaster manifest
        source: '/.well-known/farcaster.json',
        destination: '/api/manifest',
      },
    ];
  },
  
  // Simple webpack configuration for Web3 compatibility
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    return config;
  },
};

module.exports = nextConfig;
