# Base Art Club

A Tinder-style swipe app for discovering artworks on Farcaster. Built as a Farcaster Mini App.

## Features

- 🎨 Swipe through curated artworks
- ❤️ Like your favorite pieces
- ⭐ Collect standout artworks
- 📊 Track your discovery stats
- 📱 Mobile-optimized interface
- 🔗 Integrated with Farcaster

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- A domain for hosting (required for Farcaster Mini Apps)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/base-art-club.git
cd base-art-club
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

4. Run the development server:
```bash
npm run dev
```

Visit `http://localhost:3000` to see the app.

## Deployment Setup

### 1. Deploy to Production

Deploy to your preferred platform (Vercel, Netlify, etc.):

```bash
npm run build
npm start
```

### 2. Configure Farcaster Mini App

1. **Generate Account Association**: Visit the [Farcaster Mini App Manifest Tool](https://warpcast.com/~/developers/new) and generate a signed account association for your domain.

2. **Update Manifest**: Replace the placeholder values in `app/api/manifest/route.ts` with your actual account association:

```typescript
accountAssociation: {
  header: "YOUR_ACTUAL_HEADER",
  payload: "YOUR_ACTUAL_PAYLOAD", 
  signature: "YOUR_ACTUAL_SIGNATURE"
}
```

3. **Verify Manifest**: Test your manifest at:
```
https://yourdomain.com/.well-known/farcaster.json
```

### 3. Add Required Assets

Create and add these image assets to your `public/` folder:

- `icon.png` - 1024x1024px app icon
- `splash.png` - 200x200px splash screen image
- `og.png` - 1200x630px Open Graph image
- `hero.png` - 1200x630px hero image for app store
- `screenshot1.png`, `screenshot2.png`, `screenshot3.png` - 1284x2778px app screenshots
- `artwork1.jpg` through `artwork5.jpg` - Sample artwork images

### 4. Test Your Mini App

1. **Preview Tool**: Test using the [Mini App Debug Tool](https://warpcast.com/~/developers/mini-apps/debug)

2. **Share Test**: Share your app URL in a Farcaster client to test the embed functionality

## Customization

### Adding Real Artwork Data

Replace the sample data in `app/page.tsx` with your actual artwork API:

```typescript
// Replace sampleArtworks with API call
const loadArtworks = async () => {
  const response = await fetch('/api/artworks');
  const artworks = await response.json();
  setArtworks(artworks);
};
```

### Styling

Customize the look and feel by modifying `app/globals.css`. The app uses:
- Base blue (#0052FF) as primary color
- Responsive design for mobile-first
- Smooth animations with Framer Motion

### Integrations

Add backend functionality by creating API routes:
- `/api/artworks` - Fetch artwork data
- `/api/actions` - Handle swipe actions
- `/api/collections` - User collections
- `/api/auth` - User authentication

## Architecture

```
base-art-club/
├── app/
│   ├── api/
│   │   └── manifest/
│   │       └── route.ts          # Farcaster manifest
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout with metadata
│   └── page.tsx                  # Main swipe interface
├── public/                       # Static assets
├── package.json                  # Dependencies
├── next.config.js               # Next.js configuration
└── tsconfig.json                # TypeScript configuration
```

## Farcaster Mini App Requirements

This app implements all required Farcaster Mini App features:

- ✅ Manifest file at `/.well-known/farcaster.json`
- ✅ Account association with domain verification
- ✅ Embed metadata for social sharing
- ✅ SDK integration with `ready()` call
- ✅ Mobile-optimized responsive design
- ✅ Proper frame headers and security

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues with the Farcaster Mini App integration, reach out to:
- @pirosb3 on Farcaster
- @linda on Farcaster  
- @deodad on Farcaster

For app-specific issues, please open a GitHub issue.
