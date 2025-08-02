// app/page.tsx - Optimized for Fast Loading
'use client';

import { useEffect, useState, useCallback } from 'react';
import { sdk } from '@farcaster/frame-sdk';

// Types
interface NFTAsset {
  tokenId: string;
  tokenType: 'ERC721' | 'ERC1155';
  name?: string;
  description?: string;
  image: {
    cachedUrl?: string;
    thumbnailUrl?: string;
    originalUrl?: string;
  };
  contract: {
    address: string;
    name?: string;
    symbol?: string;
    tokenType: 'ERC721' | 'ERC1155';
  };
  metadata?: any;
  marketplace?: string;
  price: {
    value: string;
    currency: string;
  };
  artist?: string;
  platform?: string;
  isOneOfOne?: boolean;
  isForSale: boolean;
}

export default function Home() {
  const [artworks, setArtworks] = useState<NFTAsset[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollecting, setIsCollecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageCache, setImageCache] = useState<Set<string>>(new Set());
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Preload next images for instant transitions
  const preloadImages = useCallback((startIndex: number, count: number = 5) => {
    for (let i = startIndex; i < Math.min(startIndex + count, artworks.length); i++) {
      const artwork = artworks[i];
      const imageUrl = artwork?.image.cachedUrl || artwork?.image.originalUrl || artwork?.image.thumbnailUrl;
      
      if (imageUrl && !imageCache.has(imageUrl)) {
        const img = new Image();
        img.onload = () => {
          setImageCache(prev => {
            const newCache = new Set(prev);
            newCache.add(imageUrl);
            return newCache;
          });
        };
        img.src = imageUrl;
      }
    }
  }, [artworks, imageCache]);

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        try {
          await sdk.actions.ready();
        } catch (sdkError) {
          console.log('Farcaster SDK init failed, continuing anyway');
        }
        
        await loadArtworks();
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setError('Failed to load artworks.');
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Preload images when artworks change
  useEffect(() => {
    if (artworks.length > 0) {
      preloadImages(0, 10); // Preload first 10 images
    }
  }, [artworks, preloadImages]);

  // Preload next images when index changes
  useEffect(() => {
    if (artworks.length > 0 && currentIndex >= 0) {
      preloadImages(currentIndex + 1, 3); // Preload next 3
    }
  }, [currentIndex, artworks, preloadImages]);

  const loadArtworks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('⚡ Loading for-sale artworks...');
      const response = await fetch('/api/nfts?action=curated&limit=20');
      const data = await response.json();
      
      if (data.success && data.data && data.data.length > 0) {
        console.log(`✅ Loaded ${data.data.length} for-sale artworks`);
        setArtworks(data.data);
      } else {
        setError('No for-sale artworks found.');
        setArtworks([]);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load artworks:', error);
      setError('Failed to load artworks.');
      setArtworks([]);
      setIsLoading(false);
    }
  };

  const handleAction = async (action: 'pass' | 'collect') => {
    if (isCollecting || isTransitioning) return;
    
    const currentArtwork = artworks[currentIndex];
    if (!currentArtwork) return;

    if (action === 'collect') {
      await handleCollectArtwork(currentArtwork);
    } else {
      // Fast pass - instant transition
      goToNext();
    }
  };

  const handleCollectArtwork = async (artwork: NFTAsset) => {
    try {
      setIsCollecting(true);
      
      const confirmed = confirm(
        `🎨 Collect "${artwork.name}"\n\n` +
        `👨‍🎨 Artist: ${artwork.artist}\n` +
        `💰 Price: ${artwork.price.value} ${artwork.price.currency}\n` +
        `🏪 Platform: ${artwork.platform}\n\n` +
        `Proceed with purchase?`
      );
      
      if (confirmed) {
        // Simulate transaction
        console.log('Collecting NFT:', {
          contract: artwork.contract.address,
          tokenId: artwork.tokenId,
          price: artwork.price,
        });
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        alert(`🎉 Successfully collected "${artwork.name}"!\n\n` +
              `✅ Added to your collection\n` +
              `💰 Paid: ${artwork.price.value} ${artwork.price.currency}\n` +
              `👨‍🎨 Supporting: ${artwork.artist}`);
        
        goToNext();
      }
    } catch (error) {
      console.error('Failed to collect artwork:', error);
      alert('❌ Collection failed. Please try again.');
    } finally {
      setIsCollecting(false);
    }
  };

  const goToNext = () => {
    if (currentIndex < artworks.length - 1) {
      setIsTransitioning(true);
      setCurrentIndex(prev => prev + 1);
      
      // Quick transition
      setTimeout(() => {
        setIsTransitioning(false);
      }, 100);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setIsTransitioning(true);
      setCurrentIndex(prev => prev - 1);
      
      setTimeout(() => {
        setIsTransitioning(false);
      }, 100);
    }
  };

  if (isLoading) {
    return (
      <div className="fullscreen-container">
        <div className="loading-center">
          <div className="loading-spinner"></div>
          <div style={{ marginTop: '16px', color: '#64748b' }}>Loading for-sale artworks...</div>
        </div>
      </div>
    );
  }

  if (error || artworks.length === 0) {
    return (
      <div className="fullscreen-container">
        <div className="loading-center">
          <h3>No for-sale artworks available</h3>
          <p style={{ margin: '16px 0', textAlign: 'center', color: '#64748b' }}>
            {error || 'No artworks are currently listed for sale'}
          </p>
          <button 
            onClick={loadArtworks}
            style={{
              padding: '12px 24px',
              background: '#007BFF',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  const currentArtwork = artworks[currentIndex];
  const hasNext = currentIndex < artworks.length - 1;
  const hasPrev = currentIndex > 0;

  if (!currentArtwork) {
    return (
      <div className="fullscreen-container">
        <div className="loading-center">
          <h3>All artworks viewed!</h3>
          <button 
            onClick={() => setCurrentIndex(0)}
            style={{
              marginTop: '16px',
              padding: '12px 24px',
              background: '#007BFF',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  const imageUrl = currentArtwork.image.cachedUrl || currentArtwork.image.originalUrl || currentArtwork.image.thumbnailUrl;
  const isImagePreloaded = imageCache.has(imageUrl || '');

  return (
    <div className="fullscreen-container">
      {/* Navigation arrows */}
      {hasPrev && (
        <button 
          className="nav-arrow nav-arrow-left"
          onClick={goToPrevious}
          disabled={isTransitioning}
        >
          ←
        </button>
      )}
      
      {hasNext && (
        <button 
          className="nav-arrow nav-arrow-right"
          onClick={goToNext}
          disabled={isTransitioning}
        >
          →
        </button>
      )}

      {/* Progress indicator */}
      <div className="progress-indicator">
        {currentIndex + 1} / {artworks.length}
      </div>

      {/* Price indicator - prominently displayed */}
      <div className="price-indicator">
        {currentArtwork.price.value} {currentArtwork.price.currency}
      </div>

      {/* Main artwork display */}
      <div className="artwork-display">
        {!isImagePreloaded && (
          <div className="image-loading-overlay">
            <div className="loading-spinner"></div>
          </div>
        )}
        
        <img 
          src={imageUrl}
          alt={currentArtwork.name || 'Artwork'}
          className="fullscreen-image"
          style={{ 
            opacity: (!isImagePreloaded || isTransitioning) ? 0.5 : 1,
            transition: 'opacity 0.15s ease'
          }}
        />
      </div>

      {/* Artwork info overlay */}
      <div className="artwork-info">
        <div className="artwork-title">{currentArtwork.name}</div>
        <div className="artwork-artist">by {currentArtwork.artist}</div>
      </div>

      {/* Action buttons */}
      <div className="bottom-actions">
        <button 
          className="action-btn pass-btn"
          onClick={() => handleAction('pass')}
          disabled={isCollecting || isTransitioning}
        >
          Pass
        </button>
        
        <button 
          className="action-btn collect-btn"
          onClick={() => handleAction('collect')}
          disabled={isCollecting || isTransitioning}
        >
          {isCollecting ? 'Processing...' : `Collect (${currentArtwork.price.value} ${currentArtwork.price.currency})`}
        </button>
      </div>
    </div>
  );
}
