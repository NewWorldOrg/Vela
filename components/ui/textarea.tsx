import * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'field-sizing-content flex min-h-16 w-full rounded-md bg-surface px-3 py-2.5 text-body text-ink outline-none',
        'transition-[box-shadow,background-color] duration-[140ms] ease-toy',
        'placeholder:text-ink-3 selection:bg-accent-soft',
        'enabled:hover:bg-surface-2',
        'focus-visible:bg-surface focus-visible:shadow-ring',
        'aria-invalid:bg-accent-soft',
        'disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
