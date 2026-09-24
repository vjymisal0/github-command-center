import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const signedIn = request.cookies.has('sid');
  const login = request.nextUrl.pathname === '/login';
  if (!signedIn && !login) return NextResponse.redirect(new URL('/login', request.url));
  return NextResponse.next();
}

export const config = { matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'] };
