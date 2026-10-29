'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { DESTINATIONS, SETTINGS_HREF, destinationOf } from '@/lib/destinations'
import {
  Brand,
  GlobalNav,
  GlobalNavItem,
  SettingsLink,
  TopBar,
} from '@/components/vela/app-shell'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

const SERVICES = DESTINATIONS.filter(({ href }) => href !== SETTINGS_HREF)

export function AppTopBar() {
  const current = destinationOf(usePathname())

  return (
    <TopBar>
      <Brand />
      <GlobalNav>
        {SERVICES.map(({ href, label }) => (
          <GlobalNavItem key={href} asChild active={href === current}>
            <Link href={href}>{label}</Link>
          </GlobalNavItem>
        ))}
      </GlobalNav>
      <div className="flex items-center gap-[calc(7rem/16)] max-[600px]:ml-auto">
        <ThemeToggle />
        <SettingsLink asChild active={current === SETTINGS_HREF}>
          <Link href={SETTINGS_HREF}>設定</Link>
        </SettingsLink>
      </div>
    </TopBar>
  )
}
