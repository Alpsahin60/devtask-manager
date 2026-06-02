import { NextResponse } from 'next/server';

// Kept minimal — auth redirects are handled client-side because the
// refreshToken cookie is set by a different origin (the API server)
// and is therefore not accessible in the Next.js proxy layer.
export function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
