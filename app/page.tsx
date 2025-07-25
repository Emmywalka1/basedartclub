'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, PanInfo, useAnimation } from 'framer-motion';
import { sdk } from '@farcaster/frame-sdk';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

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
}

interface SwipeStats {
  liked: number;
  passed: number;
  collected: number;
}

export default function Home() {
  const [artworks, setArtworks] = useState<CollectibleNFT[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<SwipeStats>({ liked: 0, passed: 0, collected: 0 });
  const [swipeDirection, setSwipeDirection] = useState<string | null>(null);
  const [isCollecting, setIsCollecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const controls = useAnimation();
  
  // Wagmi hooks for wallet functionality
  const { isConnected, address } = useAccount();
  const { connect, connectors, isPending: isConnectingWallet } = useConnect();
  const { disconnect } = useDisconnect();

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
          }));
          
          setArtworks(collectibleNFTs);
          setIsLoading(false);
          return;
        }
      } catch (apiError) {
        console.log('API not available, using mock data');
      }

      // Fallback to mock data
      const mockArtworks: CollectibleNFT[] = [
        {
          tokenId: '1',
          tokenType: 'ERC721',
          name: 'Digital Dreams #1',
          description: 'A vibrant digital landscape exploring the intersection of technology and nature.',
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
          salePrice: { value: '0.5', currency: 'ETH' },
          marketplace: 'OpenSea'
        },
        {
          tokenId: '2',
          tokenType: 'ERC721',
          name: 'Neon Genesis #42',
          description: 'Cyberpunk-inspired artwork with electric blues and magentas.',
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
          salePrice: { value: '0.25', currency: 'ETH' },
          marketplace: 'Foundation'
        },
        {
          tokenId: '3',
          tokenType: 'ERC721',
          name: 'Abstract Emotions',
          description: 'An emotional journey through color and form.',
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
          salePrice: { value: '0.75', currency: 'ETH' },
          marketplace: 'Zora'
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
    if (connectors.length > 0) {
      // Try to use injected connector first (works well in Farcaster)
      const injectedConnector = connectors.find(c => c.type === 'injected');
      connect({ connector: injectedConnector || connectors[0] });
    }
  }, [connect, connectors]);

  const handleSwipe = async (direction: 'left' | 'right' | 'up', artwork: CollectibleNFT) => {
    if (isCollecting) return;
    
    setSwipeDirection(direction);
    
    // Update stats
    const newStats = { ...stats };
    if (direction === 'left') newStats.passed++;
    else if (direction === 'right') newStats.liked++;
    else if (direction === 'up') newStats.collected++;
    
    setStats(newStats);

    // Handle collection (purchasing)
    if (direction === 'up') {
      await handleCollectArtwork(artwork);
    }

    // Show swipe indicator briefly
    setTimeout(() => {
      setSwipeDirection(null);
      setCurrentIndex(prev => prev + 1);
    }, 300);

    console.log(`${direction} swipe on artwork:`, artwork.name);
  };

  const handleCollectArtwork = async (artwork: CollectibleNFT) => {
    if (!isConnected) {
      connectWallet();
      return;
    }

    if (!artwork.isForSale || !artwork.salePrice) {
      alert('This artwork is not available for purchase');
      return;
    }

    try {
      setIsCollecting(true);
      
      const confirmed = confirm(
        `Collect "${artwork.name}" for ${artwork.salePrice.value} ${artwork.salePrice.currency}?\n\nThis would initiate a blockchain transaction.`
      );
      
      if (confirmed) {
        console.log('Collecting NFT:', {
          contract: artwork.contract.address,
          tokenId: artwork.tokenId,
          price: artwork.salePrice
        });
        
        alert(`Collection initiated! In a real deployment, this would interact with ${artwork.marketplace} to purchase the NFT.`);
      }
    } catch (error) {
      console.error('Failed to collect artwork:', error);
      alert('Failed to collect artwork. Please try again.');
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
          <h1>Base Art Club</h1>
          <p>Discover amazing art on Base</p>
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
        <h1>Base Art Club</h1>
        <p>Discover amazing art on Base</p>
        
        {/* Wallet Connection Status */}
        <div style={{ marginTop: '10px', fontSize: '12px' }}>
          {isConnected ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
              <span>Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</span>
              <button 
                onClick={() => disconnect()} 
                className="wallet-button"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button 
              onClick={connectWallet}
              disabled={isConnectingWallet}
              className="wallet-button"
            >
              {isConnectingWallet ? 'Connecting...' : 'Connect Wallet'}
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

      <div className="card-stack">
        {hasMoreArtworks ? (
          <>
            {/* Next card (background) */}
            {currentIndex + 1 < artworks.length && (
              <div className="card" style={{ transform: 'scale(0.95)', zIndex: 1 }}>
                <img 
                  src={artworks[currentIndex + 1].image.cachedUrl || 
                       artworks[currentIndex + 1].image.thumbnailUrl || 
                       artworks[currentIndex + 1].image.originalUrl} 
                  alt={artworks[currentIndex + 1].name || 'NFT'}
                  className="card-image"
                />
                <div className="card-content">
                  <h3 className="card-title">{artworks[currentIndex + 1].name || 'Untitled'}</h3>
                  <p className="card-artist">by {artworks[currentIndex + 1].contract.name || 'Unknown'}</p>
                  {artworks[currentIndex + 1].isForSale && artworks[currentIndex + 1].salePrice && (
                    <p className="card-price">{artworks[currentIndex + 1].salePrice!.value} {artworks[currentIndex + 1].salePrice!.currency}</p>
                  )}
                  <p className="card-description">
                    {artworks[currentIndex + 1].description || 
                     artworks[currentIndex + 1].raw.metadata?.description || 
                     'A unique digital artwork on Base blockchain'}
                  </p>
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
              whileDrag={{
                scale: 1.05,
                rotate: (info: any) => info.offset.x / 10,
              }}
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
                <p className="card-artist">by {currentArtwork.contract.name || 'Unknown'}</p>
                {currentArtwork.isForSale && currentArtwork.salePrice && (
                  <p className="card-price">{currentArtwork.salePrice.value} {currentArtwork.salePrice.currency}</p>
                )}
                <p className="card-description">
                  {currentArtwork.description || 
                   currentArtwork.raw.metadata?.description || 
                   'A unique digital artwork on Base blockchain'}
                </p>
                
                {/* NFT Metadata */}
                <div className="card-metadata">
                  <div>Token #{currentArtwork.tokenId}</div>
                  <div>Contract: {currentArtwork.contract.address.slice(0, 8)}...</div>
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
            <h3>You've seen all artworks!</h3>
            <p>Check back later for more amazing pieces from Base</p>
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
          >
            ✕
          </button>
          <button 
            className="control-button collect-button"
            onClick={() => handleButtonAction('collect')}
            disabled={isCollecting || !currentArtwork?.isForSale}
            style={{ 
              opacity: isCollecting ? 0.5 : currentArtwork?.isForSale ? 1 : 0.3,
              cursor: isCollecting || !currentArtwork?.isForSale ? 'not-allowed' : 'pointer'
            }}
          >
            {isCollecting ? '⏳' : '⭐'}
          </button>
          <button 
            className="control-button like-button"
            onClick={() => handleButtonAction('like')}
            disabled={isCollecting}
          >
            ♡
          </button>
        </div>
      )}
    </div>
  );
}
