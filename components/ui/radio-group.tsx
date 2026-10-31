'use client'

import * as React from 'react'
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn('grid gap-[calc(26rem/16)]', className)}
      {...props}
    />
  )
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        'tap-target inline-flex aspect-square size-[calc(18rem/16)] shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface-2 shadow-[inset_0_0_0_1.5px_var(--hair-strong)] outline-none',
        'transition-[background-color,box-shadow] duration-[140ms] ease-toy',
        'enabled:hover:bg-surface-3',
        'data-[state=checked]:bg-btn data-[state=checked]:shadow-none enabled:data-[state=checked]:hover:bg-btn-hover',
        'focus-visible:shadow-ring aria-invalid:bg-accent-soft',
        'disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="flex items-center justify-center"
      >
        <span className="size-2 rounded-full bg-on-ink" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem }
