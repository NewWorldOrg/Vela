import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'
import { pressable, still, tactile } from '@/components/vela/tactile'

const buttonVariants = cva(
  cn(
    "tap-target inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap outline-none focus-visible:shadow-ring disabled:opacity-40 aria-disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    tactile,
    pressable,
    still,
  ),
  {
    variants: {
      variant: {
        default:
          'bg-btn text-on-ink not-disabled:not-aria-disabled:hover:bg-btn-hover',
        tone: 'bg-surface-2 text-ink not-disabled:not-aria-disabled:hover:bg-surface-3',
        ghost:
          'bg-transparent text-ink-2 not-disabled:not-aria-disabled:hover:bg-surface not-disabled:not-aria-disabled:hover:text-ink',
        danger:
          'bg-transparent text-acc-text not-disabled:not-aria-disabled:hover:bg-accent-soft',
        dangerFill:
          'bg-accent-soft text-acc-text not-disabled:not-aria-disabled:hover:bg-accent/20',
      },
      size: {
        default: 'h-10 px-[18px] text-body',
        sm: "h-[34px] px-3 text-sub [&_svg:not([class*='size-'])]:size-[15px]",
        lg: 'h-11 px-[22px] text-title',
        icon: 'size-10 px-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
