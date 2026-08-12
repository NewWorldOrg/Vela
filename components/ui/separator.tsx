'use client'

import * as React from 'react'
import { Separator as SeparatorPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

/**
 * Rules are not always solid — a dashed one reads as a lighter break and is
 * what row and section separators use.
 */
function Separator({
  className,
  orientation = 'horizontal',
  decorative = true,
  variant = 'dashed',
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root> & {
  variant?: 'solid' | 'dashed'
}) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      data-variant={variant}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        'shrink-0 border-line data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px',
        variant === 'dashed'
          ? 'border-dashed data-[orientation=horizontal]:border-t data-[orientation=vertical]:border-l'
          : 'bg-line',
        className,
      )}
      {...props}
    />
  )
}

export { Separator }
