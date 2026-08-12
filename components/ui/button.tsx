import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'
import { tactile } from '@/components/vela/tactile'

/**
 * Buttons are pills. The weight of the action picks the variant:
 * `default` for creating something, `outline` for editing, `ghost` for a minor
 * inline action, `destructive` for removal and `destructiveFill` for the one
 * button that actually carries out a destructive confirmation.
 *
 * Pressable things are lifted with a hard offset shadow, never a blurred one:
 * 2px at rest, 3px plus a 1px lift on hover, gone plus a 1px sink on press.
 */
const buttonVariants = cva(
  cn(
    "inline-flex shrink-0 items-center justify-center gap-[7px] rounded-full font-bold whitespace-nowrap outline-none disabled:pointer-events-none disabled:border-dashed disabled:border-line disabled:bg-surface-2 disabled:text-ink-3 disabled:shadow-pop-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[15px]",
    '[&_svg]:transition-transform [&_svg]:duration-150 [&_svg]:ease-toy hover:[&_svg]:scale-[1.08] hover:[&_svg]:rotate-[-7deg]',
    tactile,
  ),
  {
    variants: {
      variant: {
        default:
          'border border-btn-fill bg-btn-fill text-on-btn shadow-pop hover:border-btn-fill-hover hover:bg-btn-fill-hover hover:shadow-pop-lg active:shadow-pop-none focus-visible:shadow-pop-ring',
        outline:
          'border border-line-strong bg-surface text-ink shadow-pop hover:shadow-pop-lg active:shadow-pop-none focus-visible:shadow-pop-ring',
        secondary:
          'border border-line bg-surface-2 text-ink shadow-pop hover:shadow-pop-lg active:shadow-pop-none focus-visible:shadow-pop-ring',
        ghost:
          'border border-line bg-transparent font-medium text-ink-2 hover:translate-x-0 hover:bg-surface-2 hover:text-ink focus-visible:shadow-ring',
        destructive:
          'border border-coral-line bg-coral-soft text-coral shadow-pop hover:shadow-pop-lg active:shadow-pop-none focus-visible:shadow-pop-ring',
        destructiveFill:
          'border border-coral bg-coral text-on-coral shadow-pop hover:shadow-pop-lg active:shadow-pop-none focus-visible:shadow-pop-ring',
        link: 'text-brand underline-offset-[3px] hover:translate-x-0 hover:translate-y-0 hover:underline focus-visible:shadow-ring',
      },
      size: {
        default: 'h-[34px] px-[17px] text-ui',
        xs: "h-6 gap-1 px-2.5 text-cap [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 px-[13px] text-sub [&_svg:not([class*='size-'])]:size-[13px]",
        lg: 'h-10 px-6 text-body',
        icon: 'size-[34px] px-0',
        'icon-xs': "size-6 px-0 [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': "size-7 px-0 [&_svg:not([class*='size-'])]:size-[13px]",
        'icon-lg': 'size-10 px-0',
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
