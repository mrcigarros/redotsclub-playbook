import { NextResponse } from 'next/server';

export function middleware(request) {
  const cookie = request.cookies.get('rc_auth');
  const { pathname } = request.nextUrl;

  if (pathname === '/login') return NextResponse.next();
  if (cookie?.value === 'wewillwin') return NextResponse.next();

  const loginUrl = new URL('/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.svg).*)'],
};
