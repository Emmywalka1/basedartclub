// app/page.tsx - Improved UX with Carousel
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
  platform?: string;
  artist?: string;
  isOneOfOne?: boolean;
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
  passed: number;
  collected: number;
}

export default function Home() {
  const [artworks, setArtworks] = useState<CollectibleNFT[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<SwipeStats>({ passed: 0, collected: 0 });
  const [isCollecting, setIsCollecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [userPoints, setUserPoints] = useState(0);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
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
        setError('Failed to load artworks. Please check your connection and try again.');
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  const loadArtworks = async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      
      console.log('Fetching 1/1 artworks from Base...');
      const response = await fetch(`/api/nfts?action=curated&limit=20${refresh ? '&refresh=true' : ''}`);
      const data = await response.json();
      
      console.log('API Response:', data);
      
      if (data.success && data.data && data.data.length > 0) {
        const collectibleNFTs: CollectibleNFT[] = data.data.map((nft: BaseNFT) => ({
          ...nft,
          isForSale: !!nft.price,
          category: nft.platform || 'Digital Art',
        }));
        
        setArtworks(collectibleNFTs);
        console.log('Loaded artworks:', collectibleNFTs.length);
      } else if (data.success && data.data && data.data.length === 0) {
        setError('No 1/1 artworks found on Base. This could be due to limited art activity or API limitations. Try refreshing or check back later.');
        setArtworks([]);
      } else {
        setError(data.error || 'Failed to load artworks');
        setArtworks([]);
      }
      
      setIsLoading(false);
      setIsRefreshing(false);
    } catch (error) {
      console.error('Failed to load artworks:', error);
      setError('Network error. Please check your connection and try again.');
      setArtworks([]);
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const connectWallet = useCallback(() => {
    setWalletConnected(true);
    alert('🎉 Wallet connected! Welcome to Base Art Club.\n\nStart collecting 1/1 art to earn points!');
  }, []);

  const showFeedback = (message: string) => {
    setActionFeedback(message);
    setTimeout(() => setActionFeedback(null), 2000);
  };

  const handleAction = async (action: 'pass' | 'collect', artwork: CollectibleNFT) => {
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
      const shouldConnect = confirm('🔗 Connect wallet to collect this 1/1 artwork?\n\nYou\'ll earn points and support the artist!');
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
        `🎨 Collect "${artwork.name}"\n\n` +
        `👨‍🎨 Artist: ${artwork.artist || 'Unknown'}\n` +
        `💰 Price: ${artwork.price.value} ${artwork.price.currency}\n` +
        `🏪 Platform: ${artwork.platform || artwork.marketplace || 'Independent'}\n` +
        `📈 Type: ${artwork.isOneOfOne ? '1/1 Original' : 'Limited Edition'}\n\n` +
        `Proceed with collection?`
      );
      
      if (confirmed) {
        console.log('Collecting NFT:', {
          contract: artwork.contract.address,
          tokenId: artwork.tokenId,
          price: artwork.price,
        });
        
        // In a real implementation, this would trigger the blockchain transaction
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        showFeedback('✅ Collected!');
        alert(
          `🎉 Successfully collected "${artwork.name}"!\n\n` +
          `✅ Added to your collection\n` +
          `🏆 +10 points earned\n` +
          `👨‍🎨 Supporting artist: ${artwork.artist || 'Independent Artist'}\n\n` +
          `🔗 View on ${artwork.platform || artwork.marketplace || 'Base Explorer'}`
        );
        
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
    setStats({ passed: 0, collected: 0 });
    setUserPoints(0);
    loadArtworks(true);
  };

  // Carousel navigation functions
  const goToPrevious = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex(prev => Math.min(artworks.length - 1, prev + 1));
  };

  if (isLoading) {
    return (
      <div className="app-container">
        <div className="loading">
          <div className="loading-spinner"></div>
          <div>Discovering 1/1 artworks on Base blockchain...</div>
        </div>
      </div>
    );
  }

  const currentArtwork = artworks[currentIndex];
  const hasMoreArtworks = currentIndex < artworks.length;

  return (
    <div className="app-container">
      <header className="header">
        <h1>BASE ART CLUB</h1>
        
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
          <div className="stat-number">{stats.collected}</div>
          <div className="stat-label">Collected</div>
        </div>
        <div className="stat">
          <div className="stat-number">{stats.passed}</div>
          <div className="stat-label">Passed</div>
        </div>
        <div className="stat">
          <div className="stat-number">{artworks.length}</div>
          <div className="stat-label">Available</div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="artwork-container">
        {error && !hasMoreArtworks ? (
          <div className="empty-stack">
            <h3>No Artworks Available</h3>
            <p>{error}</p>
            <button 
              className="reload-button" 
              onClick={() => loadArtworks(true)}
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Refreshing...' : 'Try Again'}
            </button>
          </div>
        ) : hasMoreArtworks && currentArtwork ? (
          <div className="carousel-container">
            {/* Carousel Navigation */}
            <div className="carousel-nav">
              <button 
                className="nav-button prev-button"
                onClick={goToPrevious}
                disabled={currentIndex === 0}
              >
                ←
              </button>
              
              <span className="artwork-counter">
                {currentIndex + 1} of {artworks.length}
              </span>
              
              <button 
                className="nav-button next-button"
                onClick={goToNext}
                disabled={currentIndex === artworks.length - 1}
              >
                →
              </button>
            </div>

            <div className="artwork-card">
              {currentArtwork.isOneOfOne && (
                <div className="collection-status for-sale">1/1 Original</div>
              )}
              
              {/* Action Feedback */}
              {actionFeedback && (
                <div className="action-feedback">{actionFeedback}</div>
              )}
              
              <div className="artwork-image-container">
                <img 
                  src={currentArtwork.image.cachedUrl || currentArtwork.image.originalUrl || currentArtwork.image.thumbnailUrl} 
                  alt={currentArtwork.name || 'NFT Artwork'}
                  className="artwork-image"
                  onError={(e) => {
                    console.error('Image failed to load:', e);
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = '<div style="padding: 40px; text-align: center; color: #64748b;">Image unavailable</div>';
                  }}
                />
              </div>
              
              <div className="artwork-details">
                <h2 className="artwork-title">{currentArtwork.name || 'Untitled'}</h2>
                <p className="artwork-artist">by {currentArtwork.artist || currentArtwork.contract.name || 'Unknown Artist'}</p>
                
                {currentArtwork.platform && (
                  <span className="artwork-category">{currentArtwork.platform}</span>
                )}
                
                {currentArtwork.isForSale && currentArtwork.price && (
                  <div className="artwork-price">
                    {currentArtwork.price.value} {currentArtwork.price.currency}
                  </div>
                )}
                
                <p className="artwork-description">
                  {currentArtwork.description || 'A unique 1/1 artwork on Base blockchain.'}
                </p>
                
                <div className="artwork-metadata">
                  <div>Token #{currentArtwork.tokenId}</div>
                  <div>{currentArtwork.marketplace || currentArtwork.platform || 'Base'}</div>
                </div>
              </div>

              {/* Action Buttons - Only Pass and Collect */}
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
                  className="action-button collect-button"
                  onClick={() => handleAction('collect', currentArtwork)}
                  disabled={isCollecting || !currentArtwork.isForSale}
                >
                  <span className="button-icon">{isCollecting ? '⏳' : '⭐'}</span>
                  <span className="button-text">{isCollecting ? 'Processing' : 'Collect'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-stack">
            <h3>🎨 No More Artworks</h3>
            <p>You've viewed all available 1/1 artworks!</p>
            <p style={{ marginTop: '10px', fontSize: '14px', color: '#64748b' }}>
              Discovered {artworks.length} unique pieces
            </p>
            <button className="reload-button" onClick={resetGallery}>
              Refresh Gallery
            </button>
          </div>
        )}
      </div>

      {/* Progress indicator */}
      {hasMoreArtworks && artworks.length > 0 && (
        <div className="progress-container">
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
