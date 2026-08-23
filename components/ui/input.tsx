import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * State is shown with the border colour and the focus ring only — no glow, no
 * blink. Paths, numbers and model names should be set in the code face by
 * adding `font-code tabular-nums`.
 *
 * The field is wrapped in a `<label>` that carries the 44px press area. An
 * `<input>` is a replaced element, so it cannot lay an area down itself, and
 * the label is what a press outside the drawn field lands on: pressing a label
 * moves focus into the field it wraps. The field is drawn exactly as before —
 * 36px, or whatever `className` makes it — and the area is invisible.
 *
 * Width therefore belongs to `areaClassName`, not to `className`: the label is
 * the box the layout sees, and a field narrowed inside a full-width label would
 * leave the rest of that label answering presses on nothing.
 */
function Input({
  className,
  areaClassName,
  type,
  ...props
}: React.ComponentProps<'input'> & { areaClassName?: string }) {
  return (
    <label
      data-slot="input-area"
      className={cn('tap-area block', areaClassName)}
    >
      <input
        type={type}
        data-slot="input"
        className={cn(
          'h-9 w-full min-w-0 rounded-md border border-line-strong bg-surface px-[13px] text-[13px] text-ink outline-none',
          'transition-[border-color,box-shadow,background-color] duration-150 ease-out',
          'placeholder:text-ink-3 selection:bg-brand selection:text-on-brand',
          'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sub file:font-medium file:text-ink',
          'enabled:hover:border-ink-3',
          'focus-visible:border-brand focus-visible:shadow-ring',
          'aria-invalid:border-coral aria-invalid:bg-coral-soft',
          'disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-2 disabled:text-ink-3',
          className,
        )}
        {...props}
      />
    </label>
  )
}

export { Input }
