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
          // Remove X-Frame-Options to allow embedding
          // X-Frame-Options conflicts with CSP frame-ancestors
          {
            key: 'Content-Security-Policy',
            value: [
              "frame-ancestors",
              "'self'",
              "https://*.farcaster.xyz",
              "https://farcaster.xyz", 
              "https://*.warpcast.com",
              "https://warpcast.com",
              "https://warpcast.com/~/developers/mini-apps/*",
              "https://miniapps.farcaster.xyz",
              "https://*.fc-miniapps.pages.dev",
              "https://fc-miniapps.pages.dev",
              "http://localhost:*"
            ].join(' ') + ';',
          },
          // Add CORS headers for API access
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type',
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
