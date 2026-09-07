import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { pressable, still, tactile } from '@/components/vela/tactile'

const iconButtonVariants = cva(
  cn(
    "tap-target inline-flex shrink-0 items-center justify-center rounded-full outline-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-[15px]",
    pressable,
    still,
  ),
  {
    variants: {
      variant: {
        pop: cn(
          'border border-edge bg-surface text-ink-2 shadow-pop',
          'hover:text-ink hover:shadow-pop-lg active:shadow-pop-none focus-visible:shadow-pop-ring',
          'disabled:hover:text-ink-2 disabled:hover:shadow-pop',
          tactile,
        ),
        quiet:
          'border border-edge bg-transparent text-ink-2 transition-[background-color,color,transform] duration-150 ease-toy hover:bg-surface-2 hover:text-ink hover:-rotate-6 focus-visible:shadow-ring disabled:hover:bg-transparent disabled:hover:text-ink-2',
      },
      size: {
        sm: "size-[27px] [&_svg:not([class*='size-'])]:size-[13px]",
        default: 'size-8',
      },
    },
    defaultVariants: { variant: 'pop', size: 'default' },
  },
)

export function IconButton({
  className,
  variant,
  size,
  ...props
}: ComponentProps<'button'> &
  VariantProps<typeof iconButtonVariants> & { 'aria-label': string }) {
  return (
    <button
      type="button"
      data-slot="icon-button"
      className={cn(iconButtonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { iconButtonVariants }
