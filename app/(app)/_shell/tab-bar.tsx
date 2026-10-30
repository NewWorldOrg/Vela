'use client'

import type { ComponentType } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { DESTINATIONS, destinationOf } from '@/lib/destinations'
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

export function AppTabBar() {
  const current = destinationOf(usePathname())

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
          >
            <Link href={href} />
          </TabBarItem>
        )
      })}
    </TabBar>
  )
}
