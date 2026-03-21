import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define the critical routes that require an authenticated session
const protectedRoutes = ['/dashboard', '/portfolio', '/pitch/new', '/my/pitches'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));
  // Django's default session cookie
  const hasSession = request.cookies.has('sessionid');

  if (isProtected && !hasSession) {
    // Redirect unauthenticated users immediately without rendering the page
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // If the user is authenticated and hits the entry login page, push them to dashboard
  if (pathname === '/' && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Matcher ignores next/static, API requests, images, and favicons to conserve middleware execution
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
