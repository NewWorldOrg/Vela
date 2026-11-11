import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'
import { ScreenMain } from '@/components/vela/screen-main'

export function AdminMain({ className, ...props }: ComponentProps<'main'>) {
  return (
    <ScreenMain
      rises={false}
      data-slot="admin-main"
      className={cn(
        'min-w-0 px-[calc(18rem/16)] pt-4 pb-5 upright:px-4 upright:pt-1',
        'sideways:px-5 sideways:pb-[calc(var(--safe-bottom)+16rem/16)]',
        className,
      )}
      {...props}
    />
  )
}
