'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { useId, type ComponentProps } from 'react'

import { cn } from '@/lib/utils'

export interface SegmentedOption {
  value: string
  label: string
  href?: Route
}

export const CHOICE_LABEL = 'text-ui font-medium whitespace-nowrap text-ink-2'

const TRACK =
  'inline-flex min-w-0 flex-wrap gap-x-0.5 gap-y-[calc(18rem/16)] rounded-lg bg-surface-2 p-[calc(3rem/16)]'

const OPTION = cn(
  'tap-target inline-flex h-[calc(26rem/16)] cursor-pointer items-center rounded-full border border-transparent px-[calc(14rem/16)] text-sub font-medium whitespace-nowrap text-ink-2 outline-none disabled:cursor-not-allowed',
  'transition-[background-color,color,transform] duration-150 ease-toy',
  'enabled:hover:text-ink enabled:active:translate-x-px enabled:active:translate-y-px focus-visible:shadow-ring',
)

const CHOSEN = 'border-brand bg-brand-soft font-bold text-brand'

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
  }) {
  const labelId = useId()

  const group = (
    <div
      data-slot="segmented-control"
      role="group"
      aria-labelledby={label ? labelId : undefined}
      className={cn(TRACK, disabled && 'opacity-55', !label && className)}
      {...props}
    >
      {options.map((option) => (
        <Segment
          key={option.value}
          option={option}
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
  selected,
  disabled,
  onPick,
}: {
  option: SegmentedOption
  selected: boolean
  disabled?: boolean
  onPick: () => void
}) {
  if (option.href) {
    return (
      <Link
        href={option.href}
        aria-current={selected ? 'page' : undefined}
        className={cn(OPTION, 'hover:text-ink', selected && CHOSEN)}
      >
        {option.label}
      </Link>
    )
  }

  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onPick}
      className={cn(OPTION, selected && CHOSEN)}
    >
      {option.label}
    </button>
  )
}
