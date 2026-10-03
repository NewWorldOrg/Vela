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
import { IconButton } from '@/components/vela/icon-button'
import type { ThemePreference } from '@/lib/theme'
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
  { value: 'light', label: 'ライト', Icon: SunIcon },
  { value: 'dark', label: 'ダーク', Icon: MoonIcon },
  { value: 'system', label: 'システム', Icon: DisplayIcon },
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
