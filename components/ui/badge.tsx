import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border px-[11px] py-[3px] text-note font-medium whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&>svg]:pointer-events-none [&>svg]:size-3',
  {
    variants: {
      width: {
        fit: 'w-fit',
        fixed: 'w-[7.5em] overflow-hidden',
      },
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
      width: 'fit',
    },
  },
)

export type BadgeWidth = NonNullable<
  VariantProps<typeof badgeVariants>['width']
>

function said(children: React.ReactNode): string {
  return React.Children.toArray(children)
    .filter((part) => typeof part === 'string' || typeof part === 'number')
    .join('')
    .trim()
}

function Badge({
  className,
  variant = 'default',
  width = 'fit',
  asChild = false,
  title,
  children,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span'

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      data-width={width}
      title={title ?? (width === 'fixed' ? said(children) : undefined)}
      className={cn(badgeVariants({ variant, width }), className)}
      {...props}
    >
      {children}
    </Comp>
  )
}

export { Badge, badgeVariants }
