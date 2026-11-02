import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { iconTilt, pressable, still, tactile } from '@/components/vela/tactile'

const iconButtonVariants = cva(
  cn(
    "tap-target inline-flex shrink-0 items-center justify-center rounded-full outline-none focus-visible:shadow-ring disabled:opacity-40 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
    iconTilt,
    pressable,
    still,
  ),
  {
    variants: {
      variant: {
        pop: cn(
          'bg-surface text-ink-2 shadow-pop not-disabled:hover:bg-surface-2 not-disabled:hover:text-ink not-disabled:hover:shadow-pop-lg active:shadow-pop-none focus-visible:shadow-pop-ring',
          tactile,
        ),
        quiet:
          'bg-transparent text-ink-2 not-disabled:hover:bg-surface-2 not-disabled:hover:text-ink',
      },
      size: {
        sm: "size-7 [&_svg:not([class*='size-'])]:size-[calc(14*var(--px))]",
        default: 'size-[calc(34*var(--px))]',
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
