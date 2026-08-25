'use client'

import * as React from 'react'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'
import { CheckIcon } from '@/components/vela/icons'

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'tap-target peer inline-flex size-[18px] shrink-0 cursor-pointer items-center justify-center rounded-[6px] border border-line-strong bg-surface outline-none',
        'transition-[background-color,border-color,transform,box-shadow] duration-150 ease-toy',
        'enabled:hover:-translate-x-px enabled:hover:-translate-y-px',
        'data-[state=checked]:border-brand data-[state=checked]:bg-brand data-[state=checked]:text-on-brand',
        'focus-visible:shadow-ring aria-invalid:border-coral',
        'disabled:cursor-not-allowed disabled:opacity-45',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current"
      >
        <CheckIcon className="size-[11px]" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
