import { NextRequest, NextResponse } from 'next/server'

import { RENDERED_PAGE_HEADER } from '@/repository/auth'

const THEME_COOKIE = 'vela-theme-mode'

const PAYLOAD_PARAM = '_rsc'

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)

  const page = request.nextUrl.clone()
  page.searchParams.delete(PAYLOAD_PARAM)
  requestHeaders.set(RENDERED_PAGE_HEADER, `${page.pathname}${page.search}`)

  const themeCookie = request.cookies.get(THEME_COOKIE)?.value
  const themeMode =
    themeCookie === 'dark' ||
    themeCookie === 'light' ||
    themeCookie === 'system'
      ? themeCookie
      : 'system'
  requestHeaders.set('x-theme-mode', themeMode)

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
