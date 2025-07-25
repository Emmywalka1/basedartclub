'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, PanInfo, useAnimation } from 'framer-motion';
import { sdk } from '@farcaster/frame-sdk';

interface NFTMetadata {
  name?: string
  description?: string
  image?: string
  attributes?: Array<{
    trait_type: string
    value: string | number
  }>
}

interface NFTContract {
  address: string
  name?: string
  symbol?: string
  tokenType: 'ERC721' | 'ERC1155'
}

interface BaseNFT {
  tokenId: string
  tokenType: 'ERC721' | 'ERC1155'
  name?: string
  description?: string
  image: {
    cachedUrl?: string
    thumbnailUrl?: string
    originalUrl?: string
  }
  raw: {
    metadata?: NFTMetadata
  }
  contract: NFTContract
  timeLastUpdated: string
}

interface CollectibleNFT extends BaseNFT {
  isForSale?: boolean;
  salePrice?: {
    value: string;
    currency: string;
  };
  marketplace?: string;
  category?: string;
}

interface SwipeStats {
  liked: number;
  passed: number;
  collected: number;
}

const CATEGORIES = [
  'Photography',
  'Editions', 
  'One-of-Ones',
  'AI Art',
  'Digital',
];

const PRICE_RANGES = [
  'Freemint',
  'Under 0.1 ETH',
  'Under 1 ETH',
  'Over 1 ETH'
];

export default function Home() {
  const [artworks, setArtworks] = useState<CollectibleNFT[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<SwipeStats>({ liked: 0, passed: 0, collected: 0 });
  const [swipeDirection, setSwipeDirection] = useState<string | null>(null);
  const [isCollecting, setIsCollecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [userPoints, setUserPoints] = useState(0);
  
  const controls = useAnimation();

  // Initialize Farcaster SDK and load artworks
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize Farcaster SDK
        await sdk.actions.ready();
        console.log('Farcaster SDK initialized');
        
        // Load NFT artworks
        await loadArtworks();
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setError('Failed to load artworks. Please try again.');
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  const loadArtworks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Try to fetch from our API first, fallback to mock data
      try {
        const response = await fetch('/api/nfts?action=curated&limit=20');
        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
          const collectibleNFTs: CollectibleNFT[] = data.data.map((nft: BaseNFT) => ({
            ...nft,
            isForSale: Math.random() > 0.3,
            salePrice: {
              value: (Math.random() * 0.5 + 0.1).toFixed(3),
              currency: 'ETH',
            },
            marketplace: 'OpenSea',
            category: CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)],
          }));
          
          setArtworks(collectibleNFTs);
          setIsLoading(false);
          return;
        }
      } catch (apiError) {
        console.log('API not available, using mock data');
      }

      // Enhanced mock data with categories
      const mockArtworks: CollectibleNFT[] = [
        {
          tokenId: '1',
          tokenType: 'ERC721',
          name: 'Digital Dreams #1',
          description: 'A vibrant digital landscape exploring the intersection of technology and nature through abstract forms and flowing colors.',
          image: {
            cachedUrl: '/artwork1.jpg',
            originalUrl: '/artwork1.jpg'
          },
          raw: {
            metadata: {
              name: 'Digital Dreams #1',
              description: 'A vibrant digital landscape exploring the intersection of technology and nature.',
              image: '/artwork1.jpg'
            }
          },
          contract: {
            address: '0x036721e5A681E02A730b05e2B56e9b7189f2A3F8',
            name: 'Based Ghouls',
            tokenType: 'ERC721'
          },
          timeLastUpdated: new Date().toISOString(),
          isForSale: true,
          salePrice: { value: '0.15', currency: 'ETH' },
          marketplace: 'OpenSea',
          category: 'Digital'
        },
        {
          tokenId: '2',
          tokenType: 'ERC721',
          name: 'Neon Genesis #42',
          description: 'Cyberpunk-inspired artwork featuring electric blues and vibrant magentas in a futuristic cityscape composition.',
          image: {
            cachedUrl: '/artwork2.jpg',
            originalUrl: '/artwork2.jpg'
          },
          raw: {
            metadata: {
              name: 'Neon Genesis #42',
              description: 'Cyberpunk-inspired artwork with electric blues and magentas.',
              image: '/artwork2.jpg'
            }
          },
          contract: {
            address: '0x4F89Bbe2c2C896819f246F3dce8A33F5B1aB4586',
            name: 'Base Punks',
            tokenType: 'ERC721'
          },
          timeLastUpdated: new Date().toISOString(),
          isForSale: true,
          salePrice: { value: '0.08', currency: 'ETH' },
          marketplace: 'Foundation',
          category: 'AI Art'
        },
        {
          tokenId: '3',
          tokenType: 'ERC721',
          name: 'Abstract Emotions',
          description: 'An emotional journey through color and form, expressing the complexity of human feelings in abstract visual language.',
          image: {
            cachedUrl: '/artwork3.jpg',
            originalUrl: '/artwork3.jpg'
          },
          raw: {
            metadata: {
              name: 'Abstract Emotions',
              description: 'An emotional journey through color and form.',
              image: '/artwork3.jpg'
            }
          },
          contract: {
            address: '0x1538C5c8FbE7c1F0FF63F5b3F59cbad74B41db87',
            name: 'Base Names',
            tokenType: 'ERC721'
          },
          timeLastUpdated: new Date().toISOString(),
          isForSale: true,
          salePrice: { value: '0.25', currency: 'ETH' },
          marketplace: 'Zora',
          category: 'One-of-Ones'
        },
        {
          tokenId: '4',
          tokenType: 'ERC721',
          name: 'Cosmic Journey',
          description: 'A breathtaking view of distant galaxies and star formations captured through digital photography and enhancement.',
          image: {
            cachedUrl: '/artwork4.jpg',
            originalUrl: '/artwork4.jpg'
          },
          raw: {
            metadata: {
              name: 'Cosmic Journey',
              description: 'A breathtaking view of distant galaxies and star formations.',
              image: '/artwork4.jpg'
            }
          },
          contract: {
            address: '0x03c4738Ee98aE44591e1A4A4F3CaB6641d95DD9a',
            name: 'Tiny Based Frogs',
            tokenType: 'ERC721'
          },
          timeLastUpdated: new Date().toISOString(),
          isForSale: true,
          salePrice: { value: '0.05', currency: 'ETH' },
          marketplace: 'Rarible',
          category: 'Photography'
        },
        {
          tokenId: '5',
          tokenType: 'ERC721',
          name: 'Urban Poetry',
          description: 'Street art meets digital innovation in this urban masterpiece, blending traditional graffiti with modern digital techniques.',
          image: {
            cachedUrl: '/artwork5.jpg',
            originalUrl: '/artwork5.jpg'
          },
          raw: {
            metadata: {
              name: 'Urban Poetry',
              description: 'Street art meets digital innovation in this urban masterpiece.',
              image: '/artwork5.jpg'
            }
          },
          contract: {
            address: '0x7F7f3aFc9eA11b8e3b6a89071c94ce3155fb4Ccb',
            name: 'Based Vitalik',
            tokenType: 'ERC721'
          },
          timeLastUpdated: new Date().toISOString(),
          isForSale: true,
          salePrice: { value: '0.12', currency: 'ETH' },
          marketplace: 'Manifold',
          category: 'Editions'
        }
      ];

      setArtworks(mockArtworks);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load artworks:', error);
      setError('Failed to load artworks. Please try again.');
      setIsLoading(false);
    }
  };

  const connectWallet = useCallback(() => {
    // Simulate wallet connection
    setWalletConnected(true);
    alert('🎉 Wallet connected! Welcome to Base Art Club.\n\nStart collecting to earn points and climb the leaderboard!');
  }, []);

  const handleSwipe = async (direction: 'left' | 'right' | 'up', artwork: CollectibleNFT) => {
    if (isCollecting) return;
    
    setSwipeDirection(direction);
    
    // Update stats and points
    const newStats = { ...stats };
    let pointsEarned = 0;
    
    if (direction === 'left') {
      newStats.passed++;
      pointsEarned = 1; // Points for engagement
    } else if (direction === 'right') {
      newStats.liked++;
      pointsEarned = 2; // More points for liking
    } else if (direction === 'up') {
      newStats.collected++;
      pointsEarned = 10; // Most points for collecting
    }
    
    setStats(newStats);
    setUserPoints(prev => prev + pointsEarned);

    // Handle collection (purchasing)
    if (direction === 'up') {
      await handleCollectArtwork(artwork);
    }

    // Show swipe indicator briefly
    setTimeout(() => {
      setSwipeDirection(null);
      setCurrentIndex(prev => prev + 1);
    }, 300);

    console.log(`${direction} swipe on artwork:`, artwork.name, `+${pointsEarned} points`);
  };

  const handleCollectArtwork = async (artwork: CollectibleNFT) => {
    if (!walletConnected) {
      const shouldConnect = confirm('🔗 Connect wallet to collect this amazing artwork?\n\nYou\'ll earn points and join the collector leaderboard!');
      if (shouldConnect) {
        connectWallet();
      }
      return;
    }

    if (!artwork.isForSale || !artwork.salePrice) {
      alert('❌ This artwork is not currently available for purchase');
      return;
    }

    try {
      setIsCollecting(true);
      
      const confirmed = confirm(
        `🎨 Collect "${artwork.name}"\n\n💰 Price: ${artwork.salePrice.value} ${artwork.salePrice.currency}\n🏪 Marketplace: ${artwork.marketplace}\n📈 Category: ${artwork.category}\n\nProceed with collection?`
      );
      
      if (confirmed) {
        console.log('Collecting NFT:', {
          contract: artwork.contract.address,
          tokenId: artwork.tokenId,
          price: artwork.salePrice,
          category: artwork.category
        });
        
        // Simulate collection process with realistic timing
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        alert(`🎉 Successfully collected "${artwork.name}"!\n\n✅ Added to your collection\n🏆 +10 collector points earned\n📊 Check leaderboard for your ranking\n\n🔗 View on ${artwork.marketplace}`);
      }
    } catch (error) {
      console.error('Failed to collect artwork:', error);
      alert('❌ Collection failed. Please try again.');
    } finally {
      setIsCollecting(false);
    }
  };

  const handlePanEnd = (event: any, info: PanInfo) => {
    if (isCollecting || currentIndex >= artworks.length) return;
    
    const threshold = 100;
    const velocity = 500;
    
    if (Math.abs(info.offset.x) > threshold || Math.abs(info.velocity.x) > velocity) {
      if (info.offset.x > 0) {
        handleSwipe('right', artworks[currentIndex]);
      } else {
        handleSwipe('left', artworks[currentIndex]);
      }
    } else if (info.offset.y < -threshold || info.velocity.y < -velocity) {
      handleSwipe('up', artworks[currentIndex]);
    } else {
      controls.start({ x: 0, y: 0, rotate: 0 });
    }
  };

  const handleButtonAction = (action: 'pass' | 'like' | 'collect') => {
    if (currentIndex >= artworks.length || isCollecting) return;
    
    const directionMap = {
      pass: 'left' as const,
      like: 'right' as const,
      collect: 'up' as const
    };
    
    handleSwipe(directionMap[action], artworks[currentIndex]);
  };

  const resetStack = () => {
    setCurrentIndex(0);
    setStats({ liked: 0, passed: 0, collected: 0 });
    setSwipeDirection(null);
    setSelectedCategory(null);
    loadArtworks();
  };

  if (isLoading) {
    return (
      <div className="loading">
        <div>Loading amazing artworks from Base...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container">
        <header className="header">
          <div className="brand-container">
            <div className="paint-palette"></div>
            <h1>BASE</h1>
          </div>
          <div className="subtitle">art club</div>
        </header>
        <div className="empty-stack">
          <h3>Unable to load artworks</h3>
          <p>{error}</p>
          <button className="reload-button" onClick={loadArtworks}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const currentArtwork = artworks[currentIndex];
  const hasMoreArtworks = currentIndex < artworks.length;
  const imageUrl = currentArtwork?.image.cachedUrl || 
                   currentArtwork?.image.thumbnailUrl || 
                   currentArtwork?.image.originalUrl;

  return (
    <div className="app-container">
      <header className="header">
        <div className="brand-container">
          <div className="paint-palette"></div>
          <h1>BASE</h1>
        </div>
        <div className="subtitle">art club</div>
        <div className="tagline">every artwork on base, one feed.</div>
        
        {/* Wallet Connection Status */}
        <div className="wallet-status">
          {walletConnected ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span>🏆 {userPoints} points</span>
              <button 
                onClick={() => setWalletConnected(false)} 
                className="wallet-button"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button 
              onClick={connectWallet}
              className="wallet-button"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      <div className="stats">
        <div className="stat">
          <div className="stat-number">{stats.liked}</div>
          <div className="stat-label">Liked</div>
        </div>
        <div className="stat">
          <div className="stat-number">{stats.collected}</div>
          <div className="stat-label">Collected</div>
        </div>
        <div className="stat">
          <div className="stat-number">{stats.passed}</div>
          <div className="stat-label">Passed</div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="filter-pills">
        <div 
          className={`filter-pill ${!selectedCategory ? 'active' : ''}`}
          onClick={() => setSelectedCategory(null)}
        >
          All
        </div>
        {CATEGORIES.map(category => (
          <div 
            key={category}
            className={`filter-pill ${selectedCategory === category ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </div>
        ))}
      </div>

      <div className="card-stack">
        {hasMoreArtworks ? (
          <>
            {/* Next card (background) */}
            {currentIndex + 1 < artworks.length && (
              <div className="card" style={{ transform: 'scale(0.95)', zIndex: 1, opacity: 0.8 }}>
                <img 
                  src={artworks[currentIndex + 1].image.cachedUrl || 
                       artworks[currentIndex + 1].image.thumbnailUrl || 
                       artworks[currentIndex + 1].image.originalUrl} 
                  alt={artworks[currentIndex + 1].name || 'NFT'}
                  className="card-image"
                />
                <div className="card-content">
                  <h3 className="card-title">{artworks[currentIndex + 1].name || 'Untitled'}</h3>
                  <p className="card-artist">by {artworks[currentIndex + 1].contract.name || 'Unknown Artist'}</p>
                  {artworks[currentIndex + 1].isForSale && artworks[currentIndex + 1].salePrice && (
                    <div className="card-price">{artworks[currentIndex + 1].salePrice!.value} {artworks[currentIndex + 1].salePrice!.currency}</div>
                  )}
                </div>
              </div>
            )}

            {/* Current card */}
            <motion.div
              className="card"
              style={{ zIndex: 2 }}
              animate={controls}
              drag
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              onPanEnd={handlePanEnd}
              whileDrag={{ scale: 1.02 }}
            >
              {currentArtwork.isForSale && (
                <div className="collection-status for-sale">For Sale</div>
              )}
              
              <img 
                src={imageUrl} 
                alt={currentArtwork.name || 'NFT'}
                className="card-image"
                style={{ objectFit: 'cover' }}
              />
              <div className="card-content">
                <h3 className="card-title">{currentArtwork.name || 'Untitled'}</h3>
                <p className="card-artist">by {currentArtwork.contract.name || 'Unknown Artist'}</p>
                
                {currentArtwork.category && (
                  <div className="filter-pill" style={{ marginBottom: '8px', fontSize: '11px' }}>
                    {currentArtwork.category}
                  </div>
                )}
                
                {currentArtwork.isForSale && currentArtwork.salePrice && (
                  <div className="card-price">{currentArtwork.salePrice.value} {currentArtwork.salePrice.currency}</div>
                )}
                
                <p className="card-description">
                  {currentArtwork.description || 
                   currentArtwork.raw.metadata?.description || 
                   'A unique digital artwork minted on Base blockchain, representing the cutting edge of digital art and creative expression.'}
                </p>
                
                {/* NFT Metadata */}
                <div className="card-metadata">
                  <div>Token #{currentArtwork.tokenId} • {currentArtwork.tokenType}</div>
                  <div>{currentArtwork.contract.address.slice(0, 8)}...{currentArtwork.contract.address.slice(-6)}</div>
                  {currentArtwork.marketplace && (
                    <div>Available on {currentArtwork.marketplace}</div>
                  )}
                </div>
              </div>

              {swipeDirection && (
                <div className={`swipe-indicator ${
                  swipeDirection === 'left' ? 'pass' : 
                  swipeDirection === 'right' ? 'like' : 'collect'
                }`} style={{ opacity: 1 }}>
                  {swipeDirection === 'left' ? 'PASS' : 
                   swipeDirection === 'right' ? 'LIKE' : 'COLLECT'}
                </div>
              )}
            </motion.div>
          </>
        ) : (
          <div className="empty-stack">
            <h3>🎉 You've discovered all artworks!</h3>
            <p>Amazing work! You've explored every piece in our curated collection. New artworks are added regularly, so check back soon for more incredible discoveries.</p>
            <button className="reload-button" onClick={resetStack}>
              Discover More
            </button>
          </div>
        )}
      </div>

      {hasMoreArtworks && (
        <div className="controls">
          <button 
            className="control-button pass-button"
            onClick={() => handleButtonAction('pass')}
            disabled={isCollecting}
            title="Pass (+1 point)"
          >
            ✕
          </button>
          <button 
            className="control-button collect-button"
            onClick={() => handleButtonAction('collect')}
            disabled={isCollecting || !currentArtwork?.isForSale}
            title={`Collect ${currentArtwork?.isForSale ? '(+10 points)' : '(Not for sale)'}`}
          >
            {isCollecting ? '⏳' : '⭐'}
          </button>
          <button 
            className="control-button like-button"
            onClick={() => handleButtonAction('like')}
            disabled={isCollecting}
            title="Like (+2 points)"
          >
            ♡
          </button>
        </div>
      )}
    </div>
  );
}
