// app/embed/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/frame-sdk';

export default function EmbedPage() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const initSDK = async () => {
      try {
        await sdk.actions.ready();
        setIsReady(true);
      } catch (err) {
        console.error('SDK init error:', err);
        setError('Failed to initialize Farcaster SDK');
      }
    };
    
    initSDK();
  }, []);
  
  if (error) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <h2>Error</h2>
        <p>{error}</p>
        <button 
          onClick={() => window.location.href = '/'}
          style={{
            padding: '10px 20px',
            background: '#007BFF',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Try Full App
        </button>
      </div>
    );
  }
  
  if (!isReady) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div>Loading Base Art Club...</div>
      </div>
    );
  }
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: 'linear-gradient(135deg, #007BFF 0%, #0056cc 100%)',
      color: 'white',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '32px', marginBottom: '20px' }}>
        🎨 Base Art Club
      </h1>
      
      <p style={{ fontSize: '18px', marginBottom: '30px', opacity: 0.9 }}>
        Discover amazing art on Base
      </p>
      
      <button
        onClick={() => {
          // Use client-side navigation to avoid CSP issues
          window.location.href = '/';
        }}
        style={{
          padding: '15px 30px',
          fontSize: '18px',
          background: 'white',
          color: '#007BFF',
          border: 'none',
          borderRadius: '30px',
          cursor: 'pointer',
          fontWeight: 'bold',
          boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
          transition: 'transform 0.2s'
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        Start Swiping
      </button>
      
      <div style={{ 
        marginTop: '40px', 
        fontSize: '14px', 
        opacity: 0.7 
      }}>
        Swipe right to like • Swipe up to collect • Swipe left to pass
      </div>
    </div>
  );
}
