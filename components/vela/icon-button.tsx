import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { pressable, still, tactile } from '@/components/vela/tactile'

const iconButtonVariants = cva(
  cn(
    "tap-target inline-flex shrink-0 items-center justify-center rounded-full outline-none focus-visible:shadow-ring disabled:opacity-40 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
    tactile,
    pressable,
    still,
  ),
  {
    variants: {
      variant: {
        pop: 'bg-surface text-ink-2 not-disabled:hover:bg-surface-2 not-disabled:hover:text-ink',
        quiet:
          'bg-transparent text-ink-2 not-disabled:hover:bg-surface-2 not-disabled:hover:text-ink',
      },
      size: {
        sm: "size-7 [&_svg:not([class*='size-'])]:size-[14px]",
        default: 'size-[34px]',
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
