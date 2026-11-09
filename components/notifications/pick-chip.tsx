'use client'

import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { CheckIcon } from '@/components/vela/icons'
import { pressable } from '@/components/vela/tactile'

/** A choice pressed in and out: a tick on the accent's tint while it is in, an empty ring while it is out. */
export function PickChip({
  on,
  onPress,
  disabled,
  className,
  children,
}: {
  on: boolean
  onPress: () => void
  disabled?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onPress}
      className={cn(
        'tap-target inline-flex h-[calc(34rem/16)] items-center gap-[calc(7rem/16)] rounded-full pr-3.5 pl-3 text-ui whitespace-nowrap outline-none',
        'transition-[background-color,color,transform] duration-[140ms] ease-toy enabled:active:scale-[0.98] focus-visible:shadow-ring disabled:opacity-40',
        pressable,
        on
          ? 'bg-accent-tint font-semibold text-acc-text'
          : 'bg-surface font-medium text-ink enabled:hover:bg-surface-2 dark:bg-surface-2 dark:enabled:hover:bg-surface-3',
        className,
      )}
    >
      {on ? (
        <CheckIcon className="size-3.5 [stroke-width:2.2]" />
      ) : (
        <span
          aria-hidden="true"
          className="inline-block size-3.5 shrink-0 rounded-full shadow-[inset_0_0_0_1.5px_var(--ink-3)]"
        />
      )}
      {children}
    </button>
  )
}

export function PickChips({
  className,
  children,
  ...props
}: {
  className?: string
  children: ReactNode
  'aria-label'?: string
  'aria-labelledby'?: string
}) {
  return (
    <div
      role="group"
      className={cn('flex flex-wrap gap-2', className)}
      {...props}
    >
      {children}
    </div>
  )
}
