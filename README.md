# Base Art Club - Real NFT Integration

A Tinder-style swipe app for discovering and collecting real artworks from Base blockchain. Built as a Farcaster Mini App with integrated wallet functionality and real NFT marketplace data.

## 🚀 Features

- 🎨 **Real NFT Discovery**: Swipe through actual artworks from Base blockchain
- 💰 **Live Marketplace Data**: Real-time pricing from OpenSea, Foundation, Zora, and more
- 🔗 **Seamless Wallet Integration**: Connect with Farcaster's built-in wallet
- ⭐ **Collect & Purchase**: Actually buy NFTs directly from the app
- 📊 **Discovery Analytics**: Track your art discovery journey
- 📱 **Mobile-Optimized**: Perfect experience on mobile devices
- 🔗 **Farcaster Native**: Deep integration with Farcaster ecosystem

## 🏗️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Blockchain**: Base (Ethereum L2), Wagmi, Viem
- **NFT Data**: Alchemy NFT API, OpenSea API
- **Wallet**: Farcaster Frame Wagmi Connector
- **Styling**: Custom CSS with mobile-first design
- **Animation**: Framer Motion

## 📋 Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- npm or yarn package manager
- An Alchemy account and API key
- A domain for hosting (required for Farcaster Mini Apps)
- (Optional) OpenSea API key for enhanced data

## 🛠️ Installation

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/base-art-club.git
cd base-art-club
npm install
```

### 2. Environment Setup

Create your environment file:

```bash
cp .env.example .env.local
```

Configure your `.env.local`:

```env
# Required: Your production domain
NEXT_PUBLIC_BASE_URL=https://yourdomain.com

# Required: Alchemy API Key (get from https://dashboard.alchemy.com)
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key_here

# Optional: Enhanced marketplace data
OPENSEA_API_KEY=your_opensea_api_key_here

# Optional: WalletConnect for additional wallet support
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# Base Configuration
NEXT_PUBLIC_BASE_CHAIN_ID=8453
```

### 3. Get Your API Keys

#### Alchemy Setup (Required)
1. Go to [Alchemy Dashboard](https://dashboard.alchemy.com)
2. Create a new app
3. Select "Base" as the network
4. Copy your API key to `NEXT_PUBLIC_ALCHEMY_API_KEY`

#### OpenSea Setup (Optional)
1. Go to [OpenSea Developer Portal](https://docs.opensea.io/reference/api-overview)
2. Request an API key
3. Add it to `OPENSEA_API_KEY`

### 4. Development

```bash
npm run dev
```

Visit `http://localhost:3000` to see your app.

## 🚀 Deployment & Farcaster Setup

### 1. Deploy to Production

Deploy to Vercel, Netlify, or your preferred platform:

```bash
npm run build
npm start
```

### 2. Configure Farcaster Mini App

