import * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'field-sizing-content flex min-h-16 w-full rounded-md border border-line-strong bg-surface px-[13px] py-2 text-[13px] text-ink outline-none',
        'transition-[border-color,box-shadow,background-color] duration-150 ease-out',
        'placeholder:text-ink-3 selection:bg-brand selection:text-on-brand',
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

export { Textarea }
