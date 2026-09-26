import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'
import { pressable, still, tactile } from '@/components/vela/tactile'

const buttonVariants = cva(
  cn(
    "tap-target inline-flex shrink-0 items-center justify-center gap-[calc(7rem/16)] rounded-full font-bold whitespace-nowrap outline-none disabled:border-dashed disabled:border-line disabled:bg-surface-2 disabled:text-ink-3 disabled:shadow-pop-none disabled:hover:no-underline [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[calc(15rem/16)]",
    '[&_svg]:transition-transform [&_svg]:duration-150 [&_svg]:ease-toy hover:[&_svg]:scale-[1.08] hover:[&_svg]:rotate-[-7deg]',
    tactile,
    pressable,
    still,
  ),
  {
    variants: {
      variant: {
        default:
          'border border-btn-fill bg-btn-fill text-on-btn shadow-pop hover:border-btn-fill-hover hover:bg-btn-fill-hover hover:shadow-pop-lg active:shadow-pop-none focus-visible:shadow-pop-ring',
        outline:
          'border border-edge bg-surface text-ink shadow-pop hover:shadow-pop-lg active:shadow-pop-none focus-visible:shadow-pop-ring',
        ghost:
          'border border-edge bg-transparent font-medium text-ink-2 hover:translate-x-0 hover:bg-surface-2 hover:text-ink focus-visible:shadow-ring',
        watch:
          'border border-brand-line bg-brand-soft text-brand shadow-pop hover:shadow-pop-lg active:shadow-pop-none focus-visible:shadow-pop-ring',
        change:
          'border border-sky-line bg-sky-soft text-sky shadow-pop hover:shadow-pop-lg active:shadow-pop-none focus-visible:shadow-pop-ring',
        halt: 'border border-lemon-line bg-lemon-soft text-lemon shadow-pop hover:shadow-pop-lg active:shadow-pop-none focus-visible:shadow-pop-ring',
        remove:
          'border border-coral-line bg-coral-soft text-coral shadow-pop hover:shadow-pop-lg active:shadow-pop-none focus-visible:shadow-pop-ring',
        removeFill:
          'border border-coral bg-coral text-on-coral shadow-pop hover:shadow-pop-lg active:shadow-pop-none focus-visible:shadow-pop-ring',
      },
      size: {
        default: 'h-[calc(34rem/16)] px-[calc(17rem/16)] text-ui',
        sm: "h-7 px-[calc(13rem/16)] text-sub [&_svg:not([class*='size-'])]:size-[calc(13rem/16)]",
        lg: 'h-10 px-6 text-body',
        icon: 'size-[calc(34rem/16)] px-0',
        'icon-sm':
          "size-7 px-0 [&_svg:not([class*='size-'])]:size-[calc(13rem/16)]",
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
