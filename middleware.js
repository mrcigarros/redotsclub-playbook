export const runtime = 'experimental-edge';

import { NextResponse } from 'next/server';

const PASSWORD = 'wewillwin';
const COOKIE = 'rc_auth';

export function middleware(req) {
  const cookie = req.cookies.get(COOKIE)?.value;
  if (cookie === PASSWORD) return NextResponse.next();

  const url = req.nextUrl.clone();
  if (url.pathname === '/login') return NextResponse.next();

  url.pathname = '/login';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|logo.svg).*)'],
};
