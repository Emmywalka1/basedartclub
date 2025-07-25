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
      'zora.co',
      'rarible.com',
      'manifold.xyz',
      'i.seadn.io',
      'cdn.simplehash.com',
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
