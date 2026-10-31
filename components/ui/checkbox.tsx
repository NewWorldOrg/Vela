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
        'group/checkbox tap-target peer inline-flex size-[calc(18rem/16)] shrink-0 cursor-pointer items-center justify-center rounded-[6px] bg-surface-2 shadow-[inset_0_0_0_1.5px_var(--hair-strong)] outline-none',
        'transition-[background-color,box-shadow] duration-[140ms] ease-toy',
        'enabled:hover:bg-surface-3',
        'data-[state=checked]:bg-btn data-[state=checked]:shadow-none data-[state=checked]:text-on-ink enabled:data-[state=checked]:hover:bg-btn-hover',
        'data-[state=indeterminate]:bg-btn data-[state=indeterminate]:text-on-ink',
        'focus-visible:shadow-ring aria-invalid:bg-accent-soft',
        'disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current"
      >
        <CheckIcon className="size-[calc(11rem/16)] group-data-[state=indeterminate]/checkbox:hidden" />
        <span className="hidden h-[2px] w-[calc(9rem/16)] rounded-full bg-current group-data-[state=indeterminate]/checkbox:block" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
