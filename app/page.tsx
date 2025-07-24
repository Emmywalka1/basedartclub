'use client';

import { useEffect, useState } from 'react';
import { motion, PanInfo, useAnimation } from 'framer-motion';
import { sdk } from '@farcaster/frame-sdk';

interface Artwork {
  id: string;
  title: string;
  artist: string;
  imageUrl: string;
  price?: string;
  description: string;
  collection?: string;
}

// Sample artwork data - replace with real API data
const sampleArtworks: Artwork[] = [
  {
    id: '1',
    title: 'Digital Dreams',
    artist: 'CryptoArtist',
    imageUrl: '/artwork1.jpg',
    price: '0.5 ETH',
    description: 'A vibrant digital landscape exploring the intersection of technology and nature.'
  },
  {
    id: '2',
    title: 'Neon Genesis',
    artist: 'BaseCreator',
    imageUrl: '/artwork2.jpg',
    price: '0.25 ETH',
    description: 'Cyberpunk-inspired artwork with electric blues and magentas.'
  },
  {
    id: '3',
    title: 'Abstract Emotions',
    artist: 'DigitalPioneer',
    imageUrl: '/artwork3.jpg',
    price: '0.75 ETH',
    description: 'An emotional journey through color and form.'
  },
  {
    id: '4',
    title: 'Cosmic Journey',
    artist: 'SpaceArtist',
    imageUrl: '/artwork4.jpg',
    price: '1.0 ETH',
    description: 'A breathtaking view of distant galaxies and star formations.'
  },
  {
    id: '5',
    title: 'Urban Poetry',
    artist: 'CityVibes',
    imageUrl: '/artwork5.jpg',
    price: '0.3 ETH',
    description: 'Street art meets digital innovation in this urban masterpiece.'
  }
];

export default function Home() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ liked: 0, passed: 0, collected: 0 });
  const [swipeDirection, setSwipeDirection] = useState<string | null>(null);
  
  const controls = useAnimation();

  useEffect(() => {
    // Initialize Farcaster SDK
    const initializeFarcaster = async () => {
      try {
        await sdk.actions.ready();
        console.log('Farcaster SDK initialized');
      } catch (error) {
        console.error('Failed to initialize Farcaster SDK:', error);
      }
    };

    // Load artworks
    const loadArtworks = () => {
      // Simulate API loading
      setTimeout(() => {
        setArtworks(sampleArtworks);
        setIsLoading(false);
      }, 1000);
    };

    initializeFarcaster();
    loadArtworks();
  }, []);

  const handleSwipe = async (direction: 'left' | 'right' | 'up', artwork: Artwork) => {
    setSwipeDirection(direction);
    
    // Update stats
    const newStats = { ...stats };
    if (direction === 'left') newStats.passed++;
    else if (direction === 'right') newStats.liked++;
    else if (direction === 'up') newStats.collected++;
    
    setStats(newStats);

    // Show swipe indicator briefly
    setTimeout(() => {
      setSwipeDirection(null);
      setCurrentIndex(prev => prev + 1);
    }, 300);

    // Here you would typically send the action to your backend
    console.log(`${direction} swipe on artwork:`, artwork.title);
  };

  const handlePanEnd = (event: any, info: PanInfo) => {
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
      // Snap back to center
      controls.start({ x: 0, y: 0, rotate: 0 });
    }
  };

  const handleButtonAction = (action: 'pass' | 'like' | 'collect') => {
    if (currentIndex >= artworks.length) return;
    
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
  };

  if (isLoading) {
    return (
      <div className="loading">
        <div>Loading amazing artworks...</div>
      </div>
    );
  }

  const currentArtwork = artworks[currentIndex];
  const hasMoreArtworks = currentIndex < artworks.length;

  return (
    <div className="app-container">
      <header className="header">
        <h1>Base Art Club</h1>
        <p>Discover amazing art on Base</p>
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
                  src={artworks[currentIndex + 1].imageUrl} 
                  alt={artworks[currentIndex + 1].title}
                  className="card-image"
                />
                <div className="card-content">
                  <h3 className="card-title">{artworks[currentIndex + 1].title}</h3>
                  <p className="card-artist">by {artworks[currentIndex + 1].artist}</p>
                  {artworks[currentIndex + 1].price && (
                    <p className="card-price">{artworks[currentIndex + 1].price}</p>
                  )}
                  <p className="card-description">{artworks[currentIndex + 1].description}</p>
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
              <img 
                src={currentArtwork.imageUrl} 
                alt={currentArtwork.title}
                className="card-image"
              />
              <div className="card-content">
                <h3 className="card-title">{currentArtwork.title}</h3>
                <p className="card-artist">by {currentArtwork.artist}</p>
                {currentArtwork.price && (
                  <p className="card-price">{currentArtwork.price}</p>
                )}
                <p className="card-description">{currentArtwork.description}</p>
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
            <p>Check back later for more amazing pieces</p>
            <button className="reload-button" onClick={resetStack}>
              Start Over
            </button>
          </div>
        )}
      </div>

      {hasMoreArtworks && (
        <div className="controls">
          <button 
            className="control-button pass-button"
            onClick={() => handleButtonAction('pass')}
          >
            ✕
          </button>
          <button 
            className="control-button collect-button"
            onClick={() => handleButtonAction('collect')}
          >
            ⭐
          </button>
          <button 
            className="control-button like-button"
            onClick={() => handleButtonAction('like')}
          >
            ♡
          </button>
        </div>
      )}
    </div>
  );
}
