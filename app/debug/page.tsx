// app/debug/page.tsx
'use client';

import { useEffect, useState } from 'react';

export default function DebugPage() {
  const [headers, setHeaders] = useState<any>({});
  const [embedInfo, setEmbedInfo] = useState<any>({});
  
  useEffect(() => {
    // Check if we're in an iframe
    const isInIframe = window.self !== window.top;
    
    // Get referrer and origin info
    const info = {
      isInIframe,
      referrer: document.referrer,
      origin: window.location.origin,
      ancestorOrigins: Array.from(document.location.ancestorOrigins || []),
      userAgent: navigator.userAgent,
    };
    
    setEmbedInfo(info);
    
    // Fetch headers from API
    fetch('/api/debug-headers')
      .then(res => res.json())
      .then(data => setHeaders(data))
      .catch(err => console.error('Failed to fetch headers:', err));
  }, []);
  
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', background: '#f0f0f0', minHeight: '100vh' }}>
      <h1>Base Art Club - Debug Info</h1>
      
      <section style={{ marginBottom: '20px' }}>
        <h2>Embed Status</h2>
        <pre style={{ background: 'white', padding: '10px', borderRadius: '5px' }}>
          {JSON.stringify(embedInfo, null, 2)}
        </pre>
      </section>
      
      <section style={{ marginBottom: '20px' }}>
        <h2>Response Headers</h2>
        <pre style={{ background: 'white', padding: '10px', borderRadius: '5px' }}>
          {JSON.stringify(headers, null, 2)}
        </pre>
      </section>
      
      <section>
        <h2>Test Embed</h2>
        <p>✅ If you can see this page, the embed is working!</p>
        <p>Current time: {new Date().toLocaleString()}</p>
      </section>
    </div>
  );
}
