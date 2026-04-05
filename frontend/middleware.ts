import { NextResponse } from 'next/server';

// Middleware is kept minimal — auth redirects are handled client-side
// because the refreshToken cookie is set by a different origin (the API server)
// and is therefore not accessible here in the Next.js middleware.
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
