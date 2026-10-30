import type { Route } from 'next'

import { isPathActive } from '@/lib/path'

/** What the bar at the top of a phone held upright says for a screen: its name, and where its arrow goes back to when the screen is one pressed into. */
export interface PhoneBar {
  title: string
  back?: { href: Route; label: string }
}

/** The settings, in the order the side nav and the phone's entrance give them. */
export const SETTINGS_SCREENS: readonly { href: Route; label: string }[] = [
  { href: '/settings/system', label: 'システム' },
  { href: '/settings/tuners', label: 'チューナー' },
  { href: '/settings/channels', label: 'チャンネル' },
  { href: '/settings/encode', label: 'エンコード' },
  { href: '/settings/segments', label: 'CM・OP・ED の検出' },
  { href: '/settings/quality', label: '品質' },
  { href: '/settings/authentication', label: '認証' },
  { href: '/settings/display', label: '表示' },
  { href: '/settings/viewing', label: '視聴' },
  { href: '/settings/migration', label: '移行記録' },
]

/** The names of the screens a setting presses into, by the setting. */
const SETTINGS_SUB_SCREENS: Readonly<Record<string, string>> = {
  '/settings/channels': 'スキャン結果',
}

const TO_THE_SETTINGS = { href: '/settings' as Route, label: '設定' }
const TO_THE_GUIDE = { href: '/guide' as Route, label: '番組表' }
const TO_THE_LIBRARY = { href: '/library' as Route, label: 'ライブラリ' }

const PRESSED_INTO: readonly { root: string; bar: PhoneBar }[] = [
  { root: '/search', bar: { title: '番組検索', back: TO_THE_GUIDE } },
  { root: '/guide/programs', bar: { title: '番組詳細', back: TO_THE_GUIDE } },
  {
    root: '/library/integrity',
    bar: { title: '整合性チェック', back: TO_THE_LIBRARY },
  },
  { root: '/recordings', bar: { title: '録画詳細', back: TO_THE_LIBRARY } },
]

const HEADS: readonly { root: string; title: string }[] = [
  { root: '/guide', title: '番組表' },
  { root: '/live', title: 'ライブ' },
  { root: '/library', title: 'ライブラリ' },
  { root: '/reservations', title: '予約' },
]

function settingsBarOf(pathname: string): PhoneBar {
  const screen = SETTINGS_SCREENS.find(({ href }) =>
    isPathActive(pathname, href),
  )

  if (!screen) {
    return { title: '設定' }
  }

  if (pathname !== screen.href) {
    return {
      title: SETTINGS_SUB_SCREENS[screen.href] ?? screen.label,
      back: { href: screen.href, label: screen.label },
    }
  }

  return { title: screen.label, back: TO_THE_SETTINGS }
}

/** The bar a phone held upright gives the screen at this path: the head of a tab says its name alone, a screen pressed into says its name after the arrow back. */
export function phoneBarOf(pathname: string): PhoneBar {
  if (isPathActive(pathname, '/settings')) {
    return settingsBarOf(pathname)
  }

  const pressed = PRESSED_INTO.find(({ root }) => isPathActive(pathname, root))

  if (pressed) {
    return pressed.bar
  }

  const head = HEADS.find(({ root }) => isPathActive(pathname, root))

  return { title: head?.title ?? 'Vela' }
}
