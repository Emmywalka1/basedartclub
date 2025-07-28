// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Get the origin/referer to check if request is from Farcaster
  const referer = request.headers.get('referer');
  const origin = request.headers.get('origin');
  
  // List of allowed Farcaster domains
  const allowedDomains = [
    'https://farcaster.xyz',
    'https://warpcast.com',
    'https://miniapps.farcaster.xyz',
    'https://fc-miniapps.pages.dev',
  ];
  
  // Check if request is from Farcaster
  const isFromFarcaster = 
    (referer && allowedDomains.some(domain => referer.startsWith(domain))) ||
    (origin && allowedDomains.some(domain => origin.startsWith(domain)));
  
  // Remove X-Frame-Options header completely
  response.headers.delete('X-Frame-Options');
  
  // Set permissive CSP for Farcaster embeds
  if (isFromFarcaster || request.nextUrl.pathname.startsWith('/api')) {
    response.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self' https:",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
        "style-src 'self' 'unsafe-inline' https:",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data: https:",
        "connect-src 'self' https: wss: ws:",
        "frame-ancestors 'self' https://farcaster.xyz https://*.farcaster.xyz https://warpcast.com https://*.warpcast.com https://miniapps.farcaster.xyz https://*.fc-miniapps.pages.dev https://warpcast.com/~/developers/mini-apps/*",
        "frame-src 'self' https:",
        "worker-src 'self' blob:",
        "media-src 'self' https:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join('; ') + ';'
    );
  } else {
    // More restrictive CSP for direct access
    response.headers.set(
      'Content-Security-Policy',
      [
        "frame-ancestors 'self' https://farcaster.xyz https://*.farcaster.xyz https://warpcast.com https://*.warpcast.com https://miniapps.farcaster.xyz https://*.fc-miniapps.pages.dev https://warpcast.com/~/developers/mini-apps/*"
      ].join('; ') + ';'
    );
  }
  
  // Add CORS headers
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  
  // Add specific Farcaster headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
