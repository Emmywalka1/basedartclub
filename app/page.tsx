// app/page.tsx - Minimal Full-Screen Art Display
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

export default function Home() {
  const [artworks, setArtworks] = useState<CollectibleNFT[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollecting, setIsCollecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());
  
  // Initialize Farcaster SDK and load artworks
  useEffect(() => {
    const initializeApp = async () => {
      try {
        try {
          await sdk.actions.ready();
        } catch (sdkError) {
          console.log('Failed to initialize Farcaster SDK, continuing anyway');
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

  // Preload next few images
  useEffect(() => {
    if (artworks.length > 0 && currentIndex < artworks.length) {
      const preloadNext = 3; // Preload next 3 images
      for (let i = currentIndex; i < Math.min(currentIndex + preloadNext, artworks.length); i++) {
        const artwork = artworks[i];
        const imageUrl = artwork.image.cachedUrl || artwork.image.originalUrl || artwork.image.thumbnailUrl;
        
        if (imageUrl && !preloadedImages.has(imageUrl)) {
          const img = new Image();
          img.onload = () => {
            setPreloadedImages(prev => {
              const newSet = new Set(prev);
              newSet.add(imageUrl);
              return newSet;
            });
          };
          img.src = imageUrl;
        }
      }
    }
  }, [artworks, currentIndex, preloadedImages]);

  const loadArtworks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/nfts?action=curated&limit=20');
      const data = await response.json();
      
      if (data.success && data.data && data.data.length > 0) {
        const collectibleNFTs: CollectibleNFT[] = data.data.map((nft: BaseNFT) => ({
          ...nft,
          isForSale: !!nft.price,
          category: nft.platform || 'Digital Art',
        }));
        
        setArtworks(collectibleNFTs);
      } else {
        setError('No artworks found.');
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
    if (isCollecting || isImageLoading) return;
    
    const currentArtwork = artworks[currentIndex];
    if (!currentArtwork) return;

    if (action === 'collect') {
      await handleCollectArtwork(currentArtwork);
    } else {
      // For pass, immediately move to next
      goToNext();
    }
  };

  const handleCollectArtwork = async (artwork: CollectibleNFT) => {
    try {
      setIsCollecting(true);
      
      const confirmed = confirm(
        `Collect "${artwork.name}" by ${artwork.artist || 'Unknown Artist'}?\n\nPrice: ${artwork.price?.value || 'N/A'} ${artwork.price?.currency || 'ETH'}`
      );
      
      if (confirmed) {
        // Simulate transaction
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        alert(`Successfully collected "${artwork.name}"!`);
        goToNext();
      }
    } catch (error) {
      console.error('Failed to collect artwork:', error);
      alert('Collection failed. Please try again.');
    } finally {
      setIsCollecting(false);
    }
  };

  const goToNext = () => {
    if (currentIndex < artworks.length - 1) {
      setIsImageLoading(true);
      setCurrentIndex(prev => prev + 1);
      
      // Small delay to prevent flashing
      setTimeout(() => {
        setIsImageLoading(false);
      }, 100);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setIsImageLoading(true);
      setCurrentIndex(prev => prev - 1);
      
      setTimeout(() => {
        setIsImageLoading(false);
      }, 100);
    }
  };

  if (isLoading) {
    return (
      <div className="fullscreen-container">
        <div className="loading-center">
          <div className="loading-spinner"></div>
          <div style={{ marginTop: '16px', color: '#64748b' }}>Loading artworks...</div>
        </div>
      </div>
    );
  }

  if (error || artworks.length === 0) {
    return (
      <div className="fullscreen-container">
        <div className="loading-center">
          <h3>No artworks available</h3>
          <button 
            onClick={loadArtworks}
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
            Retry
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

  return (
    <div className="fullscreen-container">
      {/* Navigation arrows - minimal and subtle */}
      {hasPrev && (
        <button 
          className="nav-arrow nav-arrow-left"
          onClick={goToPrevious}
          disabled={isImageLoading}
        >
          ←
        </button>
      )}
      
      {hasNext && (
        <button 
          className="nav-arrow nav-arrow-right"
          onClick={goToNext}
          disabled={isImageLoading}
        >
          →
        </button>
      )}

      {/* Progress indicator - minimal */}
      <div className="progress-indicator">
        {currentIndex + 1} / {artworks.length}
      </div>

      {/* Main artwork display */}
      <div className="artwork-display">
        {isImageLoading && (
          <div className="image-loading-overlay">
            <div className="loading-spinner"></div>
          </div>
        )}
        
        <img 
          src={imageUrl}
          alt={currentArtwork.name || 'Artwork'}
          className="fullscreen-image"
          onLoad={() => setIsImageLoading(false)}
          onError={(e) => {
            console.error('Image failed to load');
            setIsImageLoading(false);
          }}
          style={{ 
            opacity: isImageLoading ? 0.3 : 1,
            transition: 'opacity 0.2s ease'
          }}
        />
      </div>

      {/* Minimal action buttons at bottom */}
      <div className="bottom-actions">
        <button 
          className="action-btn pass-btn"
          onClick={() => handleAction('pass')}
          disabled={isCollecting || isImageLoading}
        >
          Pass
        </button>
        
        <button 
          className="action-btn collect-btn"
          onClick={() => handleAction('collect')}
          disabled={isCollecting || isImageLoading || !currentArtwork.isForSale}
        >
          {isCollecting ? 'Processing...' : 'Collect'}
        </button>
      </div>

      {/* Hidden preload images for smooth transitions */}
      <div style={{ display: 'none' }}>
        {artworks.slice(currentIndex + 1, currentIndex + 4).map((artwork, i) => {
          const nextImageUrl = artwork.image.cachedUrl || artwork.image.originalUrl || artwork.image.thumbnailUrl;
          return nextImageUrl ? (
            <img 
              key={`preload-${currentIndex + i + 1}`}
              src={nextImageUrl} 
              alt="preload"
            />
          ) : null;
        })}
      </div>
    </div>
  );
}
