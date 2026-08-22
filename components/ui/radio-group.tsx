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
      className={cn('grid gap-[26px]', className)}
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
        'tap-target inline-flex aspect-square size-[18px] shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface outline-none',
        'transition-[background-color,border-color,transform,box-shadow] duration-150 ease-toy',
        'enabled:hover:-translate-x-px enabled:hover:-translate-y-px',
        'data-[state=checked]:border-brand data-[state=checked]:bg-brand',
        'focus-visible:shadow-ring aria-invalid:border-coral',
        'disabled:cursor-not-allowed disabled:opacity-45',
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="flex items-center justify-center"
      >
        <span className="size-1.5 rounded-full bg-on-brand" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem }
