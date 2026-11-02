import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'
import { iconTilt, pressable, still, tactile } from '@/components/vela/tactile'

const buttonVariants = cva(
  cn(
    "tap-target inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap outline-none focus-visible:shadow-ring disabled:opacity-40 aria-disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    tactile,
    iconTilt,
    pressable,
    still,
  ),
  {
    variants: {
      variant: {
        default:
          'bg-accent-fill text-on-accent not-disabled:not-aria-disabled:hover:bg-accent-fill-hover shadow-pop not-disabled:not-aria-disabled:hover:shadow-pop-lg active:shadow-pop-none focus-visible:shadow-pop-ring',
        record:
          'bg-rec-fill text-on-rec not-disabled:not-aria-disabled:hover:bg-rec-fill-hover shadow-pop not-disabled:not-aria-disabled:hover:shadow-pop-lg active:shadow-pop-none focus-visible:shadow-pop-ring',
        tone: 'bg-surface-2 text-ink not-disabled:not-aria-disabled:hover:bg-surface-3 shadow-pop not-disabled:not-aria-disabled:hover:shadow-pop-lg active:shadow-pop-none focus-visible:shadow-pop-ring',
        ghost:
          'bg-transparent text-ink-2 not-disabled:not-aria-disabled:hover:bg-surface not-disabled:not-aria-disabled:hover:text-ink',
        danger:
          'bg-transparent text-rec-text not-disabled:not-aria-disabled:hover:bg-rec-soft',
        dangerFill:
          'bg-rec-soft text-rec-text not-disabled:not-aria-disabled:hover:bg-rec/20 shadow-pop not-disabled:not-aria-disabled:hover:shadow-pop-lg active:shadow-pop-none focus-visible:shadow-pop-ring',
      },
      size: {
        default: 'h-10 px-[calc(18*var(--px))] text-body',
        sm: "h-[calc(34*var(--px))] px-3 text-sub [&_svg:not([class*='size-'])]:size-[calc(15*var(--px))]",
        lg: 'h-11 px-[calc(22*var(--px))] text-title',
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
