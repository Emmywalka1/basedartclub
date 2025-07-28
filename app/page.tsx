'use client';

import { useEffect, useState, useCallback } from 'react';
import { sdk } from '@farcaster/frame-sdk';

// Types
interface NFTImage {
  cachedUrl?: string;
  thumbnailUrl?: string;
  originalUrl?: string;
}

interface NFTContract {
  address: string;
  name?: string;
  symbol?: string;
  tokenType: 'ERC721' | 'ERC1155';
}

interface BaseNFT {
  tokenId: string;
  tokenType: 'ERC721' | 'ERC1155';
  name?: string;
  description?: string;
  image: NFTImage;
  contract: NFTContract;
  metadata?: any;
  marketplace?: string;
  price?: {
    value: string;
    currency: string;
  };
}

interface CollectibleNFT extends BaseNFT {
  isForSale?: boolean;
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

export default function Home() {
  const [artworks, setArtworks] = useState<CollectibleNFT[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<SwipeStats>({ liked: 0, passed: 0, collected: 0 });
  const [isCollecting, setIsCollecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [userPoints, setUserPoints] = useState(0);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  
  // Initialize Farcaster SDK and load artworks
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize Farcaster SDK
        try {
          await sdk.actions.ready();
          console.log('Farcaster SDK initialized');
        } catch (sdkError) {
          console.log('Failed to initialize Farcaster SDK, continuing anyway');
        }
        
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
      
      console.log('Fetching artworks...');
      const response = await fetch('/api/nfts?action=curated&limit=20');
      const data = await response.json();
      
      console.log('API Response:', data);
      
      if (data.success && data.data && data.data.length > 0) {
        const collectibleNFTs: CollectibleNFT[] = data.data.map((nft: BaseNFT) => ({
          ...nft,
          isForSale: !!nft.price,
          category: CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)],
        }));
        
        setArtworks(collectibleNFTs);
        console.log('Loaded artworks:', collectibleNFTs.length);
      } else {
        // Use mock data if API fails
        console.log('Using mock data');
        setArtworks(getMockArtworks());
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load artworks:', error);
      setError('Failed to load artworks. Using demo data.');
      setArtworks(getMockArtworks());
      setIsLoading(false);
    }
  };

  const getMockArtworks = (): CollectibleNFT[] => {
    return [
      {
        tokenId: '1',
        tokenType: 'ERC721',
        name: 'Digital Dreams #1',
        description: 'A vibrant digital landscape exploring the intersection of technology and nature.',
        image: {
          cachedUrl: '/artwork1.jpg',
          originalUrl: '/artwork1.jpg'
        },
        contract: {
          address: '0x036721e5A681E02A730b05e2B56e9b7189f2A3F8',
          name: 'Based Ghouls',
          tokenType: 'ERC721'
        },
        isForSale: true,
        price: { value: '0.15', currency: 'ETH' },
        marketplace: 'OpenSea',
        category: 'Digital'
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
        contract: {
          address: '0x4F89Bbe2c2C896819f246F3dce8A33F5B1aB4586',
          name: 'Base Punks',
          tokenType: 'ERC721'
        },
        isForSale: true,
        price: { value: '0.08', currency: 'ETH' },
        marketplace: 'Foundation',
        category: 'AI Art'
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
        contract: {
          address: '0x1538C5c8FbE7c1F0FF63F5b3F59cbad74B41db87',
          name: 'Base Names',
          tokenType: 'ERC721'
        },
        isForSale: true,
        price: { value: '0.25', currency: 'ETH' },
        marketplace: 'Zora',
        category: 'One-of-Ones'
      },
    ];
  };

  const connectWallet = useCallback(() => {
    setWalletConnected(true);
    alert('🎉 Wallet connected! Welcome to Base Art Club.\n\nStart collecting to earn points!');
  }, []);

  const showFeedback = (message: string) => {
    setActionFeedback(message);
    setTimeout(() => setActionFeedback(null), 2000);
  };

  const handleAction = async (action: 'pass' | 'like' | 'collect', artwork: CollectibleNFT) => {
    if (isCollecting) return;
    
    // Update stats and points
    const newStats = { ...stats };
    let pointsEarned = 0;
    
    switch (action) {
      case 'pass':
        newStats.passed++;
        pointsEarned = 1;
        showFeedback('➡️ Passed');
        break;
      case 'like':
        newStats.liked++;
        pointsEarned = 2;
        showFeedback('❤️ Liked!');
        break;
      case 'collect':
        newStats.collected++;
        pointsEarned = 10;
        await handleCollectArtwork(artwork);
        break;
    }
    
    setStats(newStats);
    setUserPoints(prev => prev + pointsEarned);

    // Move to next artwork after a short delay
    if (action !== 'collect') {
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 500);
    }

