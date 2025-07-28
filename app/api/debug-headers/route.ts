// app/api/debug-headers/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const headers: Record<string, string> = {};
  
  // Get all request headers
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  
  // Get response headers that will be sent
  const responseHeaders = {
    'content-security-policy': request.headers.get('content-security-policy') || 'not set',
    'x-frame-options': request.headers.get('x-frame-options') || 'not set',
    'referer': request.headers.get('referer') || 'not set',
    'origin': request.headers.get('origin') || 'not set',
  };
  
  return NextResponse.json({
    requestHeaders: headers,
    responseHeaders,
    timestamp: new Date().toISOString(),
  });
}
