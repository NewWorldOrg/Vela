'use client'

import { useTheme } from '@/components/theme/ThemeProvider'
import { cn } from '@/lib/utils'
import { PHONE_BAR_BUTTON } from '@/components/vela/app-shell'
import { IconButton } from '@/components/vela/icon-button'
import { MoonIcon, SunIcon } from '@/components/vela/icons'
import type { ThemeToggleProps } from '@/components/theme/ThemeToggle'

/** The theme in the bar at the top of a phone held upright: one press turns the page to the other of light and dark, from whichever it is showing, and goes back to following the device when that other is the device's theme. */
export function PhoneThemeButton({ className }: ThemeToggleProps) {
  const { mode, press } = useTheme()
  const Icon = mode === 'dark' ? MoonIcon : SunIcon

  return (
    <IconButton
      aria-label="テーマ"
      className={cn(PHONE_BAR_BUTTON, className)}
      onClick={press}
    >
      <Icon />
    </IconButton>
  )
}
