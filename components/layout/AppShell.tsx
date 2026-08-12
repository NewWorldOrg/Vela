'use client'

import { useCallback, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, Menu, PanelLeft, User } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import SideNav from '@/components/layout/SideNav'
import { APP_NAME, NAV_ITEMS } from '@/components/layout/navConfig'

/** Page title shown in the header — derived from the active nav item. */
function usePageTitle() {
  const pathname = usePathname()
  return (
    NAV_ITEMS.find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    )?.label ?? APP_NAME
  )
}

const SIDEBAR_WIDTH = 256
const SIDEBAR_COLLAPSED_WIDTH = 56
const COOKIE_NAME = 'next-base-sidebar-collapsed'
const MOBILE_QUERY = '(max-width: 767px)'

function readCollapsed(): boolean {
  if (typeof document === 'undefined') return false
  return new RegExp(`(?:^|; )${COOKIE_NAME}=1`).test(document.cookie)
}

function writeCollapsed(collapsed: boolean) {
  document.cookie = `${COOKIE_NAME}=${collapsed ? 1 : 0}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
}

// Small external store so the collapsed state syncs from the cookie without a
// setState-in-effect (server renders expanded; the cookie value applies on
// hydration, animated via the sidebar's width transition).
const collapsedListeners = new Set<() => void>()
function subscribeCollapsed(cb: () => void) {
  collapsedListeners.add(cb)
  return () => collapsedListeners.delete(cb)
}
function setCollapsedCookie(next: boolean) {
  writeCollapsed(next)
  for (const listener of collapsedListeners) listener()
}

function useIsMobile() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(MOBILE_QUERY)
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false,
  )
}

/** Header user menu — a generic placeholder (no auth in the base). */
function UserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-2" aria-label="Account">
          <Avatar className="size-7">
            <AvatarFallback>
              <User className="size-3.5" />
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-sm sm:inline">Account</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>My account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <LogOut className="mr-2 size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile()
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    readCollapsed,
    () => false,
  )
  const [mobileOpen, setMobileOpen] = useState(false)
  const pageTitle = usePageTitle()

  const toggleCollapsed = useCallback(() => {
    setCollapsedCookie(!readCollapsed())
  }, [])

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Desktop sidebar (collapsible) */}
      {!isMobile && (
        <aside
          className="flex shrink-0 flex-col overflow-hidden border-r bg-muted/30 transition-[width] duration-150"
          style={{ width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH }}
          aria-label="Sidebar"
        >
          <div className="flex h-12 items-center px-3">
            {!collapsed && (
              <Link href="/dashboard" className="font-semibold">
                {APP_NAME}
              </Link>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            <SideNav collapsed={collapsed} />
          </div>
        </aside>
      )}

      {/* Mobile drawer */}
      {isMobile && (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="flex h-12 items-center px-3 text-base font-semibold">
              {APP_NAME}
            </SheetTitle>
            <SideNav onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background px-3">
          {isMobile ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Toggle sidebar"
              onClick={toggleCollapsed}
            >
              <PanelLeft className="size-4" />
            </Button>
          )}
          <h1 className="text-base font-semibold">{pageTitle}</h1>
          <div className="flex-1" />
          <ThemeToggle />
          <UserMenu />
        </header>

        {/* Fill area: children control their own scroll (list pages fill, content
            pages use overflow-y-auto). */}
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
