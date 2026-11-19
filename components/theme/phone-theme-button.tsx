'use client'

import { useTheme } from '@/components/theme/theme-provider'
import { cn } from '@/lib/utils'
import { PHONE_BAR_BUTTON } from '@/components/vela/app-shell'
import { IconButton } from '@/components/vela/icon-button'
import { MoonIcon, SunIcon } from '@/components/vela/icons'
import type { ThemeToggleProps } from '@/components/theme/theme-toggle'

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
