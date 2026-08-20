'use client'

import type { ComponentType } from 'react'
import type { Route } from 'next'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { isPathActive } from '@/lib/path'
import { AdminSideNav, AdminSideNavItem } from '@/components/vela/app-shell'
import {
  ChannelIcon,
  EncodeIcon,
  KeyIcon,
  ListIcon,
  QualityIcon,
  SystemIcon,
  TunerIcon,
  type IconProps,
} from '@/components/vela/icons'

interface AdminNavItem {
  href: Route
  label: string
  icon: ComponentType<IconProps>
}

const ADMIN_NAV: AdminNavItem[] = [
  { href: '/settings/system', label: 'システム', icon: SystemIcon },
  { href: '/settings/tuners', label: 'チューナー', icon: TunerIcon },
  { href: '/settings/channels', label: 'チャンネル', icon: ChannelIcon },
  { href: '/settings/encode', label: 'エンコード', icon: EncodeIcon },
  { href: '/settings/quality', label: '品質', icon: QualityIcon },
  { href: '/settings/authentication', label: '認証', icon: KeyIcon },
]

const MIGRATION_NAV: AdminNavItem = {
  href: '/settings/migration',
  label: '移行記録',
  icon: ListIcon,
}

export function SettingsSideNav({ hasMigration }: { hasMigration: boolean }) {
  const pathname = usePathname()
  const items = hasMigration ? [...ADMIN_NAV, MIGRATION_NAV] : ADMIN_NAV

  return (
    <AdminSideNav caption="管理">
      {items.map(({ href, label, icon: Icon }) => (
        <AdminSideNavItem
          key={href}
          asChild
          label={label}
          icon={<Icon />}
          active={isPathActive(pathname, href)}
        >
          <Link href={href} />
        </AdminSideNavItem>
      ))}
    </AdminSideNav>
  )
}
