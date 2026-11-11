import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

const SPINNER_SIZE = {
  control: 'size-3.5',
  status: 'size-[calc(17rem/16)]',
} as const

export function Spinner({
  className,
  size = 'status',
  ...props
}: Omit<ComponentProps<'svg'>, 'children'> & {
  size?: keyof typeof SPINNER_SIZE
}) {
  return (
    <svg
      data-slot="spinner"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn(SPINNER_SIZE[size], 'shrink-0 animate-spin', className)}
      {...props}
    >
      <circle
        cx="12"
        cy="12"
        r="8.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeDasharray="40 17"
      />
    </svg>
  )
}
