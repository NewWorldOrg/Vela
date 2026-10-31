'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { useId, type ComponentProps, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface SegmentedOption {
  value: string
  label: string
  href?: Route
  /** Drawn in place of the label, which is then only read out. */
  icon?: ReactNode
}

export const CHOICE_LABEL =
  'text-sub font-semibold whitespace-nowrap text-ink-2'

const TRACK = {
  default:
    'inline-flex min-w-0 flex-wrap gap-x-0.5 gap-y-3 rounded-xl bg-surface p-1',
  band: 'inline-flex min-w-0 flex-wrap gap-x-0.5 gap-y-4 rounded-xl bg-surface p-0.5',
} as const

const OPTION_SIZE = {
  default: 'h-8 px-4 text-body',
  band: 'h-7 px-3 text-ui',
} as const

const OPTION = cn(
  'tap-target inline-flex cursor-pointer items-center rounded-full font-semibold whitespace-nowrap text-ink-2 outline-none disabled:cursor-not-allowed',
  'transition-[background-color,color,box-shadow,transform] duration-[140ms] ease-toy',
  'enabled:hover:text-ink enabled:active:scale-[0.98] focus-visible:shadow-ring',
)

const ICON_ONLY = {
  default: 'w-11 justify-center px-0 [&_svg]:size-4',
  band: 'w-11 justify-center px-0 [&_svg]:size-4',
} as const

function Said({ option }: { option: SegmentedOption }) {
  if (!option.icon) {
    return option.label
  }

  return (
    <>
      {option.icon}
      <span className="sr-only">{option.label}</span>
    </>
  )
}

const CHOSEN =
  'bg-raised text-ink shadow-chosen dark:shadow-none hover:text-ink'

type Naming =
  | { label: string; 'aria-label'?: string }
  | { label?: undefined; 'aria-label': string }

export function ChoiceLabel({ className, ...props }: ComponentProps<'span'>) {
  return <span className={cn(CHOICE_LABEL, className)} {...props} />
}

export function SegmentedControl({
  options,
  value,
  onValueChange,
  disabled,
  label,
  size = 'default',
  className,
  ...props
}: Omit<
  ComponentProps<'div'>,
  'onChange' | 'children' | 'aria-label' | 'aria-labelledby'
> &
  Naming & {
    options: SegmentedOption[]
    value?: string
    onValueChange?: (value: string) => void
    disabled?: boolean
    /** `band` sits among the 32px controls of a filter band. */
    size?: keyof typeof TRACK
  }) {
  const labelId = useId()

  const group = (
    <div
      data-slot="segmented-control"
      role="group"
      aria-labelledby={label ? labelId : undefined}
      className={cn(TRACK[size], disabled && 'opacity-55', !label && className)}
      {...props}
    >
      {options.map((option) => (
        <Segment
          key={option.value}
          option={option}
          size={size}
          selected={option.value === value}
          disabled={disabled}
          onPick={() => onValueChange?.(option.value)}
        />
      ))}
    </div>
  )

  if (!label) {
    return group
  }

  return (
    <div className={cn('inline-flex min-w-0 items-center gap-2', className)}>
      <ChoiceLabel id={labelId}>{label}</ChoiceLabel>
      {group}
    </div>
  )
}

function Segment({
  option,
  size,
  selected,
  disabled,
  onPick,
}: {
  option: SegmentedOption
  size: keyof typeof TRACK
  selected: boolean
  disabled?: boolean
  onPick: () => void
}) {
  if (option.href) {
    return (
      <Link
        href={option.href}
        aria-current={selected ? 'page' : undefined}
        className={cn(
          OPTION,
          OPTION_SIZE[size],
          'hover:text-ink',
          selected && CHOSEN,
          option.icon && ICON_ONLY[size],
        )}
      >
        <Said option={option} />
      </Link>
    )
  }

  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onPick}
      className={cn(
        OPTION,
        OPTION_SIZE[size],
        selected && CHOSEN,
        option.icon && ICON_ONLY[size],
      )}
    >
      <Said option={option} />
    </button>
  )
}