#### Generate Account Association
1. Visit the [Farcaster Mini App Manifest Tool](https://warpcast.com/~/developers/new)
2. Enter your domain
3. Generate a signed account association
4. Update `app/api/manifest/route.ts` with the generated values:

```typescript
accountAssociation: {
  header: "YOUR_ACTUAL_HEADER",
  payload: "YOUR_ACTUAL_PAYLOAD",
  signature: "YOUR_ACTUAL_SIGNATURE"
}
```

#### Test Your Setup
1. Verify manifest: `https://yourdomain.com/.well-known/farcaster.json`
2. Test in [Mini App Debug Tool](https://warpcast.com/~/developers/mini-apps/debug)
3. Share in Farcaster to test embeds

### 3. Add Required Assets

Add these image assets to your `public/` folder:

- `icon.png` - 1024x1024px app icon
- `splash.png` - 200x200px splash screen
- `og.png` - 1200x630px social sharing image
- `hero.png` - 1200x630px app store image
- `screenshot1.png`, `screenshot2.png`, `screenshot3.png` - App screenshots

## 🎨 NFT Data Sources

### Supported Marketplaces
- **OpenSea**: Largest NFT marketplace with comprehensive Base support
- **Foundation**: Curated art platform
- **Zora**: Creator-focused marketplace
- **Rarible**: Community-owned marketplace
- **Manifold**: Creator tools and marketplace

### Curated Collections
The app features popular Base NFT collections:
- Based Ghouls
- Base Punks  
- Base Names
- Tiny Based Frogs
- Based Vitalik

### Adding New Collections
Update `app/api/nfts/route.ts` to add new collections:

```typescript
const BASE_NFT_COLLECTIONS = [
  {
    contract: '0xYourContractAddress',
    name: 'Your Collection Name',
    description: 'Collection description'
  }
];
```

## 💰 Wallet Integration

### Supported Wallets
- **Farcaster Wallet**: Native integration (primary)
- **MetaMask**: Via WalletConnect
- **Coinbase Wallet**: Via WalletConnect
- **Rainbow**: Via WalletConnect

### Purchase Flow
1. User swipes up to collect an NFT
2. Wallet connection prompt (if not connected)
3. Transaction confirmation with real pricing
4. Blockchain transaction execution
5. Success confirmation with transaction link

### Smart Contract Interactions
The app handles various marketplace contracts:
- OpenSea Seaport protocol
- Foundation marketplace contracts
- Zora protocol contracts
- Direct NFT contract purchases

## 📊 Features Overview

### Discovery Engine
- **Real-time NFT fetching** from Base blockchain
- **Smart filtering** for quality artworks
- **Marketplace integration** for live pricing
- **Collection curation** from popular Base projects

### User Experience
- **Swipe gestures**: Left (pass), Right (like), Up (collect)
- **Touch controls**: Button alternatives for all actions
- **Live stats**: Track discovery journey
- **Smooth animations**: Framer Motion powered

### Performance Optimizations
- **API caching**: 5-minute cache for NFT data
- **Image optimization**: Next.js Image component
- **Lazy loading**: Progressive content loading
- **Error boundaries**: Graceful error handling

## 🔧 API Endpoints

### `/api/nfts`
- `GET ?action=curated&limit=20` - Get curated NFTs
- `GET ?action=metadata&contract=0x...&tokenId=123` - Get specific NFT
- `GET ?action=floor-price&contract=0x...` - Get collection floor price
- `GET ?action=collections` - Get available collections

### `/api/manifest`
- `GET` - Farcaster Mini App manifest

## 📁 File Structure

```
base-art-club/
├── app/
│   ├── api/
│   │   ├── manifest/route.ts      # Farcaster manifest
│   │   └── nfts/route.ts          # NFT data API
│   ├── globals.css                # Enhanced styles
│   ├── layout.tsx                 # Wagmi providers
│   └── page.tsx                   # Main app with real NFTs
├── config/
│   └── wagmi.ts                   # Wagmi configuration
├── hooks/
│   └── useMarketplace.ts          # Marketplace interactions
├── services/
│   └── nftApi.ts                  # NFT API service
├── public/                        # Static assets
├── package.json                   # Updated dependencies
├── next.config.js                 # Enhanced configuration
└── README.md                      # This file
```

## 🧪 Testing

### Local Testing
```bash
npm run dev
# Test at http://localhost:3000
```

### Farcaster Testing
1. Use [Mini App Debug Tool](https://warpcast.com/~/developers/mini-apps/debug)
2. Test wallet connections
3. Verify NFT data loading
4. Test purchase flows (testnet recommended)

### Production Testing
1. Deploy to staging environment
2. Test with real Farcaster client
3. Verify all marketplace integrations
4. Test on mobile devices

## 🐛 Troubleshooting

### Common Issues

#### NFTs Not Loading
- Check Alchemy API key configuration
- Verify Base network support
- Check console for API errors

#### Wallet Connection Issues
- Ensure Farcaster Frame connector is properly configured
- Check for CORS issues in production
- Verify domain configuration

#### Purchase Failures
- Check wallet has sufficient ETH for gas
- Verify contract addresses are correct
- Ensure marketplace integrations are up-to-date

### Debug Tools
- Browser DevTools console
- [Farcaster Debug Tool](https://warpcast.com/~/developers/mini-apps/debug)
- [Base Block Explorer](https://basescan.org)
- Alchemy Dashboard logs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Add proper error handling
- Test on mobile devices
- Ensure accessibility compliance

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Community
- Farcaster: [@baseartclub](https://warpcast.com/baseartclub)
- Discord: [Join our Discord](https://discord.gg/baseartclub)
- Twitter: [@baseartclub](https://twitter.com/baseartclub)

### Technical Issues
For Farcaster Mini App specific issues:
- @pirosb3 on Farcaster
- @linda on Farcaster
- @deodad on Farcaster

For app-specific issues:
- Open a [GitHub Issue](https://github.com/yourusername/base-art-club/issues)
- Include browser, device, and error details

## 🙏 Acknowledgments

- **Farcaster Team**: For the amazing Mini App platform
- **Alchemy**: For reliable Base blockchain infrastructure
- **Base**: For the awesome L2 ecosystem
- **OpenSea**: For comprehensive NFT marketplace APIs
- **Wagmi Team**: For excellent Web3 React hooks

## 🔗 Links

- [Live App](https://baseartclub.xyz)
- [Farcaster Mini Apps Docs](https://miniapps.farcaster.xyz)
- [Base Documentation](https://docs.base.org)
- [Alchemy NFT API](https://docs.alchemy.com/reference/nft-api-quickstart)
- [Wagmi Documentation](https://wagmi.sh)

---

**Built with ❤️ for the Base and Farcaster ecosystems**
