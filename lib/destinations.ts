import { isPathActive } from '@/lib/path'

export interface Destination {
  href: string
  label: string
  alsoUnder: readonly string[]
}

/** Where the app's own navigation goes: the four services, then the settings. */
export const DESTINATIONS: readonly Destination[] = [
  { href: '/guide', label: '番組表', alsoUnder: ['/search'] },
  { href: '/live', label: 'ライブ', alsoUnder: [] },
  { href: '/library', label: 'ライブラリ', alsoUnder: ['/recordings'] },
  { href: '/reservations', label: '予約', alsoUnder: [] },
  { href: '/settings', label: '設定', alsoUnder: [] },
]

export const SETTINGS_HREF = '/settings'

export function destinationOf(pathname: string): string | null {
  const found = DESTINATIONS.find(({ href, alsoUnder }) =>
    [href, ...alsoUnder].some((root) => isPathActive(pathname, root)),
  )

  return found?.href ?? null
}
