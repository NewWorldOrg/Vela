'use client'

import { useTheme } from '@/components/theme/theme-provider'
import { cn } from '@/lib/utils'
import { MoonIcon, SunIcon } from '@/components/vela/icons'
import type { ThemeToggleProps } from '@/components/theme/theme-toggle'

/** The theme in the bar at the top of a wide window, beside the settings: one press turns the page to the other of light and dark, as on a phone. */
export function BarThemeButton({ className }: ThemeToggleProps) {
  const { mode, press } = useTheme()
  const Icon = mode === 'dark' ? MoonIcon : SunIcon

  return (
    <button
      type="button"
      data-slot="bar-theme"
      aria-label="テーマ"
      onClick={press}
      className={cn(
        'tap-target relative grid size-[calc(38*var(--px))] cursor-pointer place-items-center rounded-full text-ink-2 outline-none phone:hidden [&_svg]:size-5',
        'transition-[background-color,color,transform] duration-[140ms] ease-toy',
        'hover:bg-surface hover:text-ink focus-visible:shadow-ring active:scale-95',
        className,
      )}
    >
      <Icon />
    </button>
  )
}
