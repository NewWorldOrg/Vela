'use client'

import { Laptop, Moon, Sun, Check, type LucideIcon } from 'lucide-react'
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

interface ThemeToggleProps {
  /** Extra classes for the trigger button (color tweaks). */
  className?: string
  /** Trigger button variant (default: ghost). */
  variant?: React.ComponentProps<typeof Button>['variant']
  /** Trigger button size (default: icon-sm). */
  size?: React.ComponentProps<typeof Button>['size']
}

const OPTIONS: { value: ThemePreference; label: string; Icon: LucideIcon }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Laptop },
]

const MODE_LABELS: Record<ThemePreference, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
}

/**
 * Theme switcher. Three choices: Light / Dark / System.
 *
 * - `mode`: the theme actually applied (for `system`, the matchMedia result).
 * - `preference`: the user's selection, surfaced via the trigger icon.
 */
export function ThemeToggle({
  className,
  variant = 'ghost',
  size = 'icon-sm',
}: ThemeToggleProps) {
  const { mode, preference, setPreference } = useTheme()

  // The trigger icon follows `preference` (Laptop when `system` is selected).
  // Using `mode` would show Sun/Moon even for `system`, hiding the selection.
  const TriggerIcon =
    preference === 'light' ? Sun : preference === 'dark' ? Moon : Laptop

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
              {selected && <Check className="size-4" aria-hidden="true" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
