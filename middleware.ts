import { NextRequest, NextResponse } from 'next/server'

const THEME_COOKIE = 'next-base-theme-mode'

/**
 * Reads the theme-preference cookie and forwards it as the `x-theme-mode`
 * request header so the root layout can render the correct theme at SSR.
 *
 * Valid values: `light` | `dark` | `system` (explicit user choice). When the
 * cookie is unset or unknown, falls back to `system`, and the client resolves
 * `prefers-color-scheme`.
 */
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)

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
