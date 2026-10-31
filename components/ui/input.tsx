import * as React from 'react'

import { cn } from '@/lib/utils'

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
          'h-10 w-full min-w-0 rounded-md bg-surface px-3 text-body text-ink outline-none',
          'transition-[box-shadow,background-color] duration-[140ms] ease-toy',
          'placeholder:text-ink-3 selection:bg-accent-soft',
          'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sub file:font-medium file:text-ink',
          'enabled:hover:bg-surface-2',
          'focus-visible:bg-surface focus-visible:shadow-ring',
          'aria-invalid:bg-accent-soft',
          'disabled:cursor-not-allowed disabled:opacity-40',
          className,
        )}
        {...props}
      />
    </label>
  )
}

export { Input }
