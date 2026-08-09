import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'
import { DangerIcon } from '@/components/vela/icons'
import { Label } from '@/components/ui/label'

/** Label, control, then hint or error — stacked with a 6px gap. */
export function Field({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="field"
      className={cn('flex flex-col gap-1.5', className)}
      {...props}
    />
  )
}

export function FieldLabel({
  className,
  ...props
}: ComponentProps<typeof Label>) {
  return (
    <Label
      className={cn('gap-[7px] text-ui font-bold text-ink', className)}
      {...props}
    />
  )
}

/** The 必須 pill that sits next to a label. */
export function RequiredMark({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      data-slot="required-mark"
      className={cn(
        'rounded-full border border-coral-line bg-coral-soft px-2 text-[10px] leading-[1.7] font-bold text-coral',
        className,
      )}
      {...props}
    >
      必須
    </span>
  )
}

export function FieldHint({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      data-slot="field-hint"
      className={cn('text-note text-ink-3', className)}
      {...props}
    />
  )
}

export function FieldError({
  className,
  children,
  ...props
}: ComponentProps<'p'>) {
  return (
    <p
      data-slot="field-error"
      className={cn('flex items-start gap-1.5 text-note text-coral', className)}
      {...props}
    >
      <DangerIcon className="mt-[3px] size-3.5" />
      <span>{children}</span>
    </p>
  )
}

/** A group of related options, separated by a pastel panel instead of a box. */
export function OptionGroup({
  title,
  className,
  children,
  ...props
}: ComponentProps<'div'> & { title: string }) {
  return (
    <div
      data-slot="option-group"
      role="group"
      aria-label={title}
      className={cn(
        'flex flex-col items-start gap-[11px] rounded-lg px-[15px] py-[13px]',
        className,
      )}
      {...props}
    >
      <span className="heading text-sub text-ink">{title}</span>
      {children}
    </div>
  )
}
