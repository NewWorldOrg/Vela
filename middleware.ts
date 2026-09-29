import { NextRequest, NextResponse } from 'next/server'

import { RENDERED_PAGE_HEADER } from '@/repository/auth'
import { MOTION_COOKIE, MOTION_HEADER, motionOf } from '@/lib/motion'
import { THEME_COOKIE, THEME_HEADER, themeOf } from '@/lib/theme'

const PAYLOAD_PARAM = '_rsc'

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)

  const page = request.nextUrl.clone()
  page.searchParams.delete(PAYLOAD_PARAM)
  requestHeaders.set(RENDERED_PAGE_HEADER, `${page.pathname}${page.search}`)

  requestHeaders.set(
    THEME_HEADER,
    themeOf(request.cookies.get(THEME_COOKIE)?.value),
  )
  requestHeaders.set(
    MOTION_HEADER,
    motionOf(request.cookies.get(MOTION_COOKIE)?.value) ?? '',
  )

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest.webmanifest|pwa/).*)',
  ],
}
