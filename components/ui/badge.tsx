import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border px-[11px] py-[3px] text-note font-medium whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&>svg]:pointer-events-none [&>svg]:size-3',
  {
    variants: {
      variant: {
        default: 'border-line bg-surface text-ink-2',
        secondary: 'border-line bg-surface-2 text-ink-2',
        outline: 'border-line-strong bg-transparent text-ink-2',
        mute: 'border-dashed border-line bg-surface-2 text-ink-3',
        ok: 'border-mint-line bg-mint-soft text-mint',
        warn: 'border-lemon-line bg-lemon-soft text-lemon',
        err: 'border-coral-line bg-coral-soft text-coral',
        sky: 'border-sky-line bg-sky-soft text-sky',
        info: 'border-brand-line bg-brand-soft text-brand',
        selected: 'border-brand-line bg-brand-soft font-bold text-brand',
        recording: 'border-coral-line bg-coral-soft font-bold text-coral',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export type PillWidth = `${number}em`

export type BadgeWidth = 'fit' | PillWidth

const IN_A_COLUMN = 'border-transparent'

function Badge({
  className,
  variant = 'default',
  width = 'fit',
  asChild = false,
  style,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean
    width?: BadgeWidth
  }) {
  const Comp = asChild ? Slot.Root : 'span'
  const told = width !== 'fit'

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      data-width={width}
      className={cn(badgeVariants({ variant }), told && IN_A_COLUMN, className)}
      style={told ? { ...style, width } : style}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
