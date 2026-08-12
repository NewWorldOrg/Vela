'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { isPathActive } from '@/lib/path'
import {
  Brand,
  GlobalNav,
  GlobalNavItem,
  SettingsLink,
  TopBar,
} from '@/components/vela/app-shell'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

const SERVICE_NAV = [
  { href: '/guide', label: '番組表', alsoUnder: ['/search'] },
  { href: '/live', label: 'ライブ', alsoUnder: [] },
  { href: '/library', label: 'ライブラリ', alsoUnder: ['/recordings'] },
  { href: '/reservations', label: '予約', alsoUnder: [] },
] as const

export function AppTopBar() {
  const pathname = usePathname()
  const inSettings = isPathActive(pathname, '/settings')
  const activeIndex = inSettings
    ? -1
    : SERVICE_NAV.findIndex(({ href, alsoUnder }) =>
        [href, ...alsoUnder].some((root) => isPathActive(pathname, root)),
      )

  return (
    <TopBar>
      <Brand />
      <GlobalNav>
        {SERVICE_NAV.map(({ href, label }, index) => (
          <GlobalNavItem key={href} asChild active={index === activeIndex}>
            <Link href={href}>{label}</Link>
          </GlobalNavItem>
        ))}
      </GlobalNav>
      <div className="flex items-center gap-[7px]">
        <ThemeToggle />
        <SettingsLink asChild active={inSettings}>
          <Link href="/settings">設定</Link>
        </SettingsLink>
      </div>
    </TopBar>
  )
}
