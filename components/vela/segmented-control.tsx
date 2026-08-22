'use client'

import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

export interface SegmentedOption {
  value: string
  label: string
}

/**
 * The pill-shaped filter switch. Selection is shown with the soft accent
 * surface and a hairline, never with a solid fill.
 */
export function SegmentedControl({
  options,
  value,
  onValueChange,
  disabled,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'onChange' | 'children'> & {
  options: SegmentedOption[]
  /** Unset selects nothing: the strip states no option rather than a wrong one. */
  value?: string
  onValueChange?: (value: string) => void
  /** Fades the whole strip and takes it out of the tab order. */
  disabled?: boolean
  'aria-label': string
}) {
  return (
    <div
      data-slot="segmented-control"
      role="group"
      className={cn(
        'inline-flex gap-0.5 rounded-full bg-surface-2 p-[3px]',
        disabled && 'opacity-55',
        className,
      )}
      {...props}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onValueChange?.(option.value)}
            className={cn(
              'tap-target rounded-full border border-transparent px-[14px] py-[5px] text-sub font-medium whitespace-nowrap text-ink-2 outline-none',
              'transition-[background-color,color,transform] duration-150 ease-toy',
              'hover:text-ink active:translate-x-px active:translate-y-px focus-visible:shadow-ring',
              selected && 'border-brand bg-brand-soft font-bold text-brand',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
