'use client'

import { cn } from '@/lib/utils'

/** The shade at the head of a picture while choosing, so its mark reads on a bright picture. */
export function PickShade({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(0,0,0,.32),rgba(0,0,0,0)_42%)]',
        className,
      )}
    />
  )
}
