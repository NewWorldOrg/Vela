'use client'

import { cn } from '@/lib/utils'
import { pressable, still } from '@/components/vela/tactile'

export function PlayerSegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  nameOf,
  numeric,
  off,
  title,
}: {
  label: string
  options: readonly T[]
  value?: T
  onChange: (next: T) => void
  nameOf?: (option: T) => string
  numeric?: boolean
  off?: boolean
  title?: string
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'inline-flex gap-1 rounded-full border border-white/20 p-0.5',
        off && 'border-white/12',
      )}
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          disabled={off}
          title={title}
          aria-pressed={off ? undefined : option === value}
          onClick={() => onChange(option)}
          className={cn(
            'tap-target rounded-full border-none bg-transparent px-[calc(11rem/16)] py-[calc(3rem/16)] text-note font-medium whitespace-nowrap text-(--pl-ink-2) transition-[background-color,color] duration-150 hover:text-(--pl-ink) focus-visible:shadow-ring focus-visible:outline-none disabled:text-(--pl-ink-3) disabled:hover:text-(--pl-ink-3)',
            pressable,
            still,
            numeric && 'font-code',
            !off &&
              option === value &&
              'bg-(--pl-accent)/24 font-bold text-(--pl-accent-ink)',
          )}
        >
          {nameOf ? nameOf(option) : option}
        </button>
      ))}
    </div>
  )
}
