// app/page.tsx - Grid Layout with Search and Popup
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
  const [allArtworks, setAllArtworks] = useState<NFTAsset[]>([]);
  const [filteredArtworks, setFilteredArtworks] = useState<NFTAsset[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollecting, setIsCollecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedArtwork, setSelectedArtwork] = useState<NFTAsset | null>(null);
  const [imageCache, setImageCache] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [availableArtists, setAvailableArtists] = useState<string[]>([]);
  const [showArtistList, setShowArtistList] = useState(false);
  
  const ITEMS_PER_PAGE = 4;
  
  // Get current page artworks
  const getCurrentPageArtworks = () => {
    const startIndex = currentPage * ITEMS_PER_PAGE;
    return filteredArtworks.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  };

  // Check if there's a next page
  const hasNextPage = () => {
    return (currentPage + 1) * ITEMS_PER_PAGE < filteredArtworks.length;
  };

  // Filter artworks by search term
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    setCurrentPage(0); // Reset to first page when searching
    
    if (!term.trim()) {
      setFilteredArtworks(allArtworks);
      setIsSearching(false);
    } else {
      setIsSearching(true);
      // Simple filter by artist name
      const search = term.toLowerCase().trim();
      const filtered = allArtworks.filter(nft => {
        const artist = (nft.artist || '').toLowerCase();
        return artist.includes(search);
      });
      setFilteredArtworks(filtered);
    }
  }, [allArtworks]);

  // Clear search
  const clearSearch = () => {
    setSearchTerm('');
    setFilteredArtworks(allArtworks);
    setIsSearching(false);
    setCurrentPage(0);
    setShowArtistList(false);
  };

  // Handle artist selection from list
  const selectArtist = (artist: string) => {
    handleSearch(artist);
    setShowArtistList(false);
  };

  // Preload images for better performance
  const preloadImages = useCallback((artworksToCache: NFTAsset[]) => {
    artworksToCache.forEach(artwork => {
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
    });
  }, [imageCache]);

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

  // Update filtered artworks when all artworks change
  useEffect(() => {
    if (!isSearching) {
      setFilteredArtworks(allArtworks);
    }
    
    // Get unique artists
    const artists = new Set<string>();
    allArtworks.forEach(nft => {
      if (nft.artist && nft.artist !== 'Unknown Artist') {
        artists.add(nft.artist);
      }
    });
    setAvailableArtists(Array.from(artists).sort());
  }, [allArtworks, isSearching]);

  // Preload images when artworks change
  useEffect(() => {
    if (filteredArtworks.length > 0) {
      // Preload current page and next page
      const currentPageArtworks = getCurrentPageArtworks();
      const nextPageStart = (currentPage + 1) * ITEMS_PER_PAGE;
      const nextPageArtworks = filteredArtworks.slice(nextPageStart, nextPageStart + ITEMS_PER_PAGE);
      
      preloadImages([...currentPageArtworks, ...nextPageArtworks]);
    }
  }, [filteredArtworks, currentPage, preloadImages]);

  const loadArtworks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('⚡ Loading for-sale artworks...');
      const response = await fetch('/api/nfts?action=curated&limit=40'); // Load more for pagination
      const data = await response.json();
      
      if (data.success && data.data && data.data.length > 0) {
        console.log(`✅ Loaded ${data.data.length} for-sale artworks`);
        setAllArtworks(data.data);
      } else {
        setError('No for-sale artworks found.');
        setAllArtworks([]);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load artworks:', error);
      setError('Failed to load artworks.');
      setAllArtworks([]);
      setIsLoading(false);
    }
  };

  const handleArtworkClick = (artwork: NFTAsset) => {
    setSelectedArtwork(artwork);
  };

  const handleClosePopup = () => {
    setSelectedArtwork(null);
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
        
        // Close popup and remove from current view
        setSelectedArtwork(null);
        
        // Remove collected artwork from the list
        setAllArtworks(prev => prev.filter(art => 
          !(art.contract.address === artwork.contract.address && art.tokenId === artwork.tokenId)
        ));
      }
    } catch (error) {
      console.error('Failed to collect artwork:', error);
      alert('❌ Collection failed. Please try again.');
    } finally {
      setIsCollecting(false);
    }
  };

  const handleNextPage = () => {
    if (hasNextPage()) {
      setCurrentPage(prev => prev + 1);
    } else if (!isSearching) {
      // If no more pages and not searching, load more artworks
      loadArtworks();
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  if (isLoading) {
    return (
      <div className="grid-container">
        <div className="loading-center">
          <div className="loading-spinner"></div>
          <div style={{ marginTop: '16px', color: '#64748b' }}>Loading for-sale artworks...</div>
        </div>
      </div>
    );
  }

  if (error || allArtworks.length === 0) {
    return (
      <div className="grid-container">
        <div className="loading-center">
          <h3>No for-sale artworks available</h3>
          <p style={{ margin: '16px 0', textAlign: 'center', color: '#64748b' }}>
            {error || 'No artworks are currently listed for sale'}
          </p>
          <button 
            onClick={loadArtworks}
            className="refresh-btn"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  const currentPageArtworks = getCurrentPageArtworks();

  if (currentPageArtworks.length === 0 && isSearching) {
    return (
      <div className="grid-container">
        {/* Header */}
        <div className="grid-header">
          <h1>🎨 Base Art Club</h1>
          <div className="page-indicator">
            {allArtworks.length} artworks
          </div>
        </div>

        {/* Search Section */}
        <div className="search-section">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search by artist name..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button onClick={clearSearch} className="clear-search-btn">
                ×
              </button>
            )}
          </div>
          {availableArtists.length > 0 && (
            <button 
              onClick={() => setShowArtistList(!showArtistList)}
              className="view-artists-btn"
            >
              {showArtistList ? 'Hide' : 'View'} Artists ({availableArtists.length})
            </button>
          )}
          {showArtistList && (
            <div className="artist-list">
              {availableArtists.map(artist => (
                <button
                  key={artist}
                  onClick={() => selectArtist(artist)}
                  className="artist-tag"
                >
                  {artist}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="loading-center">
          <h3>No artworks found</h3>
          <p style={{ margin: '16px 0', textAlign: 'center', color: '#64748b' }}>
            No artworks found for artist "{searchTerm}"
          </p>
          <button 
            onClick={clearSearch}
            className="refresh-btn"
          >
            Clear Search
          </button>
        </div>
      </div>
    );
  }

  if (currentPageArtworks.length === 0) {
    return (
      <div className="grid-container">
        <div className="loading-center">
          <h3>All artworks viewed!</h3>
          <button 
            onClick={() => setCurrentPage(0)}
            className="refresh-btn"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid-container">
      {/* Header */}
      <div className="grid-header">
        <h1>🎨 Base Art Club</h1>
        <div className="page-indicator">
          Page {currentPage + 1} • {filteredArtworks.length} artworks
          {isSearching && ` • Searching: "${searchTerm}"`}
        </div>
      </div>

      {/* Search Section */}
      <div className="search-section">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search by artist name..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button onClick={clearSearch} className="clear-search-btn">
              ×
            </button>
          )}
        </div>
        {availableArtists.length > 0 && (
          <button 
            onClick={() => setShowArtistList(!showArtistList)}
            className="view-artists-btn"
          >
            {showArtistList ? 'Hide' : 'View'} Artists ({availableArtists.length})
          </button>
        )}
        {showArtistList && (
          <div className="artist-list">
            {availableArtists.map(artist => (
              <button
                key={artist}
                onClick={() => selectArtist(artist)}
                className="artist-tag"
              >
                {artist}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid of artworks */}
      <div className="artworks-grid">
        {currentPageArtworks.map((artwork, index) => {
          const imageUrl = artwork.image.cachedUrl || artwork.image.originalUrl || artwork.image.thumbnailUrl;
          const isImageLoaded = imageCache.has(imageUrl || '');

          return (
            <div 
              key={`${artwork.contract.address}-${artwork.tokenId}`}
              className="artwork-card"
              onClick={() => handleArtworkClick(artwork)}
            >
              <div className="artwork-image-container">
                {!isImageLoaded && (
                  <div className="grid-loading">
                    <div className="mini-spinner"></div>
                  </div>
                )}
                <img 
                  src={imageUrl}
                  alt={artwork.name || 'Artwork'}
                  className="artwork-image"
                  style={{ 
                    opacity: isImageLoaded ? 1 : 0.3,
                  }}
                />
                <div className="price-overlay">
                  {artwork.price.value} {artwork.price.currency}
                </div>
              </div>
              <div className="artwork-text-below">
                <div className="artwork-name">{artwork.name || `Token #${artwork.tokenId}`}</div>
                <div className="artwork-artist">by {artwork.artist || 'Unknown'}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="grid-navigation">
        <button 
          onClick={handlePreviousPage}
          disabled={currentPage === 0}
          className="nav-btn prev-btn"
        >
          ← Previous
        </button>
        
        <button 
          onClick={handleNextPage}
          className="nav-btn next-btn"
        >
          {hasNextPage() ? 'Pass →' : (isSearching ? 'No More' : 'Load More →')}
        </button>
      </div>

      {/* Popup Modal */}
      {selectedArtwork && (
        <div className="popup-overlay" onClick={handleClosePopup}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="close-btn"
              onClick={handleClosePopup}
            >
              ×
            </button>
            
            <div className="popup-image-container">
              <img 
                src={selectedArtwork.image.cachedUrl || selectedArtwork.image.originalUrl || selectedArtwork.image.thumbnailUrl}
                alt={selectedArtwork.name || 'Artwork'}
                className="popup-image"
              />
            </div>
            
            <div className="popup-info">
              <h2 className="popup-title">{selectedArtwork.name || `Token #${selectedArtwork.tokenId}`}</h2>
              <p className="popup-artist">by {selectedArtwork.artist || 'Unknown Artist'}</p>
              <p className="popup-platform">{selectedArtwork.platform}</p>
              
              {selectedArtwork.description && (
                <p className="popup-description">
                  {selectedArtwork.description.substring(0, 200)}
                  {selectedArtwork.description.length > 200 ? '...' : ''}
                </p>
              )}
            </div>
            
            <button 
              className="collect-btn-popup"
              onClick={() => handleCollectArtwork(selectedArtwork)}
              disabled={isCollecting}
            >
              {isCollecting ? 'Processing...' : `Collect (${selectedArtwork.price.value} ${selectedArtwork.price.currency})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
