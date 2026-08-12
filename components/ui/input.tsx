import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * State is shown with the border colour and the focus ring only — no glow, no
 * blink. Paths, numbers and model names should be set in the code face by
 * adding `font-code tabular-nums`.
 */
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
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
  )
}

export { Input }
