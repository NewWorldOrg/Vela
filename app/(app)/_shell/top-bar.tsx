'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { DESTINATIONS, SETTINGS_HREF, destinationOf } from '@/lib/destinations'
import { phoneBarOf } from '@/lib/phone-bar'
import {
  Brand,
  GlobalNav,
  GlobalNavItem,
  PhoneBarBack,
  PhoneBarTitle,
  SettingsLink,
  TopBar,
} from '@/components/vela/app-shell'
import {
  PhoneBarLeadSlot,
  PhoneBarToolsSlot,
} from '@/components/vela/phone-bar-tools'
import { PhoneThemeButton, ThemeToggle } from '@/components/theme/ThemeToggle'

const SERVICES = DESTINATIONS.filter(({ href }) => href !== SETTINGS_HREF)

export function AppTopBar() {
  const pathname = usePathname()
  const current = destinationOf(pathname)
  const phone = phoneBarOf(pathname)

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
      <div className="flex items-center gap-[calc(7rem/16)] upright:hidden">
        <ThemeToggle />
        <SettingsLink asChild active={current === SETTINGS_HREF}>
          <Link href="/settings/system">設定</Link>
        </SettingsLink>
      </div>
      <div className="hidden min-w-0 flex-1 items-center gap-2 upright:flex">
        {phone.back && (
          <PhoneBarBack asChild aria-label={`${phone.back.label}へ`}>
            <Link href={phone.back.href} />
          </PhoneBarBack>
        )}
        <PhoneBarLeadSlot />
        <PhoneBarTitle className="[[data-slot=phone-bar-lead]:not(:empty)~&]:hidden">
          {phone.title}
        </PhoneBarTitle>
        <PhoneBarToolsSlot />
        {!phone.withoutTheme && <PhoneThemeButton />}
      </div>
    </TopBar>
  )
}
