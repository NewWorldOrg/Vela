'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { isPathActive } from '@/lib/path'
import { AdminSideNav, AdminSideNavItem } from '@/components/vela/app-shell'
import {
  ChannelIcon,
  EncodeIcon,
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

export function SettingsSideNav() {
  const pathname = usePathname()

  return (
    <AdminSideNav caption="管理">
      {ADMIN_NAV.map(({ href, label, icon: Icon }) => (
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
