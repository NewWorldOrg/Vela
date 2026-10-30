'use client'

import { useEffect, useRef, type ComponentType, type ReactNode } from 'react'
import type { Route } from 'next'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import { DESTINATIONS, destinationOf } from '@/lib/destinations'
import { TabMemory, pressTab } from '@/lib/tab-memory'
import { TabBar, TabBarItem } from '@/components/vela/app-shell'
import {
  LibraryIcon,
  LiveIcon,
  ProgramGuideIcon,
  ReservationIcon,
  SettingsIcon,
  type IconProps,
} from '@/components/vela/icons'

const ICONS: Record<string, ComponentType<IconProps>> = {
  '/guide': ProgramGuideIcon,
  '/live': LiveIcon,
  '/library': LibraryIcon,
  '/reservations': ReservationIcon,
  '/settings': SettingsIcon,
}

const RESERVATIONS = '/reservations'

/** How many frames a position is tried for while the screen it belongs to is still arriving. */
const FRAMES_TO_REACH = 30

const memory = new TabMemory()

function pressedWithAModifier(event: React.MouseEvent): boolean {
  return (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  )
}

function toTheTop(): void {
  window.scrollTo({ top: 0 })

  for (const within of document.querySelectorAll<HTMLElement>(
    '[data-slot="screen-main"] *',
  )) {
    if (within.scrollTop > 0) {
      within.scrollTop = 0
    }
  }
}

function reach(scrollY: number, frames = FRAMES_TO_REACH): void {
  window.scrollTo({ top: scrollY })

  if (frames > 0 && Math.abs(window.scrollY - scrollY) > 1) {
    requestAnimationFrame(() => reach(scrollY, frames - 1))
  }
}

/** The tabs at the foot of a phone held upright. A tab goes back to the screen and the position it was left at; the open tab, pressed again, goes to its head screen at the top. The reservations' tab carries the count of conflicts left unsettled. */
export function AppTabBar({ conflicts }: { conflicts?: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const current = destinationOf(pathname)
  const arriving = useRef<{ pathname: string; scrollY: number } | null>(null)

  useEffect(() => {
    const due = arriving.current

    if (due && due.pathname === pathname) {
      arriving.current = null
      requestAnimationFrame(() => reach(due.scrollY))
    }
  }, [pathname])

  const press = (event: React.MouseEvent, href: string): void => {
    if (pressedWithAModifier(event)) {
      return
    }

    event.preventDefault()

    const here = `${window.location.pathname}${window.location.search}`
    const pressed = pressTab(memory, href, current, {
      address: here,
      scrollY: window.scrollY,
    })

    if (pressed.kind === 'top') {
      if (here !== pressed.address) {
        router.push(pressed.address as Route)
      }
      toTheTop()

      return
    }

    arriving.current = {
      pathname: new URL(pressed.address, window.location.origin).pathname,
      scrollY: pressed.scrollY,
    }
    router.push(pressed.address as Route, { scroll: false })
  }

  return (
    <TabBar>
      {DESTINATIONS.map(({ href, label }) => {
        const Icon = ICONS[href]

        return (
          <TabBarItem
            key={href}
            asChild
            active={href === current}
            icon={<Icon />}
            label={label}
            badge={href === RESERVATIONS ? conflicts : undefined}
          >
            <Link href={href} onClick={(event) => press(event, href)} />
          </TabBarItem>
        )
      })}
    </TabBar>
  )
}
