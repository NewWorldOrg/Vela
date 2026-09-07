'use client'

import type { ComponentType } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  useTheme,
  type ThemePreference,
} from '@/components/theme/ThemeProvider'
import {
  CheckIcon,
  DisplayIcon,
  MoonIcon,
  SunIcon,
  type IconProps,
} from '@/components/vela/icons'

interface ThemeToggleProps {
  className?: string
  variant?: React.ComponentProps<typeof Button>['variant']
  size?: React.ComponentProps<typeof Button>['size']
}

const OPTIONS: {
  value: ThemePreference
  label: string
  Icon: ComponentType<IconProps>
}[] = [
  { value: 'light', label: 'Light', Icon: SunIcon },
  { value: 'dark', label: 'Dark', Icon: MoonIcon },
  { value: 'system', label: 'System', Icon: DisplayIcon },
]

const MODE_LABELS: Record<ThemePreference, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
}

export function ThemeToggle({
  className,
  variant = 'ghost',
  size = 'icon-sm',
}: ThemeToggleProps) {
  const { mode, preference, setPreference } = useTheme()

  const TriggerIcon =
    preference === 'light'
      ? SunIcon
      : preference === 'dark'
        ? MoonIcon
        : DisplayIcon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          aria-label="Toggle theme"
          className={className}
        >
          <TriggerIcon className="size-4" />
          <span className="sr-only">
            Current theme: {MODE_LABELS[preference]} (showing{' '}
            {MODE_LABELS[mode]})
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map(({ value, label, Icon }) => {
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
