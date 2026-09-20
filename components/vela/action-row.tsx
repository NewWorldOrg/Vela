import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

const EVENLY_WIDE =
  'inline-grid w-max auto-cols-fr grid-flow-col items-start gap-[9px] [&_[data-slot=button]]:w-full'

export function ActionRow({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      data-slot="action-row"
      className={cn(EVENLY_WIDE, className)}
      {...props}
    />
  )
}
