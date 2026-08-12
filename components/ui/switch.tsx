'use client'

import * as React from 'react'
import { Switch as SwitchPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

/**
 * The knob travels on the toy easing, so it overshoots very slightly before it
 * settles.
 */
function Switch({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: 'sm' | 'default'
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        'peer group/switch inline-flex shrink-0 items-center rounded-full border border-line-strong bg-surface-3 p-0.5 outline-none',
        'transition-[background-color,border-color,box-shadow] duration-150 ease-out',
        'data-[size=default]:h-6 data-[size=default]:w-[42px] data-[size=sm]:h-5 data-[size=sm]:w-[34px]',
        'data-[state=checked]:border-brand data-[state=checked]:bg-brand',
        'focus-visible:shadow-ring disabled:cursor-not-allowed disabled:opacity-45',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block rounded-full border border-line-strong bg-surface transition-transform duration-150 ease-toy',
          'group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3.5',
          'data-[state=unchecked]:translate-x-0 group-data-[size=default]/switch:data-[state=checked]:translate-x-5 group-data-[size=sm]/switch:data-[state=checked]:translate-x-3.5',
          'data-[state=checked]:border-brand-hover data-[state=checked]:bg-on-brand',
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
