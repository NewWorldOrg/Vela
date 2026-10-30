'use client'

import type { ComponentType } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from '@/components/theme/ThemeProvider'
import { cn } from '@/lib/utils'
import { PHONE_BAR_BUTTON } from '@/components/vela/app-shell'
import { IconButton } from '@/components/vela/icon-button'
import { THEME_LABEL, type ThemePreference } from '@/lib/theme'
import {
  CheckIcon,
  DisplayIcon,
  MoonIcon,
  SunIcon,
  type IconProps,
} from '@/components/vela/icons'

interface ThemeToggleProps {
  className?: string
}

export const THEME_OPTIONS: {
  value: ThemePreference
  label: string
  Icon: ComponentType<IconProps>
}[] = [
  { value: 'light', label: THEME_LABEL.light, Icon: SunIcon },
  { value: 'dark', label: THEME_LABEL.dark, Icon: MoonIcon },
  { value: 'system', label: THEME_LABEL.system, Icon: DisplayIcon },
]

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { preference, setPreference } = useTheme()

  const TriggerIcon =
    preference === 'light'
      ? SunIcon
      : preference === 'dark'
        ? MoonIcon
        : DisplayIcon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton
          variant="quiet"
          size="sm"
          aria-label="テーマ"
          className={className}
        >
          <TriggerIcon />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>テーマ</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {THEME_OPTIONS.map(({ value, label, Icon }) => {
          const selected = preference === value
          return (
            <DropdownMenuItem
              key={value}
              onSelect={() => setPreference(value)}
              className="flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Icon className="size-4" />
                {label}
              </span>
              {selected && <CheckIcon className="size-3.5" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** The theme in the bar at the top of a phone held upright: one press turns the page to the other of light and dark, from whichever it is showing. */
export function PhoneThemeButton({ className }: ThemeToggleProps) {
  const { mode, setPreference } = useTheme()
  const Icon = mode === 'dark' ? MoonIcon : SunIcon

  return (
    <IconButton
      aria-label="テーマ"
      className={cn(PHONE_BAR_BUTTON, className)}
      onClick={() => setPreference(mode === 'dark' ? 'light' : 'dark')}
    >
      <Icon />
    </IconButton>
  )
}
