/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
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
      'res.cloudinary.com',
      
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
      'arweave.net',
      
      // Other common NFT hosts
      'metadata.ens.domains',
      'i.seadn.io',
      'cdn.simplehash.com',
    ],
    // Enable image optimization for better performance
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
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
            value: [
              "frame-ancestors 'self' https://*.farcaster.xyz https://*.warpcast.com;",
              "connect-src 'self' https://*.alchemy.com https://*.alchemyapi.io https://api.opensea.io https://basescan.org;",
              "img-src 'self' data: https: blob:;",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline';"
            ].join(' ')
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
      {
        // CORS headers for API routes
        source: '/api/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
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
      {
        // Proxy for NFT API to avoid CORS issues
        source: '/api/proxy/alchemy/:path*',
        destination: 'https://base-mainnet.g.alchemy.com/:path*',
      },
      {
        // Proxy for OpenSea API
        source: '/api/proxy/opensea/:path*',
        destination: 'https://api.opensea.io/:path*',
      },
    ];
  },
  
  async redirects() {
    return [
      {
        // Redirect old frame URLs to new mini app
        source: '/frame',
        destination: '/',
        permanent: true,
      },
      {
        // Redirect old API endpoints
        source: '/api/frame/:path*',
        destination: '/api/:path*',
        permanent: true,
      },
    ];
  },
  
  // Webpack configuration for Web3 libraries
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Fix for Web3 modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      url: require.resolve('url'),
      zlib: require.resolve('browserify-zlib'),
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      assert: require.resolve('assert'),
      os: require.resolve('os-browserify'),
      path: require.resolve('path-browserify'),
    };
    
    config.plugins.push(
      new webpack.ProvidePlugin({
        process: 'process/browser',
        Buffer: ['buffer', 'Buffer'],
      })
    );
    
    // Ignore node-specific modules
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    
    return config;
  },
  
  // Environment variables that should be available to the client
  env: {
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    NEXT_PUBLIC_ALCHEMY_API_KEY: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
    NEXT_PUBLIC_BASE_CHAIN_ID: process.env.NEXT_PUBLIC_BASE_CHAIN_ID,
  },
  
  // Compiler options
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Production optimization
  ...(process.env.NODE_ENV === 'production' && {
    output: 'standalone',
    poweredByHeader: false,
    compress: true,
  }),
};

module.exports = nextConfig;