    console.log(`${action} artwork:`, artwork.name, `+${pointsEarned} points`);
  };

  const handleCollectArtwork = async (artwork: CollectibleNFT) => {
    if (!walletConnected) {
      const shouldConnect = confirm('🔗 Connect wallet to collect this artwork?\n\nYou\'ll earn points and join the collector leaderboard!');
      if (shouldConnect) {
        connectWallet();
      }
      return;
    }

    if (!artwork.isForSale || !artwork.price) {
      alert('❌ This artwork is not currently available for purchase');
      return;
    }

    try {
      setIsCollecting(true);
      showFeedback('🔄 Processing...');
      
      const confirmed = confirm(
        `🎨 Collect "${artwork.name}"\n\n💰 Price: ${artwork.price.value} ${artwork.price.currency}\n🏪 Marketplace: ${artwork.marketplace}\n📈 Category: ${artwork.category}\n\nProceed with collection?`
      );
      
      if (confirmed) {
        console.log('Collecting NFT:', {
          contract: artwork.contract.address,
          tokenId: artwork.tokenId,
          price: artwork.price,
        });
        
        // Simulate collection process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        showFeedback('✅ Collected!');
        alert(`🎉 Successfully collected "${artwork.name}"!\n\n✅ Added to your collection\n🏆 +10 points earned\n\n🔗 View on ${artwork.marketplace}`);
        
        setTimeout(() => {
          setCurrentIndex(prev => prev + 1);
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to collect artwork:', error);
      alert('❌ Collection failed. Please try again.');
    } finally {
      setIsCollecting(false);
    }
  };

  const resetGallery = () => {
    setCurrentIndex(0);
    setStats({ liked: 0, passed: 0, collected: 0 });
    setUserPoints(0);
    loadArtworks();
  };

  if (isLoading) {
    return (
      <div className="app-container">
        <div className="loading">
          <div className="loading-spinner"></div>
          <div>Loading amazing artworks from Base...</div>
        </div>
      </div>
    );
  }

  if (error && artworks.length === 0) {
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

      {/* Main Content Area */}
      <div className="artwork-container">
        {hasMoreArtworks && currentArtwork ? (
          <div className="artwork-card">
            {currentArtwork.isForSale && (
              <div className="collection-status for-sale">For Sale</div>
            )}
            
            {/* Action Feedback */}
            {actionFeedback && (
              <div className="action-feedback">{actionFeedback}</div>
            )}
            
            <div className="artwork-image-container">
              <img 
                src={currentArtwork.image.cachedUrl || currentArtwork.image.originalUrl || '/artwork1.jpg'} 
                alt={currentArtwork.name || 'NFT'}
                className="artwork-image"
                onError={(e) => {
                  console.error('Image failed to load:', e);
                  e.currentTarget.src = '/artwork1.jpg';
                }}
              />
            </div>
            
            <div className="artwork-details">
              <h2 className="artwork-title">{currentArtwork.name || 'Untitled'}</h2>
              <p className="artwork-artist">by {currentArtwork.contract.name || 'Unknown Artist'}</p>
              
              {currentArtwork.category && (
                <span className="artwork-category">{currentArtwork.category}</span>
              )}
              
              {currentArtwork.isForSale && currentArtwork.price && (
                <div className="artwork-price">
                  {currentArtwork.price.value} {currentArtwork.price.currency}
                </div>
              )}
              
              <p className="artwork-description">
                {currentArtwork.description || 'A unique digital artwork on Base blockchain.'}
              </p>
              
              <div className="artwork-metadata">
                <div>Token #{currentArtwork.tokenId}</div>
                <div>{currentArtwork.marketplace || 'OpenSea'}</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <button 
                className="action-button pass-button"
                onClick={() => handleAction('pass', currentArtwork)}
                disabled={isCollecting}
              >
                <span className="button-icon">✕</span>
                <span className="button-text">Pass</span>
              </button>
              
              <button 
                className="action-button like-button"
                onClick={() => handleAction('like', currentArtwork)}
                disabled={isCollecting}
              >
                <span className="button-icon">♡</span>
                <span className="button-text">Like</span>
              </button>
              
              <button 
                className="action-button collect-button"
                onClick={() => handleAction('collect', currentArtwork)}
                disabled={isCollecting || !currentArtwork.isForSale}
              >
                <span className="button-icon">{isCollecting ? '⏳' : '⭐'}</span>
                <span className="button-text">{isCollecting ? 'Processing' : 'Collect'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="empty-stack">
            <h3>🎉 You've discovered all artworks!</h3>
            <p>Amazing work! You've explored {artworks.length} pieces in our collection.</p>
            <button className="reload-button" onClick={resetGallery}>
              Start Over
            </button>
          </div>
        )}
      </div>

      {/* Progress indicator */}
      {hasMoreArtworks && (
        <div className="progress-container">
          <div className="progress-text">
            {currentIndex + 1} of {artworks.length}
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${((currentIndex + 1) / artworks.length) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
