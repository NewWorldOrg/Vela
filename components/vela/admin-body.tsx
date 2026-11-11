import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

export function AdminBody({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="admin-body"
      className={cn('flex min-h-[calc(196rem/16)]', className)}
      {...props}
    />
  )
}
