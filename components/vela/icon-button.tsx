import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { tactile } from '@/components/vela/tactile'

const iconButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-full outline-none disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-[15px]",
  {
    variants: {
      variant: {
        /** Pressable and lifted — used for pagers and toolbar actions. */
        pop: cn(
          'border border-line-strong bg-surface text-ink-2 shadow-pop',
          'hover:text-ink hover:shadow-pop-lg active:shadow-pop-none focus-visible:shadow-pop-ring',
          tactile,
        ),
        /** Flat — used inside bars and panel headers; tilts instead of lifting. */
        quiet:
          'border border-line bg-transparent text-ink-2 transition-[background-color,color,transform] duration-150 ease-toy hover:bg-surface-2 hover:text-ink hover:-rotate-6 focus-visible:shadow-ring',
      },
      size: {
        sm: "size-[27px] [&_svg:not([class*='size-'])]:size-[13px]",
        default: 'size-8',
      },
    },
    defaultVariants: { variant: 'pop', size: 'default' },
  },
)

/**
 * A round icon-only control. `aria-label` is required because there is no
 * visible text to name it.
 */
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
