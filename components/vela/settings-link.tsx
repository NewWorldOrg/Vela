import type { ComponentProps } from 'react'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'
import { SettingsIcon } from '@/components/vela/icons'

export function SettingsLink({
  active,
  asChild,
  className,
  children,
  ...props
}: ComponentProps<'a'> & { active?: boolean; asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'a'

  return (
    <Comp
      data-slot="settings-link"
      aria-current={active ? 'page' : undefined}
      aria-label="設定"
      className={cn(
        'tap-target relative grid size-[calc(38*var(--px))] place-items-center rounded-full text-ink-2 no-underline outline-none phone:hidden [&_svg]:size-5',
        'transition-[background-color,color] duration-[140ms] ease-toy',
        'hover:bg-surface hover:text-ink focus-visible:shadow-ring',
        active &&
          'bg-accent-tint text-acc-text hover:bg-accent-tint hover:text-acc-text',
        className,
      )}
      {...props}
    >
      <SettingsIcon />
      {asChild ? <Slot.Slottable>{children}</Slot.Slottable> : children}
    </Comp>
  )
}
