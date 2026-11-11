import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'
import { VelaMark } from '@/components/vela/vela-mark'

export function Brand({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="brand"
      className={cn(
        'flex items-center gap-2 text-[calc(19rem/16)] leading-none font-bold tracking-[-0.035em] phone:hidden',
        className,
      )}
      {...props}
    >
      <VelaMark small className="size-5" />
      Vela
    </div>
  )
}
