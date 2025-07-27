/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'ipfs.io',
      'gateway.pinata.cloud', 
      'arweave.net',
      'res.cloudinary.com',
      'opensea.io',
      'lh3.googleusercontent.com',
      'nft-cdn.alchemy.com',
      'assets.base.org',
      'foundation.app',
      'f8n-production.imgix.net',
      'f8n-production-collection-assets.imgix.net',
      'zora.co',
      'rarible.com',
      'manifold.xyz',
      'i.seadn.io',
      'static.foundation.app',
      'media.foundation.app',
      'api.zora.co',
      'zora-prod.mypinata.cloud',
      'ipfs.foundation.app',
      'cdn.moralis.io',
    ],
  },
  
  async headers() {
    return [
      {
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
        source: '/.well-known/farcaster.json',
        destination: '/api/manifest',
      },
    ];
  },
};

module.exports = nextConfig;
