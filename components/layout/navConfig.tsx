import { LayoutDashboard, Settings, Users, type LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

/**
 * Sidebar navigation. Generic example sections — replace with your own.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Users', href: '/users', icon: Users },
  { label: 'Settings', href: '/settings', icon: Settings },
]

export const APP_NAME = 'next-base'
