/** The screen the app opens on. */
export const HOME_PATH = '/guide'

export function isPathActive(pathname: string, root: string) {
  return pathname === root || pathname.startsWith(`${root}/`)
}

export function addressWith(
  pathname: string,
  query: string,
  patch: Record<string, string | null | undefined>,
): string {
  const params = new URLSearchParams(query)

  for (const [key, value] of Object.entries(patch)) {
    if (value == null || value === '') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
  }

  const qs = params.toString()

  return qs ? `${pathname}?${qs}` : pathname
}
