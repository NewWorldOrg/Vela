'use client'

import * as React from 'react'
import { Switch as SwitchPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

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
        'tap-target peer group/switch inline-flex shrink-0 cursor-pointer items-center rounded-full bg-surface-2 p-[3px] outline-none',
        'transition-[background-color,box-shadow] duration-[140ms] ease-toy',
        'data-[size=default]:h-7 data-[size=default]:w-[46px] data-[size=sm]:h-6 data-[size=sm]:w-[40px]',
        'data-[state=checked]:bg-ink',
        'focus-visible:shadow-ring disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-transform duration-[140ms] ease-toy',
          'group-data-[size=default]/switch:size-[22px] group-data-[size=sm]/switch:size-[18px]',
          'data-[state=unchecked]:translate-x-0 group-data-[size=default]/switch:data-[state=checked]:translate-x-[18px] group-data-[size=sm]/switch:data-[state=checked]:translate-x-4',
          'data-[state=checked]:bg-bg',
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
