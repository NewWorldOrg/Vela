import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

/** A chip is said only when it asks for attention, or states a fact quietly. Good news wears no colour. */
const badgeVariants = cva(
  'inline-flex h-6 shrink-0 items-center justify-center gap-[5px] rounded-full px-[9px] text-note font-semibold whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:shadow-ring [&>svg]:pointer-events-none [&>svg]:size-3',
  {
    variants: {
      variant: {
        default: 'bg-surface-2 text-ink-2',
        secondary: 'bg-surface-2 text-ink-2',
        outline: 'bg-surface-2 text-ink-2',
        mute: 'bg-surface-2 text-ink-2',
        ok: 'bg-surface-2 text-ink',
        sky: 'bg-surface-2 text-ink',
        info: 'bg-surface-2 text-ink',
        warn: 'bg-accent-soft text-acc-text',
        err: 'bg-accent-soft text-acc-text',
        recording: 'bg-accent-soft text-acc-text',
        selected: 'bg-btn text-on-ink',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'span'

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
