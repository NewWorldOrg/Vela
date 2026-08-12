import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

/**
 * The chip. Dot-plus-text is the base form for state and the chip is the
 * supporting form, so chips stay quiet: a hairline, a soft colour surface and
 * text. `kind*` variants label a category rather than a state, so their text
 * stays ink-2 and only the surface colour changes.
 */
const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1.5 rounded-full border px-[11px] py-[3px] text-note font-medium whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&>svg]:pointer-events-none [&>svg]:size-3',
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
        info: 'border-brand-line bg-brand-soft text-brand',
        selected: 'border-brand-line bg-brand-soft font-bold text-brand',
        recording: 'border-coral-line bg-coral-soft font-bold text-coral',
        kindTv: 'border-line bg-tint-sky text-ink-2',
        kindSegment: 'border-line bg-tint-sage text-ink-2',
        kindData: 'border-line bg-surface-2 text-ink-2',
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
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
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
