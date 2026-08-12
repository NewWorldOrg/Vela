'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { isPathActive } from '@/lib/path'
import { AdminSideNav, AdminSideNavItem } from '@/components/vela/app-shell'
import {
  ChannelIcon,
  EncodeIcon,
  ListIcon,
  QualityIcon,
  SystemIcon,
  TunerIcon,
} from '@/components/vela/icons'

const ADMIN_NAV = [
  { href: '/settings/system', label: 'システム', icon: SystemIcon },
  { href: '/settings/tuners', label: 'チューナー', icon: TunerIcon },
  { href: '/settings/channels', label: 'チャンネル', icon: ChannelIcon },
  { href: '/settings/encode', label: 'エンコード', icon: EncodeIcon },
  { href: '/settings/quality', label: '品質', icon: QualityIcon },
] as const

const MIGRATION_NAV = {
  href: '/settings/migration',
  label: '移行記録',
  icon: ListIcon,
} as const

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
