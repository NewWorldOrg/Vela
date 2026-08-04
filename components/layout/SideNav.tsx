'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { NAV_ITEMS } from '@/components/layout/navConfig'

interface SideNavProps {
  /** Icon-only rail mode (labels hidden, shown via tooltip). */
  collapsed?: boolean
  /** Called when a nav link is clicked (e.g. to close the mobile drawer). */
  onNavigate?: () => void
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function SideNav({ collapsed, onNavigate }: SideNavProps) {
  const pathname = usePathname()

  return (
    <TooltipProvider delayDuration={0}>
      <nav className="flex flex-col gap-1 p-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href)
          const link = (
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                collapsed && 'justify-center px-0',
                active
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          )

          if (!collapsed) return <div key={item.href}>{link}</div>

          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          )
        })}
      </nav>
    </TooltipProvider>
  )
}
