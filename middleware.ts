import { NextRequest, NextResponse } from 'next/server'

import { RENDERED_PAGE_HEADER } from '@/repository/auth'

const THEME_COOKIE = 'vela-theme-mode'

/** Next appends this to a payload request; it is not part of the page's path. */
const PAYLOAD_PARAM = '_rsc'

/**
 * Reads the theme-preference cookie and forwards it as the `x-theme-mode`
 * request header so the root layout can render the correct theme at SSR.
 *
 * Valid values: `light` | `dark` | `system` (explicit user choice). When the
 * cookie is unset or unknown, falls back to `system`, and the client resolves
 * `prefers-color-scheme`.
 *
 * Also forwards the path the request belongs to as `x-vela-page`, which is
 * where a session that has to be signed in again is sent back to. An action
 * posts to the page it was taken on, so the way back is the same either way.
 */
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
