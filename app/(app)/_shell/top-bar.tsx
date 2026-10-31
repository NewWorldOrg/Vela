'use client'

import Form from 'next/form'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

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
import { SearchIcon } from '@/components/vela/icons'
import { PhoneThemeButton } from '@/components/theme/ThemeToggle'

const SERVICES = DESTINATIONS.filter(({ href }) => href !== SETTINGS_HREF)

const RESERVATIONS = '/reservations'

const GUIDE = '/guide'

/** The field in the bar that opens the programme search with its words. */
function BarSearch() {
  return (
    <Form
      action="/search"
      role="search"
      className="relative w-[min(300px,28vw)] max-[1100px]:hidden"
    >
      <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-2" />
      <label className="tap-area block">
        <span className="sr-only">番組を検索</span>
        <input
          type="search"
          name="q"
          placeholder="番組を検索"
          className="h-10 w-full rounded-full bg-surface pr-4 pl-[42px] text-body text-ink outline-none placeholder:text-ink-3 focus-visible:shadow-ring [&::-webkit-search-cancel-button]:hidden"
        />
      </label>
    </Form>
  )
}

export function AppTopBar({ conflicts }: { conflicts?: ReactNode }) {
  const pathname = usePathname()
  const current = destinationOf(pathname)
  const phone = phoneBarOf(pathname)
  const besideTheEntrance = phone.back?.href === '/settings'

  return (
    <TopBar>
      <Brand />
      <GlobalNav>
        {SERVICES.map(({ href, label }) => (
          <GlobalNavItem key={href} asChild active={href === current}>
            <Link href={href}>
              {label}
              {href === RESERVATIONS && conflicts}
            </Link>
          </GlobalNavItem>
        ))}
      </GlobalNav>
      <div className="ml-auto flex items-center gap-1.5 phone:hidden">
        {current === GUIDE && <BarSearch />}
        <SettingsLink asChild active={current === SETTINGS_HREF}>
          <Link href="/settings/system" />
        </SettingsLink>
      </div>
      <div className="hidden min-w-0 flex-1 items-center gap-2 phone:flex">
        {phone.back && (
          <PhoneBarBack
            asChild
            aria-label={`${phone.back.label}へ`}
            className={besideTheEntrance ? 'sideways:hidden' : undefined}
          >
            <Link href={phone.back.href} />
          </PhoneBarBack>
        )}
        <PhoneBarLeadSlot />
        <PhoneBarTitle className="phone:[[data-slot=phone-bar-lead]:not(:empty)~&]:hidden sideways:[&:has(~[data-slot=phone-bar-tools]:not(:empty))]:flex-none">
          {besideTheEntrance ? (
            <>
              <span className="sideways:hidden">{phone.title}</span>
              <span className="hidden sideways:inline">設定</span>
            </>
          ) : (
            phone.title
          )}
        </PhoneBarTitle>
        <PhoneBarToolsSlot />
        {!phone.withoutTheme && <PhoneThemeButton />}
      </div>
    </TopBar>
  )
}
